DELETE FROM project_activity_logs
WHERE created_at < now() - interval '90 days'
   OR event_type NOT IN (
       'task.deleted',
       'feedback.deleted',
       'meeting.deleted',
       'event.deleted',
       'member.joined',
       'member.removed',
       'member.role_updated'
   );
