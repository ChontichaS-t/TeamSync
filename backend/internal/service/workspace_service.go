package service

import (
	"context"
	"errors"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/jackc/pgx/v5/pgtype"

	"teamsync/backend/internal/pages"
)

var ErrWorkspaceInput = errors.New("invalid workspace data")
var ErrWorkspaceNotFound = errors.New("workspace resource not found")

type TaskInput struct {
	Title      string
	AssigneeID string
	DueDate    string
	Status     string
	Priority   string
	Source     string
	MeetingID  string
}

type MeetingInput struct {
	Title   string
	Date    string
	Summary []string
	Agreed  []string
}

type FeedbackInput struct {
	Topic      string
	Provider   string
	AssigneeID string
	Status     string
	Result     string
	MeetingID  string
	DueDate    string
	Priority   string
}

type EventInput struct {
	Title    string
	DateKey  string
	Time     string
	Location string
	Tone     string
}

type WorkspaceRepository interface {
	ListTasks(ctx context.Context, userID, projectID string) ([]pages.Task, error)
	CreateTask(ctx context.Context, userID, projectID string, input TaskInput) (pages.Task, error)
	UpdateTask(ctx context.Context, userID, projectID, taskID string, input TaskInput) (pages.Task, error)
	DeleteTask(ctx context.Context, userID, projectID, taskID string) error
	ListMeetings(ctx context.Context, userID, projectID string) ([]pages.Meeting, error)
	CreateMeeting(ctx context.Context, userID, projectID string, input MeetingInput) (pages.Meeting, error)
	UpdateMeeting(ctx context.Context, userID, projectID, meetingID string, input MeetingInput) (pages.Meeting, error)
	DeleteMeeting(ctx context.Context, userID, projectID, meetingID string) error
	ListFeedback(ctx context.Context, userID, projectID string) ([]pages.Feedback, error)
	CreateFeedback(ctx context.Context, userID, projectID string, input FeedbackInput) (pages.Feedback, error)
	UpdateFeedback(ctx context.Context, userID, projectID, feedbackID string, input FeedbackInput) (pages.Feedback, error)
	DeleteFeedback(ctx context.Context, userID, projectID, feedbackID string) error
	ListEvents(ctx context.Context, userID, projectID string) ([]pages.CalendarEvent, error)
	CreateEvent(ctx context.Context, userID, projectID string, input EventInput) (pages.CalendarEvent, error)
	UpdateEvent(ctx context.Context, userID, projectID, eventID string, input EventInput) (pages.CalendarEvent, error)
	DeleteEvent(ctx context.Context, userID, projectID, eventID string) error
	ListActivity(ctx context.Context, userID, projectID string, limit int) ([]pages.ActivityLog, error)
}

type WorkspaceService struct {
	repository WorkspaceRepository
}

func NewWorkspaceService(repository WorkspaceRepository) *WorkspaceService {
	return &WorkspaceService{repository: repository}
}

func (s *WorkspaceService) ListTasks(ctx context.Context, userID, projectID string) ([]pages.Task, error) {
	if !validID(projectID) {
		return nil, ErrWorkspaceInput
	}
	return s.repository.ListTasks(ctx, userID, projectID)
}
func (s *WorkspaceService) CreateTask(ctx context.Context, userID, projectID string, input TaskInput) (pages.Task, error) {
	if !validID(projectID) || !normalizeTaskInput(&input) {
		return pages.Task{}, ErrWorkspaceInput
	}
	return s.repository.CreateTask(ctx, userID, projectID, input)
}
func (s *WorkspaceService) UpdateTask(ctx context.Context, userID, projectID, taskID string, input TaskInput) (pages.Task, error) {
	if !validID(projectID) || !validID(taskID) || !normalizeTaskInput(&input) {
		return pages.Task{}, ErrWorkspaceInput
	}
	return s.repository.UpdateTask(ctx, userID, projectID, taskID, input)
}
func (s *WorkspaceService) DeleteTask(ctx context.Context, userID, projectID, taskID string) error {
	if !validID(projectID) || !validID(taskID) {
		return ErrWorkspaceInput
	}
	return s.repository.DeleteTask(ctx, userID, projectID, taskID)
}

