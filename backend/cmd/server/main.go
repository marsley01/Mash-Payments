package main

import (
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/mash-payments/backend/internal/config"
	"github.com/mash-payments/backend/internal/daraja"
	"github.com/mash-payments/backend/internal/database"
	"github.com/mash-payments/backend/internal/handler"
)

func main() {
	cfg := config.Load()
	cfg.Validate()

	db := database.New(cfg.SupabaseURL, cfg.SupabaseServiceKey)
	authClient := database.NewAuth(cfg.SupabaseURL, cfg.SupabaseServiceKey)
	darajaClient := daraja.New()

	profileH := &handler.ProfileHandler{DB: db}
	adminUsersH := &handler.AdminUsersHandler{DB: db, Auth: authClient}

	r := chi.NewRouter()

	r.Use(chimw.Logger)
	r.Use(chimw.Recoverer)
	r.Use(chimw.RealIP)
	r.Use(chimw.Timeout(60 * time.Second))
	r.Use(handler.CORSMiddleware)

	r.Route("/api", func(r chi.Router) {
		r.Post("/auth/signup", (&handler.SignupHandler{DB: db, Auth: authClient}).ServeHTTP)

		r.Group(func(r chi.Router) {
			r.Use(handler.AuthMiddleware(cfg.SupabaseJWTSecret))
			r.Get("/profile", profileH.ServeHTTP)
			r.Get("/transactions", (&handler.TransactionsHandler{DB: db}).ServeHTTP)
			r.Post("/settings", (&handler.SettingsHandler{DB: db, SandboxPasskey: cfg.SandboxPasskey}).ServeHTTP)
			r.Get("/settings", (&handler.SettingsHandler{DB: db, SandboxPasskey: cfg.SandboxPasskey}).ServeHTTP)
			r.Post("/test-push", (&handler.TestPushHandler{DarajaClient: darajaClient, DB: db}).ServeHTTP)

			r.Route("/admin", func(r chi.Router) {
				r.Use(handler.AdminOnlyMiddleware)
				r.Get("/stats", (&handler.AdminStatsHandler{DB: db}).ServeHTTP)
				r.Get("/transactions", (&handler.AdminTransactionsHandler{DB: db}).ServeHTTP)
				r.Get("/users", adminUsersH.ListUsers)
				r.Patch("/users/{id}", adminUsersH.UpdateUser)
			})
		})

		r.With(handler.RateLimitMiddleware(10, time.Minute, "stkpush")).Post("/stkpush", (&handler.STKPushHandler{
			DarajaClient: darajaClient,
			ProfileH:     profileH,
		}).ServeHTTP)

		r.Post("/callback", (&handler.CallbackHandler{DB: db}).ServeHTTP)
	})

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok"}`))
	})

	addr := fmt.Sprintf(":%s", cfg.Port)
	log.Printf("Mash Payments API server starting on %s", addr)
	if err := http.ListenAndServe(addr, r); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
