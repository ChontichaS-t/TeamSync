package service

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"strings"
	"time"
	"unicode/utf8"

	"teamsync/backend/internal/pages"
)

var ErrProjectInput = errors.New("invalid project data")
var ErrProjectForbidden = errors.New("project access denied")
var ErrInvitationInvalid = errors.New("invitation is invalid or has expired")
var ErrProjectNotFound = errors.New("project not found")

type EnsureProjectInput struct {
	ExternalKey string
	Title       string
	Description string
	Cover       string
	Tag         string
	Deadline    string
	Progress    int
}

type MemberProfileInput struct {
	DisplayName    string
	Responsibility string
	AvatarURL      string
}

type ProjectRepository interface {
	EnsureProject(ctx context.Context, userID string, input EnsureProjectInput) (pages.Project, error)
	CreateProject(ctx context.Context, userID string, input EnsureProjectInput) (pages.Project, error)
	GetProject(ctx context.Context, userID, projectID string) (pages.Project, error)
	UpdateProject(ctx context.Context, userID, projectID string, input EnsureProjectInput) (pages.Project, error)
	DeleteProject(ctx context.Context, userID, projectID string) error
	ListProjects(ctx context.Context, userID string) ([]pages.Project, error)
	ListMembers(ctx context.Context, userID, projectID string) ([]pages.ProjectMember, error)
	UpdateMemberProfile(ctx context.Context, userID, projectID, memberID string, input MemberProfileInput) (pages.ProjectMember, error)
	UpdateMemberRole(ctx context.Context, userID, projectID, memberID, role string) (pages.ProjectMember, error)
	RemoveMember(ctx context.Context, userID, projectID, memberID string) error
	CreateInvitation(ctx context.Context, userID, projectID string, tokenHash []byte, expiresAt time.Time) (string, error)
	ListInvitations(ctx context.Context, userID, projectID string) ([]pages.InvitationListItem, error)
	RevokeInvitation(ctx context.Context, userID, projectID, invitationID string) error
	InvitationByTokenHash(ctx context.Context, tokenHash []byte) (pages.InvitationPreview, error)
	AcceptInvitation(ctx context.Context, userID string, tokenHash []byte) (pages.Project, error)
}

type ProjectService struct {
	repository ProjectRepository
}

func NewProjectService(repository ProjectRepository) *ProjectService {
	return &ProjectService{repository: repository}
}

func (s *ProjectService) EnsureProject(ctx context.Context, userID string, input EnsureProjectInput) (pages.Project, error) {
	if !normalizeProjectInput(&input, true) {
		return pages.Project{}, ErrProjectInput
	}
	return s.repository.EnsureProject(ctx, userID, input)
}

func normalizeProjectInput(input *EnsureProjectInput, requireExternalKey bool) bool {
	input.ExternalKey = strings.TrimSpace(input.ExternalKey)
	input.Title = strings.TrimSpace(input.Title)
	input.Description = strings.TrimSpace(input.Description)
	input.Cover = strings.TrimSpace(input.Cover)
	input.Tag = strings.TrimSpace(input.Tag)
	input.Deadline = strings.TrimSpace(input.Deadline)
	if (requireExternalKey && input.ExternalKey == "") || utf8.RuneCountInString(input.ExternalKey) > 200 || input.Title == "" || utf8.RuneCountInString(input.Title) > 200 || utf8.RuneCountInString(input.Description) > 2000 || input.Progress < 0 || input.Progress > 100 {
		return false
	}
	if input.Cover == "" {
		input.Cover = "/new/newsea.jpg"
	}
	if input.Tag == "" {
		input.Tag = "blue"
	}
	return true
}

func (s *ProjectService) CreateProject(ctx context.Context, userID string, input EnsureProjectInput) (pages.Project, error) {
	if !normalizeProjectInput(&input, false) {
		return pages.Project{}, ErrProjectInput
	}
	return s.repository.CreateProject(ctx, userID, input)
}
func (s *ProjectService) GetProject(ctx context.Context, userID, projectID string) (pages.Project, error) {
	if !validID(projectID) {
		return pages.Project{}, ErrProjectInput
	}
	return s.repository.GetProject(ctx, userID, projectID)
}
func (s *ProjectService) UpdateProject(ctx context.Context, userID, projectID string, input EnsureProjectInput) (pages.Project, error) {
	if !validID(projectID) || !normalizeProjectInput(&input, false) {
		return pages.Project{}, ErrProjectInput
	}
	return s.repository.UpdateProject(ctx, userID, projectID, input)
}
func (s *ProjectService) DeleteProject(ctx context.Context, userID, projectID string) error {
	if !validID(projectID) {
		return ErrProjectInput
	}
	return s.repository.DeleteProject(ctx, userID, projectID)
}