func (s *WorkspaceService) ListMeetings(ctx context.Context, userID, projectID string) ([]pages.Meeting, error) {
	if !validID(projectID) {
		return nil, ErrWorkspaceInput
	}
	return s.repository.ListMeetings(ctx, userID, projectID)
}
func (s *WorkspaceService) CreateMeeting(ctx context.Context, userID, projectID string, input MeetingInput) (pages.Meeting, error) {
	if !validID(projectID) || !normalizeMeetingInput(&input) {
		return pages.Meeting{}, ErrWorkspaceInput
	}
	return s.repository.CreateMeeting(ctx, userID, projectID, input)
}
func (s *WorkspaceService) UpdateMeeting(ctx context.Context, userID, projectID, meetingID string, input MeetingInput) (pages.Meeting, error) {
	if !validID(projectID) || !validID(meetingID) || !normalizeMeetingInput(&input) {
		return pages.Meeting{}, ErrWorkspaceInput
	}
	return s.repository.UpdateMeeting(ctx, userID, projectID, meetingID, input)
}
func (s *WorkspaceService) DeleteMeeting(ctx context.Context, userID, projectID, meetingID string) error {
	if !validID(projectID) || !validID(meetingID) {
		return ErrWorkspaceInput
	}
	return s.repository.DeleteMeeting(ctx, userID, projectID, meetingID)
}

func (s *WorkspaceService) ListFeedback(ctx context.Context, userID, projectID string) ([]pages.Feedback, error) {
	if !validID(projectID) {
		return nil, ErrWorkspaceInput
	}
	return s.repository.ListFeedback(ctx, userID, projectID)
}
func (s *WorkspaceService) CreateFeedback(ctx context.Context, userID, projectID string, input FeedbackInput) (pages.Feedback, error) {
	if !validID(projectID) || !normalizeFeedbackInput(&input) {
		return pages.Feedback{}, ErrWorkspaceInput
	}
	return s.repository.CreateFeedback(ctx, userID, projectID, input)
}
func (s *WorkspaceService) UpdateFeedback(ctx context.Context, userID, projectID, feedbackID string, input FeedbackInput) (pages.Feedback, error) {
	if !validID(projectID) || !validID(feedbackID) || !normalizeFeedbackInput(&input) {
		return pages.Feedback{}, ErrWorkspaceInput
	}
	return s.repository.UpdateFeedback(ctx, userID, projectID, feedbackID, input)
}
func (s *WorkspaceService) DeleteFeedback(ctx context.Context, userID, projectID, feedbackID string) error {
	if !validID(projectID) || !validID(feedbackID) {
		return ErrWorkspaceInput
	}
	return s.repository.DeleteFeedback(ctx, userID, projectID, feedbackID)
}

func (s *WorkspaceService) ListEvents(ctx context.Context, userID, projectID string) ([]pages.CalendarEvent, error) {
	if !validID(projectID) {
		return nil, ErrWorkspaceInput
	}
	return s.repository.ListEvents(ctx, userID, projectID)
}
func (s *WorkspaceService) CreateEvent(ctx context.Context, userID, projectID string, input EventInput) (pages.CalendarEvent, error) {
	if !validID(projectID) || !normalizeEventInput(&input) {
		return pages.CalendarEvent{}, ErrWorkspaceInput
	}
	return s.repository.CreateEvent(ctx, userID, projectID, input)
}
func (s *WorkspaceService) UpdateEvent(ctx context.Context, userID, projectID, eventID string, input EventInput) (pages.CalendarEvent, error) {
	if !validID(projectID) || !validID(eventID) || !normalizeEventInput(&input) {
		return pages.CalendarEvent{}, ErrWorkspaceInput
	}
	return s.repository.UpdateEvent(ctx, userID, projectID, eventID, input)
}
func (s *WorkspaceService) DeleteEvent(ctx context.Context, userID, projectID, eventID string) error {
	if !validID(projectID) || !validID(eventID) {
		return ErrWorkspaceInput
	}
	return s.repository.DeleteEvent(ctx, userID, projectID, eventID)
}

