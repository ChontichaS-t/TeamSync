"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Plus, Search, X, Calendar as CalendarIcon, ChevronDown, MoreHorizontal, Trash2, Edit, UserPlus } from "lucide-react";
import { CalendarDemo } from "@/components/global/CalendarDemo";
import { Combobox } from "@/components/ui/combobox";
import { AlertDialogSmall } from "@/components/global/AlertDialogSmall";
import { UserProfileMenu } from "@/components/global/UserProfileMenu";
import { InviteProjectModal } from "@/components/project/InviteProjectModal";
import { apiFetch } from "@/lib/api";

export type TaskStatus = "ยังไม่เริ่ม" | "กำลังทำ" | "รอตรวจ" | "เสร็จแล้ว";

export interface TaskItem {
  id: string;
  title: string;
  assignee: string;
  dueDate: string;
  status: TaskStatus;
  priority: "ต่ำ" | "ปานกลาง" | "สูง";
  source: string;
  provider: string;
  expectedResult: string;
  meetingId?: string;
  feedbackId?: string;
}

export interface MemberItem {
  id: string;
  name: string;
  role: string;
  projectRole: "owner" | "admin" | "member";
  currentTasks: string;
  avatarUrl?: string;
}

export interface MeetingItem {
  id: string;
  title: string;
  date: string;
  summary: string[];
  agreed: string[];
}

type ApiPerson = { id: string; displayName: string } | null;
type ApiTask = { id: string; title: string; assignee: ApiPerson; dueDate: string; status: TaskStatus; priority: "ต่ำ" | "ปานกลาง" | "สูง"; source: string; provider: string; expectedResult: string; meetingId: string | null; feedbackId: string | null };
type ApiMeeting = { id: string; title: string; date: string; summary: string[]; agreed: string[] };

type EditConfirmation = {
  entityLabel: string;
  itemName: string;
};

