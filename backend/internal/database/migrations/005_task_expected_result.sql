ALTER TABLE tasks
    ADD COLUMN IF NOT EXISTS expected_result text NOT NULL DEFAULT '';

UPDATE tasks AS task
SET expected_result = feedback.result
FROM feedback
WHERE task.feedback_id = feedback.id
  AND task.expected_result = '';
