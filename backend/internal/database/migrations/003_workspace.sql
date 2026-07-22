ALTER TABLE project_activity_logs
    ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS meetings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title text NOT NULL,
    meeting_date date NOT NULL,
    summary text[] NOT NULL DEFAULT '{}',
    agreed text[] NOT NULL DEFAULT '{}',
    created_by uuid REFERENCES users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS meetings_project_date_idx ON meetings (project_id, meeting_date DESC);

CREATE TABLE IF NOT EXISTS feedback (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    meeting_id uuid REFERENCES meetings(id) ON DELETE SET NULL,
    topic text NOT NULL,
    provider text NOT NULL,
    assignee_id uuid REFERENCES users(id) ON DELETE SET NULL,
    status text NOT NULL DEFAULT 'กำลังแก้ไข' CHECK (status IN ('กำลังแก้ไข', 'แก้ไขแล้ว')),
    result text NOT NULL DEFAULT '',
    created_by uuid REFERENCES users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS feedback_project_created_idx ON feedback (project_id, created_at DESC);

CREATE TABLE IF NOT EXISTS tasks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    meeting_id uuid REFERENCES meetings(id) ON DELETE SET NULL,
    feedback_id uuid REFERENCES feedback(id) ON DELETE CASCADE,
    title text NOT NULL,
    assignee_id uuid REFERENCES users(id) ON DELETE SET NULL,
    due_date date NOT NULL,
    status text NOT NULL DEFAULT 'ยังไม่เริ่ม' CHECK (status IN ('ยังไม่เริ่ม', 'กำลังทำ', 'รอตรวจ', 'เสร็จแล้ว')),
    priority text NOT NULL DEFAULT 'ปานกลาง' CHECK (priority IN ('ต่ำ', 'ปานกลาง', 'สูง')),
    source text NOT NULL DEFAULT '',
    created_by uuid REFERENCES users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS tasks_feedback_unique_idx ON tasks (feedback_id) WHERE feedback_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS tasks_project_due_idx ON tasks (project_id, due_date);
CREATE INDEX IF NOT EXISTS tasks_assignee_idx ON tasks (assignee_id);

CREATE TABLE IF NOT EXISTS calendar_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title text NOT NULL,
    event_date date NOT NULL,
    event_time time NOT NULL,
    location text NOT NULL DEFAULT '',
    tone text NOT NULL DEFAULT 'blue' CHECK (tone IN ('blue', 'green', 'orange', 'purple')),
    created_by uuid REFERENCES users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS calendar_events_project_date_idx
    ON calendar_events (project_id, event_date, event_time);
