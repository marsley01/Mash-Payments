package handler

import (
	"context"
	"net/http"

	"github.com/mash-payments/backend/internal/model"
)

type TransactionsHandler struct {
	DB TransactionsDB
}

type TransactionsDB interface {
	Get(ctx context.Context, path string, result interface{}) error
}

func (h *TransactionsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	claims := GetUserClaims(r.Context())
	if claims == nil {
		writeError(w, http.StatusUnauthorized, "Not authenticated")
		return
	}

	var transactions []model.Transaction
	err := h.DB.Get(r.Context(), "/transactions?user_id=eq."+claims.Sub+"&order=created_at.desc", &transactions)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Database error")
		return
	}

	if transactions == nil {
		transactions = []model.Transaction{}
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"transactions": transactions,
	})
}
