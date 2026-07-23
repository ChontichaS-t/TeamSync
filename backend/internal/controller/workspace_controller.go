package controller

import (
	"errors"
	"log/slog"
	"net/http"
	"strconv"

	"teamsync/backend/internal/pages"
	"teamsync/backend/internal/service"
)

type taskRequest struct {
	Title          string `json:"title"`
	AssigneeID     string `json:"assigneeId"`
	DueDate        string `json:"dueDate"`
	Status         string `json:"status"`
	Priority       string `json:"priority"`
	Source         string `json:"source"`
	Provider       string `json:"provider"`
	ExpectedResult string `json:"expectedResult"`
	MeetingID      string `json:"meetingId"`
}
type meetingRequest struct {
	Title   string   `json:"title"`
	Date    string   `json:"date"`
	Summary []string `json:"summary"`
	Agreed  []string `json:"agreed"`
}
type feedbackRequest struct {
	Topic      string `json:"topic"`
	Provider   string `json:"provider"`
	AssigneeID string `json:"assigneeId"`
	Status     string `json:"status"`
	Result     string `json:"result"`
	MeetingID  string `json:"meetingId"`
	DueDate    string `json:"dueDate"`
	Priority   string `json:"priority"`
}
type eventRequest struct {
	Title    string `json:"title"`
	DateKey  string `json:"dateKey"`
	Time     string `json:"time"`
	Location string `json:"location"`
	Tone     string `json:"tone"`
}
type tasksResponse struct {
	Tasks []pages.Task `json:"tasks"`
}
type meetingsResponse struct {
	Meetings []pages.Meeting `json:"meetings"`
}
type feedbackResponse struct {
	Feedback []pages.Feedback `json:"feedback"`
}
type eventsResponse struct {
	Events []pages.CalendarEvent `json:"events"`
}
type activityResponse struct {
	Activity []pages.ActivityLog `json:"activity"`
}

func (s *Server) workspaceUser(w http.ResponseWriter, r *http.Request) (string, bool) {
	user, ok := s.authenticatedUser(w, r)
	if !ok {
		return "", false
	}
	return user.ID, true
}
func (s *Server) requireMutation(w http.ResponseWriter, r *http.Request) (string, bool) {
	if !s.requireTrustedOrigin(w, r) {
		return "", false
	}
	return s.workspaceUser(w, r)
}

func writeWorkspaceError(w http.ResponseWriter, operation string, err error) {
	switch {
	case errors.Is(err, service.ErrWorkspaceInput):
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "ข้อมูลไม่ถูกต้อง"})
	case errors.Is(err, service.ErrProjectForbidden):
		writeJSON(w, http.StatusForbidden, errorResponse{Error: "คุณไม่มีสิทธิ์เข้าถึงโปรเจกต์นี้"})
	case errors.Is(err, service.ErrWorkspaceNotFound):
		writeJSON(w, http.StatusNotFound, errorResponse{Error: "ไม่พบข้อมูลที่ต้องการ"})
	default:
		slog.Error(operation+" failed", "error", err)
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "ไม่สามารถดำเนินการได้"})
	}
}

func taskInput(value taskRequest) service.TaskInput {
	return service.TaskInput{Title: value.Title, AssigneeID: value.AssigneeID, DueDate: value.DueDate, Status: value.Status, Priority: value.Priority, Source: value.Source, Provider: value.Provider, ExpectedResult: value.ExpectedResult, MeetingID: value.MeetingID}
}
func meetingInput(value meetingRequest) service.MeetingInput {
	return service.MeetingInput{Title: value.Title, Date: value.Date, Summary: value.Summary, Agreed: value.Agreed}
}
func feedbackInput(value feedbackRequest) service.FeedbackInput {
	return service.FeedbackInput{Topic: value.Topic, Provider: value.Provider, AssigneeID: value.AssigneeID, Status: value.Status, Result: value.Result, MeetingID: value.MeetingID, DueDate: value.DueDate, Priority: value.Priority}
}
func eventInput(value eventRequest) service.EventInput {
	return service.EventInput{Title: value.Title, DateKey: value.DateKey, Time: value.Time, Location: value.Location, Tone: value.Tone}
}

