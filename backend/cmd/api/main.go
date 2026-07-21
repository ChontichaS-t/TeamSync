package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"teamsync/backend/internal/config"
	"teamsync/backend/internal/controller"
	"teamsync/backend/internal/database"
	"teamsync/backend/internal/repository"
	"teamsync/backend/internal/service"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	slog.SetDefault(logger)

	appConfig, err := config.Load()
	if err != nil {
		slog.Error("invalid configuration", "error", err)
		os.Exit(1)
	}

	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer cancel()

	pool, err := database.Open(ctx, appConfig.DatabaseURL)
	if err != nil {
		slog.Error("database connection failed", "error", err)
		os.Exit(1)
	}
	defer pool.Close()
	if err := database.Migrate(ctx, pool); err != nil {
		slog.Error("database migration failed", "error", err)
		os.Exit(1)
	}

	authRepository := repository.NewAuthRepository(pool)
	authService, err := service.NewAuthService(authRepository)
	if err != nil {
		slog.Error("authentication setup failed", "error", err)
		os.Exit(1)
	}

	server := &http.Server{
		Addr:              appConfig.Address,
		Handler:           controller.NewServer(appConfig, pool, authService).Handler(),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      15 * time.Second,
		IdleTimeout:       60 * time.Second,
		MaxHeaderBytes:    1 << 20,
	}

	go func() {
		slog.Info("API listening", "address", appConfig.Address)
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			slog.Error("API server failed", "error", err)
			cancel()
		}
	}()

	<-ctx.Done()
	shutdownContext, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()
	if err := server.Shutdown(shutdownContext); err != nil {
		slog.Error("API shutdown failed", "error", err)
	}
}
