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
	mux.HandleFunc("POST /api/projects", s.handleCreateProject)
	mux.HandleFunc("POST /api/projects/ensure", s.handleEnsureProject)
	mux.HandleFunc("GET /api/projects/{projectID}", s.handleGetProject)
	mux.HandleFunc("PUT /api/projects/{projectID}", s.handleUpdateProject)
	mux.HandleFunc("DELETE /api/projects/{projectID}", s.handleDeleteProject)
	mux.HandleFunc("GET /api/projects/{projectID}/members", s.handleProjectMembers)
	mux.HandleFunc("PUT /api/projects/{projectID}/members/{memberID}/role", s.handleUpdateMemberRole)
	mux.HandleFunc("DELETE /api/projects/{projectID}/members/{memberID}", s.handleRemoveMember)
	mux.HandleFunc("POST /api/projects/{projectID}/invitations", s.handleCreateInvitation)
	mux.HandleFunc("GET /api/projects/{projectID}/invitations", s.handleListInvitations)
	mux.HandleFunc("DELETE /api/projects/{projectID}/invitations/{invitationID}", s.handleRevokeInvitation)
	mux.HandleFunc("GET /api/invitations/{token}", s.handleInvitation)
	mux.HandleFunc("POST /api/invitations/{token}/accept", s.handleAcceptInvitation)
	mux.HandleFunc("GET /api/projects/{projectID}/tasks", s.handleListTasks)
	mux.HandleFunc("POST /api/projects/{projectID}/tasks", s.handleCreateTask)
	mux.HandleFunc("PUT /api/projects/{projectID}/tasks/{taskID}", s.handleUpdateTask)
	mux.HandleFunc("DELETE /api/projects/{projectID}/tasks/{taskID}", s.handleDeleteTask)
	mux.HandleFunc("GET /api/projects/{projectID}/meetings", s.handleListMeetings)
	mux.HandleFunc("POST /api/projects/{projectID}/meetings", s.handleCreateMeeting)
	mux.HandleFunc("PUT /api/projects/{projectID}/meetings/{meetingID}", s.handleUpdateMeeting)
	mux.HandleFunc("DELETE /api/projects/{projectID}/meetings/{meetingID}", s.handleDeleteMeeting)
	mux.HandleFunc("GET /api/projects/{projectID}/feedback", s.handleListFeedback)
	mux.HandleFunc("POST /api/projects/{projectID}/feedback", s.handleCreateFeedback)
	mux.HandleFunc("PUT /api/projects/{projectID}/feedback/{feedbackID}", s.handleUpdateFeedback)
	mux.HandleFunc("DELETE /api/projects/{projectID}/feedback/{feedbackID}", s.handleDeleteFeedback)
	mux.HandleFunc("GET /api/projects/{projectID}/events", s.handleListEvents)
	mux.HandleFunc("POST /api/projects/{projectID}/events", s.handleCreateEvent)
	mux.HandleFunc("PUT /api/projects/{projectID}/events/{eventID}", s.handleUpdateEvent)
	mux.HandleFunc("DELETE /api/projects/{projectID}/events/{eventID}", s.handleDeleteEvent)
	mux.HandleFunc("GET /api/projects/{projectID}/activity", s.handleActivity)
	return middleware.SecurityHeaders(mux)
}
