package handler

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/mash-payments/backend/internal/database"
	"github.com/mash-payments/backend/internal/model"
)

type AdminUsersHandler struct {
	DB   *database.Client
	Auth *database.AuthClient
}

func (h *AdminUsersHandler) ListUsers(w http.ResponseWriter, r *http.Request) {
	var profiles []struct {
		ID           string `json:"id"`
		BusinessName string `json:"business_name"`
		APIToken     string `json:"api_token"`
		SetupStep    int    `json:"setup_step"`
		Role         string `json:"role"`
		CreatedAt    string `json:"created_at"`
		DarajaCreds  []struct {
			IsConfigured bool `json:"is_configured"`
		} `json:"daraja_credentials"`
	}
	err := h.DB.Get(r.Context(), "/profiles?select=*,daraja_credentials(is_configured)&order=created_at.desc", &profiles)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Database error")
		return
	}

	authResp, err := h.Auth.AdminListUsers(r.Context())
	userMap := make(map[string]string)
	if err == nil && authResp != nil {
		for _, u := range authResp.Users {
			userMap[u.ID] = u.Email
		}
	}

	var users []model.AdminUserRow
	for _, p := range profiles {
		token := p.APIToken
		if len(token) > 14 {
			token = token[:10] + "..." + token[len(token)-4:]
		}
		isConfigured := false
		if len(p.DarajaCreds) > 0 {
			isConfigured = p.DarajaCreds[0].IsConfigured
		}
		role := p.Role
		if role == "" {
			role = "user"
		}
		users = append(users, model.AdminUserRow{
			ID:           p.ID,
			Email:        userMap[p.ID],
			BusinessName: p.BusinessName,
			APIToken:     token,
			SetupStep:    p.SetupStep,
			Role:         role,
			IsConfigured: isConfigured,
			CreatedAt:    p.CreatedAt,
		})
	}

	if users == nil {
		users = []model.AdminUserRow{}
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{"users": users})
}

func (h *AdminUsersHandler) UpdateUser(w http.ResponseWriter, r *http.Request) {
	userID := chi.URLParam(r, "id")
	if userID == "" {
		writeError(w, http.StatusBadRequest, "User ID is required")
		return
	}

	var req model.AdminUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	profileUpdates := make(map[string]interface{})
	credsUpdates := make(map[string]interface{})

	if req.Role != nil {
		if *req.Role != "user" && *req.Role != "admin" {
			writeError(w, http.StatusBadRequest, "Invalid role")
			return
		}
		profileUpdates["role"] = *req.Role
	}

	if req.SetupStep != nil {
		if *req.SetupStep < 1 || *req.SetupStep > 4 {
			writeError(w, http.StatusBadRequest, "Invalid setup_step")
			return
		}
		profileUpdates["setup_step"] = *req.SetupStep
	}

	if req.IsConfigured != nil {
		credsUpdates["is_configured"] = *req.IsConfigured
	}

	if len(profileUpdates) > 0 {
		err := h.DB.Patch(r.Context(), "/profiles?id=eq."+userID, profileUpdates, nil)
		if err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
	}

	if len(credsUpdates) > 0 {
		err := h.DB.Patch(r.Context(), "/daraja_credentials?user_id=eq."+userID, credsUpdates, nil)
		if err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{"success": true})
}
