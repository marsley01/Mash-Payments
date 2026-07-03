package auth

import (
	"fmt"

	"github.com/golang-jwt/jwt/v5"
)

type UserClaims struct {
	Sub       string `json:"sub"`
	Email     string `json:"email"`
	Aud       string `json:"aud"`
	Role      string `json:"role"`
	ExpiresAt int64  `json:"exp"`
}

func VerifyToken(tokenString, jwtSecret string) (*UserClaims, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(jwtSecret), nil
	})
	if err != nil {
		return nil, fmt.Errorf("parse token: %w", err)
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok || !token.Valid {
		return nil, fmt.Errorf("invalid token claims")
	}

	sub, _ := claims.GetSubject()
	email, _ := claims["email"].(string)
	aud, _ := claims["aud"].(string)
	role, _ := claims["role"].(string)
	exp := int64(0)
	if expFloat, ok := claims["exp"].(float64); ok {
		exp = int64(expFloat)
	}

	return &UserClaims{
		Sub:       sub,
		Email:     email,
		Aud:       aud,
		Role:      role,
		ExpiresAt: exp,
	}, nil
}
