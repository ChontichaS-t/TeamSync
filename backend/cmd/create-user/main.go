package main

import (
	"context"
	"flag"
	"fmt"
	"io"
	"os"
	"strings"

	"golang.org/x/term"

	"teamsync/backend/internal/config"
	"teamsync/backend/internal/database"
	"teamsync/backend/internal/repository"
	"teamsync/backend/internal/service"
)

func main() {
	emailFlag := flag.String("email", "", "email address for the new user")
	nameFlag := flag.String("name", "", "display name for the new user")
	passwordStdin := flag.Bool("password-stdin", false, "read one password from standard input (for automation)")
	flag.Parse()

	email, err := service.NormalizeEmail(*emailFlag)
	if err != nil {
		fatal("invalid email address")
	}

	var passwordBytes []byte
	if *passwordStdin {
		passwordBytes, err = io.ReadAll(io.LimitReader(os.Stdin, 1024))
		passwordBytes = []byte(strings.TrimRight(string(passwordBytes), "\r\n"))
		if err != nil {
			fatal("unable to read password from standard input")
		}
	} else {
		fmt.Print("Password (12-128 characters): ")
		passwordBytes, err = term.ReadPassword(int(os.Stdin.Fd()))
		fmt.Println()
		if err != nil {
			fatal("unable to read password from terminal")
		}
		fmt.Print("Confirm password: ")
		confirmationBytes, readErr := term.ReadPassword(int(os.Stdin.Fd()))
		fmt.Println()
		if readErr != nil {
			fatal("unable to read password confirmation")
		}
		if string(passwordBytes) != string(confirmationBytes) {
			fatal("passwords do not match")
		}
		for index := range confirmationBytes {
			confirmationBytes[index] = 0
		}
	}

	passwordHash, err := service.HashPassword(string(passwordBytes))
	for index := range passwordBytes {
		passwordBytes[index] = 0
	}
	if err != nil {
		fatal(err.Error())
	}

	appConfig, err := config.Load()
	if err != nil {
		fatal(err.Error())
	}
	ctx := context.Background()
	pool, err := database.Open(ctx, appConfig.DatabaseURL)
	if err != nil {
		fatal(err.Error())
	}
	defer pool.Close()
	if err := database.Migrate(ctx, pool); err != nil {
		fatal(err.Error())
	}

	authRepository := repository.NewAuthRepository(pool)
	user, err := authRepository.CreateUser(ctx, email, strings.TrimSpace(*nameFlag), passwordHash)
	if err != nil {
		fatal(err.Error())
	}
	fmt.Printf("Created user %s (%s)\n", user.Email, user.ID)
}

func fatal(message string) {
	fmt.Fprintln(os.Stderr, "Error:", message)
	os.Exit(1)
}
