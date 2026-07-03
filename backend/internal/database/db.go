package database

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

type Client struct {
	baseURL    string
	serviceKey string
	httpClient *http.Client
}

func New(baseURL, serviceKey string) *Client {
	return &Client{
		baseURL:    baseURL,
		serviceKey: serviceKey,
		httpClient: &http.Client{Timeout: 30 * time.Second},
	}
}

func (c *Client) request(ctx context.Context, method, path string, body, result interface{}) error {
	url := c.baseURL + "/rest/v1" + path

	var bodyReader io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			return fmt.Errorf("marshal body: %w", err)
		}
		bodyReader = bytes.NewReader(b)
	}

	req, err := http.NewRequestWithContext(ctx, method, url, bodyReader)
	if err != nil {
		return fmt.Errorf("create request: %w", err)
	}

	req.Header.Set("apikey", c.serviceKey)
	req.Header.Set("Authorization", "Bearer "+c.serviceKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Prefer", "return=representation")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("do request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("supabase api error (status %d): %s", resp.StatusCode, string(respBody))
	}

	if result != nil {
		if err := json.NewDecoder(resp.Body).Decode(result); err != nil {
			return fmt.Errorf("decode response: %w", err)
		}
	}

	return nil
}

func (c *Client) Get(ctx context.Context, path string, result interface{}) error {
	return c.request(ctx, http.MethodGet, path, nil, result)
}

func (c *Client) Post(ctx context.Context, path string, body, result interface{}) error {
	return c.request(ctx, http.MethodPost, path, body, result)
}

func (c *Client) Patch(ctx context.Context, path string, body, result interface{}) error {
	return c.request(ctx, http.MethodPatch, path, body, result)
}

type AuthClient struct {
	baseURL    string
	serviceKey string
	httpClient *http.Client
}

func NewAuth(baseURL, serviceKey string) *AuthClient {
	return &AuthClient{
		baseURL:    baseURL,
		serviceKey: serviceKey,
		httpClient: &http.Client{Timeout: 30 * time.Second},
	}
}

type CreateUserRequest struct {
	Email        string `json:"email"`
	Password     string `json:"password"`
	EmailConfirm bool   `json:"email_confirm"`
}

type CreateUserResponse struct {
	ID    string `json:"id"`
	Email string `json:"email"`
}

type ListUsersResponse struct {
	Users []struct {
		ID    string `json:"id"`
		Email string `json:"email"`
	} `json:"users"`
}

func (a *AuthClient) AdminCreateUser(ctx context.Context, req CreateUserRequest) (*CreateUserResponse, error) {
	url := a.baseURL + "/auth/v1/admin/users"
	body, _ := json.Marshal(req)
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	httpReq.Header.Set("apikey", a.serviceKey)
	httpReq.Header.Set("Authorization", "Bearer "+a.serviceKey)
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := a.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("do request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		respBody, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("auth api error (status %d): %s", resp.StatusCode, string(respBody))
	}

	var result CreateUserResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("decode response: %w", err)
	}
	return &result, nil
}

func (a *AuthClient) AdminListUsers(ctx context.Context) (*ListUsersResponse, error) {
	url := a.baseURL + "/auth/v1/admin/users"
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	httpReq.Header.Set("apikey", a.serviceKey)
	httpReq.Header.Set("Authorization", "Bearer "+a.serviceKey)

	resp, err := a.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("do request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		respBody, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("auth api error (status %d): %s", resp.StatusCode, string(respBody))
	}

	var result ListUsersResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("decode response: %w", err)
	}
	return &result, nil
}
