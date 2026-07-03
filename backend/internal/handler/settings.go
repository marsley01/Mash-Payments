package handler

import (
	"encoding/json"
	"net/http"

	"github.com/mash-payments/backend/internal/database"
	"github.com/mash-payments/backend/internal/model"
)

type SettingsHandler struct {
	DB            *database.Client
	SandboxPasskey string
}

func maskSecret(s string) string {
	if len(s) <= 6 {
		return s
	}
	return "******" + s[len(s)-6:]
}

func (h *SettingsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	claims := GetUserClaims(r.Context())
	if claims == nil {
		writeError(w, http.StatusUnauthorized, "Not authenticated")
		return
	}

	switch r.Method {
	case http.MethodGet:
		h.getSettings(w, r, claims.Sub)
	case http.MethodPost:
		h.saveSettings(w, r, claims.Sub)
	default:
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed")
	}
}

func (h *SettingsHandler) getSettings(w http.ResponseWriter, r *http.Request, userID string) {
	var creds []model.DarajaCredentials
	err := h.DB.Get(r.Context(), "/daraja_credentials?user_id=eq."+userID, &creds)
	if err != nil || len(creds) == 0 {
		writeJSON(w, http.StatusOK, map[string]interface{}{"config": nil})
		return
	}

	cred := creds[0]
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"config": map[string]interface{}{
			"id":              cred.ID,
			"consumer_key":    maskSecret(cred.ConsumerKey),
			"consumer_secret": maskSecret(cred.ConsumerSec),
			"passkey":         maskSecret(cred.Passkey),
			"shortcode":       cred.Shortcode,
			"environment":     cred.Environment,
			"callback_url":    cred.CallbackURL,
			"is_configured":   cred.IsConfigured,
		},
	})
}

func (h *SettingsHandler) saveSettings(w http.ResponseWriter, r *http.Request, userID string) {
	var req model.SettingsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.ConsumerKey == "" || req.CallbackURL == "" {
		writeError(w, http.StatusBadRequest, "Consumer key and callback URL are required")
		return
	}

	isSandbox := req.Environment == "" || req.Environment == "sandbox"
	if isSandbox {
		req.Shortcode = "174379"
		req.Passkey = h.SandboxPasskey
	} else {
		if req.Passkey == "" || req.Shortcode == "" {
			writeError(w, http.StatusBadRequest, "Shortcode and Passkey are required for production")
			return
		}
	}

	var existing []struct {
		ID             string `json:"id"`
		ConsumerSecret string `json:"consumer_secret"`
	}
	err := h.DB.Get(r.Context(), "/daraja_credentials?user_id=eq."+userID+"&select=id,consumer_secret", &existing)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Database error")
		return
	}

	finalSecret := req.ConsumerSecret
	if finalSecret == "" && len(existing) > 0 {
		finalSecret = existing[0].ConsumerSecret
	}
	if finalSecret == "" {
		writeError(w, http.StatusBadRequest, "Consumer secret is required")
		return
	}

	payload := map[string]interface{}{
		"consumer_key":    req.ConsumerKey,
		"consumer_secret": finalSecret,
		"passkey":         req.Passkey,
		"shortcode":       req.Shortcode,
		"environment":     req.Environment,
		"callback_url":    req.CallbackURL,
		"is_configured":   true,
	}

	if len(existing) > 0 {
		err = h.DB.Patch(r.Context(), "/daraja_credentials?id=eq."+existing[0].ID, payload, nil)
	} else {
		payload["user_id"] = userID
		err = h.DB.Post(r.Context(), "/daraja_credentials", payload, nil)
	}
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	h.DB.Patch(r.Context(), "/profiles?id=eq."+userID+"&setup_step=lt.3", map[string]interface{}{
		"setup_step": 3,
	}, nil)

	writeJSON(w, http.StatusOK, map[string]interface{}{"success": true})
}
