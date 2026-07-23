package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"teamsync/backend/internal/pages"
	"teamsync/backend/internal/service"
)

type ProjectRepository struct {
	pool *pgxpool.Pool
}

func NewProjectRepository(pool *pgxpool.Pool) *ProjectRepository {
	return &ProjectRepository{pool: pool}
}

var _ service.ProjectRepository = (*ProjectRepository)(nil)

func (r *ProjectRepository) EnsureProject(ctx context.Context, userID string, input service.EnsureProjectInput) (pages.Project, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return pages.Project{}, fmt.Errorf("begin ensure project: %w", err)
	}
	defer tx.Rollback(ctx)

	var project pages.Project
	err = tx.QueryRow(ctx, `
		INSERT INTO projects (owner_id, external_key, title, description, cover, tag, deadline, progress)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		ON CONFLICT (owner_id, external_key) DO UPDATE SET
			title = EXCLUDED.title,
			description = EXCLUDED.description,
			cover = EXCLUDED.cover,
			tag = EXCLUDED.tag,
			deadline = EXCLUDED.deadline,
			progress = EXCLUDED.progress,
			updated_at = now()
		RETURNING id, title, description, cover, tag, deadline, progress
	`, userID, input.ExternalKey, input.Title, input.Description, input.Cover, input.Tag, input.Deadline, input.Progress).Scan(
		&project.ID, &project.Title, &project.Description, &project.Cover, &project.Tag, &project.Deadline, &project.Progress,
	)
	if err != nil {
		return pages.Project{}, fmt.Errorf("ensure project: %w", err)
	}
	if _, err := tx.Exec(ctx, `
		INSERT INTO project_members (project_id, user_id, role)
		VALUES ($1, $2, 'owner')
		ON CONFLICT (project_id, user_id) DO NOTHING
	`, project.ID, userID); err != nil {
		return pages.Project{}, fmt.Errorf("ensure project owner: %w", err)
	}
	if err := tx.QueryRow(ctx, `SELECT count(*) FROM project_members WHERE project_id = $1`, project.ID).Scan(&project.MemberCount); err != nil {
		return pages.Project{}, fmt.Errorf("count project members: %w", err)
	}
	if err := tx.Commit(ctx); err != nil {
		return pages.Project{}, fmt.Errorf("commit ensure project: %w", err)
	}
	project.Role = "owner"
	return project, nil
}

func (r *ProjectRepository) CreateProject(ctx context.Context, userID string, input service.EnsureProjectInput) (pages.Project, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return pages.Project{}, err
	}
	defer tx.Rollback(ctx)
	var project pages.Project
	err = tx.QueryRow(ctx, `
		INSERT INTO projects(owner_id,external_key,title,description,cover,tag,deadline,progress)
		VALUES($1,'created:' || gen_random_uuid()::text,$2,$3,$4,$5,$6,$7)
		RETURNING id,title,description,cover,tag,deadline,progress
	`, userID, input.Title, input.Description, input.Cover, input.Tag, input.Deadline, input.Progress).Scan(&project.ID, &project.Title, &project.Description, &project.Cover, &project.Tag, &project.Deadline, &project.Progress)
	if err != nil {
		return pages.Project{}, fmt.Errorf("create project: %w", err)
	}
	if _, err = tx.Exec(ctx, `INSERT INTO project_members(project_id,user_id,role) VALUES($1,$2,'owner')`, project.ID, userID); err != nil {
		return pages.Project{}, err
	}
	if err = tx.Commit(ctx); err != nil {
		return pages.Project{}, err
	}
	project.Role = "owner"
	project.MemberCount = 1
	return project, nil
}

