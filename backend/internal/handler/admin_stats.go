package handler

import (
	"context"
	"net/http"

	"github.com/mash-payments/backend/internal/model"
)

type AdminStatsHandler struct {
	DB AdminStatsDB
}

type AdminStatsDB interface {
	Get(ctx context.Context, path string, result interface{}) error
}

func (h *AdminStatsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	claims := GetUserClaims(r.Context())
	if claims == nil || claims.Role != "admin" {
		writeError(w, http.StatusForbidden, "Forbidden")
		return
	}

	var profiles []struct{ ID string }
	h.DB.Get(r.Context(), "/profiles?select=id", &profiles)
	totalUsers := len(profiles)

	var allTx []struct{ ID string }
	h.DB.Get(r.Context(), "/transactions?select=id", &allTx)
	totalTransactions := len(allTx)

	var activeCreds []struct{ ID string }
	h.DB.Get(r.Context(), "/daraja_credentials?is_configured=eq.true&select=id", &activeCreds)
	activeGateways := len(activeCreds)

	var revenueData []struct {
		Amount float64 `json:"amount"`
	}
	h.DB.Get(r.Context(), "/transactions?status=eq.SUCCESS&select=amount", &revenueData)

	totalRevenue := 0.0
	for _, t := range revenueData {
		totalRevenue += t.Amount
	}

	writeJSON(w, http.StatusOK, model.AdminStats{
		TotalUsers:        totalUsers,
		TotalTransactions: totalTransactions,
		TotalRevenue:      totalRevenue,
		ActiveGateways:    activeGateways,
	})
}
