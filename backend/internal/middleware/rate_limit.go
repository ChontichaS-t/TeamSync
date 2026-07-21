package middleware

import (
	"crypto/sha256"
	"encoding/hex"
	"sync"
	"time"
)

type rateEntry struct {
	count   int
	resetAt time.Time
}

type LoginLimiter struct {
	mu      sync.Mutex
	entries map[string]rateEntry
}

func NewLoginLimiter() *LoginLimiter {
	return &LoginLimiter{entries: make(map[string]rateEntry)}
}

func (l *LoginLimiter) AllowIPAndEmail(ip, email string, now time.Time) bool {
	l.mu.Lock()
	defer l.mu.Unlock()

	l.removeExpiredEntries(now)
	emailDigest := sha256.Sum256([]byte(email))
	emailKey := "email:" + hex.EncodeToString(emailDigest[:8])
	return l.allow("ip:"+ip, 20, time.Minute, now) && l.allow(emailKey, 5, time.Minute, now)
}

func (l *LoginLimiter) Allow(key string, limit int, window time.Duration, now time.Time) bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	l.removeExpiredEntries(now)
	return l.allow(key, limit, window, now)
}

func (l *LoginLimiter) removeExpiredEntries(now time.Time) {
	if len(l.entries) <= 10_000 {
		return
	}
	for key, entry := range l.entries {
		if now.After(entry.resetAt) {
			delete(l.entries, key)
		}
	}
}

func (l *LoginLimiter) allow(key string, limit int, window time.Duration, now time.Time) bool {
	entry, ok := l.entries[key]
	if !ok || !now.Before(entry.resetAt) {
		l.entries[key] = rateEntry{count: 1, resetAt: now.Add(window)}
		return true
	}
	if entry.count >= limit {
		return false
	}
	entry.count++
	l.entries[key] = entry
	return true
}
