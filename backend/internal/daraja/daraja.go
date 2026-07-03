package daraja

import (
	"bytes"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

const sandboxOAuth = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials"
const productionOAuth = "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials"
const sandboxSTK = "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest"
const productionSTK = "https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest"

type Config struct {
	ConsumerKey    string
	ConsumerSecret string
	Passkey        string
	Shortcode      string
	CallbackURL    string
	Env            string
}

type Client struct {
	httpClient *http.Client
}

func New() *Client {
	return &Client{
		httpClient: &http.Client{Timeout: 30 * time.Second},
	}
}

func (c *Client) GetOAuthToken(cfg Config) (string, error) {
	auth := base64.StdEncoding.EncodeToString([]byte(cfg.ConsumerKey + ":" + cfg.ConsumerSecret))
	url := sandboxOAuth
	if cfg.Env == "production" {
		url = productionOAuth
	}

	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return "", fmt.Errorf("create oauth request: %w", err)
	}
	req.Header.Set("Authorization", "Basic "+auth)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("oauth request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("read oauth response: %w", err)
	}

	var data map[string]interface{}
	if err := json.Unmarshal(body, &data); err != nil {
		return "", fmt.Errorf("parse oauth response (status %d): %s", resp.StatusCode, string(body))
	}

	token, ok := data["access_token"].(string)
	if !ok || token == "" {
		errDesc, _ := data["error_description"].(string)
		return "", fmt.Errorf("oauth failed: %s", errDesc)
	}

	return token, nil
}

func formatTimestamp() string {
	now := time.Now()
	return fmt.Sprintf("%04d%02d%02d%02d%02d%02d",
		now.Year(), now.Month(), now.Day(),
		now.Hour(), now.Minute(), now.Second())
}

func normalizePhone(phone string) string {
	p := strings.ReplaceAll(phone, " ", "")
	if strings.HasPrefix(p, "+254") {
		p = "254" + p[4:]
	} else if strings.HasPrefix(p, "0") {
		p = "254" + p[1:]
	} else if !strings.HasPrefix(p, "254") {
		p = "254" + p
	}
	return p
}

type STKPushResult struct {
	ResponseCode        string `json:"ResponseCode"`
	ResponseDescription string `json:"ResponseDescription"`
	CheckoutRequestID   string `json:"CheckoutRequestID"`
	MerchantRequestID   string `json:"MerchantRequestID"`
	ErrorMessage        string `json:"errorMessage,omitempty"`
}

func (c *Client) SendSTKPush(cfg Config, phone string, amount float64, reference string) (*STKPushResult, error) {
	token, err := c.GetOAuthToken(cfg)
	if err != nil {
		return nil, fmt.Errorf("get token: %w", err)
	}

	timestamp := formatTimestamp()
	password := base64.StdEncoding.EncodeToString([]byte(cfg.Shortcode + cfg.Passkey + timestamp))
	normalizedPhone := normalizePhone(phone)

	url := sandboxSTK
	if cfg.Env == "production" {
		url = productionSTK
	}

	payload := map[string]interface{}{
		"BusinessShortCode": cfg.Shortcode,
		"Password":          password,
		"Timestamp":         timestamp,
		"TransactionType":   "CustomerPayBillOnline",
		"Amount":            int(amount),
		"PartyA":            normalizedPhone,
		"PartyB":            cfg.Shortcode,
		"PhoneNumber":       normalizedPhone,
		"CallBackURL":       cfg.CallbackURL,
		"AccountReference":  reference,
		"TransactionDesc":   reference,
	}

	body, _ := json.Marshal(payload)
	req, err := http.NewRequest(http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("create stk request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("stk request: %w", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	var result STKPushResult
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("parse stk response (status %d): %s", resp.StatusCode, string(respBody))
	}

	return &result, nil
}

func GenerateToken() string {
	b := make([]byte, 24)
	rand.Read(b)
	return "mash_live_" + base64.RawURLEncoding.EncodeToString(b)
}

var safaricomIPs = map[string]bool{
	"196.201.214.200": true,
	"196.201.214.206": true,
	"196.201.213.200": true,
	"196.201.213.206": true,
	"196.201.214.208": true,
	"196.201.213.208": true,
}

func IsValidSafaricomIP(ip string) bool {
	return safaricomIPs[ip]
}
