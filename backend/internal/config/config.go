package config

import (
	"fmt"
	"os"
	"strconv"
	"time"
)

type Config struct {
	Address        string
	DatabaseURL    string
	FrontendOrigin string
	CookieSecure   bool
	SessionTTL     time.Duration
	RememberTTL    time.Duration
}

func Load() (Config, error) {
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		return Config{}, fmt.Errorf("DATABASE_URL is required")
	}

	cookieSecure, err := strconv.ParseBool(envOrDefault("COOKIE_SECURE", "false"))
	if err != nil {
		return Config{}, fmt.Errorf("parse COOKIE_SECURE: %w", err)
	}

	address := os.Getenv("HTTP_ADDRESS")
	if address == "" {
		if port := os.Getenv("PORT"); port != "" {
			address = ":" + port
		} else {
			address = ":8080"
		}
	}

	return Config{
		Address:        address,
		DatabaseURL:    databaseURL,
		FrontendOrigin: envOrDefault("FRONTEND_ORIGIN", "http://localhost:3001"),
		CookieSecure:   cookieSecure,
		SessionTTL:     24 * time.Hour,
		RememberTTL:    30 * 24 * time.Hour,
	}, nil
}

func (c Config) CookieName() string {
	if c.CookieSecure {
		return "__Host-teamsync_session"
	}
	return "teamsync_session"
}

func envOrDefault(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
