package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"

	"github.com/mash-payments/backend/internal/daraja"
)

type TestPushHandler struct {
	DarajaClient *daraja.Client
	DB           TestPushDB
}

type TestPushDB interface {
	Get(ctx context.Context, path string, result interface{}) error
	Post(ctx context.Context, path string, body interface{}, result interface{}) error
	Patch(ctx context.Context, path string, body interface{}, result interface{}) error
}

func (h *TestPushHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	claims := GetUserClaims(r.Context())
	if claims == nil {
		writeError(w, http.StatusUnauthorized, "Not authenticated")
		return
	}

	var creds []struct {
		ConsumerKey    string `json:"consumer_key"`
		ConsumerSecret string `json:"consumer_secret"`
		Passkey        string `json:"passkey"`
		Shortcode      string `json:"shortcode"`
		Environment    string `json:"environment"`
		CallbackURL    string `json:"callback_url"`
	}
	err := h.DB.Get(r.Context(), "/daraja_credentials?user_id=eq."+claims.Sub+"&select=consumer_key,consumer_secret,passkey,shortcode,environment,callback_url", &creds)
	if err != nil || len(creds) == 0 || creds[0].ConsumerKey == "" {
		writeError(w, http.StatusBadRequest, "Save your Daraja keys first before testing.")
		return
	}
	cred := creds[0]

	var body struct {
		Phone  string  `json:"phone"`
		Amount float64 `json:"amount"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if body.Phone == "" {
		writeError(w, http.StatusBadRequest, "Phone number is required")
		return
	}

	body.Phone = strings.ReplaceAll(body.Phone, " ", "")
	if !phoneRegex.MatchString(body.Phone) {
		writeError(w, http.StatusBadRequest, "Invalid phone number")
		return
	}

	if body.Amount <= 0 {
		body.Amount = 1
	}
	if body.Amount > 150000 {
		writeError(w, http.StatusBadRequest, "Amount must be between 1 and 150,000")
		return
	}

	result, err := h.DarajaClient.SendSTKPush(daraja.Config{
		ConsumerKey:    cred.ConsumerKey,
		ConsumerSecret: cred.ConsumerSecret,
		Passkey:        cred.Passkey,
		Shortcode:      cred.Shortcode,
		CallbackURL:    cred.CallbackURL,
		Env:            cred.Environment,
	}, body.Phone, body.Amount, "MASH-TEST")

	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]interface{}{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	if result.ResponseCode == "0" {
		h.DB.Post(r.Context(), "/transactions", map[string]interface{}{
			"user_id":              claims.Sub,
			"phone":                body.Phone,
			"amount":               body.Amount,
			"reference":            "MASH-TEST",
			"checkout_request_id":  result.CheckoutRequestID,
			"status":               "PENDING",
		}, nil)

		var profiles []struct {
			SetupStep int `json:"setup_step"`
		}
		h.DB.Get(r.Context(), "/profiles?id=eq."+claims.Sub+"&select=setup_step", &profiles)
		if len(profiles) > 0 && profiles[0].SetupStep < 4 {
			h.DB.Patch(r.Context(), "/profiles?id=eq."+claims.Sub, map[string]interface{}{
				"setup_step": 4,
			}, nil)
		}

		writeJSON(w, http.StatusOK, map[string]interface{}{
			"success":            true,
			"checkout_request_id": result.CheckoutRequestID,
			"message":            "Prompt sent! Check your phone.",
		})
		return
	}

	msg := result.ErrorMessage
	if msg == "" {
		msg = result.ResponseDescription
	}
	if msg == "" {
		msg = "STK push failed"
	}
	writeJSON(w, http.StatusInternalServerError, map[string]interface{}{
		"success": false,
		"message": msg,
	})
}
