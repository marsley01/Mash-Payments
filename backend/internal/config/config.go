package config

import "os"

type Config struct {
	Port              string
	SupabaseURL       string
	SupabaseServiceKey string
	SupabaseJWTSecret string
	SandboxPasskey    string
}

func Load() *Config {
	return &Config{
		Port:              getEnv("PORT", "8080"),
		SupabaseURL:       getEnv("SUPABASE_URL", ""),
		SupabaseServiceKey: getEnv("SUPABASE_SERVICE_ROLE_KEY", ""),
		SupabaseJWTSecret: getEnv("SUPABASE_JWT_SECRET", ""),
		SandboxPasskey:    getEnv("SANDBOX_PASSKEY", "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919"),
	}
}

func (c *Config) Validate() {
	required := map[string]string{
		"SUPABASE_URL":             c.SupabaseURL,
		"SUPABASE_SERVICE_ROLE_KEY": c.SupabaseServiceKey,
		"SUPABASE_JWT_SECRET":      c.SupabaseJWTSecret,
	}
	for name, val := range required {
		if val == "" {
			panic("Missing required environment variable: " + name)
		}
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
