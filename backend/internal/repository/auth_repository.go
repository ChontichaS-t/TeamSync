package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"teamsync/backend/internal/pages"
	"teamsync/backend/internal/service"
)

type AuthRepository struct {
	pool *pgxpool.Pool
}

func NewAuthRepository(pool *pgxpool.Pool) *AuthRepository {
	return &AuthRepository{pool: pool}
}

var _ service.AuthRepository = (*AuthRepository)(nil)

func (r *AuthRepository) CreateUser(ctx context.Context, email, displayName, passwordHash string) (pages.User, error) {
	var user pages.User
	err := r.pool.QueryRow(ctx, `
		INSERT INTO users (email, display_name, password_hash)
		VALUES ($1, $2, $3)
		RETURNING id, email, display_name, password_hash, created_at
	`, email, displayName, passwordHash).Scan(
		&user.ID, &user.Email, &user.DisplayName, &user.PasswordHash, &user.CreatedAt,
	)
	if err != nil {
		var postgresError *pgconn.PgError
		if errors.As(err, &postgresError) && postgresError.Code == "23505" {
			return pages.User{}, service.ErrEmailInUse
		}
		return pages.User{}, fmt.Errorf("create user: %w", err)
	}
	return user, nil
}

func (r *AuthRepository) UserByEmail(ctx context.Context, email string) (pages.User, error) {
	var user pages.User
	err := r.pool.QueryRow(ctx, `
		SELECT id, email, display_name, password_hash, created_at
		FROM users
		WHERE lower(email) = lower($1)
	`, email).Scan(&user.ID, &user.Email, &user.DisplayName, &user.PasswordHash, &user.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return pages.User{}, service.ErrUserNotFound
	}
	if err != nil {
		return pages.User{}, fmt.Errorf("find user by email: %w", err)
	}
	return user, nil
}

func (r *AuthRepository) CreateSession(ctx context.Context, userID string, tokenHash []byte, expiresAt time.Time) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO sessions (user_id, token_hash, expires_at)
		VALUES ($1, $2, $3)
	`, userID, tokenHash, expiresAt)
	if err != nil {
		return fmt.Errorf("create session: %w", err)
	}
	return nil
}

func (r *AuthRepository) UserBySession(ctx context.Context, tokenHash []byte) (pages.User, error) {
	var user pages.User
	err := r.pool.QueryRow(ctx, `
		UPDATE sessions AS session
		SET last_seen_at = now()
		FROM users AS account
		WHERE session.token_hash = $1
		  AND session.expires_at > now()
		  AND account.id = session.user_id
		RETURNING account.id, account.email, account.display_name, account.password_hash, account.created_at
	`, tokenHash).Scan(&user.ID, &user.Email, &user.DisplayName, &user.PasswordHash, &user.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return pages.User{}, service.ErrUserNotFound
	}
	if err != nil {
		return pages.User{}, fmt.Errorf("find session: %w", err)
	}
	return user, nil
}

func (r *AuthRepository) DeleteSession(ctx context.Context, tokenHash []byte) error {
	if _, err := r.pool.Exec(ctx, `DELETE FROM sessions WHERE token_hash = $1`, tokenHash); err != nil {
		return fmt.Errorf("delete session: %w", err)
	}
	return nil
}

func (r *AuthRepository) DeleteExpiredSessions(ctx context.Context) error {
	if _, err := r.pool.Exec(ctx, `DELETE FROM sessions WHERE expires_at <= now()`); err != nil {
		return fmt.Errorf("delete expired sessions: %w", err)
	}
	return nil
}
