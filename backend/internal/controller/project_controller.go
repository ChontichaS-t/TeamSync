package controller

import (
	"errors"
	"log/slog"
	"net/http"

	"teamsync/backend/internal/pages"
	"teamsync/backend/internal/service"
)

type ensureProjectRequest struct {
	ExternalKey string `json:"externalKey"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Cover       string `json:"cover"`
	Tags        string `json:"tags"`
	Deadline    string `json:"deadline"`
	Progress    int    `json:"progress"`
}

type projectsResponse struct {
	Projects []pages.Project `json:"projects"`
}

type membersResponse struct {
	Members []pages.ProjectMember `json:"members"`
}

func (s *Server) handleEnsureProject(w http.ResponseWriter, r *http.Request) {
	if !s.requireTrustedOrigin(w, r) {
		return
	}
	user, ok := s.authenticatedUser(w, r)
	if !ok {
		return
	}
	var input ensureProjectRequest
	if !decodeJSON(w, r, &input) {
		return
	}
	project, err := s.projects.EnsureProject(r.Context(), user.ID, service.EnsureProjectInput{
		ExternalKey: input.ExternalKey,
		Title:       input.Title,
		Description: input.Description,
		Cover:       input.Cover,
		Tag:         input.Tags,
		Deadline:    input.Deadline,
		Progress:    input.Progress,
	})
	if errors.Is(err, service.ErrProjectInput) {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "ข้อมูลโปรเจกต์ไม่ถูกต้อง"})
		return
	}
	if err != nil {
		slog.Error("ensure project failed", "error", err)
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "ไม่สามารถเตรียมโปรเจกต์ได้"})
		return
	}
	writeJSON(w, http.StatusOK, project)
}

func (s *Server) handleListProjects(w http.ResponseWriter, r *http.Request) {
	user, ok := s.authenticatedUser(w, r)
	if !ok {
		return
	}
	projects, err := s.projects.ListProjects(r.Context(), user.ID)
	if err != nil {
		slog.Error("list projects failed", "error", err)
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "ไม่สามารถโหลดโปรเจกต์ได้"})
		return
	}
	writeJSON(w, http.StatusOK, projectsResponse{Projects: projects})
}

func (s *Server) handleProjectMembers(w http.ResponseWriter, r *http.Request) {
	user, ok := s.authenticatedUser(w, r)
	if !ok {
		return
	}
	members, err := s.projects.ListMembers(r.Context(), user.ID, r.PathValue("projectID"))
	if errors.Is(err, service.ErrProjectForbidden) {
		writeJSON(w, http.StatusForbidden, errorResponse{Error: "คุณไม่มีสิทธิ์เข้าถึงโปรเจกต์นี้"})
		return
	}
	if err != nil {
		slog.Error("list project members failed", "error", err)
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "ไม่สามารถโหลดสมาชิกได้"})
		return
	}
	writeJSON(w, http.StatusOK, membersResponse{Members: members})
}

func (s *Server) handleCreateInvitation(w http.ResponseWriter, r *http.Request) {
	if !s.requireTrustedOrigin(w, r) {
		return
	}
	user, ok := s.authenticatedUser(w, r)
	if !ok {
		return
	}
	invitation, err := s.projects.CreateInvitation(r.Context(), user.ID, r.PathValue("projectID"))
	if errors.Is(err, service.ErrProjectForbidden) {
		writeJSON(w, http.StatusForbidden, errorResponse{Error: "เฉพาะเจ้าของหรือผู้ดูแลโปรเจกต์เท่านั้นที่สร้างลิงก์เชิญได้"})
		return
	}
	if err != nil {
		slog.Error("create invitation failed", "error", err)
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "ไม่สามารถสร้างลิงก์เชิญได้"})
		return
	}
	writeJSON(w, http.StatusCreated, invitation)
}

func (s *Server) handleInvitation(w http.ResponseWriter, r *http.Request) {
	preview, err := s.projects.Invitation(r.Context(), r.PathValue("token"))
	if errors.Is(err, service.ErrInvitationInvalid) {
		writeJSON(w, http.StatusNotFound, errorResponse{Error: "ลิงก์เชิญไม่ถูกต้องหรือหมดอายุแล้ว"})
		return
	}
	if err != nil {
		slog.Error("load invitation failed", "error", err)
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "ไม่สามารถโหลดคำเชิญได้"})
		return
	}
	writeJSON(w, http.StatusOK, preview)
}

func (s *Server) handleAcceptInvitation(w http.ResponseWriter, r *http.Request) {
	if !s.requireTrustedOrigin(w, r) {
		return
	}
	user, ok := s.authenticatedUser(w, r)
	if !ok {
		return
	}
	project, err := s.projects.AcceptInvitation(r.Context(), user.ID, r.PathValue("token"))
	if errors.Is(err, service.ErrInvitationInvalid) {
		writeJSON(w, http.StatusNotFound, errorResponse{Error: "ลิงก์เชิญไม่ถูกต้องหรือหมดอายุแล้ว"})
		return
	}
	if err != nil {
		slog.Error("accept invitation failed", "error", err)
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "ไม่สามารถเข้าร่วมโปรเจกต์ได้"})
		return
	}
	writeJSON(w, http.StatusOK, project)
}

func (s *Server) authenticatedUser(w http.ResponseWriter, r *http.Request) (pages.User, bool) {
	cookie, err := r.Cookie(s.config.CookieName())
	if err != nil {
		writeJSON(w, http.StatusUnauthorized, errorResponse{Error: "authentication required"})
		return pages.User{}, false
	}
	user, err := s.auth.Authenticate(r.Context(), cookie.Value)
	if errors.Is(err, service.ErrInvalidSession) {
		s.clearSessionCookie(w)
		writeJSON(w, http.StatusUnauthorized, errorResponse{Error: "authentication required"})
		return pages.User{}, false
	}
	if err != nil {
		slog.Error("session lookup failed", "error", err)
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "unable to load session"})
		return pages.User{}, false
	}
	return user, true
}