func (s *Server) handleListTasks(w http.ResponseWriter, r *http.Request) {
	userID, ok := s.workspaceUser(w, r)
	if !ok {
		return
	}
	items, err := s.workspaces.ListTasks(r.Context(), userID, r.PathValue("projectID"))
	if err != nil {
		writeWorkspaceError(w, "list tasks", err)
		return
	}
	writeJSON(w, http.StatusOK, tasksResponse{Tasks: items})
}
func (s *Server) handleCreateTask(w http.ResponseWriter, r *http.Request) {
	userID, ok := s.requireMutation(w, r)
	if !ok {
		return
	}
	var value taskRequest
	if !decodeJSON(w, r, &value) {
		return
	}
	item, err := s.workspaces.CreateTask(r.Context(), userID, r.PathValue("projectID"), taskInput(value))
	if err != nil {
		writeWorkspaceError(w, "create task", err)
		return
	}
	writeJSON(w, http.StatusCreated, item)
}
func (s *Server) handleUpdateTask(w http.ResponseWriter, r *http.Request) {
	userID, ok := s.requireMutation(w, r)
	if !ok {
		return
	}
	var value taskRequest
	if !decodeJSON(w, r, &value) {
		return
	}
	item, err := s.workspaces.UpdateTask(r.Context(), userID, r.PathValue("projectID"), r.PathValue("taskID"), taskInput(value))
	if err != nil {
		writeWorkspaceError(w, "update task", err)
		return
	}
	writeJSON(w, http.StatusOK, item)
}
func (s *Server) handleDeleteTask(w http.ResponseWriter, r *http.Request) {
	userID, ok := s.requireMutation(w, r)
	if !ok {
		return
	}
	err := s.workspaces.DeleteTask(r.Context(), userID, r.PathValue("projectID"), r.PathValue("taskID"))
	if err != nil {
		writeWorkspaceError(w, "delete task", err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) handleListMeetings(w http.ResponseWriter, r *http.Request) {
	userID, ok := s.workspaceUser(w, r)
	if !ok {
		return
	}
	items, err := s.workspaces.ListMeetings(r.Context(), userID, r.PathValue("projectID"))
	if err != nil {
		writeWorkspaceError(w, "list meetings", err)
		return
	}
	writeJSON(w, http.StatusOK, meetingsResponse{Meetings: items})
}
func (s *Server) handleCreateMeeting(w http.ResponseWriter, r *http.Request) {
	userID, ok := s.requireMutation(w, r)
	if !ok {
		return
	}
	var value meetingRequest
	if !decodeJSON(w, r, &value) {
		return
	}
	item, err := s.workspaces.CreateMeeting(r.Context(), userID, r.PathValue("projectID"), meetingInput(value))
	if err != nil {
		writeWorkspaceError(w, "create meeting", err)
		return
	}
	writeJSON(w, http.StatusCreated, item)
}
func (s *Server) handleUpdateMeeting(w http.ResponseWriter, r *http.Request) {
	userID, ok := s.requireMutation(w, r)
	if !ok {
		return
	}
	var value meetingRequest
	if !decodeJSON(w, r, &value) {
		return
	}
	item, err := s.workspaces.UpdateMeeting(r.Context(), userID, r.PathValue("projectID"), r.PathValue("meetingID"), meetingInput(value))
	if err != nil {
		writeWorkspaceError(w, "update meeting", err)
		return
	}
	writeJSON(w, http.StatusOK, item)
}
func (s *Server) handleDeleteMeeting(w http.ResponseWriter, r *http.Request) {
	userID, ok := s.requireMutation(w, r)
	if !ok {
		return
	}
	err := s.workspaces.DeleteMeeting(r.Context(), userID, r.PathValue("projectID"), r.PathValue("meetingID"))
	if err != nil {
		writeWorkspaceError(w, "delete meeting", err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) handleListFeedback(w http.ResponseWriter, r *http.Request) {
	userID, ok := s.workspaceUser(w, r)
	if !ok {
		return
	}
	items, err := s.workspaces.ListFeedback(r.Context(), userID, r.PathValue("projectID"))
	if err != nil {
		writeWorkspaceError(w, "list feedback", err)
		return
	}
	writeJSON(w, http.StatusOK, feedbackResponse{Feedback: items})
}
func (s *Server) handleCreateFeedback(w http.ResponseWriter, r *http.Request) {
	userID, ok := s.requireMutation(w, r)
	if !ok {
		return
	}
	var value feedbackRequest
	if !decodeJSON(w, r, &value) {
		return
	}
	item, err := s.workspaces.CreateFeedback(r.Context(), userID, r.PathValue("projectID"), feedbackInput(value))
	if err != nil {
		writeWorkspaceError(w, "create feedback", err)
		return
	}
	writeJSON(w, http.StatusCreated, item)
}
func (s *Server) handleUpdateFeedback(w http.ResponseWriter, r *http.Request) {
	userID, ok := s.requireMutation(w, r)
	if !ok {
		return
	}
	var value feedbackRequest
	if !decodeJSON(w, r, &value) {
		return
	}
	item, err := s.workspaces.UpdateFeedback(r.Context(), userID, r.PathValue("projectID"), r.PathValue("feedbackID"), feedbackInput(value))
	if err != nil {
		writeWorkspaceError(w, "update feedback", err)
		return
	}
	writeJSON(w, http.StatusOK, item)
}
func (s *Server) handleDeleteFeedback(w http.ResponseWriter, r *http.Request) {
	userID, ok := s.requireMutation(w, r)
	if !ok {
		return
	}
	err := s.workspaces.DeleteFeedback(r.Context(), userID, r.PathValue("projectID"), r.PathValue("feedbackID"))
	if err != nil {
		writeWorkspaceError(w, "delete feedback", err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) handleListEvents(w http.ResponseWriter, r *http.Request) {
	userID, ok := s.workspaceUser(w, r)
	if !ok {
		return
	}
	items, err := s.workspaces.ListEvents(r.Context(), userID, r.PathValue("projectID"))
	if err != nil {
		writeWorkspaceError(w, "list events", err)
		return
	}
	writeJSON(w, http.StatusOK, eventsResponse{Events: items})
}
func (s *Server) handleCreateEvent(w http.ResponseWriter, r *http.Request) {
	userID, ok := s.requireMutation(w, r)
	if !ok {
		return
	}
	var value eventRequest
	if !decodeJSON(w, r, &value) {
		return
	}
	item, err := s.workspaces.CreateEvent(r.Context(), userID, r.PathValue("projectID"), eventInput(value))
	if err != nil {
		writeWorkspaceError(w, "create event", err)
		return
	}
	writeJSON(w, http.StatusCreated, item)
}
func (s *Server) handleUpdateEvent(w http.ResponseWriter, r *http.Request) {
	userID, ok := s.requireMutation(w, r)
	if !ok {
		return
	}
	var value eventRequest
	if !decodeJSON(w, r, &value) {
		return
	}
	item, err := s.workspaces.UpdateEvent(r.Context(), userID, r.PathValue("projectID"), r.PathValue("eventID"), eventInput(value))
	if err != nil {
		writeWorkspaceError(w, "update event", err)
		return
	}
	writeJSON(w, http.StatusOK, item)
}
func (s *Server) handleDeleteEvent(w http.ResponseWriter, r *http.Request) {
	userID, ok := s.requireMutation(w, r)
	if !ok {
		return
	}
	err := s.workspaces.DeleteEvent(r.Context(), userID, r.PathValue("projectID"), r.PathValue("eventID"))
	if err != nil {
		writeWorkspaceError(w, "delete event", err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) handleActivity(w http.ResponseWriter, r *http.Request) {
	userID, ok := s.workspaceUser(w, r)
	if !ok {
		return
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	items, err := s.workspaces.ListActivity(r.Context(), userID, r.PathValue("projectID"), limit)
	if err != nil {
		writeWorkspaceError(w, "list activity", err)
		return
	}
	writeJSON(w, http.StatusOK, activityResponse{Activity: items})
}
