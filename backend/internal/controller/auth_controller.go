package controller

import (
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net"
	"net/http"
	"strings"
	"time"

	"teamsync/backend/internal/pages"
	"teamsync/backend/internal/service"
)

type loginRequest struct {
	Email      string `json:"email"`
	Password   string `json:"password"`
	RememberMe bool   `json:"rememberMe"`
}

type registerRequest struct {
	Email       string `json:"email"`
	DisplayName string `json:"displayName"`
	Password    string `json:"password"`
}

type userResponse struct {
	User pages.User `json:"user"`
}

func (s *Server) handleRegister(w http.ResponseWriter, r *http.Request) {
	if !s.requireTrustedOrigin(w, r) {
		return
	}

	var input registerRequest
	if !decodeJSON(w, r, &input) {
		return
	}
	ip := remoteIP(r.RemoteAddr)
	if !s.limiter.Allow("register:"+ip, 5, time.Minute, time.Now()) {
		w.Header().Set("Retry-After", "60")
		writeJSON(w, http.StatusTooManyRequests, errorResponse{Error: "too many registration attempts; try again shortly"})
		return
	}

	user, err := s.auth.Register(r.Context(), input.Email, input.DisplayName, input.Password)
	switch {
	case errors.Is(err, service.ErrEmailInUse):
		writeJSON(w, http.StatusConflict, errorResponse{Error: "an account with this email already exists"})
		return
	case errors.Is(err, service.ErrPasswordPolicy), errors.Is(err, service.ErrDisplayName), errors.Is(err, service.ErrInvalidEmail):
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: err.Error()})
		return
	case err != nil:
		slog.Error("registration failed", "error", err)
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "unable to create account"})
		return
	}

	writeJSON(w, http.StatusCreated, userResponse{User: user})
}

func (s *Server) handleLogin(w http.ResponseWriter, r *http.Request) {
	if !s.requireTrustedOrigin(w, r) {
		return
	}

	var input loginRequest
	if !decodeJSON(w, r, &input) {
		return
	}
	ip := remoteIP(r.RemoteAddr)
	if !s.limiter.AllowIPAndEmail(ip, strings.ToLower(strings.TrimSpace(input.Email)), time.Now()) {
		w.Header().Set("Retry-After", "60")
		writeJSON(w, http.StatusTooManyRequests, errorResponse{Error: "too many login attempts; try again shortly"})
		return
	}

	ttl := s.config.SessionTTL
	if input.RememberMe {
		ttl = s.config.RememberTTL
	}
	user, token, expiresAt, err := s.auth.Login(r.Context(), input.Email, input.Password, ttl)
	if errors.Is(err, service.ErrInvalidCredentials) {
		writeJSON(w, http.StatusUnauthorized, errorResponse{Error: "invalid email or password"})
		return
	}
	if err != nil {
		slog.Error("login failed", "error", err)
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "unable to sign in"})
		return
	}

	maxAge := 0
	if input.RememberMe {
		maxAge = int(time.Until(expiresAt).Seconds())
	}
	s.setSessionCookie(w, token, expiresAt, maxAge)
	writeJSON(w, http.StatusOK, userResponse{User: user})
}

func (s *Server) handleLogout(w http.ResponseWriter, r *http.Request) {
	if !s.requireTrustedOrigin(w, r) {
		return
	}
	if cookie, err := r.Cookie(s.config.CookieName()); err == nil {
		if err := s.auth.Logout(r.Context(), cookie.Value); err != nil {
			slog.Error("logout failed", "error", err)
		}
	}
	s.clearSessionCookie(w)
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) handleMe(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie(s.config.CookieName())
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, errorResponse{Error: "authentication required"})
		return
	}
	user, err := s.auth.Authenticate(r.Context(), cookie.Value)
	if errors.Is(err, service.ErrInvalidSession) {
		s.clearSessionCookie(w)
		writeJSON(w, http.StatusUnauthorized, errorResponse{Error: "authentication required"})
		return
	}
	if err != nil {
		slog.Error("session lookup failed", "error", err)
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "unable to load session"})
		return
	}
	writeJSON(w, http.StatusOK, userResponse{User: user})
}

func decodeJSON(w http.ResponseWriter, r *http.Request, destination any) bool {
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(destination); err != nil {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "invalid request"})
		return false
	}
	if err := decoder.Decode(&struct{}{}); !errors.Is(err, io.EOF) {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "invalid request"})
		return false
	}
	return true
}

func (s *Server) requireTrustedOrigin(w http.ResponseWriter, r *http.Request) bool {
	origin := r.Header.Get("Origin")
	if origin == "" || origin != s.config.FrontendOrigin {
		writeJSON(w, http.StatusForbidden, errorResponse{Error: "untrusted request origin"})
		return false
	}
	return true
}

func (s *Server) setSessionCookie(w http.ResponseWriter, token string, expiresAt time.Time, maxAge int) {
	cookieExpires := time.Time{}
	if maxAge > 0 {
		cookieExpires = expiresAt
	}
	http.SetCookie(w, &http.Cookie{
		Name: s.config.CookieName(), Value: token, Path: "/", Expires: cookieExpires, MaxAge: maxAge,
		HttpOnly: true, Secure: s.config.CookieSecure, SameSite: http.SameSiteStrictMode,
	})
}

func (s *Server) clearSessionCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name: s.config.CookieName(), Value: "", Path: "/", Expires: time.Unix(1, 0), MaxAge: -1,
		HttpOnly: true, Secure: s.config.CookieSecure, SameSite: http.SameSiteStrictMode,
	})
}

func remoteIP(remoteAddr string) string {
	host, _, err := net.SplitHostPort(remoteAddr)
	if err == nil {
		return host
	}
	return remoteAddr
}
