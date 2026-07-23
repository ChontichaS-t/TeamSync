package pages

import "time"

type MemberSummary struct {
	ID          string `json:"id"`
	DisplayName string `json:"displayName"`
}

type Task struct {
	ID             string         `json:"id"`
	ProjectID      string         `json:"projectId"`
	Title          string         `json:"title"`
	Assignee       *MemberSummary `json:"assignee"`
	DueDate        string         `json:"dueDate"`
	Status         string         `json:"status"`
	Priority       string         `json:"priority"`
	Source         string         `json:"source"`
	ExpectedResult string         `json:"expectedResult"`
	MeetingID      *string        `json:"meetingId"`
	FeedbackID     *string        `json:"feedbackId"`
	CreatedAt      time.Time      `json:"createdAt"`
	UpdatedAt      time.Time      `json:"updatedAt"`
}

type Meeting struct {
	ID        string    `json:"id"`
	ProjectID string    `json:"projectId"`
	Title     string    `json:"title"`
	Date      string    `json:"date"`
	Summary   []string  `json:"summary"`
	Agreed    []string  `json:"agreed"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type Feedback struct {
	ID        string         `json:"id"`
	ProjectID string         `json:"projectId"`
	Topic     string         `json:"topic"`
	Provider  string         `json:"provider"`
	Assignee  *MemberSummary `json:"assignee"`
	Status    string         `json:"status"`
	Result    string         `json:"result"`
	MeetingID *string        `json:"meetingId"`
	Meeting   *Meeting       `json:"meeting"`
	TaskID    *string        `json:"taskId"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
}

type CalendarEvent struct {
	ID        string    `json:"id"`
	ProjectID string    `json:"projectId"`
	Title     string    `json:"title"`
	DateKey   string    `json:"dateKey"`
	Time      string    `json:"time"`
	Location  string    `json:"location"`
	Tone      string    `json:"tone"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type ActivityLog struct {
	ID        string         `json:"id"`
	ProjectID string         `json:"projectId"`
	Actor     *MemberSummary `json:"actor"`
	EventType string         `json:"eventType"`
	Message   string         `json:"message"`
	CreatedAt time.Time      `json:"createdAt"`
}

type InvitationListItem struct {
	ID        string    `json:"id"`
	Role      string    `json:"role"`
	ExpiresAt time.Time `json:"expiresAt"`
	UsedCount int       `json:"usedCount"`
	MaxUses   int       `json:"maxUses"`
	Revoked   bool      `json:"revoked"`
	CreatedAt time.Time `json:"createdAt"`
}
