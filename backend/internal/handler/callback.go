package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"

	"github.com/mash-payments/backend/internal/daraja"
)

type CallbackHandler struct {
	DB CallbackDB
}

type CallbackDB interface {
	Patch(ctx context.Context, path string, body interface{}, result interface{}) error
}

func (h *CallbackHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	ip := r.Header.Get("x-forwarded-for")
	if idx := strings.Index(ip, ","); idx > 0 {
		ip = strings.TrimSpace(ip[:idx])
	}
	if ip != "" && !daraja.IsValidSafaricomIP(ip) {
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"ResultCode": 0,
			"ResultDesc": "Accepted",
		})
		return
	}

	var cbBody struct {
		Body struct {
			StkCallback *struct {
				CheckoutRequestID string `json:"CheckoutRequestID"`
				ResultCode        int    `json:"ResultCode"`
				CallbackMetadata  *struct {
					Item []struct {
						Name  string      `json:"Name"`
						Value interface{} `json:"Value"`
					} `json:"Item"`
				} `json:"CallbackMetadata"`
			} `json:"stkCallback"`
		} `json:"Body"`
	}

	if err := json.NewDecoder(r.Body).Decode(&cbBody); err != nil {
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"ResultCode": 0,
			"ResultDesc": "Accepted",
		})
		return
	}

	callback := cbBody.Body.StkCallback
	if callback == nil {
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"ResultCode": 0,
			"ResultDesc": "Accepted",
		})
		return
	}

	if callback.ResultCode == 0 && callback.CallbackMetadata != nil {
		mpesaReceipt := ""
		for _, item := range callback.CallbackMetadata.Item {
			if item.Name == "MpesaReceiptNumber" {
				if v, ok := item.Value.(string); ok {
					mpesaReceipt = v
				}
				break
			}
		}

		h.DB.Patch(r.Context(), "/transactions?checkout_request_id=eq."+callback.CheckoutRequestID, map[string]interface{}{
			"status":        "SUCCESS",
			"mpesa_receipt": mpesaReceipt,
		}, nil)
	} else {
		h.DB.Patch(r.Context(), "/transactions?checkout_request_id=eq."+callback.CheckoutRequestID, map[string]interface{}{
			"status": "FAILED",
		}, nil)
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"ResultCode": 0,
		"ResultDesc": "Accepted",
	})
}
