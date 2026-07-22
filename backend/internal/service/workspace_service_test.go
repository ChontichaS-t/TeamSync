package service

import "testing"

func TestNormalizeTaskInput(t *testing.T) {
	input := TaskInput{Title: "  ออกแบบหน้า Dashboard  ", DueDate: "2026-08-01"}
	if !normalizeTaskInput(&input) {
		t.Fatal("valid task was rejected")
	}
	if input.Title != "ออกแบบหน้า Dashboard" || input.Status != "ยังไม่เริ่ม" || input.Priority != "ปานกลาง" {
		t.Fatalf("unexpected normalized task: %#v", input)
	}
	invalid := TaskInput{Title: "งาน", DueDate: "01/08/2026", Status: "ผิด", Priority: "สูง"}
	if normalizeTaskInput(&invalid) {
		t.Fatal("invalid task was accepted")
	}
}

func TestNormalizeFeedbackInput(t *testing.T) {
	input := FeedbackInput{Topic: "  ปรับหน้า Monitor ", Provider: "อาจารย์", Status: "กำลังแก้ไข", Priority: "สูง", DueDate: "2026-08-01"}
	if !normalizeFeedbackInput(&input) {
		t.Fatal("valid feedback was rejected")
	}
	if input.Topic != "ปรับหน้า Monitor" {
		t.Fatalf("topic was not trimmed: %q", input.Topic)
	}
	invalid := FeedbackInput{Topic: "หัวข้อ", Provider: "", DueDate: "2026-08-01", Status: "กำลังแก้ไข", Priority: "สูง"}
	if normalizeFeedbackInput(&invalid) {
		t.Fatal("feedback without provider was accepted")
	}
}

func TestNormalizeEventInput(t *testing.T) {
	input := EventInput{Title: "ประชุมทีม", DateKey: "2026-07-23", Time: "10:00", Tone: "blue"}
	if !normalizeEventInput(&input) {
		t.Fatal("valid event was rejected")
	}
	if input.Location != "ออนไลน์" {
		t.Fatalf("default location = %q", input.Location)
	}
	input.Tone = "red"
	if normalizeEventInput(&input) {
		t.Fatal("invalid event tone was accepted")
	}
}

func TestNormalizeMeetingInput(t *testing.T) {
	input := MeetingInput{Title: " ประชุม Sprint ", Date: "2026-07-25", Summary: []string{" ข้อหนึ่ง ", ""}, Agreed: []string{" ทำต่อ "}}
	if !normalizeMeetingInput(&input) {
		t.Fatal("valid meeting was rejected")
	}
	if len(input.Summary) != 1 || input.Summary[0] != "ข้อหนึ่ง" {
		t.Fatalf("summary was not cleaned: %#v", input.Summary)
	}
}

func TestNormalizeProjectInput(t *testing.T) {
	input := EnsureProjectInput{Title: " TeamSync ", Progress: 50}
	if !normalizeProjectInput(&input, false) {
		t.Fatal("valid project was rejected")
	}
	if input.Title != "TeamSync" || input.Cover == "" || input.Tag == "" {
		t.Fatalf("unexpected normalized project: %#v", input)
	}
	if normalizeProjectInput(&input, true) {
		t.Fatal("ensure project accepted an empty external key")
	}
}

func TestInvitationTokenValidation(t *testing.T) {
	if _, err := invitationTokenHash("not-a-token"); err != ErrInvitationInvalid {
		t.Fatalf("error = %v", err)
	}
}
