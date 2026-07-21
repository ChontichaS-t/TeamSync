package service

import "testing"

func TestHashAndVerifyPassword(t *testing.T) {
	password := "correct horse battery staple"
	hash, err := HashPassword(password)
	if err != nil {
		t.Fatalf("HashPassword() error = %v", err)
	}

	valid, err := VerifyPassword(password, hash)
	if err != nil {
		t.Fatalf("VerifyPassword() error = %v", err)
	}
	if !valid {
		t.Fatal("VerifyPassword() = false, want true")
	}

	valid, err = VerifyPassword("wrong password", hash)
	if err != nil {
		t.Fatalf("VerifyPassword(wrong) error = %v", err)
	}
	if valid {
		t.Fatal("VerifyPassword(wrong) = true, want false")
	}
}

func TestPasswordPolicy(t *testing.T) {
	if _, err := HashPassword("too-short"); err != ErrPasswordPolicy {
		t.Fatalf("HashPassword(short) error = %v, want ErrPasswordPolicy", err)
	}
}

func TestNormalizeDisplayName(t *testing.T) {
	name, err := NormalizeDisplayName("  Team Member  ")
	if err != nil {
		t.Fatalf("NormalizeDisplayName() error = %v", err)
	}
	if name != "Team Member" {
		t.Fatalf("NormalizeDisplayName() = %q, want %q", name, "Team Member")
	}
	if _, err := NormalizeDisplayName("   "); err != ErrDisplayName {
		t.Fatalf("NormalizeDisplayName(empty) error = %v, want ErrDisplayName", err)
	}
}