func (r *ProjectRepository) GetProject(ctx context.Context, userID, projectID string) (pages.Project, error) {
	var project pages.Project
	err := r.pool.QueryRow(ctx, `
		SELECT project.id,project.title,project.description,project.cover,project.tag,project.deadline,project.progress,member.role,
		       (SELECT count(*) FROM project_members count_member WHERE count_member.project_id=project.id)
		FROM projects project JOIN project_members member ON member.project_id=project.id
		WHERE project.id=$1 AND member.user_id=$2
	`, projectID, userID).Scan(&project.ID, &project.Title, &project.Description, &project.Cover, &project.Tag, &project.Deadline, &project.Progress, &project.Role, &project.MemberCount)
	if errors.Is(err, pgx.ErrNoRows) {
		return pages.Project{}, service.ErrProjectNotFound
	}
	if err != nil {
		return pages.Project{}, fmt.Errorf("get project: %w", err)
	}
	return project, nil
}

func (r *ProjectRepository) UpdateProject(ctx context.Context, userID, projectID string, input service.EnsureProjectInput) (pages.Project, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return pages.Project{}, err
	}
	defer tx.Rollback(ctx)
	var project pages.Project
	err = tx.QueryRow(ctx, `
		UPDATE projects project SET title=$3,description=$4,cover=$5,tag=$6,deadline=$7,progress=$8,updated_at=now()
		FROM project_members member
		WHERE project.id=$1 AND member.project_id=project.id AND member.user_id=$2 AND member.role IN ('owner','admin')
		RETURNING project.id,project.title,project.description,project.cover,project.tag,project.deadline,project.progress,member.role
	`, projectID, userID, input.Title, input.Description, input.Cover, input.Tag, input.Deadline, input.Progress).Scan(&project.ID, &project.Title, &project.Description, &project.Cover, &project.Tag, &project.Deadline, &project.Progress, &project.Role)
	if errors.Is(err, pgx.ErrNoRows) {
		return pages.Project{}, service.ErrProjectForbidden
	}
	if err != nil {
		return pages.Project{}, err
	}
	if err = tx.QueryRow(ctx, `SELECT count(*) FROM project_members WHERE project_id=$1`, projectID).Scan(&project.MemberCount); err != nil {
		return pages.Project{}, err
	}
	if err = tx.Commit(ctx); err != nil {
		return pages.Project{}, err
	}
	return project, nil
}

func (r *ProjectRepository) DeleteProject(ctx context.Context, userID, projectID string) error {
	command, err := r.pool.Exec(ctx, `DELETE FROM projects project USING project_members member WHERE project.id=$1 AND member.project_id=project.id AND member.user_id=$2 AND member.role='owner'`, projectID, userID)
	if err != nil {
		return err
	}
	if command.RowsAffected() == 0 {
		return service.ErrProjectForbidden
	}
	return nil
}

func (r *ProjectRepository) ListProjects(ctx context.Context, userID string) ([]pages.Project, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT project.id, project.title, project.description, project.cover, project.tag,
		       project.deadline, project.progress, membership.role,
		       (SELECT count(*) FROM project_members member_count WHERE member_count.project_id = project.id)
		FROM project_members membership
		JOIN projects project ON project.id = membership.project_id
		WHERE membership.user_id = $1
		ORDER BY project.updated_at DESC, project.created_at DESC
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("list projects: %w", err)
	}
	defer rows.Close()

	projects := make([]pages.Project, 0)
	for rows.Next() {
		var project pages.Project
		if err := rows.Scan(&project.ID, &project.Title, &project.Description, &project.Cover, &project.Tag, &project.Deadline, &project.Progress, &project.Role, &project.MemberCount); err != nil {
			return nil, fmt.Errorf("scan project: %w", err)
		}
		projects = append(projects, project)
	}
	return projects, rows.Err()
}

