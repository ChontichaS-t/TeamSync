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
type invitationsResponse struct {
	Invitations []pages.InvitationListItem `json:"invitations"`
}
type memberRoleRequest struct {
	Role string `json:"role"`
}

func writeProjectError(w http.ResponseWriter, operation string, err error) {
	switch {
	case errors.Is(err, service.ErrProjectInput):
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "ข้อมูลโปรเจกต์ไม่ถูกต้อง"})
	case errors.Is(err, service.ErrProjectForbidden):
		writeJSON(w, http.StatusForbidden, errorResponse{Error: "คุณไม่มีสิทธิ์ดำเนินการในโปรเจกต์นี้"})
	case errors.Is(err, service.ErrProjectNotFound):
		writeJSON(w, http.StatusNotFound, errorResponse{Error: "ไม่พบโปรเจกต์"})
	default:
		slog.Error(operation+" failed", "error", err)
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "ไม่สามารถดำเนินการได้"})
	}
}

func projectInput(input ensureProjectRequest) service.EnsureProjectInput {
	return service.EnsureProjectInput{ExternalKey: input.ExternalKey, Title: input.Title, Description: input.Description, Cover: input.Cover, Tag: input.Tags, Deadline: input.Deadline, Progress: input.Progress}
}

func (s *Server) handleCreateProject(w http.ResponseWriter, r *http.Request) {
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
	project, err := s.projects.CreateProject(r.Context(), user.ID, projectInput(input))
	if err != nil {
		writeProjectError(w, "create project", err)
		return
	}
	writeJSON(w, http.StatusCreated, project)
}
func (s *Server) handleGetProject(w http.ResponseWriter, r *http.Request) {
	user, ok := s.authenticatedUser(w, r)
	if !ok {
		return
	}
	project, err := s.projects.GetProject(r.Context(), user.ID, r.PathValue("projectID"))
	if err != nil {
		writeProjectError(w, "get project", err)
		return
	}
	writeJSON(w, http.StatusOK, project)
}
func (s *Server) handleUpdateProject(w http.ResponseWriter, r *http.Request) {
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
	project, err := s.projects.UpdateProject(r.Context(), user.ID, r.PathValue("projectID"), projectInput(input))
	if err != nil {
		writeProjectError(w, "update project", err)
		return
	}
	writeJSON(w, http.StatusOK, project)
}
func (s *Server) handleDeleteProject(w http.ResponseWriter, r *http.Request) {
	if !s.requireTrustedOrigin(w, r) {
		return
	}
	user, ok := s.authenticatedUser(w, r)
	if !ok {
		return
	}
	if err := s.projects.DeleteProject(r.Context(), user.ID, r.PathValue("projectID")); err != nil {
		writeProjectError(w, "delete project", err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
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
	if err != nil {
		writeProjectError(w, "list project members", err)
		return
	}
	writeJSON(w, http.StatusOK, membersResponse{Members: members})
}

func (s *Server) handleUpdateMemberRole(w http.ResponseWriter, r *http.Request) {
	if !s.requireTrustedOrigin(w, r) {
		return
	}
	user, ok := s.authenticatedUser(w, r)
	if !ok {
		return
	}
	var input memberRoleRequest
	if !decodeJSON(w, r, &input) {
		return
	}
	member, err := s.projects.UpdateMemberRole(r.Context(), user.ID, r.PathValue("projectID"), r.PathValue("memberID"), input.Role)
	if err != nil {
		writeProjectError(w, "update member role", err)
		return
	}
	writeJSON(w, http.StatusOK, member)
}
func (s *Server) handleRemoveMember(w http.ResponseWriter, r *http.Request) {
	if !s.requireTrustedOrigin(w, r) {
		return
	}
	user, ok := s.authenticatedUser(w, r)
	if !ok {
		return
	}
	if err := s.projects.RemoveMember(r.Context(), user.ID, r.PathValue("projectID"), r.PathValue("memberID")); err != nil {
		writeProjectError(w, "remove member", err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
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
	if err != nil {
		writeProjectError(w, "create invitation", err)
		return
	}
	writeJSON(w, http.StatusCreated, invitation)
}

func (s *Server) handleListInvitations(w http.ResponseWriter, r *http.Request) {
	user, ok := s.authenticatedUser(w, r)
	if !ok {
		return
	}
	items, err := s.projects.ListInvitations(r.Context(), user.ID, r.PathValue("projectID"))
	if err != nil {
		writeProjectError(w, "list invitations", err)
		return
	}
	writeJSON(w, http.StatusOK, invitationsResponse{Invitations: items})
}
func (s *Server) handleRevokeInvitation(w http.ResponseWriter, r *http.Request) {
	if !s.requireTrustedOrigin(w, r) {
		return
	}
	user, ok := s.authenticatedUser(w, r)
	if !ok {
		return
	}
	if err := s.projects.RevokeInvitation(r.Context(), user.ID, r.PathValue("projectID"), r.PathValue("invitationID")); err != nil {
		writeProjectError(w, "revoke invitation", err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
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
