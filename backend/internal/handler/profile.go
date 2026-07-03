package handler

import (
	"net/http"
	"net/url"

	"github.com/mash-payments/backend/internal/database"
	"github.com/mash-payments/backend/internal/model"
)

type ProfileHandler struct {
	DB *database.Client
}

func (h *ProfileHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	claims := GetUserClaims(r.Context())
	if claims == nil {
		writeError(w, http.StatusUnauthorized, "Not authenticated")
		return
	}

	var profiles []model.Profile
	err := h.DB.Get(r.Context(), "/profiles?id=eq."+claims.Sub+"&select=id,business_name,api_token,setup_step,role,created_at", &profiles)
	if err != nil || len(profiles) == 0 {
		writeError(w, http.StatusNotFound, "Profile not found")
		return
	}
	profile := profiles[0]

	var creds []struct {
		IsConfigured bool `json:"is_configured"`
	}
	err = h.DB.Get(r.Context(), "/daraja_credentials?user_id=eq."+claims.Sub+"&select=is_configured", &creds)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Database error")
		return
	}

	isConfigured := false
	if len(creds) > 0 {
		isConfigured = creds[0].IsConfigured
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"profile":       profile,
		"is_configured": isConfigured,
	})
}

func (h *ProfileHandler) GetProfileByToken(r *http.Request, token string) (*model.Profile, error) {
	var profiles []model.Profile
	err := h.DB.Get(r.Context(), "/profiles?api_token=eq."+url.QueryEscape(token)+"&select=id,business_name,api_token,setup_step", &profiles)
	if err != nil || len(profiles) == 0 {
		return nil, err
	}
	return &profiles[0], nil
}
