package database

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

// PruneActivityLogs deletes audit entries after the 90-day retention window.
func PruneActivityLogs(ctx context.Context, pool *pgxpool.Pool) error {
	if _, err := pool.Exec(ctx, `DELETE FROM project_activity_logs WHERE created_at < now() - interval '90 days'`); err != nil {
		return fmt.Errorf("prune activity logs: %w", err)
	}
	return nil
}
