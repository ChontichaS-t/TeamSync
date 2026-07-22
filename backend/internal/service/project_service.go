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

type EnsureProjectInput struct {
	ExternalKey string
	Title       string
	Description string
	Cover       string
	Tag         string
	Deadline    string
	Progress    int
}

type ProjectRepository interface {
	EnsureProject(ctx context.Context, userID string, input EnsureProjectInput) (pages.Project, error)
	ListProjects(ctx context.Context, userID string) ([]pages.Project, error)
	ListMembers(ctx context.Context, userID, projectID string) ([]pages.ProjectMember, error)
	CreateInvitation(ctx context.Context, userID, projectID string, tokenHash []byte, expiresAt time.Time) error
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
	input.ExternalKey = strings.TrimSpace(input.ExternalKey)
	input.Title = strings.TrimSpace(input.Title)
	input.Description = strings.TrimSpace(input.Description)
	input.Cover = strings.TrimSpace(input.Cover)
	input.Tag = strings.TrimSpace(input.Tag)
	input.Deadline = strings.TrimSpace(input.Deadline)
	if input.ExternalKey == "" || utf8.RuneCountInString(input.ExternalKey) > 200 || input.Title == "" || utf8.RuneCountInString(input.Title) > 200 || input.Progress < 0 || input.Progress > 100 {
		return pages.Project{}, ErrProjectInput
	}
	if input.Cover == "" {
		input.Cover = "/new/newsea.jpg"
	}
	if input.Tag == "" {
		input.Tag = "blue"
	}
	return s.repository.EnsureProject(ctx, userID, input)
}

func (s *ProjectService) ListProjects(ctx context.Context, userID string) ([]pages.Project, error) {
	return s.repository.ListProjects(ctx, userID)
}

func (s *ProjectService) ListMembers(ctx context.Context, userID, projectID string) ([]pages.ProjectMember, error) {
	return s.repository.ListMembers(ctx, userID, projectID)
}

func (s *ProjectService) CreateInvitation(ctx context.Context, userID, projectID string) (pages.CreatedInvitation, error) {
	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		return pages.CreatedInvitation{}, err
	}
	token := base64.RawURLEncoding.EncodeToString(raw)
	hash := sha256.Sum256([]byte(token))
	expiresAt := time.Now().UTC().Add(7 * 24 * time.Hour)
	if err := s.repository.CreateInvitation(ctx, userID, projectID, hash[:], expiresAt); err != nil {
		return pages.CreatedInvitation{}, err
	}
	return pages.CreatedInvitation{Token: token, ExpiresAt: expiresAt}, nil
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
