package pages

import "time"

type Project struct {
	ID          string `json:"id"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Cover       string `json:"cover"`
	Tag         string `json:"tags"`
	Deadline    string `json:"deadline"`
	Progress    int    `json:"progress"`
	Role        string `json:"role"`
	MemberCount int    `json:"memberCount"`
}

type ProjectMember struct {
	ID          string    `json:"id"`
	DisplayName string    `json:"displayName"`
	Email       string    `json:"email"`
	Role        string    `json:"role"`
	JoinedAt    time.Time `json:"joinedAt"`
}

type InvitationPreview struct {
	Project   Project   `json:"project"`
	InvitedBy string    `json:"invitedBy"`
	ExpiresAt time.Time `json:"expiresAt"`
}

type CreatedInvitation struct {
	Token     string    `json:"token"`
	ExpiresAt time.Time `json:"expiresAt"`
}