// Custom Task Status Dropdown Component
function TaskStatusCombobox({
  status,
  onChange,
}: {
  status: TaskStatus;
  onChange: (newStatus: TaskStatus) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const statuses: TaskStatus[] = ["ยังไม่เริ่ม", "กำลังทำ", "รอตรวจ", "เสร็จแล้ว"];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getStatusClass = (st: TaskStatus) => {
    switch (st) {
      case "เสร็จแล้ว": return "status-done";
      case "กำลังทำ": return "status-doing";
      case "รอตรวจ": return "status-review";
      default: return "status-todo";
    }
  };

  return (
    <div
      ref={dropdownRef}
      style={{
        position: "relative",
        display: "inline-block",
        zIndex: isOpen ? 1000 : "auto",
      }}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`status-pill ${getStatusClass(status)}`}
        style={{
          border: "none",
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          padding: "5px 12px",
          fontSize: "12px",
          fontWeight: 600,
          borderRadius: "999px",
        }}
      >
        <span>{status}</span>
        <ChevronDown style={{ width: 14, height: 14, transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s ease" }} />
      </button>

      {isOpen && (
        <div className="status-dropdown-menu">
          {statuses.map((st) => (
            <div
              key={st}
              onClick={() => {
                onChange(st);
                setIsOpen(false);
              }}
              className={`status-dropdown-item ${status === st ? "active" : ""}`}
            >
              <span className={`status-pill ${getStatusClass(st)}`}>{st}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatThaiDate(date?: Date): string {
  if (!date) return "ระบุวันส่ง";
  const day = date.getDate();
  const monthNames = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ];
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

function parseThaiDate(value: string): Date | undefined {
  const monthNames = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ];
  const [dayValue, monthValue, yearValue] = value.trim().split(/\s+/);
  const day = Number(dayValue);
  const month = monthNames.indexOf(monthValue);
  const year = Number(yearValue);
  if (!Number.isInteger(day) || month < 0 || !Number.isInteger(year)) return undefined;
  return new Date(year, month, day);
}

function toISODate(date?: Date): string {
  if (!date) return new Date().toISOString().slice(0, 10);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fromISODate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  return formatThaiDate(new Date(year, month - 1, day));
}

function mapApiTask(task: ApiTask): TaskItem {
  return { ...task, assignee: task.assignee?.displayName || "ยังไม่มอบหมาย", dueDate: fromISODate(task.dueDate), meetingId: task.meetingId || undefined, feedbackId: task.feedbackId || undefined };
}

function mapApiMeeting(meeting: ApiMeeting): MeetingItem {
  return { ...meeting, date: fromISODate(meeting.date) };
}

function TaskSourceDisplay({ source }: { source: string }) {
  const [title, ...dateParts] = source.split(" — ");
  const date = dateParts.join(" — ");

  return (
    <span className="task-source">
      <span className="task-source-title">{title || "ไม่ได้มาจากการประชุม"}</span>
      {date && <span className="task-source-date">{date}</span>}
    </span>
  );
}

const THEME_MAP = {
  "/new/newsea.jpg": { primary: "#1a77a6", hover: "#13587b", shadow: "rgba(26, 119, 166, 0.2)" },
  "/new/newtrain.jpg": { primary: "#351e7a", hover: "#2d0c90ff", shadow: "rgba(53, 30, 122, 0.2)" },
  "/new/newrabbit.jpg": { primary: "#db2777", hover: "#be185d", shadow: "rgba(219, 39, 119, 0.2)" },
  "/new/newgrli.jpg": { primary: "#5D4037", hover: "#3E2723", shadow: "rgba(93, 64, 55, 0.2)" },
  "/new/newwindow.jpg": { primary: "#bb5b12ff", hover: "#bc5b10ff", shadow: "rgba(248, 123, 27, 0.2)" },
  "/new/newbed.jpg": { primary: "#1a77a6", hover: "#13587b", shadow: "rgba(26, 119, 166, 0.2)" },
  "/new/newboy.jpg": { primary: "#1a77a6", hover: "#13587b", shadow: "rgba(26, 119, 166, 0.2)" },
  "/new/newdog.jpg": { primary: "#16a34a", hover: "#15803d", shadow: "rgba(22, 163, 74, 0.2)" },
};

export default function ProjectPage() {
  const searchParams = useSearchParams();
  const coverImage = searchParams.get("cover") || "/new/newsea.jpg";
  const requestedProjectId = searchParams.get("projectId");
  const projectTitle = searchParams.get("title") || "Badminton Tournament System";

  const activeTheme = (THEME_MAP as Record<string, { primary: string; hover: string; shadow: string }>)[coverImage] || {
    primary: "#17211e",
    hover: "#253631",
    shadow: "rgba(23, 33, 30, 0.18)",
  };

  const dynamicStyle = {
    "--theme-primary": activeTheme.primary,
    "--theme-primary-hover": activeTheme.hover,
    "--theme-primary-shadow": activeTheme.shadow,
  } as React.CSSProperties;

  const [activeTab, setActiveTab] = useState<"all" | "tasks" | "meetings" | "members">("all");
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [meetings, setMeetings] = useState<MeetingItem[]>([]);
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [apiError, setApiError] = useState("");
  const [backendProjectId, setBackendProjectId] = useState<string | null>(requestedProjectId);
  const [canInviteMembers, setCanInviteMembers] = useState(!requestedProjectId);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  const [taskFilterStatus, setTaskFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modals
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [isAddMeetingModalOpen, setIsAddMeetingModalOpen] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);

  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("/cv1.png");

  // Task Due Date Calendar State (Using CalendarDemo)
  const [taskDueDate, setTaskDueDate] = useState<Date | undefined>(new Date(2026, 6, 28));
  const [showTaskCalendar, setShowTaskCalendar] = useState(false);

  // Meeting Date Calendar State
  const [meetingDate, setMeetingDate] = useState<Date | undefined>(new Date(2026, 6, 25));
  const [showMeetingCalendar, setShowMeetingCalendar] = useState(false);

  // Task Date Editing Popup
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  // Task actions state
  const [activeMenuTaskId, setActiveMenuTaskId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [deletingTask, setDeletingTask] = useState<TaskItem | null>(null);

  // Meeting actions state
  const [activeMenuMeetingId, setActiveMenuMeetingId] = useState<string | null>(null);
  const [editingMeeting, setEditingMeeting] = useState<MeetingItem | null>(null);
  const [deletingMeeting, setDeletingMeeting] = useState<MeetingItem | null>(null);

  // Member actions state
  const [activeMenuMemberName, setActiveMenuMemberName] = useState<string | null>(null);
  const [deletingMember, setDeletingMember] = useState<MemberItem | null>(null);
  const [editingMember, setEditingMember] = useState<MemberItem | null>(null);

  // Keep every "บันทึกการแก้ไข" action behind the same confirmation step.
  const [editConfirmation, setEditConfirmation] = useState<EditConfirmation | null>(null);
  const pendingEditActionRef = useRef<(() => void) | null>(null);

  const requestEditConfirmation = (
    entityLabel: string,
    itemName: string,
    action: () => void,
  ) => {
    pendingEditActionRef.current = action;
    setEditConfirmation({ entityLabel, itemName });
  };

  const clearEditConfirmation = () => {
    pendingEditActionRef.current = null;
    setEditConfirmation(null);
  };

  useEffect(() => {
    const controller = new AbortController();

    async function loadWorkspace(projectId: string) {
      const encoded = encodeURIComponent(projectId);
      const [memberResult, taskResult, meetingResult] = await Promise.all([
        apiFetch<{ members: Array<{ id: string; displayName: string; role: "owner" | "admin" | "member"; responsibility: string; avatarUrl: string }> }>(`/api/projects/${encoded}/members`, { signal: controller.signal }),
        apiFetch<{ tasks: ApiTask[] }>(`/api/projects/${encoded}/tasks`, { signal: controller.signal }),
        apiFetch<{ meetings: ApiMeeting[] }>(`/api/projects/${encoded}/meetings`, { signal: controller.signal }),
      ]);
      setTasks(taskResult.tasks.map(mapApiTask));
      setMeetings(meetingResult.meetings.map(mapApiMeeting));
      setMembers(memberResult.members.map((member, index) => ({ id: member.id, name: member.displayName, projectRole: member.role, role: member.responsibility || (member.role === "owner" ? "เจ้าของโปรเจกต์" : member.role === "admin" ? "ผู้ดูแลโปรเจกต์" : "สมาชิกทีม"), currentTasks: `กำลังทำ ${taskResult.tasks.filter((task) => task.assignee?.id === member.id && task.status !== "เสร็จแล้ว").length} งาน`, avatarUrl: member.avatarUrl || `/cv${(index % 5) + 1}.png` })));
    }

    async function prepareProject() {
      try {
        let projectId = requestedProjectId;
        if (!projectId) {
          const response = await fetch("/api/projects/ensure", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              externalKey: `cover:${coverImage}`,
              title: projectTitle,
              description: "พัฒนาระบบจัดการแข่งขันแบดมินตัน",
              cover: coverImage,
              tags: "blue",
              deadline: "กำหนดส่ง 30 กันยายน 2026",
              progress: progressPercent,
            }),
            signal: controller.signal,
          });
          if (!response.ok) return;
          const project = (await response.json()) as { id: string };
          projectId = project.id;
          setBackendProjectId(project.id);
          setCanInviteMembers(true);
        }
        if (projectId) {
          await loadWorkspace(projectId);
          if (requestedProjectId) {
            const projectsResponse = await fetch("/api/projects", {
              credentials: "include",
              cache: "no-store",
              signal: controller.signal,
            });
            if (projectsResponse.ok) {
              const result = (await projectsResponse.json()) as {
                projects: Array<{ id: string; role: "owner" | "admin" | "member" }>;
              };
              const access = result.projects.find((project) => project.id === projectId);
              setCanInviteMembers(access?.role === "owner" || access?.role === "admin");
            }
          }
        }
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          console.error("Unable to prepare project collaboration", error);
          setApiError(error instanceof Error ? error.message : "ไม่สามารถโหลดข้อมูลโปรเจกต์ได้");
        }
      }
    }

    void prepareProject();
    return () => controller.abort();
  }, [coverImage, projectTitle, requestedProjectId]);

  const refreshWorkItems = async () => {
    if (!backendProjectId) return;
    const encoded = encodeURIComponent(backendProjectId);
    const [taskResult, meetingResult] = await Promise.all([
      apiFetch<{ tasks: ApiTask[] }>(`/api/projects/${encoded}/tasks`),
      apiFetch<{ meetings: ApiMeeting[] }>(`/api/projects/${encoded}/meetings`),
    ]);
    setTasks(taskResult.tasks.map(mapApiTask));
    setMeetings(meetingResult.meetings.map(mapApiMeeting));
  };

  const assigneeId = (name: string) => members.find((member) => member.name === name)?.id || "";

  const runMutation = async (action: () => Promise<void>, fallback: string) => {
    setApiError("");
    try {
      await action();
    } catch (error) {
      setApiError(error instanceof Error ? error.message : fallback);
    }
  };

  const handleDeleteMember = async (member: MemberItem) => {
    if (!backendProjectId || !member.id) return;
    try {
      await apiFetch<void>(`/api/projects/${encodeURIComponent(backendProjectId)}/members/${encodeURIComponent(member.id)}`, { method: "DELETE" });
      setMembers((prev) => prev.filter((item) => item.id !== member.id));
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "ไม่สามารถนำสมาชิกออกได้");
    }
  };

  useEffect(() => {
    if (!activeMenuMemberName) return;
    const handleOutsideClick = () => setActiveMenuMemberName(null);
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, [activeMenuMemberName]);

  useEffect(() => {
    if (!activeMenuTaskId) return;
    const handleOutsideClick = () => setActiveMenuTaskId(null);
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, [activeMenuTaskId]);

  useEffect(() => {
    if (!activeMenuMeetingId) return;
    const handleOutsideClick = () => setActiveMenuMeetingId(null);
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, [activeMenuMeetingId]);

  // Form Inputs
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskAssignee, setNewTaskAssignee] = useState("Chonticha");
  const [newTaskSource, setNewTaskSource] = useState("");
  const [newTaskProvider, setNewTaskProvider] = useState("");
  const [newTaskExpectedResult, setNewTaskExpectedResult] = useState("");
  const [newTaskMeetingId, setNewTaskMeetingId] = useState("");
  const [newTaskStatus, setNewTaskStatus] = useState<TaskStatus>("ยังไม่เริ่ม");

  const [newMeetingTitle, setNewMeetingTitle] = useState("");
  const [newMeetingSummaryText, setNewMeetingSummaryText] = useState("");
  const [newMeetingAgreedText, setNewMeetingAgreedText] = useState("");

  // Stat Calculations
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "เสร็จแล้ว").length;
  const inProgressTasks = tasks.filter((t) => t.status === "กำลังทำ").length;
  const pendingTasks = tasks.filter((task) => task.status !== "เสร็จแล้ว").length;
  const progressPercent = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Handlers
  const handleStatusChange = (id: string, newStatus: TaskStatus) => {
    const targetTask = tasks.find((t) => t.id === id);
    if (!targetTask || targetTask.status === newStatus || !backendProjectId) return;
    void runMutation(async () => {
      await apiFetch<ApiTask>(`/api/projects/${encodeURIComponent(backendProjectId)}/tasks/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify({ title: targetTask.title, assigneeId: assigneeId(targetTask.assignee), dueDate: toISODate(parseThaiDate(targetTask.dueDate)), status: newStatus, priority: targetTask.priority, source: targetTask.source, provider: targetTask.provider, expectedResult: targetTask.expectedResult, meetingId: targetTask.meetingId || "" }),
      });
      await refreshWorkItems();
    }, "ไม่สามารถเปลี่ยนสถานะงานได้");
  };

  const handleTaskDueDateChange = (task: TaskItem, dueDate: Date) => {
    if (!backendProjectId) return;
    void runMutation(async () => {
      await apiFetch<ApiTask>(`/api/projects/${encodeURIComponent(backendProjectId)}/tasks/${encodeURIComponent(task.id)}`, {
        method: "PUT",
        body: JSON.stringify({ title: task.title, assigneeId: assigneeId(task.assignee), dueDate: toISODate(dueDate), status: task.status, priority: task.priority, source: task.source, provider: task.provider, expectedResult: task.expectedResult, meetingId: task.meetingId || "" }),
      });
      await refreshWorkItems();
    }, "ไม่สามารถแก้ไขวันส่งงานได้");
  };

  const openNewTaskModal = () => {
    setEditingTask(null);
    setNewTaskTitle("");
    setNewTaskAssignee(members[0]?.name || "");
    setNewTaskSource("ไม่ได้มาจากการประชุม");
    setNewTaskProvider(members[0]?.name || "");
    setNewTaskExpectedResult("");
    setNewTaskMeetingId("");
    setNewTaskStatus("ยังไม่เริ่ม");
    setTaskDueDate(new Date(2026, 6, 28));
    setShowTaskCalendar(false);
    setIsAddTaskModalOpen(true);
  };

  const openEditTaskModal = (task: TaskItem) => {
    setEditingTask(task);
    setNewTaskTitle(task.title);
    setNewTaskAssignee(task.assignee);
    setNewTaskSource(task.source);
    setNewTaskProvider(task.provider);
    setNewTaskExpectedResult(task.expectedResult);
    setNewTaskMeetingId(task.meetingId || "");
    setNewTaskStatus(task.status);
    setTaskDueDate(parseThaiDate(task.dueDate) || new Date());
    setShowTaskCalendar(false);
    setActiveMenuTaskId(null);
    setIsAddTaskModalOpen(true);
  };

  const closeTaskModal = () => {
    setIsAddTaskModalOpen(false);
    setEditingTask(null);
    setShowTaskCalendar(false);
  };

  const handleSaveTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    if (!newTaskProvider.trim()) {
      setApiError("กรุณาระบุผู้ให้หรือผู้เสนองาน");
      return;
    }

    if (editingTask) {
      const taskId = editingTask.id;
      const taskTitle = newTaskTitle.trim();
      const taskAssignee = newTaskAssignee;
      const taskSource = newTaskSource.trim() || "ไม่ได้มาจากการประชุม";
      const taskProvider = newTaskProvider.trim();
      const taskExpectedResult = newTaskExpectedResult.trim();
      requestEditConfirmation("งาน", taskTitle, () => {
        void runMutation(async () => {
          if (!backendProjectId) return;
          await apiFetch<ApiTask>(`/api/projects/${encodeURIComponent(backendProjectId)}/tasks/${encodeURIComponent(taskId)}`, { method: "PUT", body: JSON.stringify({ title: taskTitle, assigneeId: assigneeId(taskAssignee), dueDate: toISODate(taskDueDate), status: newTaskStatus, priority: editingTask.priority, source: taskSource, provider: taskProvider, expectedResult: taskExpectedResult, meetingId: newTaskMeetingId }) });
          await refreshWorkItems();
          closeTaskModal();
        }, "ไม่สามารถแก้ไขงานได้");
      });
      return;
    }

    void runMutation(async () => {
      if (!backendProjectId) return;
      await apiFetch<ApiTask>(`/api/projects/${encodeURIComponent(backendProjectId)}/tasks`, { method: "POST", body: JSON.stringify({ title: newTaskTitle.trim(), assigneeId: assigneeId(newTaskAssignee), dueDate: toISODate(taskDueDate), status: newTaskStatus, priority: "ปานกลาง", source: newTaskSource.trim() || "ไม่ได้มาจากการประชุม", provider: newTaskProvider.trim(), expectedResult: newTaskExpectedResult.trim(), meetingId: newTaskMeetingId }) });
      await refreshWorkItems();
      setNewTaskTitle(""); setNewTaskSource(""); setNewTaskProvider(""); setNewTaskExpectedResult(""); setNewTaskMeetingId(""); closeTaskModal();
    }, "ไม่สามารถเพิ่มงานได้");
  };

  const handleDeleteTask = (task: TaskItem) => {
    void runMutation(async () => {
      if (!backendProjectId) return;
      const path = task.feedbackId
        ? `/api/projects/${encodeURIComponent(backendProjectId)}/feedback/${encodeURIComponent(task.feedbackId)}`
        : `/api/projects/${encodeURIComponent(backendProjectId)}/tasks/${encodeURIComponent(task.id)}`;
      await apiFetch<void>(path, { method: "DELETE" });
      await refreshWorkItems();
    }, "ไม่สามารถลบงานได้");
  };

  const openNewMeetingModal = () => {
    setEditingMeeting(null);
    setNewMeetingTitle("");
    setNewMeetingSummaryText("");
    setNewMeetingAgreedText("");
    setMeetingDate(new Date(2026, 6, 25));
    setShowMeetingCalendar(false);
    setIsAddMeetingModalOpen(true);
  };

  const openEditMeetingModal = (meeting: MeetingItem) => {
    setEditingMeeting(meeting);
    setNewMeetingTitle(meeting.title);
    setNewMeetingSummaryText(meeting.summary.join("\n"));
    setNewMeetingAgreedText(meeting.agreed.join("\n"));
    setMeetingDate(parseThaiDate(meeting.date) || new Date());
    setShowMeetingCalendar(false);
    setActiveMenuMeetingId(null);
    setIsAddMeetingModalOpen(true);
  };

  const closeMeetingModal = () => {
    setIsAddMeetingModalOpen(false);
    setEditingMeeting(null);
    setShowMeetingCalendar(false);
  };

  const handleSaveMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMeetingTitle.trim()) return;

    const summary = newMeetingSummaryText.split("\n").filter((s) => s.trim());
    const agreed = newMeetingAgreedText.split("\n").filter((a) => a.trim());

    if (editingMeeting) {
      const meetingId = editingMeeting.id;
      const meetingTitle = newMeetingTitle.trim();
      requestEditConfirmation("บันทึกการประชุม", meetingTitle, () => {
        void runMutation(async () => {
          if (!backendProjectId) return;
          await apiFetch<ApiMeeting>(`/api/projects/${encodeURIComponent(backendProjectId)}/meetings/${encodeURIComponent(meetingId)}`, { method: "PUT", body: JSON.stringify({ title: meetingTitle, date: toISODate(meetingDate), summary, agreed }) });
          await refreshWorkItems(); closeMeetingModal();
        }, "ไม่สามารถแก้ไขบันทึกการประชุมได้");
      });
      return;
    }

    void runMutation(async () => {
      if (!backendProjectId) return;
      await apiFetch<ApiMeeting>(`/api/projects/${encodeURIComponent(backendProjectId)}/meetings`, { method: "POST", body: JSON.stringify({ title: newMeetingTitle.trim(), date: toISODate(meetingDate), summary, agreed }) });
      await refreshWorkItems(); setNewMeetingTitle(""); setNewMeetingSummaryText(""); setNewMeetingAgreedText(""); closeMeetingModal();
    }, "ไม่สามารถบันทึกการประชุมได้");
  };

  const handleDeleteMeeting = (meeting: MeetingItem) => {
    void runMutation(async () => {
      if (!backendProjectId) return;
      await apiFetch<void>(`/api/projects/${encodeURIComponent(backendProjectId)}/meetings/${encodeURIComponent(meeting.id)}`, { method: "DELETE" });
      await refreshWorkItems();
    }, "ไม่สามารถลบบันทึกการประชุมได้");
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch = [t.title, t.expectedResult, t.source, t.provider, t.assignee]
        .some((value) => value.toLowerCase().includes(query));
      const matchesStatus = taskFilterStatus === "all" ? true : t.status === taskFilterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [tasks, searchQuery, taskFilterStatus]);

  return (
    <div className="project-room" style={dynamicStyle}>
      {/* 1. Navbar */}
      <nav className="project-navbar" aria-label="Project navigation">
        <Link className="brand" href="/home" aria-label="TeamSync home">
          TeamSync
        </Link>
        <div className="project-navbar-menu">
          <Link href="/home">Home</Link>
          <Link
            className="project-navbar-active"
            href={`/project?cover=${encodeURIComponent(coverImage)}`}
          >
            Project
          </Link>
          <Link href={`/calendar?cover=${encodeURIComponent(coverImage)}&title=${encodeURIComponent(projectTitle)}${backendProjectId ? `&projectId=${encodeURIComponent(backendProjectId)}` : ""}`}>Calendar</Link>
        </div>
        <UserProfileMenu />
      </nav>

      {/* 2. Main Content */}
      <div className="project-content">
        {apiError && <p role="alert" style={{ color: "#b91c1c", marginBottom: 12 }}>{apiError}</p>}
        
        {/* Cover Banner with Overlay Content */}
        <div className="project-cover-banner">
          <Image
            src={coverImage}
            alt="Project cover"
            fill
            sizes="100vw"
            priority
            style={{ objectFit: "cover" }}
          />
          <div className="project-cover-overlay" />
          <div className="project-cover-content">
            <div className="project-header-top">
              <div>
                <h1 className="project-main-title">{projectTitle}</h1>
                <p className="project-goal-desc">
                  <strong>เป้าหมาย:</strong> พัฒนาระบบจัดการแข่งขันแบดมินตัน &nbsp;|&nbsp; <strong>กำหนดส่ง:</strong> 30 กันยายน 2026
                </p>
              </div>

              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <button onClick={openNewTaskModal} className="btn-banner">
                  <Plus className="w-4 h-4" /> เพิ่มงาน / รายการปรับแก้
                </button>
                <button onClick={openNewMeetingModal} className="btn-banner-outline">
                  <Plus className="w-4 h-4" /> บันทึกประชุม
                </button>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="project-quick-stats">
              <div className="stat-box stat-box-progress">
                <div className="stat-box-content">
                  <div className="stat-box-label">ความคืบหน้า</div>
                  <div className="stat-box-value">{progressPercent}<span>%</span></div>
                  <span className="stat-progress-track" aria-hidden="true">
                    <span style={{ width: `${progressPercent}%` }} />
                  </span>
                </div>
              </div>
              <div className="stat-box">
                <div className="stat-box-content">
                  <div className="stat-box-label">กำลังทำ</div>
                  <div className="stat-box-value">{inProgressTasks}<span>งาน</span></div>
                </div>
              </div>
              <div className="stat-box">
                <div className="stat-box-content">
                  <div className="stat-box-label">เสร็จแล้ว</div>
                  <div className="stat-box-value">{completedTasks}<span>งาน</span></div>
                </div>
              </div>
              <div className="stat-box">
                <div className="stat-box-content">
                  <div className="stat-box-label">รอดำเนินการ</div>
                  <div className="stat-box-value">{pendingTasks}<span>รายการ</span></div>
                </div>
              </div>
              <div className="stat-box stat-box-meeting">
                <div className="stat-box-content">
                  <div className="stat-box-label">ประชุมครั้งถัดไป</div>
                  <div className="stat-box-value stat-box-date">25 ก.ค. 2026</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section Navigation Tabs */}
        <div className="project-section-tabs">
          <button onClick={() => setActiveTab("all")} className={`sec-tab ${activeTab === "all" ? "active" : ""}`}>
            ภาพรวมโปรเจกต์
          </button>
          <button onClick={() => setActiveTab("members")} className={`sec-tab ${activeTab === "members" ? "active" : ""}`}>
            สมาชิก ({members.length})
          </button>
          <button onClick={() => setActiveTab("meetings")} className={`sec-tab ${activeTab === "meetings" ? "active" : ""}`}>
            บันทึกการประชุม ({meetings.length})
          </button>
          <button onClick={() => setActiveTab("tasks")} className={`sec-tab ${activeTab === "tasks" ? "active" : ""}`}>
            งานและรายการปรับแก้ ({tasks.length})
          </button>
        </div>

        {/* SECTION 1: MEMBERS & ROLES */}
        {(activeTab === "all" || activeTab === "members") && (
          <div className="project-overview-members" style={{ marginBottom: "30px", width: "100%" }}>
              <div className="section-header-bar" style={{ borderBottom: "none", paddingBottom: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 className="section-header-title" style={{ margin: 0 }}>สมาชิกและหน้าที่ในทีม</h2>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {canInviteMembers && (
                    <button
                      type="button"
                      className="btn-outline"
                      style={{ height: "34px" }}
                      onClick={() => setIsInviteModalOpen(true)}
                      disabled={!backendProjectId}
                    >
                      <UserPlus className="w-4 h-4" />
                      เชิญเพื่อน
                    </button>
                  )}
                </div>
              </div>
              <div style={{ padding: "8px 0" }}>
                <div
                  className="members-list-scroll"
                  style={{
                    display: "flex",
                    flexWrap: "nowrap",
                    gap: "20px",
                    overflowX: "auto",
                    padding: "8px 4px 16px",
                    width: "100%",
                    scrollBehavior: "smooth",
                  }}
                >
                  {members.map((m, idx) => {
                    const avatarUrl = m.avatarUrl || `/cv${(idx % 5) + 1}.png`;
                    return (
                      <div
                        key={m.name}
                        className="member-card"
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          textAlign: "center",
                          width: "200px",
                          height: "270px",
                          padding: "16px",
                          backgroundColor: "var(--member-card-bg, #ffffff)",
                          borderRadius: "24px",
                          border: "1px solid var(--member-card-border, #e2e8f0)",
                          boxShadow: "0 10px 25px rgba(0, 0, 0, 0.02), 0 3px 10px rgba(0, 0, 0, 0.01)",
                          justifyContent: "space-between",
                          boxSizing: "border-box",
                          flexShrink: 0,
                          position: "relative",
                        }}
                      >
                        {/* 3-Dots Button & Actions Menu */}
                        <div style={{ position: "absolute", top: "12px", right: "12px", zIndex: 10 }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuMemberName(activeMenuMemberName === m.name ? null : m.name);
                            }}
                            className="member-menu-trigger"
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              padding: "4px",
                              display: "grid",
                              placeItems: "center",
                              color: "#64748b",
                              borderRadius: "999px",
                              transition: "background-color 0.15s ease",
                            }}
                          >
                            <MoreHorizontal style={{ width: 16, height: 16 }} />
                          </button>

                          {/* Action Dropdown */}
                          {activeMenuMemberName === m.name && (
                            <div
                              className="member-menu-dropdown"
                              style={{
                                position: "absolute",
                                top: "100%",
                                right: 0,
                                zIndex: 20,
                                minWidth: "120px",
                                backgroundColor: "var(--member-card-bg, #ffffff)",
                                border: "1px solid var(--member-card-border, #e2e8f0)",
                                borderRadius: "12px",
                                boxShadow: "0 10px 25px rgba(0, 0, 0, 0.12)",
                                padding: "4px",
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingMember(m);
                                  setNewMemberName(m.name);
                                  setNewMemberRole(m.role);
                                  setSelectedAvatar(m.avatarUrl || "/cv1.png");
                                  setIsAddMemberModalOpen(true);
                                  setActiveMenuMemberName(null);
                                }}
                                className="member-menu-btn"
                              >
                                <Edit style={{ width: 14, height: 14 }} />
                                <span>แก้ไขข้อมูล</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setDeletingMember(m);
                                  setActiveMenuMemberName(null);
                                }}
                                className="member-menu-btn delete-btn"
                              >
                                <Trash2 style={{ width: 14, height: 14 }} />
                                <span>ลบสมาชิก</span>
                              </button>
                            </div>
                          )}
                        </div>
                        {/* Role Badge (Top) */}
                        <div
                          style={{
                            fontSize: "11px",
                            color: "var(--member-role-color, #4e6178)",
                            fontWeight: 600,
                            backgroundColor: "var(--member-role-bg, #f0f4f8)",
                            padding: "4px 12px",
                            borderRadius: "999px",
                          }}
                        >
                          {m.role}
                        </div>

                        {/* Profile Image (Middle 1) & Name & Current Tasks */}
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", width: "100%" }}>
                          <Image
                            src={avatarUrl}
                            alt={`${m.name}'s profile`}
                            width={80}
                            height={80}
                            style={{
                              objectFit: "contain",
                              flexShrink: 0,
                            }}
                          />
                          <h3
                            style={{
                              margin: 0,
                              fontSize: "16px",
                              fontWeight: 900,
                              color: "var(--member-name-color, #11223e)",
                              letterSpacing: "-0.3px",
                            }}
                          >
                            {m.name}
                          </h3>
                          <div
                            style={{
                              fontSize: "13px",
                              fontWeight: 700,
                              color: "var(--theme-primary)",
                            }}
                          >
                            {m.currentTasks}
                          </div>
                        </div>

                        {/* Button (Bottom) */}
                        <button
                          type="button"
                          style={{
                            width: "100%",
                            padding: "9px 16px",
                            borderRadius: "999px",
                            backgroundColor: "var(--theme-primary)",
                            color: "#ffffff",
                            fontSize: "12px",
                            fontWeight: 700,
                            border: "none",
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                            boxShadow: "0 6px 12px var(--theme-primary-shadow, rgba(0, 0, 0, 0.12))",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "var(--theme-primary-hover)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "var(--theme-primary)";
                          }}
                          onClick={() => {
                            setSearchQuery(m.name);
                            setActiveTab("tasks");
                            // Smooth scroll to tasks section
                            const tasksSection = document.getElementById("works");
                            if (tasksSection) {
                              tasksSection.scrollIntoView({ behavior: "smooth" });
                            }
                          }}
                        >
                          งานที่รับผิดชอบ
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

        {/* SECTION 2: WORK ITEMS */}
        {(activeTab === "all" || activeTab === "tasks") && (
          <div className="section-block task-section-block project-overview-tasks">
            <div className="section-header-bar">
              <div>
                <h2 className="section-header-title">งานและรายการปรับแก้</h2>
                <p className="feedback-status-help">รวมงานจากทีม การประชุม และ Feedback ไว้ในตารางเดียว</p>
              </div>
              <button onClick={openNewTaskModal} className="btn-navy" style={{ height: "34px" }}>
                <Plus className="w-4 h-4" /> เพิ่มรายการ
              </button>
            </div>

            <div className="section-body">
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "14px", gap: "10px" }}>
                <div style={{ position: "relative", width: "240px" }}>
                  <Search className="w-4 h-4" style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
                  <input
                    type="text"
                    placeholder="ค้นหางาน..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="form-input"
                    style={{ paddingLeft: "32px", height: "34px", fontSize: "12px" }}
                  />
                </div>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button onClick={() => setTaskFilterStatus("all")} className={`btn-outline ${taskFilterStatus === "all" ? "active" : ""}`} style={{ padding: "4px 10px", fontSize: "11px", height: "auto" }}>ทั้งหมด</button>
                  <button onClick={() => setTaskFilterStatus("กำลังทำ")} className={`btn-outline ${taskFilterStatus === "กำลังทำ" ? "active" : ""}`} style={{ padding: "4px 10px", fontSize: "11px", height: "auto" }}>กำลังทำ</button>
                  <button onClick={() => setTaskFilterStatus("เสร็จแล้ว")} className={`btn-outline ${taskFilterStatus === "เสร็จแล้ว" ? "active" : ""}`} style={{ padding: "4px 10px", fontSize: "11px", height: "auto" }}>เสร็จแล้ว</button>
                </div>
              </div>

              <table className="ts-table">
                <thead>
                  <tr>
                    <th>ชื่องาน / รายละเอียดงาน</th>
                    <th>ที่มา</th>
                    <th>ผู้ให้ / ผู้เสนอ</th>
                    <th>ผู้รับผิดชอบ</th>
                    <th>กำหนดส่ง</th>
                    <th>สถานะ</th>
                    <th aria-label="จัดการงาน" />
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.map((t) => (
                    <tr key={t.id}>
                      <td>
                        <div className="task-title">{t.title}</div>
                        <div className="task-expected-result">
                          {t.expectedResult || "ยังไม่ได้ระบุรายละเอียดงาน"}
                        </div>
                      </td>
                      <td>
                        <TaskSourceDisplay source={t.source || "ไม่ได้มาจากการประชุม"} />
                      </td>
                      <td>{t.provider || "—"}</td>
                      <td>{t.assignee}</td>
                      <td>
                        <button
                          type="button"
                          className="date-picker-trigger"
                          onClick={() => setEditingTaskId(editingTaskId === t.id ? null : t.id)}
                        >
                          <span>{t.dueDate}</span>
                          <ChevronDown style={{ width: 14, height: 14, color: "#94a3b8" }} />
                        </button>

                        {editingTaskId === t.id && (
                          <div style={{ position: "absolute", zIndex: 150, marginTop: "6px" }}>
                            <CalendarDemo
                              selectedDate={new Date()}
                              onSelectDate={(newDate) => {
                                if (newDate) {
                                  handleTaskDueDateChange(t, newDate);
                                }
                                setEditingTaskId(null);
                              }}
                            />
                          </div>
                        )}
                      </td>
                      <td>
                        <TaskStatusCombobox
                          status={t.status}
                          onChange={(newStatus) => handleStatusChange(t.id, newStatus)}
                        />
                      </td>
                      <td className="task-actions-cell">
                        <div className="task-actions" style={{ zIndex: activeMenuTaskId === t.id ? 1000 : 20 }}>
                          <button
                            className="task-actions-trigger"
                            type="button"
                            aria-label={`จัดการงาน ${t.title}`}
                            aria-haspopup="menu"
                            aria-expanded={activeMenuTaskId === t.id}
                            onClick={(event) => {
                              event.stopPropagation();
                              setActiveMenuTaskId((activeId) => activeId === t.id ? null : t.id);
                            }}
                          >
                            <MoreHorizontal aria-hidden="true" />
                          </button>

                          {activeMenuTaskId === t.id && (
                            <div className="task-actions-menu" role="menu" onClick={(event) => event.stopPropagation()}>
                              <button type="button" role="menuitem" onClick={() => openEditTaskModal(t)}>
                                <Edit aria-hidden="true" />
                                <span>แก้ไข</span>
                              </button>
                              <button
                                className="danger"
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                  setDeletingTask(t);
                                  setActiveMenuTaskId(null);
                                }}
                              >
                                <Trash2 aria-hidden="true" />
                                <span>ลบ</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SECTION 3: MEETING NOTES */}
        {(activeTab === "all" || activeTab === "meetings") && (
          <div className="section-block meeting-section-block project-overview-meetings">
            <div className="section-header-bar">
              <h2 className="section-header-title">บันทึกการประชุม (Meeting Summaries)</h2>
              <button onClick={openNewMeetingModal} className="btn-navy" style={{ padding: "6px 14px", fontSize: "12px", height: "auto" }}>
                <Plus className="w-3.5 h-3.5" /> บันทึกประชุม
              </button>
            </div>
            <div className="section-body">
              {meetings.map((m) => (
                <div key={m.id} className="meeting-note-card">
                  <div className="meeting-note-heading">
                    <h4>{m.title}</h4>
                    <span style={{ fontSize: "12px", color: "#64748b" }}>วันที่: {m.date}</span>
                  </div>

                  <div className="meeting-actions" style={{ zIndex: activeMenuMeetingId === m.id ? 1000 : 20 }}>
                    <button
                      className="task-actions-trigger"
                      type="button"
                      aria-label={`จัดการบันทึกการประชุม ${m.title}`}
                      aria-haspopup="menu"
                      aria-expanded={activeMenuMeetingId === m.id}
                      onClick={(event) => {
                        event.stopPropagation();
                        setActiveMenuMeetingId((activeId) => activeId === m.id ? null : m.id);
                      }}
                    >
                      <MoreHorizontal aria-hidden="true" />
                    </button>

                    {activeMenuMeetingId === m.id && (
                      <div className="task-actions-menu" role="menu" onClick={(event) => event.stopPropagation()}>
                        <button type="button" role="menuitem" onClick={() => openEditMeetingModal(m)}>
                          <Edit aria-hidden="true" />
                          <span>แก้ไข</span>
                        </button>
                        <button
                          className="danger"
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setDeletingMeeting(m);
                            setActiveMenuMeetingId(null);
                          }}
                        >
                          <Trash2 aria-hidden="true" />
                          <span>ลบ</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <strong style={{ fontSize: "12px", color: "#475569" }}>สรุป:</strong>
                  <ul className="meeting-note-list">
                    {m.summary.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>

                  <div className="meeting-note-agreed">
                    <strong>สิ่งที่ทีมตกลงกัน:</strong> {m.agreed.join(" | ")}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* MODAL 1: Add Task */}
      {isAddTaskModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-dialog">
            <div className="modal-title-bar">
              <h3>{editingTask ? "แก้ไขงาน / รายการปรับแก้" : "เพิ่มงาน / รายการปรับแก้"}</h3>
              <button onClick={closeTaskModal} style={{ border: "none", background: "none", cursor: "pointer" }}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveTask}>
              <div className="form-group">
                <label className="form-label">ชื่องาน *</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ออกแบบหน้า Monitor ใหม่"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">รายละเอียดงาน</label>
                <textarea
                  rows={3}
                  placeholder="อธิบายสิ่งที่ต้องทำและผลลัพธ์ที่ต้องการ"
                  value={newTaskExpectedResult}
                  onChange={(e) => setNewTaskExpectedResult(e.target.value)}
                  className="form-input"
                  style={{ height: "auto", minHeight: "84px", paddingTop: "10px", resize: "vertical" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
                <div>
                  <label className="form-label">ที่มา</label>
                  <Combobox
                    options={[
                      "ไม่ได้มาจากการประชุม",
                      ...meetings.map((meeting) => `${meeting.title} — ${meeting.date}`),
                    ]}
                    value={newTaskSource}
                    onChange={(value) => {
                      setNewTaskSource(value);
                      const meeting = meetings.find((item) => `${item.title} — ${item.date}` === value);
                      setNewTaskMeetingId(meeting?.id || "");
                    }}
                    placeholder="เลือกบันทึกการประชุม..."
                    showAllOptionsOnOpen
                    showCheckmark={false}
                    optionSecondarySeparator=" — "
                    allowCustomValue={false}
                  />
                </div>

                <div>
                  <label className="form-label">ผู้ให้ / ผู้เสนอ *</label>
                  <Combobox
                    options={[...new Set([...members.map((member) => member.name), "อาจารย์ที่ปรึกษา", "ลูกค้า/ผู้ใช้งาน"])]}
                    value={newTaskProvider}
                    onChange={setNewTaskProvider}
                    placeholder="เลือกสมาชิก หรือพิมพ์ชื่อ..."
                    showAllOptionsOnOpen
                    showCheckmark={false}
                    allowCustomValue
                  />
                  <p className="form-field-help">เลือกจากสมาชิก หรือพิมพ์ชื่อบุคคลภายนอกเพิ่มได้</p>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
                <div>
                  <label className="form-label">ผู้รับผิดชอบ</label>
                  <Combobox
                    options={members.map((m) => m.name)}
                    value={newTaskAssignee}
                    onChange={(val) => setNewTaskAssignee(val)}
                    placeholder="เลือกผู้รับผิดชอบ..."
                    showAllOptionsOnOpen
                  />
                </div>

                <div style={{ position: "relative" }}>
                  <label className="form-label">กำหนดส่ง</label>
                  <button
                    type="button"
                    className="modal-date-picker-trigger"
                    onClick={() => setShowTaskCalendar(!showTaskCalendar)}
                  >
                    <span>{formatThaiDate(taskDueDate)}</span>
                    <ChevronDown style={{ width: 16, height: 16, color: "#94a3b8", transform: showTaskCalendar ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s ease" }} />
                  </button>

                  {showTaskCalendar && (
                    <div style={{ position: "absolute", zIndex: 300, top: "calc(100% + 6px)", right: 0 }}>
                      <CalendarDemo
                        selectedDate={taskDueDate}
                        onSelectDate={(newDate) => {
                          if (newDate) setTaskDueDate(newDate);
                          setShowTaskCalendar(false);
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">สถานะ</label>
                <select
                  value={newTaskStatus}
                  onChange={(e) => setNewTaskStatus(e.target.value as TaskStatus)}
                  className="form-input"
                >
                  <option value="ยังไม่เริ่ม">ยังไม่เริ่ม</option>
                  <option value="กำลังทำ">กำลังทำ</option>
                  <option value="รอตรวจ">รอตรวจ</option>
                  <option value="เสร็จแล้ว">เสร็จแล้ว</option>
                </select>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "18px" }}>
                <button type="button" onClick={closeTaskModal} className="btn-outline">
                  ยกเลิก
                </button>
                <button type="submit" className="btn-navy">
                  {editingTask ? "บันทึกการแก้ไข" : "บันทึกสร้างงาน"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Add Meeting */}
      {isAddMeetingModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-dialog">
            <div className="modal-title-bar">
              <h3>{editingMeeting ? "แก้ไขบันทึกการประชุม" : "บันทึกผลการประชุม"}</h3>
              <button onClick={closeMeetingModal} style={{ border: "none", background: "none", cursor: "pointer" }}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveMeeting}>
              <div className="meeting-form-row">
                <div>
                  <label className="form-label">หัวข้อการประชุม *</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น ประชุมครั้งที่ 3"
                    value={newMeetingTitle}
                    onChange={(e) => setNewMeetingTitle(e.target.value)}
                    className="form-input"
                  />
                </div>

                <div style={{ position: "relative" }}>
                  <label className="form-label">วันที่ประชุม</label>
                  <button
                    type="button"
                    className="modal-date-picker-trigger"
                    onClick={() => setShowMeetingCalendar(!showMeetingCalendar)}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
                  >
                    <span style={{ whiteSpace: "nowrap" }}>{formatThaiDate(meetingDate)}</span>
                    <ChevronDown style={{ width: 16, height: 16, flexShrink: 0, color: "#94a3b8", transform: showMeetingCalendar ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s ease" }} />
                  </button>

                  {showMeetingCalendar && (
                    <div style={{ position: "absolute", zIndex: 300, top: "calc(100% + 6px)", right: 0 }}>
                      <CalendarDemo
                        selectedDate={meetingDate}
                        onSelectDate={(newDate) => {
                          if (newDate) setMeetingDate(newDate);
                          setShowMeetingCalendar(false);
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">สรุปข้อคุยในประชุม (บรรทัดละข้อ)</label>
                <textarea
                  rows={2}
                  value={newMeetingSummaryText}
                  onChange={(e) => setNewMeetingSummaryText(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">สิ่งที่ทีมตกลงกัน (บรรทัดละข้อ)</label>
                <textarea
                  rows={2}
                  value={newMeetingAgreedText}
                  onChange={(e) => setNewMeetingAgreedText(e.target.value)}
                  className="form-input"
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "18px" }}>
                <button type="button" onClick={closeMeetingModal} className="btn-outline">
                  ยกเลิก
                </button>
                <button type="submit" className="btn-navy">
                  {editingMeeting ? "บันทึกการแก้ไข" : "บันทึกผลประชุม"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL 4: Add Member */}
      {isAddMemberModalOpen && (
        <div className="modal-backdrop" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(15, 23, 42, 0.4)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999 }}>
          {/* Backdrop Overlay sibling without blur */}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: -1 }} onClick={() => setIsAddMemberModalOpen(false)} />
          
          <div className="modal-dialog" style={{ width: "420px", backgroundColor: "#ffffff", borderRadius: "24px", padding: "24px", boxShadow: "0 20px 40px rgba(0, 0, 0, 0.1)", zIndex: 1, border: "1px solid #e2e8f0" }}>
            <div className="modal-title-bar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#0f172a" }}>
                {editingMember ? "แก้ไขข้อมูลสมาชิก" : "เพิ่มสมาชิกทีมใหม่"}
              </h3>
              <button onClick={() => { setIsAddMemberModalOpen(false); setEditingMember(null); }} style={{ border: "none", background: "none", cursor: "pointer", padding: "4px" }}>
                <X className="w-5 h-5" style={{ color: "#64748b" }} />
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              if (!newMemberName.trim() || !newMemberRole.trim()) return;

              if (editingMember) {
                const memberName = newMemberName.trim();
                const memberRole = newMemberRole.trim();
                const avatarUrl = selectedAvatar;
                requestEditConfirmation("ข้อมูลสมาชิก", memberName, () => {
                  void runMutation(async () => {
                    if (!backendProjectId || !editingMember.id) return;
                    const updated = await apiFetch<{ id: string; displayName: string; role: "owner" | "admin" | "member"; responsibility: string; avatarUrl: string }>(`/api/projects/${encodeURIComponent(backendProjectId)}/members/${encodeURIComponent(editingMember.id)}/profile`, { method: "PUT", body: JSON.stringify({ displayName: memberName, responsibility: memberRole, avatarUrl }) });
                    setMembers((current) => current.map((member) => member.id === updated.id ? { ...member, name: updated.displayName, projectRole: updated.role, role: updated.responsibility, avatarUrl: updated.avatarUrl } : member));
                    await refreshWorkItems();
                    setEditingMember(null); setNewMemberName(""); setNewMemberRole(""); setSelectedAvatar("/cv1.png"); setIsAddMemberModalOpen(false);
                  }, "ไม่สามารถแก้ไขข้อมูลสมาชิกได้");
                });
                return;
              } else {
                setIsInviteModalOpen(true);
              }

              setNewMemberName("");
              setNewMemberRole("");
              setSelectedAvatar("/cv1.png");
              setIsAddMemberModalOpen(false);
            }}>
              <div className="form-group" style={{ marginBottom: "16px" }}>
                <label className="form-label" style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: 600, color: "#334155" }}>ชื่อสมาชิก *</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น สมชาย ใจดี"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  className="form-input"
                  style={{ width: "100%", padding: "10px 14px", border: "1px solid #cbd5e1", borderRadius: "10px", fontSize: "14px" }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: "16px" }}>
                <label className="form-label" style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: 600, color: "#334155" }}>ตำแหน่ง/หน้าที่ *</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น Full-Stack Developer"
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value)}
                  className="form-input"
                  style={{ width: "100%", padding: "10px 14px", border: "1px solid #cbd5e1", borderRadius: "10px", fontSize: "14px" }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: "20px" }}>
                <label className="form-label" style={{ display: "block", marginBottom: "8px", fontSize: "13px", fontWeight: 600, color: "#334155" }}>เลือกรูปโปรไฟล์ (CV Avatar)</label>
                <div style={{ display: "flex", gap: "10px", justifyContent: "space-between" }}>
                  {["/cv1.png", "/cv2.png", "/cv3.png", "/cv4.png", "/cv5.png"].map((cv) => (
                    <div
                      key={cv}
                      onClick={() => setSelectedAvatar(cv)}
                      style={{
                        cursor: "pointer",
                        padding: "6px",
                        borderRadius: "14px",
                        border: selectedAvatar === cv ? "2px solid var(--theme-primary)" : "2px solid transparent",
                        backgroundColor: selectedAvatar === cv ? "var(--theme-primary-shadow, rgba(0,0,0,0.04))" : "transparent",
                        transition: "all 0.15s ease",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Image
                        src={cv}
                        alt="CV Avatar"
                        width={45}
                        height={45}
                        style={{ objectFit: "contain" }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "24px" }}>
                <button type="button" onClick={() => { setIsAddMemberModalOpen(false); setEditingMember(null); }} className="btn-outline" style={{ padding: "8px 16px", borderRadius: "999px", fontSize: "13px", fontWeight: 600, border: "1px solid #cbd5e1", cursor: "pointer", backgroundColor: "transparent" }}>
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  style={{
                    padding: "8px 18px",
                    borderRadius: "999px",
                    backgroundColor: "var(--theme-primary)",
                    color: "#ffffff",
                    border: "none",
                    fontSize: "13px",
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: "0 4px 10px var(--theme-primary-shadow, rgba(0,0,0,0.15))",
                  }}
                >
                  {editingMember ? "บันทึกการแก้ไข" : "เพิ่มสมาชิก"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Edit Confirmation Dialog shared by every "บันทึกการแก้ไข" action */}
      <InviteProjectModal
        isOpen={isInviteModalOpen}
        projectId={backendProjectId}
        projectTitle={projectTitle}
        onClose={() => setIsInviteModalOpen(false)}
      />

      <AlertDialogSmall
        open={!!editConfirmation}
        onOpenChange={(open) => {
          if (!open) clearEditConfirmation();
        }}
        trigger={null}
        title="ยืนยันการแก้ไข?"
        description={`คุณต้องการบันทึกการแก้ไข${editConfirmation?.entityLabel || "ข้อมูล"} "${editConfirmation?.itemName || ""}" ใช่หรือไม่?`}
        cancelText="ยกเลิก"
        actionText="ยืนยันการแก้ไข"
        actionBgColor="var(--theme-primary, #17211e)"
        onAction={() => {
          const pendingAction = pendingEditActionRef.current;
          clearEditConfirmation();
          pendingAction?.();
        }}
      />

      {/* Delete Meeting Confirmation Dialog */}
      <AlertDialogSmall
        open={!!deletingMeeting}
        onOpenChange={(open) => {
          if (!open) setDeletingMeeting(null);
        }}
        trigger={null}
        title="ลบบันทึกการประชุมนี้?"
        description={`คุณแน่ใจหรือไม่ว่าต้องการลบบันทึกการประชุม "${deletingMeeting?.title || ""}"?`}
        cancelText="ยกเลิก"
        actionText="ลบบันทึก"
        variant="destructive"
        onAction={() => {
          if (deletingMeeting) {
            handleDeleteMeeting(deletingMeeting);
            setDeletingMeeting(null);
          }
        }}
      />

      {/* Delete Task Confirmation Dialog */}
      <AlertDialogSmall
        open={!!deletingTask}
        onOpenChange={(open) => {
          if (!open) setDeletingTask(null);
        }}
        trigger={null}
        title="ลบงานนี้?"
        description={`คุณแน่ใจหรือไม่ว่าต้องการลบงาน "${deletingTask?.title || ""}"?`}
        cancelText="ยกเลิก"
        actionText="ลบงาน"
        variant="destructive"
        onAction={() => {
          if (deletingTask) {
            handleDeleteTask(deletingTask);
            setDeletingTask(null);
          }
        }}
      />

      {/* Delete Member Confirmation Dialog */}
      <AlertDialogSmall
        open={!!deletingMember}
        onOpenChange={(open) => {
          if (!open) setDeletingMember(null);
        }}
        trigger={null}
        title="ลบสมาชิกคนนี้?"
        description={`คุณแน่ใจหรือไม่ว่าต้องการลบสมาชิก "${deletingMember?.name}" ออกจากโปรเจกต์นี้?`}
        cancelText="ยกเลิก"
        actionText="ลบสมาชิก"
        variant="destructive"
        actionBgColor="var(--theme-primary, #17211e)"
        onAction={() => {
          if (deletingMember) {
            void handleDeleteMember(deletingMember);
            setDeletingMember(null);
          }
        }}
      />

    </div>
  );
}
