package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/mash-payments/backend/internal/auth"
)

type contextKey string

const userClaimsKey contextKey = "userClaims"

type rateLimiter struct {
	mu   sync.Mutex
	hits map[string]*rateEntry
}

type rateEntry struct {
	count int
	reset int64
}

var globalRateLimiter = &rateLimiter{hits: make(map[string]*rateEntry)}

func checkRateLimit(key string, max int, window time.Duration) bool {
	globalRateLimiter.mu.Lock()
	defer globalRateLimiter.mu.Unlock()

	now := time.Now().UnixMilli()
	entry, ok := globalRateLimiter.hits[key]
	if !ok || now > entry.reset {
		globalRateLimiter.hits[key] = &rateEntry{count: 1, reset: now + window.Milliseconds()}
		return true
	}
	if entry.count >= max {
		return false
	}
	entry.count++
	return true
}

func CORSMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, x-token, x-forwarded-for")
		w.Header().Set("Access-Control-Max-Age", "86400")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func RateLimitMiddleware(max int, window time.Duration, prefix string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ip := r.Header.Get("x-forwarded-for")
			if idx := strings.Index(ip, ","); idx > 0 {
				ip = strings.TrimSpace(ip[:idx])
			}
			if ip == "" {
				ip = r.RemoteAddr
			}

			if !checkRateLimit(prefix+":"+ip, max, window) {
				http.Error(w, `{"error":"Too many requests"}`, http.StatusTooManyRequests)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func AuthMiddleware(jwtSecret string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
				http.Error(w, `{"error":"Not authenticated"}`, http.StatusUnauthorized)
				return
			}

			token := strings.TrimPrefix(authHeader, "Bearer ")
			claims, err := auth.VerifyToken(token, jwtSecret)
			if err != nil {
				http.Error(w, `{"error":"Invalid token"}`, http.StatusUnauthorized)
				return
			}

			ctx := context.WithValue(r.Context(), userClaimsKey, claims)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func GetUserClaims(ctx context.Context) *auth.UserClaims {
	claims, _ := ctx.Value(userClaimsKey).(*auth.UserClaims)
	return claims
}

func AdminOnlyMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims := GetUserClaims(r.Context())
		if claims == nil {
			writeError(w, http.StatusUnauthorized, "Not authenticated")
			return
		}
		if claims.Role != "admin" {
			writeError(w, http.StatusForbidden, "Forbidden")
			return
		}
		next.ServeHTTP(w, r)
	})
}

func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}