func (r *ProjectRepository) ListMembers(ctx context.Context, userID, projectID string) ([]pages.ProjectMember, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT account.id, account.display_name, account.email, member.role,
		       member.responsibility, account.avatar_url, member.joined_at
		FROM project_members viewer
		JOIN project_members member ON member.project_id = viewer.project_id
		JOIN users account ON account.id = member.user_id
		WHERE viewer.project_id = $1 AND viewer.user_id = $2
		ORDER BY CASE member.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END, member.joined_at
	`, projectID, userID)
	if err != nil {
		return nil, fmt.Errorf("list project members: %w", err)
	}
	defer rows.Close()

	members := make([]pages.ProjectMember, 0)
	for rows.Next() {
		var member pages.ProjectMember
		if err := rows.Scan(&member.ID, &member.DisplayName, &member.Email, &member.Role, &member.Responsibility, &member.AvatarURL, &member.JoinedAt); err != nil {
			return nil, fmt.Errorf("scan project member: %w", err)
		}
		members = append(members, member)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if len(members) == 0 {
		return nil, service.ErrProjectForbidden
	}
	return members, nil
}

func (r *ProjectRepository) UpdateMemberRole(ctx context.Context, userID, projectID, memberID, role string) (pages.ProjectMember, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return pages.ProjectMember{}, err
	}
	defer tx.Rollback(ctx)
	var member pages.ProjectMember
	err = tx.QueryRow(ctx, `
		UPDATE project_members target SET role=$4
		FROM project_members viewer,users account
		WHERE target.project_id=$1 AND target.user_id=$3 AND target.role<>'owner'
		  AND viewer.project_id=target.project_id AND viewer.user_id=$2 AND viewer.role='owner'
		  AND account.id=target.user_id
		RETURNING account.id,account.display_name,account.email,target.role,target.responsibility,account.avatar_url,target.joined_at
	`, projectID, userID, memberID, role).Scan(&member.ID, &member.DisplayName, &member.Email, &member.Role, &member.Responsibility, &member.AvatarURL, &member.JoinedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return pages.ProjectMember{}, service.ErrProjectForbidden
	}
	if err != nil {
		return pages.ProjectMember{}, err
	}
	if err = logActivity(ctx, tx, projectID, userID, "member.role_updated", fmt.Sprintf("เปลี่ยนสิทธิ์ %s เป็น %s", member.DisplayName, role)); err != nil {
		return pages.ProjectMember{}, err
	}
	if err = tx.Commit(ctx); err != nil {
		return pages.ProjectMember{}, err
	}
	return member, nil
}

func (r *ProjectRepository) UpdateMemberProfile(ctx context.Context, userID, projectID, memberID string, input service.MemberProfileInput) (pages.ProjectMember, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return pages.ProjectMember{}, err
	}
	defer tx.Rollback(ctx)

	var member pages.ProjectMember
	err = tx.QueryRow(ctx, `
		UPDATE project_members target SET responsibility=$4
		FROM project_members viewer, users account
		WHERE target.project_id=$1 AND target.user_id=$3
		  AND viewer.project_id=target.project_id AND viewer.user_id=$2
		  AND (viewer.user_id=target.user_id OR viewer.role IN ('owner','admin'))
		  AND account.id=target.user_id
		RETURNING account.id,account.email,target.role,target.responsibility,target.joined_at
	`, projectID, userID, memberID, input.Responsibility).Scan(&member.ID, &member.Email, &member.Role, &member.Responsibility, &member.JoinedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return pages.ProjectMember{}, service.ErrProjectForbidden
	}
	if err != nil {
		return pages.ProjectMember{}, err
	}
	if _, err = tx.Exec(ctx, `UPDATE users SET display_name=$2,avatar_url=$3 WHERE id=$1`, memberID, input.DisplayName, input.AvatarURL); err != nil {
		return pages.ProjectMember{}, err
	}
	member.DisplayName = input.DisplayName
	member.AvatarURL = input.AvatarURL
	if err = tx.Commit(ctx); err != nil {
		return pages.ProjectMember{}, err
	}
	return member, nil
}

func (r *ProjectRepository) RemoveMember(ctx context.Context, userID, projectID, memberID string) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	var name string
	err = tx.QueryRow(ctx, `
		DELETE FROM project_members target USING project_members viewer,users account
		WHERE target.project_id=$1 AND target.user_id=$3 AND target.role<>'owner'
		  AND viewer.project_id=target.project_id AND viewer.user_id=$2
		  AND (viewer.role='owner' OR (viewer.role='admin' AND target.role='member') OR viewer.user_id=target.user_id)
		  AND account.id=target.user_id RETURNING account.display_name
	`, projectID, userID, memberID).Scan(&name)
	if errors.Is(err, pgx.ErrNoRows) {
		return service.ErrProjectForbidden
	}
	if err != nil {
		return err
	}
	if _, err = tx.Exec(ctx, `UPDATE tasks SET assignee_id=NULL,updated_at=now() WHERE project_id=$1 AND assignee_id=$2`, projectID, memberID); err != nil {
		return err
	}
	if _, err = tx.Exec(ctx, `UPDATE feedback SET assignee_id=NULL,updated_at=now() WHERE project_id=$1 AND assignee_id=$2`, projectID, memberID); err != nil {
		return err
	}
	if err = logActivity(ctx, tx, projectID, userID, "member.removed", "นำสมาชิกออกจากโปรเจกต์: "+name); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (r *ProjectRepository) CreateInvitation(ctx context.Context, userID, projectID string, tokenHash []byte, expiresAt time.Time) (string, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return "", fmt.Errorf("begin create project invitation: %w", err)
	}
	defer tx.Rollback(ctx)

	var id string
	err = tx.QueryRow(ctx, `
		INSERT INTO project_invitations (project_id, token_hash, created_by, expires_at)
		SELECT member.project_id, $3, $1, $4
		FROM project_members member
		WHERE member.project_id = $2 AND member.user_id = $1 AND member.role IN ('owner', 'admin')
		RETURNING id
	`, userID, projectID, tokenHash, expiresAt).Scan(&id)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", service.ErrProjectForbidden
	}
	if err != nil {
		return "", fmt.Errorf("create project invitation: %w", err)
	}
	if err = tx.Commit(ctx); err != nil {
		return "", fmt.Errorf("commit project invitation: %w", err)
	}
	return id, nil
}

func (r *ProjectRepository) ListInvitations(ctx context.Context, userID, projectID string) ([]pages.InvitationListItem, error) {
	rows, err := r.pool.Query(ctx, `SELECT invitation.id,invitation.role,invitation.expires_at,invitation.used_count,invitation.max_uses,invitation.revoked_at IS NOT NULL,invitation.created_at FROM project_invitations invitation JOIN project_members member ON member.project_id=invitation.project_id WHERE invitation.project_id=$1 AND member.user_id=$2 AND member.role IN ('owner','admin') ORDER BY invitation.created_at DESC`, projectID, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]pages.InvitationListItem, 0)
	for rows.Next() {
		var item pages.InvitationListItem
		if err := rows.Scan(&item.ID, &item.Role, &item.ExpiresAt, &item.UsedCount, &item.MaxUses, &item.Revoked, &item.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	if len(items) == 0 {
		var allowed bool
		if err := r.pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM project_members WHERE project_id=$1 AND user_id=$2 AND role IN ('owner','admin'))`, projectID, userID).Scan(&allowed); err != nil {
			return nil, err
		}
		if !allowed {
			return nil, service.ErrProjectForbidden
		}
	}
	return items, rows.Err()
}