func (s *WorkspaceService) ListActivity(ctx context.Context, userID, projectID string, limit int) ([]pages.ActivityLog, error) {
	if !validID(projectID) {
		return nil, ErrWorkspaceInput
	}
	if limit <= 0 {
		limit = 50
	}
	if limit > 200 {
		limit = 200
	}
	return s.repository.ListActivity(ctx, userID, projectID, limit)
}

func normalizeTaskInput(input *TaskInput) bool {
	input.Title = strings.TrimSpace(input.Title)
	input.Source = strings.TrimSpace(input.Source)
	if input.Status == "" {
		input.Status = "ยังไม่เริ่ม"
	}
	if input.Priority == "" {
		input.Priority = "ปานกลาง"
	}
	if !validText(input.Title, 1, 200) || !validText(input.Source, 0, 500) || !oneOf(input.Status, "ยังไม่เริ่ม", "กำลังทำ", "รอตรวจ", "เสร็จแล้ว") || !oneOf(input.Priority, "ต่ำ", "ปานกลาง", "สูง") {
		return false
	}
	if _, err := time.Parse("2006-01-02", input.DueDate); err != nil {
		return false
	}
	return validOptionalID(input.AssigneeID) && validOptionalID(input.MeetingID)
}

func normalizeMeetingInput(input *MeetingInput) bool {
	input.Title = strings.TrimSpace(input.Title)
	input.Summary = cleanLines(input.Summary)
	input.Agreed = cleanLines(input.Agreed)
	if !validText(input.Title, 1, 200) || len(input.Summary) > 100 || len(input.Agreed) > 100 {
		return false
	}
	_, err := time.Parse("2006-01-02", input.Date)
	return err == nil
}

func normalizeFeedbackInput(input *FeedbackInput) bool {
	input.Topic = strings.TrimSpace(input.Topic)
	input.Provider = strings.TrimSpace(input.Provider)
	input.Result = strings.TrimSpace(input.Result)
	if input.Status == "" {
		input.Status = "กำลังแก้ไข"
	}
	if input.Priority == "" {
		input.Priority = "สูง"
	}
	if input.DueDate == "" {
		input.DueDate = time.Now().UTC().AddDate(0, 0, 7).Format("2006-01-02")
	}
	if !validText(input.Topic, 1, 200) || !validText(input.Provider, 1, 200) || !validText(input.Result, 0, 1000) || !oneOf(input.Status, "กำลังแก้ไข", "แก้ไขแล้ว") || !oneOf(input.Priority, "ต่ำ", "ปานกลาง", "สูง") {
		return false
	}
	if _, err := time.Parse("2006-01-02", input.DueDate); err != nil {
		return false
	}
	return validOptionalID(input.AssigneeID) && validOptionalID(input.MeetingID)
}

func normalizeEventInput(input *EventInput) bool {
	input.Title = strings.TrimSpace(input.Title)
	input.Location = strings.TrimSpace(input.Location)
	if input.Location == "" {
		input.Location = "ออนไลน์"
	}
	if !validText(input.Title, 1, 200) || !validText(input.Location, 0, 500) || !oneOf(input.Tone, "blue", "green", "orange", "purple") {
		return false
	}
	if _, err := time.Parse("2006-01-02", input.DateKey); err != nil {
		return false
	}
	_, err := time.Parse("15:04", input.Time)
	return err == nil
}

func cleanLines(values []string) []string {
	result := make([]string, 0, len(values))
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value != "" && utf8.RuneCountInString(value) <= 1000 {
			result = append(result, value)
		}
	}
	return result
}
func validText(value string, min, max int) bool {
	length := utf8.RuneCountInString(value)
	return length >= min && length <= max
}
func oneOf(value string, values ...string) bool {
	for _, item := range values {
		if value == item {
			return true
		}
	}
	return false
}
func validOptionalID(value string) bool { return value == "" || validID(value) }
func validID(value string) bool         { var id pgtype.UUID; return id.Scan(value) == nil && id.Valid }
