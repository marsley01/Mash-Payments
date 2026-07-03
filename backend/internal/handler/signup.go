package handler

import (
	"encoding/json"
	"net/http"

	"github.com/mash-payments/backend/internal/database"
	"github.com/mash-payments/backend/internal/daraja"
	"github.com/mash-payments/backend/internal/model"
)

type SignupHandler struct {
	DB   *database.Client
	Auth *database.AuthClient
}

func (h *SignupHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	ip := r.Header.Get("x-forwarded-for")
	if idx := indexOf(ip, ","); idx > 0 {
		ip = ip[:idx]
	}
	if ip == "" {
		ip = r.RemoteAddr
	}
	if !checkRateLimit("signup:"+ip, 5, windowMinute) {
		writeError(w, http.StatusTooManyRequests, "Too many requests")
		return
	}

	var req model.SignupRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.Name == "" || req.BusinessName == "" || req.Email == "" || req.Password == "" {
		writeError(w, http.StatusBadRequest, "All fields are required")
		return
	}

	authResp, err := h.Auth.AdminCreateUser(r.Context(), database.CreateUserRequest{
		Email:        req.Email,
		Password:     req.Password,
		EmailConfirm: true,
	})
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	apiToken := daraja.GenerateToken()

	var profiles []map[string]interface{}
	err = h.DB.Post(r.Context(), "/profiles", map[string]interface{}{
		"id":            authResp.ID,
		"business_name": req.BusinessName,
		"api_token":     apiToken,
		"setup_step":    1,
		"role":          "user",
	}, &profiles)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to create account")
		return
	}

	var creds []map[string]interface{}
	err = h.DB.Post(r.Context(), "/daraja_credentials", map[string]interface{}{
		"user_id":       authResp.ID,
		"is_configured": false,
	}, &creds)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to create account")
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"success":  true,
		"api_token": apiToken,
		"email":    req.Email,
	})
}

func indexOf(s, sep string) int {
	for i := 0; i < len(s); i++ {
		if s[i] == sep[0] {
			return i
		}
	}
	return -1
}

const windowMinute = 60000