func (r *ProjectRepository) RevokeInvitation(ctx context.Context, userID, projectID, invitationID string) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin revoke project invitation: %w", err)
	}
	defer tx.Rollback(ctx)

	command, err := tx.Exec(ctx, `UPDATE project_invitations invitation SET revoked_at=now() FROM project_members member WHERE invitation.id=$3 AND invitation.project_id=$1 AND member.project_id=invitation.project_id AND member.user_id=$2 AND member.role IN ('owner','admin') AND invitation.revoked_at IS NULL`, projectID, userID, invitationID)
	if err != nil {
		return err
	}
	if command.RowsAffected() == 0 {
		return service.ErrProjectForbidden
	}
	return tx.Commit(ctx)
}

func (r *ProjectRepository) InvitationByTokenHash(ctx context.Context, tokenHash []byte) (pages.InvitationPreview, error) {
	var preview pages.InvitationPreview
	err := r.pool.QueryRow(ctx, `
		SELECT project.id, project.title, project.description, project.cover, project.tag,
		       project.deadline, project.progress,
		       (SELECT count(*) FROM project_members members WHERE members.project_id = project.id),
		       creator.display_name, invitation.expires_at
		FROM project_invitations invitation
		JOIN projects project ON project.id = invitation.project_id
		JOIN users creator ON creator.id = invitation.created_by
		WHERE invitation.token_hash = $1
		  AND invitation.revoked_at IS NULL
		  AND invitation.expires_at > now()
		  AND invitation.used_count < invitation.max_uses
	`, tokenHash).Scan(
		&preview.Project.ID, &preview.Project.Title, &preview.Project.Description, &preview.Project.Cover,
		&preview.Project.Tag, &preview.Project.Deadline, &preview.Project.Progress, &preview.Project.MemberCount,
		&preview.InvitedBy, &preview.ExpiresAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return pages.InvitationPreview{}, service.ErrInvitationInvalid
	}
	if err != nil {
		return pages.InvitationPreview{}, fmt.Errorf("load invitation: %w", err)
	}
	return preview, nil
}

