"use client";

import { ChevronDown, LogOut, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type UserProfileMenuProps = {
  displayName?: string;
};

type SessionUser = {
  displayName: string;
};

export function UserProfileMenu({ displayName }: UserProfileMenuProps) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const [sessionDisplayName, setSessionDisplayName] = useState(displayName || "");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    if (displayName) {
      setSessionDisplayName(displayName);
      return;
    }

    const controller = new AbortController();

    async function loadSession() {
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) {
          router.replace("/login");
          return;
        }
        const result = (await response.json()) as { user: SessionUser };
        setSessionDisplayName(result.user.displayName);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          router.replace("/login");
        }
      }
    }

    void loadSession();
    return () => controller.abort();
  }, [displayName, router]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsMenuOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  async function logout() {
    setIsLoggingOut(true);
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    }).catch(() => undefined);
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="home-profile" ref={menuRef}>
      <button
        className="home-profile-trigger"
        type="button"
        aria-label="Open user menu"
        aria-haspopup="menu"
        aria-expanded={isMenuOpen}
        onClick={() => setIsMenuOpen((isOpen) => !isOpen)}
      >
        <span className="home-profile-avatar" aria-hidden="true">
          <UserRound />
        </span>
        <span className="home-profile-name">
          Hello, {sessionDisplayName || "Team member"}
        </span>
        <ChevronDown className="home-profile-chevron" aria-hidden="true" />
      </button>

      {isMenuOpen && (
        <div className="home-profile-menu" role="menu">
          <button role="menuitem" type="button" onClick={logout} disabled={isLoggingOut}>
            <LogOut aria-hidden="true" />
            <span>{isLoggingOut ? "Signing out..." : "Logout"}</span>
          </button>
        </div>
      )}
    </div>
  );
}
