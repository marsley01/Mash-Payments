package model

type Profile struct {
	ID           string `json:"id"`
	BusinessName string `json:"business_name"`
	APIToken     string `json:"api_token"`
	SetupStep    int    `json:"setup_step"`
	Role         string `json:"role"`
	CreatedAt    string `json:"created_at"`
}

type DarajaCredentials struct {
	ID           string `json:"id"`
	UserID       string `json:"user_id"`
	ConsumerKey  string `json:"consumer_key"`
	ConsumerSec  string `json:"consumer_secret"`
	Passkey      string `json:"passkey"`
	Shortcode    string `json:"shortcode"`
	Environment  string `json:"environment"`
	CallbackURL  string `json:"callback_url"`
	IsConfigured bool   `json:"is_configured"`
	UpdatedAt    string `json:"updated_at"`
}

type Transaction struct {
	ID                string  `json:"id"`
	UserID            string  `json:"user_id"`
	Phone             string  `json:"phone"`
	Amount            float64 `json:"amount"`
	Reference         string  `json:"reference"`
	CheckoutRequestID string  `json:"checkout_request_id"`
	MpesaReceipt      string  `json:"mpesa_receipt"`
	Status            string  `json:"status"`
	CreatedAt         string  `json:"created_at"`
}

type STKPushRequest struct {
	Phone     string `json:"phone"`
	Amount    float64 `json:"amount"`
	Reference string `json:"reference"`
}

type STKPushResponse struct {
	Success           bool   `json:"success"`
	CheckoutRequestID string `json:"checkout_request_id,omitempty"`
	Message           string `json:"message"`
	Error             string `json:"error,omitempty"`
}

type SignupRequest struct {
	Name         string `json:"name"`
	BusinessName string `json:"business_name"`
	Email        string `json:"email"`
	Password     string `json:"password"`
}

type SettingsRequest struct {
	ConsumerKey    string `json:"consumer_key"`
	ConsumerSecret string `json:"consumer_secret"`
	Passkey        string `json:"passkey"`
	Shortcode      string `json:"shortcode"`
	Environment    string `json:"environment"`
	CallbackURL    string `json:"callback_url"`
}

type AdminUpdateRequest struct {
	Role         *string `json:"role,omitempty"`
	SetupStep    *int    `json:"setup_step,omitempty"`
	IsConfigured *bool   `json:"is_configured,omitempty"`
}

type AdminStats struct {
	TotalUsers        int     `json:"totalUsers"`
	TotalTransactions int     `json:"totalTransactions"`
	TotalRevenue      float64 `json:"totalRevenue"`
	ActiveGateways    int     `json:"activeGateways"`
}

type AdminUserRow struct {
	ID           string `json:"id"`
	Email        string `json:"email"`
	BusinessName string `json:"business_name"`
	APIToken     string `json:"api_token"`
	SetupStep    int    `json:"setup_step"`
	Role         string `json:"role"`
	IsConfigured bool   `json:"is_configured"`
	CreatedAt    string `json:"created_at"`
}
