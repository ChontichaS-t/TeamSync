"use client";

import { CalendarDays, FolderKanban, LogOut, MoreHorizontal } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type User = {
  displayName: string;
};

const projects = [
  { id: 1, cover: "/pageblue.jpg" },
  { id: 2, cover: "/pageorange.jpg" },
  { id: 3, cover: "/pagepink.jpg" },
  { id: 4, cover: "/pagepurple.jpg" },
  { id: 5, cover: "/pagered.jpg" },
];

const projectMembers = ["/cv1.png", "/cv2.png", "/cv3.png"];

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
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
        const result = (await response.json()) as { user: User };
        setUser(result.user);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          router.replace("/login");
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    void loadSession();
    return () => controller.abort();
  }, [router]);

  async function logout() {
    setIsLoggingOut(true);
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    }).catch(() => undefined);
    router.replace("/login");
    router.refresh();
  }

  if (isLoading || !user) {
    return <main className="home-loading">Checking your session...</main>;
  }

  return (
    <main className="home-page">
      <nav className="auth-navbar home-navbar" aria-label="Main navigation">
        <a className="brand" href="/home" aria-label="TeamSync home">
          <span>TeamSync</span>
        </a>
        <button className="auth-navbar-cta home-logout-button" type="button" onClick={logout} disabled={isLoggingOut}>
          <LogOut aria-hidden="true" />
          <span>{isLoggingOut ? "Signing out..." : "Logout"}</span>
        </button>
      </nav>

      <section className="home-workspace" aria-labelledby="home-title">
        <header className="home-heading">
          <div>
            <p className="home-eyebrow">Welcome, {user.displayName || "Team member"}</p>
            <h1 id="home-title">Project room</h1>
            <p className="home-description">Everything your team is building, in one shared view.</p>
          </div>
          <div className="home-project-count" aria-label="5 active projects">
            <FolderKanban aria-hidden="true" />
            <span><strong>5</strong> active projects</span>
          </div>
        </header>

        <div className="project-grid" id="projects">
          {projects.map((project, index) => (
            <article className="project-card" key={project.id}>
              <Image
                className="project-cover-image"
                src={project.cover}
                alt={`Project cover ${index + 1}`}
                fill
                sizes="(max-width: 520px) 92vw, (max-width: 760px) 46vw, (max-width: 1180px) 31vw, 18vw"
                priority={index < 2}
              />
              <div className="project-card-topbar">
                <span className="project-menu" aria-hidden="true"><MoreHorizontal /></span>
              </div>

              <div className="project-card-content">
                <p className="project-label">ชื่อโปรเจกต์</p>
                <h2>Badminton Tournament System</h2>

                <div className="project-progress-row">
                  <span>ความคืบหน้า</span>
                  <strong>65%</strong>
                </div>
                <div className="project-progress" aria-label="Project progress 65 percent">
                  <span />
                </div>

                <div className="project-deadline">
                  <CalendarDays aria-hidden="true" />
                  <span>กำหนดส่ง 30 กันยายน 2026</span>
                </div>

                <div className="project-members" aria-label="3 project members">
                  <div className="project-member-avatars">
                    {projectMembers.map((member, memberIndex) => (
                      <span className="project-member-avatar" key={member}>
                        <Image
                          src={member}
                          alt={`Project member ${memberIndex + 1}`}
                          fill
                          sizes="28px"
                        />
                      </span>
                    ))}
                  </div>
                  <span className="project-member-count">3</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