func (s *ProjectService) ListProjects(ctx context.Context, userID string) ([]pages.Project, error) {
	return s.repository.ListProjects(ctx, userID)
}

func (s *ProjectService) ListMembers(ctx context.Context, userID, projectID string) ([]pages.ProjectMember, error) {
	if !validID(projectID) {
		return nil, ErrProjectInput
	}
	return s.repository.ListMembers(ctx, userID, projectID)
}

func (s *ProjectService) UpdateMemberRole(ctx context.Context, userID, projectID, memberID, role string) (pages.ProjectMember, error) {
	if !validID(projectID) || !validID(memberID) || (role != "admin" && role != "member") {
		return pages.ProjectMember{}, ErrProjectInput
	}
	return s.repository.UpdateMemberRole(ctx, userID, projectID, memberID, role)
}

func (s *ProjectService) UpdateMemberProfile(ctx context.Context, userID, projectID, memberID string, input MemberProfileInput) (pages.ProjectMember, error) {
	input.DisplayName = strings.TrimSpace(input.DisplayName)
	input.Responsibility = strings.TrimSpace(input.Responsibility)
	input.AvatarURL = strings.TrimSpace(input.AvatarURL)
	validAvatar := input.AvatarURL == ""
	for _, avatar := range []string{"/cv1.png", "/cv2.png", "/cv3.png", "/cv4.png", "/cv5.png"} {
		validAvatar = validAvatar || input.AvatarURL == avatar
	}
	if !validID(projectID) || !validID(memberID) || utf8.RuneCountInString(input.DisplayName) < 2 || utf8.RuneCountInString(input.DisplayName) > 80 || utf8.RuneCountInString(input.Responsibility) > 100 || !validAvatar {
		return pages.ProjectMember{}, ErrProjectInput
	}
	return s.repository.UpdateMemberProfile(ctx, userID, projectID, memberID, input)
}
func (s *ProjectService) RemoveMember(ctx context.Context, userID, projectID, memberID string) error {
	if !validID(projectID) || !validID(memberID) {
		return ErrProjectInput
	}
	return s.repository.RemoveMember(ctx, userID, projectID, memberID)
}

func (s *ProjectService) CreateInvitation(ctx context.Context, userID, projectID string) (pages.CreatedInvitation, error) {
	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		return pages.CreatedInvitation{}, err
	}
	token := base64.RawURLEncoding.EncodeToString(raw)
	hash := sha256.Sum256([]byte(token))
	expiresAt := time.Now().UTC().Add(7 * 24 * time.Hour)
	if !validID(projectID) {
		return pages.CreatedInvitation{}, ErrProjectInput
	}
	id, err := s.repository.CreateInvitation(ctx, userID, projectID, hash[:], expiresAt)
	if err != nil {
		return pages.CreatedInvitation{}, err
	}
	return pages.CreatedInvitation{ID: id, Token: token, ExpiresAt: expiresAt}, nil
}

func (s *ProjectService) ListInvitations(ctx context.Context, userID, projectID string) ([]pages.InvitationListItem, error) {
	if !validID(projectID) {
		return nil, ErrProjectInput
	}
	return s.repository.ListInvitations(ctx, userID, projectID)
}
func (s *ProjectService) RevokeInvitation(ctx context.Context, userID, projectID, invitationID string) error {
	if !validID(projectID) || !validID(invitationID) {
		return ErrProjectInput
	}
	return s.repository.RevokeInvitation(ctx, userID, projectID, invitationID)
}

func (s *ProjectService) Invitation(ctx context.Context, token string) (pages.InvitationPreview, error) {
	hash, err := invitationTokenHash(token)
	if err != nil {
		return pages.InvitationPreview{}, ErrInvitationInvalid
	}
	return s.repository.InvitationByTokenHash(ctx, hash)
}

func (s *ProjectService) AcceptInvitation(ctx context.Context, userID, token string) (pages.Project, error) {
	hash, err := invitationTokenHash(token)
	if err != nil {
		return pages.Project{}, ErrInvitationInvalid
	}
	return s.repository.AcceptInvitation(ctx, userID, hash)
}

func invitationTokenHash(token string) ([]byte, error) {
	token = strings.TrimSpace(token)
	decoded, err := base64.RawURLEncoding.DecodeString(token)
	if err != nil || len(decoded) != 32 {
		return nil, ErrInvitationInvalid
	}
	hash := sha256.Sum256([]byte(token))
	return hash[:], nil
}