func (r *ProjectRepository) AcceptInvitation(ctx context.Context, userID string, tokenHash []byte) (pages.Project, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return pages.Project{}, fmt.Errorf("begin accept invitation: %w", err)
	}
	defer tx.Rollback(ctx)

	var project pages.Project
	var invitationID, role string
	err = tx.QueryRow(ctx, `
		SELECT invitation.id, invitation.role, project.id, project.title, project.description,
		       project.cover, project.tag, project.deadline, project.progress
		FROM project_invitations invitation
		JOIN projects project ON project.id = invitation.project_id
		WHERE invitation.token_hash = $1
		  AND invitation.revoked_at IS NULL
		  AND invitation.expires_at > now()
		  AND invitation.used_count < invitation.max_uses
		FOR UPDATE OF invitation
	`, tokenHash).Scan(&invitationID, &role, &project.ID, &project.Title, &project.Description, &project.Cover, &project.Tag, &project.Deadline, &project.Progress)
	if errors.Is(err, pgx.ErrNoRows) {
		return pages.Project{}, service.ErrInvitationInvalid
	}
	if err != nil {
		return pages.Project{}, fmt.Errorf("lock invitation: %w", err)
	}

	command, err := tx.Exec(ctx, `
		INSERT INTO project_members (project_id, user_id, role)
		VALUES ($1, $2, $3)
		ON CONFLICT (project_id, user_id) DO NOTHING
	`, project.ID, userID, role)
	if err != nil {
		return pages.Project{}, fmt.Errorf("join project: %w", err)
	}
	if command.RowsAffected() > 0 {
		if _, err := tx.Exec(ctx, `UPDATE project_invitations SET used_count = used_count + 1 WHERE id = $1`, invitationID); err != nil {
			return pages.Project{}, fmt.Errorf("consume invitation: %w", err)
		}
		var memberName string
		if err := tx.QueryRow(ctx, `SELECT display_name FROM users WHERE id=$1`, userID).Scan(&memberName); err != nil {
			return pages.Project{}, fmt.Errorf("load joined member: %w", err)
		}
		if err := logActivity(ctx, tx, project.ID, userID, "member.joined", "สมาชิกใหม่เข้าร่วมโปรเจกต์: "+memberName); err != nil {
			return pages.Project{}, fmt.Errorf("log project join: %w", err)
		}
	}
	if err := tx.QueryRow(ctx, `
		SELECT member.role, (SELECT count(*) FROM project_members count_member WHERE count_member.project_id = member.project_id)
		FROM project_members member
		WHERE member.project_id = $1 AND member.user_id = $2
	`, project.ID, userID).Scan(&project.Role, &project.MemberCount); err != nil {
		return pages.Project{}, fmt.Errorf("load accepted membership: %w", err)
	}
	if err := tx.Commit(ctx); err != nil {
		return pages.Project{}, fmt.Errorf("commit project join: %w", err)
	}
	return project, nil
}
