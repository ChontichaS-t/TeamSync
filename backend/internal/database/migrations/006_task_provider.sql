ALTER TABLE tasks
    ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT '';

UPDATE tasks AS task
SET provider = feedback.provider
FROM feedback
WHERE task.feedback_id = feedback.id
  AND task.provider = '';
