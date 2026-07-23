"use client";

import { AddProjectModal, NewProjectData } from "@/components/global/AddProjectModal";
import { AlertDialogSmall } from "@/components/global/AlertDialogSmall";
import { UserProfileMenu } from "@/components/global/UserProfileMenu";
import { CalendarDays, Edit3, FolderKanban, MoreHorizontal, Plus, Search, Trash2, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

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
  memberCount?: number;
  role?: "owner" | "admin" | "member";
};

const THEME_COLORS: Record<string, { light: string; dark: string }> = {
  "/new/newsea.jpg": { light: "#1a77a6", dark: "#38bdf8" },
  "/new/newtrain.jpg": { light: "#351e7a", dark: "#a78bfa" },
  "/new/newrabbit.jpg": { light: "#db2777", dark: "#f472b6" },
  "/new/newgrli.jpg": { light: "#5D4037", dark: "#bcaaa4" },
  "/new/newwindow.jpg": { light: "#bb5b12", dark: "#fb923c" },
  "/new/newbed.jpg": { light: "#1a77a6", dark: "#38bdf8" },
  "/new/newboy.jpg": { light: "#1a77a6", dark: "#38bdf8" },
  "/new/newdog.jpg": { light: "#16a34a", dark: "#4ade80" },
};

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // State for projects, modal, menu, and delete dialog
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [apiError, setApiError] = useState("");
  const [isAddProjectModalOpen, setIsAddProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectItem | null>(null);
  const [pendingProjectEdit, setPendingProjectEdit] = useState<PendingProjectEdit | null>(null);
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

        const projectResult = await apiFetch<{
            projects: Array<{
              id: string;
              title: string;
              description: string;
              cover: string;
              tags: string;
              deadline: string;
              progress: number;
              memberCount: number;
              memberAvatars?: string[];
              role: "owner" | "admin" | "member";
            }>;
          }>("/api/projects", { signal: controller.signal });
          const backendProjects: ProjectItem[] = projectResult.projects.map((project) => ({
              ...project,
              deadline: project.deadline || "ยังไม่ระบุกำหนดส่ง",
              members: (project.memberAvatars?.length ? project.memberAvatars : ["/cv1.png"]).slice(0, 6).map(
                (avatarUrl, memberIndex) => avatarUrl || `/cv${(memberIndex % 5) + 1}.png`,
              ),
            }));
          setProjects(backendProjects);
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

  const persistProject = async (projectData: NewProjectData, projectToEdit: ProjectItem | null) => {
    setApiError("");
    try {
      const payload = JSON.stringify({
        title: projectData.title,
        description: projectData.description,
        cover: projectData.cover,
        tags: projectData.tags,
        deadline: `กำหนดส่ง ${projectData.deadline}`,
        progress: projectData.progress || 0,
      });
      const saved = await apiFetch<Omit<ProjectItem, "members">>(
        projectToEdit ? `/api/projects/${encodeURIComponent(String(projectToEdit.id))}` : "/api/projects",
        { method: projectToEdit ? "PUT" : "POST", body: payload },
      );
      const next = { ...saved, members: projectToEdit?.members || ["/cv1.png"] };
      setProjects((current) => projectToEdit
        ? current.map((project) => project.id === projectToEdit.id ? next : project)
        : [next, ...current]);
      setEditingProject(null);
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "ไม่สามารถบันทึกโปรเจกต์ได้");
    }
  };

  // New projects are created immediately. Editing an existing project requires confirmation.
  const handleSaveProject = (projectData: NewProjectData) => {
    if (editingProject) {
      setPendingProjectEdit({ project: editingProject, data: projectData });
      return;
    }
    void persistProject(projectData, null);
  };

  // Confirm Delete Project
  const handleConfirmDelete = async () => {
    if (!deletingProject) return;
    try {
      await apiFetch<void>(`/api/projects/${encodeURIComponent(String(deletingProject.id))}`, { method: "DELETE" });
      setProjects((prev) => prev.filter((p) => p.id !== deletingProject.id));
      setDeletingProject(null);
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "ไม่สามารถลบโปรเจกต์ได้");
    }
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
        <UserProfileMenu displayName={user.displayName} />
      </nav>

      <section className="home-workspace" aria-labelledby="home-title">
        {apiError && (
          <div className="home-api-alert" role="alert">
            <span className="home-api-alert-copy">
              <strong>
                {apiError.includes("ไม่มีสิทธิ์")
                  ? "ไม่สามารถดำเนินการได้"
                  : "เกิดข้อผิดพลาด"}
              </strong>
              <span>{apiError}</span>
            </span>
            <button
              type="button"
              className="home-api-alert-close"
              aria-label="ปิดข้อความแจ้งเตือน"
              onClick={() => setApiError("")}
            >
              <X aria-hidden="true" />
            </button>
          </div>
        )}
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
            const totalMemberCount = project.memberCount ?? project.members.length;
            const themeColors = THEME_COLORS[project.cover] || { light: "rgba(24, 39, 33, .72)", dark: "#10b981" };
            return (
              <Link
                className="project-card"
                href={`/project?projectId=${encodeURIComponent(String(project.id))}`}
                aria-label={`Open ${project.title} project`}
                key={project.id}
                style={{
                  "--project-theme-color-light": themeColors.light,
                  "--project-theme-color-dark": themeColors.dark,
                } as React.CSSProperties}
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

                  <div className="project-members" aria-label={`${totalMemberCount} project members`}>
                    <div className="project-member-avatars">
                      {project.members.slice(0, 6).map((avatarUrl, memberIndex) => (
                        <span className="project-member-avatar" key={`${avatarUrl}-${memberIndex}`}>
                          <Image
                            src={avatarUrl || `/cv${(memberIndex % 5) + 1}.png`}
                            alt={`Project member ${memberIndex + 1}`}
                            fill
                            sizes="29px"
                          />
                        </span>
                      ))}
                    </div>
                    <span className="project-member-count">{totalMemberCount}</span>
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

      {/* Edit Confirmation Modal using the same shared card as other pages */}
      <AlertDialogSmall
        open={Boolean(pendingProjectEdit)}
        onOpenChange={(open) => {
          if (!open) setPendingProjectEdit(null);
        }}
        title="ยืนยันการแก้ไขโปรเจกต์"
        description={`คุณต้องการบันทึกการแก้ไขโปรเจกต์ "${pendingProjectEdit?.project.title || ""}" ใช่หรือไม่?`}
        cancelText="ยกเลิก"
        actionText="ยืนยันการแก้ไข"
        actionClassName="edit-project-confirm-btn"
        onAction={() => {
          if (!pendingProjectEdit) return;
          const pending = pendingProjectEdit;
          setPendingProjectEdit(null);
          void persistProject(pending.data, pending.project);
        }}
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
