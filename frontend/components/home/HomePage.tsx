"use client";

import { AddProjectModal, NewProjectData } from "@/components/global/AddProjectModal";
import { AlertDialogSmall } from "@/components/global/AlertDialogSmall";
import { CalendarDays, Edit3, FolderKanban, LogOut, MoreHorizontal, Plus, Search, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type User = {
  displayName: string;
};

type ProjectItem = {
  id: number | string;
  title: string;
  description?: string;
  cover: string;
  tags: string;
  deadline: string;
  progress: number;
  members: string[];
};

const INITIAL_PROJECTS: ProjectItem[] = [
  { id: 1, title: "Badminton Tournament System", cover: "/new/newsea.jpg", tags: "blue", deadline: "กำหนดส่ง 30 กันยายน 2026", progress: 65, members: ["/cv1.png"] },
  { id: 2, title: "Badminton Tournament System", cover: "/new/newtrain.jpg", tags: "purple", deadline: "กำหนดส่ง 30 กันยายน 2026", progress: 65, members: ["/cv1.png"] },
  { id: 3, title: "Badminton Tournament System", cover: "/new/newrabbit.jpg", tags: "pink", deadline: "กำหนดส่ง 30 กันยายน 2026", progress: 65, members: ["/cv1.png"] },
  { id: 4, title: "Badminton Tournament System", cover: "/new/newgrli.jpg", tags: "brown", deadline: "กำหนดส่ง 30 กันยายน 2026", progress: 65, members: ["/cv1.png"] },
  { id: 5, title: "Badminton Tournament System", cover: "/new/newwindow.jpg", tags: "red", deadline: "กำหนดส่ง 30 กันยายน 2026", progress: 65, members: ["/cv1.png"] },
];

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // State for projects, modal, menu, and delete dialog
  const [projects, setProjects] = useState<ProjectItem[]>(INITIAL_PROJECTS);
  const [isAddProjectModalOpen, setIsAddProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectItem | null>(null);
  const [activeMenuProjectId, setActiveMenuProjectId] = useState<number | string | null>(null);
  const [deletingProject, setDeletingProject] = useState<ProjectItem | null>(null);

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredProjects = projects.filter((project) =>
    `${project.title} project ${project.progress}% ${project.deadline} ${project.tags}`
      .toLowerCase()
      .includes(normalizedQuery),
  );

  // Close dropdown menu when clicking outside
  useEffect(() => {
    if (activeMenuProjectId === null) return;
    const handleClickOutside = () => setActiveMenuProjectId(null);
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, [activeMenuProjectId]);

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

  // Create or Update Project
  const handleSaveProject = (projectData: NewProjectData) => {
    if (editingProject) {
      // Update existing project
      setProjects((prev) =>
        prev.map((p) =>
          p.id === editingProject.id
            ? {
                ...p,
                title: projectData.title,
                description: projectData.description,
                cover: projectData.cover,
                tags: projectData.tags,
                deadline: `กำหนดส่ง ${projectData.deadline}`,
                members: projectData.members.length > 0 ? projectData.members : p.members,
              }
            : p
        )
      );
      setEditingProject(null);
    } else {
      // Add new project
      const newProject: ProjectItem = {
        id: Date.now(),
        title: projectData.title,
        description: projectData.description,
        cover: projectData.cover,
        tags: projectData.tags,
        deadline: `กำหนดส่ง ${projectData.deadline}`,
        progress: projectData.progress || 0,
        members: projectData.members.length > 0 ? projectData.members : ["/cv1.png", "/cv2.png", "/cv3.png"],
      };
      setProjects((prev) => [newProject, ...prev]);
    }
  };

  // Confirm Delete Project
  const handleConfirmDelete = () => {
    if (!deletingProject) return;
    setProjects((prev) => prev.filter((p) => p.id !== deletingProject.id));
    setDeletingProject(null);
  };

  if (isLoading || !user) {
    return <main className="home-loading">Checking your session...</main>;
  }

  return (
    <main className="home-page">
      <nav className="auth-navbar home-navbar" aria-label="Main navigation">
        <a className="brand" href="/home" aria-label="TeamSync home">
          <span>TeamSync</span>
        </a>
        <label className="home-navbar-search">
          <Search aria-hidden="true" />
          <input
            type="search"
            placeholder="Search tasks, projects, or team..."
            aria-label="Search tasks, projects, or team"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </label>
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
          <div className="home-heading-actions">
            <div className="home-project-count" aria-label={`${filteredProjects.length} matching projects`}>
              <FolderKanban aria-hidden="true" />
              <span><strong>{filteredProjects.length}</strong> {normalizedQuery ? "results" : "active projects"}</span>
            </div>
            <button
              className="new-project-button"
              type="button"
              onClick={() => {
                setEditingProject(null);
                setIsAddProjectModalOpen(true);
              }}
            >
              <Plus aria-hidden="true" />
              <span>New Project</span>
            </button>
          </div>
        </header>

        <div className="project-grid" id="projects">
          {filteredProjects.map((project, index) => {
            const isMenuOpen = activeMenuProjectId === project.id;
            return (
              <Link
                className="project-card"
                href={`/project?cover=${encodeURIComponent(project.cover)}`}
                aria-label={`Open ${project.title} project`}
                key={project.id}
              >
                <Image
                  className="project-cover-image"
                  src={project.cover}
                  alt={`${project.title} cover`}
                  fill
                  sizes="(max-width: 520px) 92vw, (max-width: 760px) 46vw, (max-width: 1180px) 31vw, 18vw"
                  priority={index < 2}
                />

                {/* 3-Dots Topbar Button & Dropdown Menu */}
                <div className="project-card-topbar">
                  <button
                    className="project-menu-btn"
                    type="button"
                    aria-label="Project actions"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setActiveMenuProjectId((prev) => (prev === project.id ? null : project.id));
                    }}
                  >
                    <MoreHorizontal aria-hidden="true" />
                  </button>

                  {/* Dropdown Popover */}
                  {isMenuOpen && (
                    <div
                      className="project-menu-dropdown"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                    >
                      <button
                        type="button"
                        className="project-menu-item"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setActiveMenuProjectId(null);
                          setEditingProject(project);
                          setIsAddProjectModalOpen(true);
                        }}
                      >
                        <Edit3 aria-hidden="true" />
                        <span>แก้ไขโปรเจกต์</span>
                      </button>

                      <button
                        type="button"
                        className="project-menu-item danger"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setActiveMenuProjectId(null);
                          setDeletingProject(project);
                        }}
                      >
                        <Trash2 aria-hidden="true" />
                        <span>ลบโปรเจกต์</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="project-card-content">
                  <h2>{project.title}</h2>

                  <div className="project-progress-row">
                    <span>ความคืบหน้า</span>
                    <strong>{project.progress}%</strong>
                  </div>
                  <div className="project-progress" aria-label={`Project progress ${project.progress} percent`}>
                    <span style={{ width: `${project.progress}%` }} />
                  </div>

                  <div className="project-deadline">
                    <CalendarDays aria-hidden="true" />
                    <span>{project.deadline}</span>
                  </div>

                  <div className="project-members" aria-label="1 project member">
                    <div className="project-member-avatars">
                      <span className="project-member-avatar">
                        <Image
                          src={project.members[0] || "/cv1.png"}
                          alt="Project owner"
                          fill
                          sizes="28px"
                        />
                      </span>
                    </div>
                    <span className="project-member-count">1</span>
                  </div>
                </div>
              </Link>
            );
          })}
          {filteredProjects.length === 0 && (
            <div className="project-empty-state" role="status">
              <Search aria-hidden="true" />
              <h2>No projects found</h2>
              <p>Try another project name or color.</p>
            </div>
          )}
        </div>
      </section>

      {/* Add / Edit Project Modal */}
      <AddProjectModal
        isOpen={isAddProjectModalOpen}
        onClose={() => {
          setIsAddProjectModalOpen(false);
          setEditingProject(null);
        }}
        onSave={handleSaveProject}
        initialData={
          editingProject
            ? {
                id: editingProject.id,
                title: editingProject.title,
                description: editingProject.description || "",
                cover: editingProject.cover,
                tags: editingProject.tags,
                deadline: editingProject.deadline,
                progress: editingProject.progress,
                members: editingProject.members,
              }
            : null
        }
      />

      {/* Delete Confirmation Modal using shared AlertDialogSmall */}
      <AlertDialogSmall
        open={Boolean(deletingProject)}
        onOpenChange={(open) => {
          if (!open) setDeletingProject(null);
        }}
        title="ยืนยันการลบโปรเจกต์"
        description={`คุณแน่ใจหรือไม่ว่าต้องการลบโปรเจกต์ "${deletingProject?.title || ""}"? ข้อมูลโปรเจกต์นี้จะถูกลบออกจากระบบและไม่สามารถกู้คืนได้`}
        cancelText="ยกเลิก"
        actionText="ลบโปรเจกต์"
        variant="destructive"
        onAction={handleConfirmDelete}
      />
    </main>
  );
}
