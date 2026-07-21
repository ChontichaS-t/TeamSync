package service

import (
	"context"
	"errors"
	"fmt"
	"net/mail"
	"strings"
	"time"
	"unicode/utf8"

	"teamsync/backend/internal/pages"
)

var ErrInvalidCredentials = errors.New("invalid email or password")
var ErrInvalidSession = errors.New("invalid session")
var ErrInvalidEmail = errors.New("invalid email address")
var ErrEmailInUse = errors.New("email address is already registered")
var ErrUserNotFound = errors.New("user not found")
var ErrDisplayName = errors.New("display name must be 1 to 100 characters")

// AuthRepository lists only the persistence operations required by AuthService.
// The PostgreSQL repository satisfies this interface implicitly.
type AuthRepository interface {
	CreateUser(ctx context.Context, email, displayName, passwordHash string) (pages.User, error)
	UserByEmail(ctx context.Context, email string) (pages.User, error)
	CreateSession(ctx context.Context, userID string, tokenHash []byte, expiresAt time.Time) error
	UserBySession(ctx context.Context, tokenHash []byte) (pages.User, error)
	DeleteSession(ctx context.Context, tokenHash []byte) error
	DeleteExpiredSessions(ctx context.Context) error
}

type AuthService struct {
	repository AuthRepository
	dummyHash  string
}

func NewAuthService(repository AuthRepository) (*AuthService, error) {
	dummyHash, err := HashPassword("dummy-password-never-used")
	if err != nil {
		return nil, fmt.Errorf("create timing-safe dummy hash: %w", err)
	}
	return &AuthService{repository: repository, dummyHash: dummyHash}, nil
}

func NormalizeEmail(value string) (string, error) {
	email := strings.ToLower(strings.TrimSpace(value))
	if len(email) == 0 || len(email) > 254 {
		return "", ErrInvalidEmail
	}
	parsed, err := mail.ParseAddress(email)
	if err != nil || parsed.Address != email {
		return "", ErrInvalidEmail
	}
	return email, nil
}

func NormalizeDisplayName(value string) (string, error) {
	displayName := strings.TrimSpace(value)
	length := utf8.RuneCountInString(displayName)
	if length == 0 || length > 100 {
		return "", ErrDisplayName
	}
	return displayName, nil
}

func (s *AuthService) Register(ctx context.Context, email, displayName, password string) (pages.User, error) {
	normalizedEmail, err := NormalizeEmail(email)
	if err != nil {
		return pages.User{}, err
	}
	normalizedName, err := NormalizeDisplayName(displayName)
	if err != nil {
		return pages.User{}, err
	}
	passwordHash, err := HashPassword(password)
	if err != nil {
		return pages.User{}, err
	}

	user, err := s.repository.CreateUser(ctx, normalizedEmail, normalizedName, passwordHash)
	if err != nil {
		return pages.User{}, err
	}
	return user, nil
}

func (s *AuthService) Login(ctx context.Context, email, password string, ttl time.Duration) (pages.User, string, time.Time, error) {
	normalizedEmail, err := NormalizeEmail(email)
	if err != nil {
		_, _ = VerifyPassword(password, s.dummyHash)
		return pages.User{}, "", time.Time{}, ErrInvalidCredentials
	}

	user, err := s.repository.UserByEmail(ctx, normalizedEmail)
	if errors.Is(err, ErrUserNotFound) {
		_, _ = VerifyPassword(password, s.dummyHash)
		return pages.User{}, "", time.Time{}, ErrInvalidCredentials
	}
	if err != nil {
		return pages.User{}, "", time.Time{}, err
	}

	valid, err := VerifyPassword(password, user.PasswordHash)
	if err != nil {
		return pages.User{}, "", time.Time{}, fmt.Errorf("verify password: %w", err)
	}
	if !valid {
		return pages.User{}, "", time.Time{}, ErrInvalidCredentials
	}

	token, tokenHash, err := newSessionToken()
	if err != nil {
		return pages.User{}, "", time.Time{}, err
	}
	expiresAt := time.Now().UTC().Add(ttl)
	if err := s.repository.CreateSession(ctx, user.ID, tokenHash, expiresAt); err != nil {
		return pages.User{}, "", time.Time{}, err
	}
	_ = s.repository.DeleteExpiredSessions(ctx)
	return user, token, expiresAt, nil
}

func (s *AuthService) Authenticate(ctx context.Context, token string) (pages.User, error) {
	tokenHash, err := hashSessionToken(token)
	if err != nil {
		return pages.User{}, ErrInvalidSession
	}
	user, err := s.repository.UserBySession(ctx, tokenHash)
	if errors.Is(err, ErrUserNotFound) {
		return pages.User{}, ErrInvalidSession
	}
	return user, err
}

func (s *AuthService) Logout(ctx context.Context, token string) error {
	tokenHash, err := hashSessionToken(token)
	if err != nil {
		return nil
	}
	return s.repository.DeleteSession(ctx, tokenHash)
}
