package controller

import (
	"net/http"

	"teamsync/backend/internal/middleware"
)

func (s *Server) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", s.handleHealth)
	mux.HandleFunc("POST /api/auth/login", s.handleLogin)
	mux.HandleFunc("POST /api/auth/register", s.handleRegister)
	mux.HandleFunc("POST /api/auth/logout", s.handleLogout)
	mux.HandleFunc("GET /api/auth/me", s.handleMe)
	mux.HandleFunc("GET /api/projects", s.handleListProjects)
	mux.HandleFunc("POST /api/projects/ensure", s.handleEnsureProject)
	mux.HandleFunc("GET /api/projects/{projectID}/members", s.handleProjectMembers)
	mux.HandleFunc("POST /api/projects/{projectID}/invitations", s.handleCreateInvitation)
	mux.HandleFunc("GET /api/invitations/{token}", s.handleInvitation)
	mux.HandleFunc("POST /api/invitations/{token}/accept", s.handleAcceptInvitation)
	return middleware.SecurityHeaders(mux)
}
