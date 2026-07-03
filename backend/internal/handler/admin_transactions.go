package handler

import (
	"context"
	"net/http"

	"github.com/mash-payments/backend/internal/model"
)

type AdminTransactionsHandler struct {
	DB AdminTxDB
}

type AdminTxDB interface {
	Get(ctx context.Context, path string, result interface{}) error
}

func (h *AdminTransactionsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	claims := GetUserClaims(r.Context())
	if claims == nil || claims.Role != "admin" {
		writeError(w, http.StatusForbidden, "Forbidden")
		return
	}

	var transactions []model.Transaction
	err := h.DB.Get(r.Context(), "/transactions?order=created_at.desc&limit=200", &transactions)
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
