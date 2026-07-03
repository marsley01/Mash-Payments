package handler

import (
	"encoding/json"
	"net/http"
	"regexp"
	"strings"

	"github.com/mash-payments/backend/internal/daraja"
	"github.com/mash-payments/backend/internal/model"
)

var phoneRegex = regexp.MustCompile(`^(\+?254|0)?[17]\d{8}$`)

type STKPushHandler struct {
	DarajaClient *daraja.Client
	ProfileH     *ProfileHandler
}

func (h *STKPushHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	ip := r.Header.Get("x-forwarded-for")
	if idx := strings.Index(ip, ","); idx > 0 {
		ip = strings.TrimSpace(ip[:idx])
	}
	if ip == "" {
		ip = r.RemoteAddr
	}
	if !checkRateLimit("stkpush:"+ip, 10, windowMinute) {
		writeError(w, http.StatusTooManyRequests, "Too many requests")
		return
	}

	token := r.Header.Get("x-token")
	if token == "" {
		writeError(w, http.StatusUnauthorized, "Missing x-token header")
		return
	}

	profile, err := h.ProfileH.GetProfileByToken(r, token)
	if err != nil || profile == nil {
		writeError(w, http.StatusUnauthorized, "Invalid token")
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
	err = h.ProfileH.DB.Get(r.Context(), "/daraja_credentials?user_id=eq."+profile.ID+"&select=consumer_key,consumer_secret,passkey,shortcode,environment,callback_url", &creds)
	if err != nil || len(creds) == 0 || creds[0].ConsumerKey == "" {
		writeError(w, http.StatusBadRequest, "You haven't saved your Daraja keys yet")
		return
	}
	cred := creds[0]

	var req model.STKPushRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	req.Phone = strings.ReplaceAll(req.Phone, " ", "")
	if req.Phone == "" || req.Amount <= 0 || req.Reference == "" {
		writeError(w, http.StatusBadRequest, "phone, amount, and reference are required")
		return
	}

	if !phoneRegex.MatchString(req.Phone) {
		writeError(w, http.StatusBadRequest, "Invalid phone number")
		return
	}

	if req.Amount <= 0 || req.Amount > 150000 {
		writeError(w, http.StatusBadRequest, "Amount must be between 1 and 150,000")
		return
	}

	if len(req.Reference) > 100 {
		writeError(w, http.StatusBadRequest, "Invalid reference")
		return
	}

	result, err := h.DarajaClient.SendSTKPush(daraja.Config{
		ConsumerKey:    cred.ConsumerKey,
		ConsumerSecret: cred.ConsumerSecret,
		Passkey:        cred.Passkey,
		Shortcode:      cred.Shortcode,
		CallbackURL:    cred.CallbackURL,
		Env:            cred.Environment,
	}, req.Phone, req.Amount, req.Reference)

	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]interface{}{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	if result.ResponseCode == "0" {
		h.ProfileH.DB.Post(r.Context(), "/transactions", map[string]interface{}{
			"user_id":              profile.ID,
			"phone":                req.Phone,
			"amount":               req.Amount,
			"reference":            req.Reference,
			"checkout_request_id":  result.CheckoutRequestID,
			"status":               "PENDING",
		}, nil)

		if profile.SetupStep < 4 {
			h.ProfileH.DB.Patch(r.Context(), "/profiles?id=eq."+profile.ID+"&setup_step=lt.4", map[string]interface{}{
				"setup_step": 4,
			}, nil)
		}

		writeJSON(w, http.StatusOK, model.STKPushResponse{
			Success:           true,
			CheckoutRequestID: result.CheckoutRequestID,
			Message:           "STK Push sent. Ask the customer to check their phone.",
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
