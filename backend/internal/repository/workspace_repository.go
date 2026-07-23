package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	"teamsync/backend/internal/pages"
	"teamsync/backend/internal/service"
)

type WorkspaceRepository struct{ pool *pgxpool.Pool }

func NewWorkspaceRepository(pool *pgxpool.Pool) *WorkspaceRepository {
	return &WorkspaceRepository{pool: pool}
}

var _ service.WorkspaceRepository = (*WorkspaceRepository)(nil)

type workspaceQuerier interface {
	Exec(context.Context, string, ...any) (pgconn.CommandTag, error)
	QueryRow(context.Context, string, ...any) pgx.Row
}

func (r *WorkspaceRepository) requireMember(ctx context.Context, query workspaceQuerier, userID, projectID string) error {
	var exists bool
	err := query.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM project_members WHERE project_id=$1 AND user_id=$2)`, projectID, userID).Scan(&exists)
	if err != nil {
		return err
	}
	if !exists {
		return service.ErrProjectForbidden
	}
	return nil
}

func (r *WorkspaceRepository) validateReferences(ctx context.Context, query workspaceQuerier, projectID, assigneeID, meetingID string) error {
	if assigneeID != "" {
		var exists bool
		if err := query.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM project_members WHERE project_id=$1 AND user_id=$2)`, projectID, assigneeID).Scan(&exists); err != nil {
			return err
		}
		if !exists {
			return service.ErrWorkspaceInput
		}
	}
	if meetingID != "" {
		var exists bool
		if err := query.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM meetings WHERE project_id=$1 AND id=$2)`, projectID, meetingID).Scan(&exists); err != nil {
			return err
		}
		if !exists {
			return service.ErrWorkspaceInput
		}
	}
	return nil
}

func nullableUUID(value string) any {
	if value == "" {
		return nil
	}
	return value
}

func logActivity(ctx context.Context, tx pgx.Tx, projectID, actorID, eventType, message string) error {
	_, err := tx.Exec(ctx, `INSERT INTO project_activity_logs (project_id,actor_id,event_type,message) VALUES ($1,$2,$3,$4)`, projectID, actorID, eventType, message)
	return err
}

const taskSelect = `
	SELECT task.id::text, task.project_id::text, task.title,
	       account.id::text, account.display_name, task.due_date::text, task.status, task.priority,
	       task.source, task.provider, task.expected_result, task.meeting_id::text, task.feedback_id::text, task.created_at, task.updated_at
	FROM tasks task LEFT JOIN users account ON account.id=task.assignee_id`

func scanTask(row pgx.Row) (pages.Task, error) {
	var task pages.Task
	var assigneeID, assigneeName, meetingID, feedbackID pgtype.Text
	err := row.Scan(&task.ID, &task.ProjectID, &task.Title, &assigneeID, &assigneeName, &task.DueDate, &task.Status, &task.Priority, &task.Source, &task.Provider, &task.ExpectedResult, &meetingID, &feedbackID, &task.CreatedAt, &task.UpdatedAt)
	if err != nil {
		return pages.Task{}, err
	}
	if assigneeID.Valid {
		task.Assignee = &pages.MemberSummary{ID: assigneeID.String, DisplayName: assigneeName.String}
	}
	if meetingID.Valid {
		value := meetingID.String
		task.MeetingID = &value
	}
	if feedbackID.Valid {
		value := feedbackID.String
		task.FeedbackID = &value
	}
	return task, nil
}

func (r *WorkspaceRepository) ListTasks(ctx context.Context, userID, projectID string) ([]pages.Task, error) {
	if err := r.requireMember(ctx, r.pool, userID, projectID); err != nil {
		return nil, err
	}
	rows, err := r.pool.Query(ctx, taskSelect+` WHERE task.project_id=$1 ORDER BY task.created_at DESC`, projectID)
	if err != nil {
		return nil, fmt.Errorf("list tasks: %w", err)
	}
	defer rows.Close()
	items := make([]pages.Task, 0)
	for rows.Next() {
		item, err := scanTask(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *WorkspaceRepository) getTask(ctx context.Context, query workspaceQuerier, projectID, taskID string) (pages.Task, error) {
	item, err := scanTask(query.QueryRow(ctx, taskSelect+` WHERE task.project_id=$1 AND task.id=$2`, projectID, taskID))
	if errors.Is(err, pgx.ErrNoRows) {
		return pages.Task{}, service.ErrWorkspaceNotFound
	}
	return item, err
}

func (r *WorkspaceRepository) CreateTask(ctx context.Context, userID, projectID string, input service.TaskInput) (pages.Task, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return pages.Task{}, err
	}
	defer tx.Rollback(ctx)
	if err = r.requireMember(ctx, tx, userID, projectID); err != nil {
		return pages.Task{}, err
	}
	if err = r.validateReferences(ctx, tx, projectID, input.AssigneeID, input.MeetingID); err != nil {
		return pages.Task{}, err
	}
	var id string
	err = tx.QueryRow(ctx, `INSERT INTO tasks(project_id,title,assignee_id,due_date,status,priority,source,provider,expected_result,meeting_id,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`, projectID, input.Title, nullableUUID(input.AssigneeID), input.DueDate, input.Status, input.Priority, input.Source, input.Provider, input.ExpectedResult, nullableUUID(input.MeetingID), userID).Scan(&id)
	if err != nil {
		return pages.Task{}, fmt.Errorf("create task: %w", err)
	}
	if err = logActivity(ctx, tx, projectID, userID, "task.created", fmt.Sprintf("สร้างงาน '%s'", input.Title)); err != nil {
		return pages.Task{}, err
	}
	item, err := r.getTask(ctx, tx, projectID, id)
	if err != nil {
		return pages.Task{}, err
	}
	if err = tx.Commit(ctx); err != nil {
		return pages.Task{}, err
	}
	return item, nil
}

func (r *WorkspaceRepository) UpdateTask(ctx context.Context, userID, projectID, taskID string, input service.TaskInput) (pages.Task, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return pages.Task{}, err
	}
	defer tx.Rollback(ctx)
	if err = r.requireMember(ctx, tx, userID, projectID); err != nil {
		return pages.Task{}, err
	}
	if err = r.validateReferences(ctx, tx, projectID, input.AssigneeID, input.MeetingID); err != nil {
		return pages.Task{}, err
	}
	command, err := tx.Exec(ctx, `UPDATE tasks SET title=$3,assignee_id=$4,due_date=$5,status=$6,priority=$7,source=$8,provider=$9,expected_result=$10,meeting_id=$11,updated_at=now() WHERE project_id=$1 AND id=$2`, projectID, taskID, input.Title, nullableUUID(input.AssigneeID), input.DueDate, input.Status, input.Priority, input.Source, input.Provider, input.ExpectedResult, nullableUUID(input.MeetingID))
	if err != nil {
		return pages.Task{}, fmt.Errorf("update task: %w", err)
	}
	if command.RowsAffected() == 0 {
		return pages.Task{}, service.ErrWorkspaceNotFound
	}
	feedbackStatus := "กำลังแก้ไข"
	if input.Status == "เสร็จแล้ว" {
		feedbackStatus = "แก้ไขแล้ว"
	}
	if _, err = tx.Exec(ctx, `
		UPDATE feedback
		SET topic=$3, provider=$4, assignee_id=$5, meeting_id=$6,
		    status=$7, result=$8, updated_at=now()
		WHERE project_id=$1
		  AND id=(SELECT feedback_id FROM tasks WHERE project_id=$1 AND id=$2)
	`, projectID, taskID, input.Title, input.Provider, nullableUUID(input.AssigneeID), nullableUUID(input.MeetingID), feedbackStatus, input.ExpectedResult); err != nil {
		return pages.Task{}, err
	}
	if err = logActivity(ctx, tx, projectID, userID, "task.updated", fmt.Sprintf("แก้ไขงาน '%s'", input.Title)); err != nil {
		return pages.Task{}, err
	}
	item, err := r.getTask(ctx, tx, projectID, taskID)
	if err != nil {
		return pages.Task{}, err
	}
	if err = tx.Commit(ctx); err != nil {
		return pages.Task{}, err
	}
	return item, nil
}

func (r *WorkspaceRepository) DeleteTask(ctx context.Context, userID, projectID, taskID string) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if err = r.requireMember(ctx, tx, userID, projectID); err != nil {
		return err
	}
	var title string
	err = tx.QueryRow(ctx, `DELETE FROM tasks WHERE project_id=$1 AND id=$2 RETURNING title`, projectID, taskID).Scan(&title)
	if errors.Is(err, pgx.ErrNoRows) {
		return service.ErrWorkspaceNotFound
	}
	if err != nil {
		return err
	}
	if err = logActivity(ctx, tx, projectID, userID, "task.deleted", fmt.Sprintf("ลบงาน '%s'", title)); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

const meetingSelect = `SELECT id::text,project_id::text,title,meeting_date::text,summary,agreed,created_at,updated_at FROM meetings`

func scanMeeting(row pgx.Row) (pages.Meeting, error) {
	var item pages.Meeting
	err := row.Scan(&item.ID, &item.ProjectID, &item.Title, &item.Date, &item.Summary, &item.Agreed, &item.CreatedAt, &item.UpdatedAt)
	return item, err
}
func (r *WorkspaceRepository) ListMeetings(ctx context.Context, userID, projectID string) ([]pages.Meeting, error) {
	if err := r.requireMember(ctx, r.pool, userID, projectID); err != nil {
		return nil, err
	}
	rows, err := r.pool.Query(ctx, meetingSelect+` WHERE project_id=$1 ORDER BY meeting_date DESC,created_at DESC`, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]pages.Meeting, 0)
	for rows.Next() {
		item, err := scanMeeting(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}
func (r *WorkspaceRepository) getMeeting(ctx context.Context, q workspaceQuerier, projectID, id string) (pages.Meeting, error) {
	item, err := scanMeeting(q.QueryRow(ctx, meetingSelect+` WHERE project_id=$1 AND id=$2`, projectID, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return pages.Meeting{}, service.ErrWorkspaceNotFound
	}
	return item, err
}
func (r *WorkspaceRepository) CreateMeeting(ctx context.Context, userID, projectID string, input service.MeetingInput) (pages.Meeting, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return pages.Meeting{}, err
	}
	defer tx.Rollback(ctx)
	if err = r.requireMember(ctx, tx, userID, projectID); err != nil {
		return pages.Meeting{}, err
	}
	var id string
	err = tx.QueryRow(ctx, `INSERT INTO meetings(project_id,title,meeting_date,summary,agreed,created_by) VALUES($1,$2,$3,$4,$5,$6) RETURNING id`, projectID, input.Title, input.Date, input.Summary, input.Agreed, userID).Scan(&id)
	if err != nil {
		return pages.Meeting{}, err
	}
	if err = logActivity(ctx, tx, projectID, userID, "meeting.created", fmt.Sprintf("บันทึกการประชุม '%s'", input.Title)); err != nil {
		return pages.Meeting{}, err
	}
	item, err := r.getMeeting(ctx, tx, projectID, id)
	if err != nil {
		return pages.Meeting{}, err
	}
	if err = tx.Commit(ctx); err != nil {
		return pages.Meeting{}, err
	}
	return item, nil
}
func (r *WorkspaceRepository) UpdateMeeting(ctx context.Context, userID, projectID, meetingID string, input service.MeetingInput) (pages.Meeting, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return pages.Meeting{}, err
	}
	defer tx.Rollback(ctx)
	if err = r.requireMember(ctx, tx, userID, projectID); err != nil {
		return pages.Meeting{}, err
	}
	command, err := tx.Exec(ctx, `UPDATE meetings SET title=$3,meeting_date=$4,summary=$5,agreed=$6,updated_at=now() WHERE project_id=$1 AND id=$2`, projectID, meetingID, input.Title, input.Date, input.Summary, input.Agreed)
	if err != nil {
		return pages.Meeting{}, err
	}
	if command.RowsAffected() == 0 {
		return pages.Meeting{}, service.ErrWorkspaceNotFound
	}
	source := fmt.Sprintf("Feedback จาก: %s — %s", input.Title, input.Date)
	if _, err = tx.Exec(ctx, `UPDATE tasks SET source=$3,updated_at=now() WHERE project_id=$1 AND meeting_id=$2 AND feedback_id IS NOT NULL`, projectID, meetingID, source); err != nil {
		return pages.Meeting{}, err
	}
	if err = logActivity(ctx, tx, projectID, userID, "meeting.updated", fmt.Sprintf("แก้ไขบันทึกการประชุม '%s'", input.Title)); err != nil {
		return pages.Meeting{}, err
	}
	item, err := r.getMeeting(ctx, tx, projectID, meetingID)
	if err != nil {
		return pages.Meeting{}, err
	}
	if err = tx.Commit(ctx); err != nil {
		return pages.Meeting{}, err
	}
	return item, nil
}
func (r *WorkspaceRepository) DeleteMeeting(ctx context.Context, userID, projectID, meetingID string) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if err = r.requireMember(ctx, tx, userID, projectID); err != nil {
		return err
	}
	var title string
	if _, err = tx.Exec(ctx, `
		UPDATE tasks task SET source='Feedback จาก ' || feedback.provider, updated_at=now()
		FROM feedback WHERE task.feedback_id=feedback.id AND task.project_id=$1 AND task.meeting_id=$2
	`, projectID, meetingID); err != nil {
		return err
	}
	err = tx.QueryRow(ctx, `DELETE FROM meetings WHERE project_id=$1 AND id=$2 RETURNING title`, projectID, meetingID).Scan(&title)
	if errors.Is(err, pgx.ErrNoRows) {
		return service.ErrWorkspaceNotFound
	}
	if err != nil {
		return err
	}
	if err = logActivity(ctx, tx, projectID, userID, "meeting.deleted", fmt.Sprintf("ลบบันทึกการประชุม '%s'", title)); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

const feedbackSelect = `SELECT feedback.id::text,feedback.project_id::text,feedback.topic,feedback.provider,account.id::text,account.display_name,feedback.status,feedback.result,feedback.meeting_id::text,task.id::text,feedback.created_at,feedback.updated_at FROM feedback LEFT JOIN users account ON account.id=feedback.assignee_id LEFT JOIN tasks task ON task.feedback_id=feedback.id`

func scanFeedback(row pgx.Row) (pages.Feedback, error) {
	var item pages.Feedback
	var assigneeID, assigneeName, meetingID, taskID pgtype.Text
	err := row.Scan(&item.ID, &item.ProjectID, &item.Topic, &item.Provider, &assigneeID, &assigneeName, &item.Status, &item.Result, &meetingID, &taskID, &item.CreatedAt, &item.UpdatedAt)
	if err != nil {
		return item, err
	}
	if assigneeID.Valid {
		item.Assignee = &pages.MemberSummary{ID: assigneeID.String, DisplayName: assigneeName.String}
	}
	if meetingID.Valid {
		v := meetingID.String
		item.MeetingID = &v
	}
	if taskID.Valid {
		v := taskID.String
		item.TaskID = &v
	}
	return item, nil
}
func (r *WorkspaceRepository) ListFeedback(ctx context.Context, userID, projectID string) ([]pages.Feedback, error) {
	if err := r.requireMember(ctx, r.pool, userID, projectID); err != nil {
		return nil, err
	}
	rows, err := r.pool.Query(ctx, feedbackSelect+` WHERE feedback.project_id=$1 ORDER BY feedback.created_at DESC`, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]pages.Feedback, 0)
	for rows.Next() {
		item, err := scanFeedback(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}
func (r *WorkspaceRepository) getFeedback(ctx context.Context, q workspaceQuerier, projectID, id string) (pages.Feedback, error) {
	item, err := scanFeedback(q.QueryRow(ctx, feedbackSelect+` WHERE feedback.project_id=$1 AND feedback.id=$2`, projectID, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return pages.Feedback{}, service.ErrWorkspaceNotFound
	}
	return item, err
}
func feedbackTaskStatus(status string) string {
	if status == "แก้ไขแล้ว" {
		return "เสร็จแล้ว"
	}
	return "กำลังทำ"
}
func (r *WorkspaceRepository) feedbackSource(ctx context.Context, q workspaceQuerier, projectID, meetingID, provider string) (string, error) {
	if meetingID == "" {
		return "Feedback จาก " + provider, nil
	}
	var title, date string
	err := q.QueryRow(ctx, `SELECT title,meeting_date::text FROM meetings WHERE project_id=$1 AND id=$2`, projectID, meetingID).Scan(&title, &date)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("Feedback จาก: %s — %s", title, date), nil
}
func (r *WorkspaceRepository) CreateFeedback(ctx context.Context, userID, projectID string, input service.FeedbackInput) (pages.Feedback, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return pages.Feedback{}, err
	}
	defer tx.Rollback(ctx)
	if err = r.requireMember(ctx, tx, userID, projectID); err != nil {
		return pages.Feedback{}, err
	}
	if err = r.validateReferences(ctx, tx, projectID, input.AssigneeID, input.MeetingID); err != nil {
		return pages.Feedback{}, err
	}
	var id string
	err = tx.QueryRow(ctx, `INSERT INTO feedback(project_id,meeting_id,topic,provider,assignee_id,status,result,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`, projectID, nullableUUID(input.MeetingID), input.Topic, input.Provider, nullableUUID(input.AssigneeID), input.Status, input.Result, userID).Scan(&id)
	if err != nil {
		return pages.Feedback{}, err
	}
	source, err := r.feedbackSource(ctx, tx, projectID, input.MeetingID, input.Provider)
	if err != nil {
		return pages.Feedback{}, err
	}
	_, err = tx.Exec(ctx, `INSERT INTO tasks(project_id,meeting_id,feedback_id,title,assignee_id,due_date,status,priority,source,provider,expected_result,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`, projectID, nullableUUID(input.MeetingID), id, input.Topic, nullableUUID(input.AssigneeID), input.DueDate, feedbackTaskStatus(input.Status), input.Priority, source, input.Provider, input.Result, userID)
	if err != nil {
		return pages.Feedback{}, err
	}
	if err = logActivity(ctx, tx, projectID, userID, "feedback.created", fmt.Sprintf("เพิ่ม Feedback '%s' และสร้างงานที่เชื่อมโยง", input.Topic)); err != nil {
		return pages.Feedback{}, err
	}
	item, err := r.getFeedback(ctx, tx, projectID, id)
	if err != nil {
		return pages.Feedback{}, err
	}
	if err = tx.Commit(ctx); err != nil {
		return pages.Feedback{}, err
	}
	return item, nil
}
func (r *WorkspaceRepository) UpdateFeedback(ctx context.Context, userID, projectID, feedbackID string, input service.FeedbackInput) (pages.Feedback, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return pages.Feedback{}, err
	}
	defer tx.Rollback(ctx)
	if err = r.requireMember(ctx, tx, userID, projectID); err != nil {
		return pages.Feedback{}, err
	}
	if err = r.validateReferences(ctx, tx, projectID, input.AssigneeID, input.MeetingID); err != nil {
		return pages.Feedback{}, err
	}
	command, err := tx.Exec(ctx, `UPDATE feedback SET meeting_id=$3,topic=$4,provider=$5,assignee_id=$6,result=$7,updated_at=now() WHERE project_id=$1 AND id=$2`, projectID, feedbackID, nullableUUID(input.MeetingID), input.Topic, input.Provider, nullableUUID(input.AssigneeID), input.Result)
	if err != nil {
		return pages.Feedback{}, err
	}
	if command.RowsAffected() == 0 {
		return pages.Feedback{}, service.ErrWorkspaceNotFound
	}
	source, err := r.feedbackSource(ctx, tx, projectID, input.MeetingID, input.Provider)
	if err != nil {
		return pages.Feedback{}, err
	}
	_, err = tx.Exec(ctx, `UPDATE tasks SET meeting_id=$3,title=$4,assignee_id=$5,due_date=$6,priority=$7,source=$8,provider=$9,expected_result=$10,updated_at=now() WHERE project_id=$1 AND feedback_id=$2`, projectID, feedbackID, nullableUUID(input.MeetingID), input.Topic, nullableUUID(input.AssigneeID), input.DueDate, input.Priority, source, input.Provider, input.Result)
	if err != nil {
		return pages.Feedback{}, err
	}
	if err = logActivity(ctx, tx, projectID, userID, "feedback.updated", fmt.Sprintf("แก้ไข Feedback '%s'", input.Topic)); err != nil {
		return pages.Feedback{}, err
	}
	item, err := r.getFeedback(ctx, tx, projectID, feedbackID)
	if err != nil {
		return pages.Feedback{}, err
	}
	if err = tx.Commit(ctx); err != nil {
		return pages.Feedback{}, err
	}
	return item, nil
}
func (r *WorkspaceRepository) DeleteFeedback(ctx context.Context, userID, projectID, feedbackID string) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if err = r.requireMember(ctx, tx, userID, projectID); err != nil {
		return err
	}
	var topic string
	err = tx.QueryRow(ctx, `DELETE FROM feedback WHERE project_id=$1 AND id=$2 RETURNING topic`, projectID, feedbackID).Scan(&topic)
	if errors.Is(err, pgx.ErrNoRows) {
		return service.ErrWorkspaceNotFound
	}
	if err != nil {
		return err
	}
	if err = logActivity(ctx, tx, projectID, userID, "feedback.deleted", fmt.Sprintf("ลบ Feedback และงานที่เชื่อมโยง '%s'", topic)); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

const eventSelect = `SELECT id::text,project_id::text,title,event_date::text,to_char(event_time,'HH24:MI'),location,tone,created_at,updated_at FROM calendar_events`

func scanEvent(row pgx.Row) (pages.CalendarEvent, error) {
	var item pages.CalendarEvent
	err := row.Scan(&item.ID, &item.ProjectID, &item.Title, &item.DateKey, &item.Time, &item.Location, &item.Tone, &item.CreatedAt, &item.UpdatedAt)
	return item, err
}
func (r *WorkspaceRepository) ListEvents(ctx context.Context, userID, projectID string) ([]pages.CalendarEvent, error) {
	if err := r.requireMember(ctx, r.pool, userID, projectID); err != nil {
		return nil, err
	}
	rows, err := r.pool.Query(ctx, eventSelect+` WHERE project_id=$1 ORDER BY event_date,event_time`, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]pages.CalendarEvent, 0)
	for rows.Next() {
		item, err := scanEvent(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}
func (r *WorkspaceRepository) getEvent(ctx context.Context, q workspaceQuerier, projectID, id string) (pages.CalendarEvent, error) {
	item, err := scanEvent(q.QueryRow(ctx, eventSelect+` WHERE project_id=$1 AND id=$2`, projectID, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return pages.CalendarEvent{}, service.ErrWorkspaceNotFound
	}
	return item, err
}
func (r *WorkspaceRepository) CreateEvent(ctx context.Context, userID, projectID string, input service.EventInput) (pages.CalendarEvent, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return pages.CalendarEvent{}, err
	}
	defer tx.Rollback(ctx)
	if err = r.requireMember(ctx, tx, userID, projectID); err != nil {
		return pages.CalendarEvent{}, err
	}
	var id string
	err = tx.QueryRow(ctx, `INSERT INTO calendar_events(project_id,title,event_date,event_time,location,tone,created_by) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id`, projectID, input.Title, input.DateKey, input.Time, input.Location, input.Tone, userID).Scan(&id)
	if err != nil {
		return pages.CalendarEvent{}, err
	}
	if err = logActivity(ctx, tx, projectID, userID, "event.created", fmt.Sprintf("เพิ่มกิจกรรม '%s'", input.Title)); err != nil {
		return pages.CalendarEvent{}, err
	}
	item, err := r.getEvent(ctx, tx, projectID, id)
	if err != nil {
		return pages.CalendarEvent{}, err
	}
	if err = tx.Commit(ctx); err != nil {
		return pages.CalendarEvent{}, err
	}
	return item, nil
}
func (r *WorkspaceRepository) UpdateEvent(ctx context.Context, userID, projectID, eventID string, input service.EventInput) (pages.CalendarEvent, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return pages.CalendarEvent{}, err
	}
	defer tx.Rollback(ctx)
	if err = r.requireMember(ctx, tx, userID, projectID); err != nil {
		return pages.CalendarEvent{}, err
	}
	command, err := tx.Exec(ctx, `UPDATE calendar_events SET title=$3,event_date=$4,event_time=$5,location=$6,tone=$7,updated_at=now() WHERE project_id=$1 AND id=$2`, projectID, eventID, input.Title, input.DateKey, input.Time, input.Location, input.Tone)
	if err != nil {
		return pages.CalendarEvent{}, err
	}
	if command.RowsAffected() == 0 {
		return pages.CalendarEvent{}, service.ErrWorkspaceNotFound
	}
	if err = logActivity(ctx, tx, projectID, userID, "event.updated", fmt.Sprintf("แก้ไขกิจกรรม '%s'", input.Title)); err != nil {
		return pages.CalendarEvent{}, err
	}
	item, err := r.getEvent(ctx, tx, projectID, eventID)
	if err != nil {
		return pages.CalendarEvent{}, err
	}
	if err = tx.Commit(ctx); err != nil {
		return pages.CalendarEvent{}, err
	}
	return item, nil
}
func (r *WorkspaceRepository) DeleteEvent(ctx context.Context, userID, projectID, eventID string) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if err = r.requireMember(ctx, tx, userID, projectID); err != nil {
		return err
	}
	var title string
	err = tx.QueryRow(ctx, `DELETE FROM calendar_events WHERE project_id=$1 AND id=$2 RETURNING title`, projectID, eventID).Scan(&title)
	if errors.Is(err, pgx.ErrNoRows) {
		return service.ErrWorkspaceNotFound
	}
	if err != nil {
		return err
	}
	if err = logActivity(ctx, tx, projectID, userID, "event.deleted", fmt.Sprintf("ลบกิจกรรม '%s'", title)); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (r *WorkspaceRepository) ListActivity(ctx context.Context, userID, projectID string, limit int) ([]pages.ActivityLog, error) {
	if err := r.requireMember(ctx, r.pool, userID, projectID); err != nil {
		return nil, err
	}
	rows, err := r.pool.Query(ctx, `SELECT log.id::text,log.project_id::text,account.id::text,account.display_name,log.event_type,log.message,log.created_at FROM project_activity_logs log LEFT JOIN users account ON account.id=log.actor_id WHERE log.project_id=$1 ORDER BY log.created_at DESC LIMIT $2`, projectID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]pages.ActivityLog, 0)
	for rows.Next() {
		var item pages.ActivityLog
		var actorID, actorName pgtype.Text
		if err := rows.Scan(&item.ID, &item.ProjectID, &actorID, &actorName, &item.EventType, &item.Message, &item.CreatedAt); err != nil {
			return nil, err
		}
		if actorID.Valid {
			item.Actor = &pages.MemberSummary{ID: actorID.String, DisplayName: actorName.String}
		}
		items = append(items, item)
	}
	return items, rows.Err()
}
