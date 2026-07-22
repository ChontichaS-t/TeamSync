package controller

import (
	"context"

	"teamsync/backend/internal/config"
	"teamsync/backend/internal/middleware"
	"teamsync/backend/internal/service"
)

type Database interface {
	Ping(context.Context) error
}

type Server struct {
	config   config.Config
	database Database
	auth     *service.AuthService
	projects *service.ProjectService
	limiter  *middleware.LoginLimiter
}

func NewServer(cfg config.Config, database Database, authService *service.AuthService, projectService *service.ProjectService) *Server {
	return &Server{
		config:   cfg,
		database: database,
		auth:     authService,
		projects: projectService,
		limiter:  middleware.NewLoginLimiter(),
	}
}
