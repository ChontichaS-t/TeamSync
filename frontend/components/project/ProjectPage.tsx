"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Plus, Search, X, Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import { CalendarDemo } from "@/components/global/CalendarDemo";
import { Combobox } from "@/components/ui/combobox";

export type TaskStatus = "ยังไม่เริ่ม" | "กำลังทำ" | "รอตรวจ" | "เสร็จแล้ว";

export interface TaskItem {
  id: string;
  title: string;
  assignee: string;
  dueDate: string;
  status: TaskStatus;
  priority: "ต่ำ" | "ปานกลาง" | "สูง";
  source: string; // ที่มาของงาน (e.g. Feedback จากการประชุมครั้งที่ 2)
}

export interface MemberItem {
  name: string;
  role: string;
  currentTasks: string;
}

export interface FeedbackItem {
  id: string;
  topic: string;
  provider: string;
  round: string;
  decision: string;
  assignee: string;
  status: "กำลังแก้ไข" | "แก้ไขแล้ว";
  result: string;
}

export interface MeetingItem {
  id: string;
  title: string;
  date: string;
  summary: string[];
  agreed: string[];
}

export interface TimelineItem {
  id: string;
  date: string;
  event: string;
}

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
    <div ref={dropdownRef} style={{ position: "relative", display: "inline-block" }}>
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
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            zIndex: 999,
            minWidth: "130px",
            backgroundColor: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.12)",
            padding: "4px",
          }}
        >
          {statuses.map((st) => (
            <div
              key={st}
              onClick={() => {
                onChange(st);
                setIsOpen(false);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "6px 10px",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "12px",
                backgroundColor: status === st ? "#f1f5f9" : "transparent",
              }}
              onMouseEnter={(e) => {
                if (status !== st) e.currentTarget.style.backgroundColor = "#f8fafc";
              }}
              onMouseLeave={(e) => {
                if (status !== st) e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <span className={`status-pill ${getStatusClass(st)}`}>{st}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Initial Data matching TeamSync PDF spec
const initialMembers: MemberItem[] = [
  { name: "Chonticha", role: "Frontend Developer", currentTasks: "กำลังทำ 3 งาน" },
  { name: "Beam", role: "Backend Developer", currentTasks: "กำลังทำ 2 งาน" },
  { name: "Jane", role: "UI/UX Designer", currentTasks: "กำลัง Review 1 งาน" },
];

const initialTasks: TaskItem[] = [
  {
    id: "t1",
    title: "ออกแบบหน้า Monitor ใหม่",
    assignee: "Chonticha",
    dueDate: "25 กรกฎาคม 2026",
    status: "กำลังทำ",
    priority: "สูง",
    source: "Feedback จากการประชุมครั้งที่ 2",
  },
  {
    id: "t2",
    title: "พัฒนา Backend รองรับ Walkover",
    assignee: "Beam",
    dueDate: "28 กรกฎาคม 2026",
    status: "กำลังทำ",
    priority: "สูง",
    source: "การประชุมครั้งที่ 2",
  },
  {
    id: "t3",
    title: "เพิ่ม Court Filter ใน Table View",
    assignee: "Chonticha",
    dueDate: "26 กรกฎาคม 2026",
    status: "ยังไม่เริ่ม",
    priority: "ปานกลาง",
    source: "สิ่งที่ทีมตกลงกัน",
  },
  {
    id: "t4",
    title: "Review UI รอบแก้ไขหน้า Monitor",
    assignee: "Jane",
    dueDate: "24 กรกฎาคม 2026",
    status: "รอตรวจ",
    priority: "สูง",
    source: "Feedback รอบ 2",
  },
  {
    id: "t5",
    title: "ออกแบบ ER Diagram ของระบบ",
    assignee: "Beam",
    dueDate: "15 กรกฎาคม 2026",
    status: "เสร็จแล้ว",
    priority: "สูง",
    source: "Kickoff Meeting",
  },
  {
    id: "t6",
    title: "ทำ Mockup Tournament Flow",
    assignee: "Jane",
    dueDate: "18 กรกฎาคม 2026",
    status: "เสร็จแล้ว",
    priority: "ปานกลาง",
    source: "Requirements",
  },
];

const initialFeedback: FeedbackItem[] = [
  {
    id: "f1",
    topic: "หน้า Monitor ดูข้อมูลยาก",
    provider: "อาจารย์ที่ปรึกษา",
    round: "Review ครั้งที่ 2",
    decision: "รับข้อเสนอ",
    assignee: "Chonticha",
    status: "กำลังแก้ไข",
    result: "ปรับเป็น Table View และเพิ่ม Filter",
  },
  {
    id: "f2",
    topic: "Backend ยังไม่รองรับ Walkover",
    provider: "ทีมงาน (Jane)",
    round: "Review ครั้งที่ 2",
    decision: "รับข้อเสนอ",
    assignee: "Beam",
    status: "กำลังแก้ไข",
    result: "เพิ่ม API endpoint walkover",
  },
  {
    id: "f3",
    topic: "ปุ่ม Export PDF ไม่ตอบสนองบนมือถือ",
    provider: "อาจารย์ที่ปรึกษา",
    round: "Review ครั้งที่ 1",
    decision: "รับข้อเสนอ",
    assignee: "Beam",
    status: "แก้ไขแล้ว",
    result: "แก้ไข Event handler รองรับ Touch Devices",
  },
];

const initialMeetings: MeetingItem[] = [
  {
    id: "m2",
    title: "ประชุมครั้งที่ 2",
    date: "22 กรกฎาคม 2026",
    summary: [
      "หน้า Monitor มีข้อมูลเยอะเกินไป",
      "ต้องเพิ่ม Filter ตามสนาม",
      "Backend ยังไม่รองรับ Walkover",
    ],
    agreed: [
      "เปลี่ยน Layout เป็น Table",
      "เพิ่ม Court Filter",
      "ส่ง UI ใหม่วันศุกร์ (25 ก.ค.)",
    ],
  },
  {
    id: "m1",
    title: "ประชุม Kickoff ครั้งที่ 1",
    date: "15 กรกฎาคม 2026",
    summary: ["ตกลง Scope MVP 7 เมนูหลัก", "มอบหมายหน้าที่ภายในทีม"],
    agreed: ["ใช้ TeamSync เป็นระบบศูนย์กลาง", "นัด Demo ทุกสัปดาห์"],
  },
];

const initialTimeline: TimelineItem[] = [
  { id: "tl4", date: "24 กรกฎาคม 2026", event: "งานออกแบบ Monitor เปลี่ยนเป็นรอตรวจ" },
  { id: "tl3", date: "22 กรกฎาคม 2026", event: "ประชุมทีมและตัดสินใจเปลี่ยน Layout" },
  { id: "tl2", date: "21 กรกฎาคม 2026", event: "มอบหมายงานออกแบบ Monitor ให้ Chonticha" },
  { id: "tl1", date: "20 กรกฎาคม 2026", event: "เพิ่ม Feedback รอบที่ 2" },
];

function generateUniqueId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
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

export default function ProjectPage() {
  const searchParams = useSearchParams();
  const coverImage = searchParams.get("cover") || "/new/newsea.jpg";

  const [activeTab, setActiveTab] = useState<"all" | "tasks" | "feedback" | "meetings" | "members_timeline">("all");
  const [tasks, setTasks] = useState<TaskItem[]>(initialTasks);
  const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>(initialFeedback);
  const [meetings, setMeetings] = useState<MeetingItem[]>(initialMeetings);
  const [timeline, setTimeline] = useState<TimelineItem[]>(initialTimeline);

  const [taskFilterStatus, setTaskFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modals
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [isAddFeedbackModalOpen, setIsAddFeedbackModalOpen] = useState(false);
  const [isAddMeetingModalOpen, setIsAddMeetingModalOpen] = useState(false);

  // Task Due Date Calendar State (Using CalendarDemo)
  const [taskDueDate, setTaskDueDate] = useState<Date | undefined>(new Date(2026, 6, 28));
  const [showTaskCalendar, setShowTaskCalendar] = useState(false);

  // Meeting Date Calendar State
  const [meetingDate, setMeetingDate] = useState<Date | undefined>(new Date(2026, 6, 25));
  const [showMeetingCalendar, setShowMeetingCalendar] = useState(false);

  // Task Date Editing Popup
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  // Form Inputs
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskAssignee, setNewTaskAssignee] = useState("Chonticha");
  const [newTaskSource, setNewTaskSource] = useState("");

  const [newFbTopic, setNewFbTopic] = useState("");
  const [newFbProvider, setNewFbProvider] = useState("อาจารย์ที่ปรึกษา");
  const [newFbDecision, setNewFbDecision] = useState("รับข้อเสนอ");
  const [newFbAssignee, setNewFbAssignee] = useState("Chonticha");
  const [newFbResult, setNewFbResult] = useState("");

  const [newMeetingTitle, setNewMeetingTitle] = useState("");
  const [newMeetingSummaryText, setNewMeetingSummaryText] = useState("");
  const [newMeetingAgreedText, setNewMeetingAgreedText] = useState("");

  // Stat Calculations
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "เสร็จแล้ว").length;
  const inProgressTasks = tasks.filter((t) => t.status === "กำลังทำ").length;
  const pendingFeedback = feedbackList.filter((f) => f.status === "กำลังแก้ไข").length;
  const progressPercent = Math.round((completedTasks / totalTasks) * 100);

  // Handlers
  const handleStatusChange = (id: string, newStatus: TaskStatus) => {
    const targetTask = tasks.find((t) => t.id === id);
    if (!targetTask || targetTask.status === newStatus) return;

    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: newStatus } : t))
    );

    setTimeline((prevTl) => [
      {
        id: generateUniqueId("tl"),
        date: "วันนี้",
        event: `งาน '${targetTask.title}' เปลี่ยนสถานะเป็น ${newStatus}`,
      },
      ...prevTl,
    ]);
  };

  const handleFeedbackToggle = (id: string) => {
    const targetFb = feedbackList.find((f) => f.id === id);
    if (!targetFb) return;

    const nextStatus = targetFb.status === "กำลังแก้ไข" ? "แก้ไขแล้ว" : "กำลังแก้ไข";

    setFeedbackList((prev) =>
      prev.map((f) => (f.id === id ? { ...f, status: nextStatus } : f))
    );

    setTimeline((prevTl) => [
      {
        id: generateUniqueId("tl"),
        date: "วันนี้",
        event: `Feedback '${targetFb.topic}' เปลี่ยนสถานะเป็น ${nextStatus}`,
      },
      ...prevTl,
    ]);
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const formattedDate = formatThaiDate(taskDueDate);

    const newTask: TaskItem = {
      id: generateUniqueId("t"),
      title: newTaskTitle.trim(),
      assignee: newTaskAssignee,
      dueDate: formattedDate,
      status: "กำลังทำ",
      priority: "ปานกลาง",
      source: newTaskSource.trim() || "จากการประชุมทีม",
    };

    setTasks((prev) => [newTask, ...prev]);
    setTimeline((prev) => [
      { id: generateUniqueId("tl"), date: "วันนี้", event: `มอบหมายงาน '${newTask.title}' ให้ ${newTask.assignee} (ส่ง ${formattedDate})` },
      ...prev,
    ]);

    setNewTaskTitle("");
    setNewTaskSource("");
    setIsAddTaskModalOpen(false);
    setShowTaskCalendar(false);
  };

  const handleAddFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFbTopic.trim()) return;

    const formattedDate = formatThaiDate(taskDueDate);

    const newFb: FeedbackItem = {
      id: generateUniqueId("f"),
      topic: newFbTopic.trim(),
      provider: newFbProvider,
      round: "Review รอบปัจจุบัน",
      decision: newFbDecision,
      assignee: newFbAssignee,
      status: "กำลังแก้ไข",
      result: newFbResult.trim() || "อยู่ระหว่างปรับแก้ไข",
    };

    setFeedbackList((prev) => [newFb, ...prev]);

    setTasks((prevTasks) => [
      {
        id: generateUniqueId("t_fb"),
        title: `แก้ Feedback: ${newFb.topic}`,
        assignee: newFb.assignee,
        dueDate: formattedDate,
        status: "กำลังทำ",
        priority: "สูง",
        source: `Feedback จาก ${newFb.provider}`,
      },
      ...prevTasks,
    ]);

    setTimeline((prev) => [
      { id: generateUniqueId("tl"), date: "วันนี้", event: `เพิ่ม Feedback '${newFb.topic}' และมอบหมายให้ ${newFb.assignee}` },
      ...prev,
    ]);

    setNewFbTopic("");
    setNewFbResult("");
    setIsAddFeedbackModalOpen(false);
  };

  const handleAddMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMeetingTitle.trim()) return;

    const formattedDate = formatThaiDate(meetingDate);

    const newM: MeetingItem = {
      id: generateUniqueId("m"),
      title: newMeetingTitle.trim(),
      date: formattedDate,
      summary: newMeetingSummaryText.split("\n").filter((s) => s.trim()),
      agreed: newMeetingAgreedText.split("\n").filter((a) => a.trim()),
    };

    setMeetings((prev) => [newM, ...prev]);
    setTimeline((prev) => [
      { id: generateUniqueId("tl"), date: "วันนี้", event: `บันทึกการประชุม '${newM.title}' (${formattedDate})` },
      ...prev,
    ]);

    setNewMeetingTitle("");
    setNewMeetingSummaryText("");
    setNewMeetingAgreedText("");
    setIsAddMeetingModalOpen(false);
    setShowMeetingCalendar(false);
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || t.assignee.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = taskFilterStatus === "all" ? true : t.status === taskFilterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [tasks, searchQuery, taskFilterStatus]);

  return (
    <div className="project-room">
      {/* 1. Navbar */}
      <nav className="project-navbar" aria-label="Project navigation">
        <Link className="brand" href="/home" aria-label="TeamSync home">
          TeamSync
        </Link>
        <div className="project-navbar-menu">
          <Link href="/home">Home</Link>
          <Link className="project-navbar-active" href="/project">
            Project
          </Link>
          <Link href="/project#works" onClick={() => setActiveTab("tasks")}>
            Works
          </Link>
          <Link href={`/calendar?cover=${encodeURIComponent(coverImage)}&title=${encodeURIComponent("Badminton Tournament System")}`}>Calendar</Link>
        </div>
      </nav>

      {/* 2. Main Content */}
      <div className="project-content">
        
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
                <h1 className="project-main-title">Badminton Tournament System</h1>
                <p className="project-goal-desc">
                  <strong>เป้าหมาย:</strong> พัฒนาระบบจัดการแข่งขันแบดมินตัน &nbsp;|&nbsp; <strong>กำหนดส่ง:</strong> 30 กันยายน 2026
                </p>
              </div>

              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <button onClick={() => setIsAddTaskModalOpen(true)} className="btn-banner">
                  <Plus className="w-4 h-4" /> เพิ่มงาน
                </button>
                <button onClick={() => setIsAddFeedbackModalOpen(true)} className="btn-banner-outline">
                  <Plus className="w-4 h-4" /> เพิ่ม Feedback
                </button>
                <button onClick={() => setIsAddMeetingModalOpen(true)} className="btn-banner-outline">
                  <Plus className="w-4 h-4" /> บันทึกประชุม
                </button>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="project-quick-stats">
              <div className="stat-box">
                <div className="stat-box-label">ความคืบหน้าโครงการ</div>
                <div className="stat-box-value">{progressPercent}%</div>
              </div>
              <div className="stat-box">
                <div className="stat-box-label">งานกำลังทำ</div>
                <div className="stat-box-value">{inProgressTasks} <span style={{ fontSize: "13px", fontWeight: 600 }}>งาน</span></div>
              </div>
              <div className="stat-box">
                <div className="stat-box-label">งานเสร็จแล้ว</div>
                <div className="stat-box-value">{completedTasks} <span style={{ fontSize: "13px", fontWeight: 600 }}>งาน</span></div>
              </div>
              <div className="stat-box">
                <div className="stat-box-label">Feedback ที่ยังไม่แก้</div>
                <div className="stat-box-value">{pendingFeedback} <span style={{ fontSize: "13px", fontWeight: 600 }}>ข้อ</span></div>
              </div>
              <div className="stat-box">
                <div className="stat-box-label">ประชุมครั้งถัดไป</div>
                <div className="stat-box-value" style={{ fontSize: "17px", paddingTop: "2px" }}>25 ก.ค. 2026</div>
              </div>
            </div>
          </div>
        </div>

        {/* Section Navigation Tabs */}
        <div className="project-section-tabs">
          <button onClick={() => setActiveTab("all")} className={`sec-tab ${activeTab === "all" ? "active" : ""}`}>
            ภาพรวมโปรเจกต์
          </button>
          <button onClick={() => setActiveTab("members_timeline")} className={`sec-tab ${activeTab === "members_timeline" ? "active" : ""}`}>
            สมาชิก & Timeline ({initialMembers.length})
          </button>
          <button onClick={() => setActiveTab("tasks")} className={`sec-tab ${activeTab === "tasks" ? "active" : ""}`}>
            แบ่งงานและติดตามสถานะ ({tasks.length})
          </button>
          <button onClick={() => setActiveTab("meetings")} className={`sec-tab ${activeTab === "meetings" ? "active" : ""}`}>
            บันทึกการประชุม ({meetings.length})
          </button>
          <button onClick={() => setActiveTab("feedback")} className={`sec-tab ${activeTab === "feedback" ? "active" : ""}`}>
            Feedback & ปรับแก้ ({feedbackList.length})
          </button>
        </div>

        {/* MEMBERS & TIMELINE SIDE-BY-SIDE */}
        {(activeTab === "all" || activeTab === "members_timeline") && (
          <div className="members-timeline-container">
            {/* SECTION 1: MEMBERS & ROLES */}
            <div className="section-block">
              <div className="section-header-bar">
                <h2 className="section-header-title">สมาชิกและหน้าที่ในทีม</h2>
                <span className="section-header-sub">ตอบว่าใครอยู่ในทีมและใครรับผิดชอบอะไร</span>
              </div>
              <div className="section-body" style={{ padding: 0 }}>
                <table className="ts-table">
                  <thead>
                    <tr>
                      <th>สมาชิก</th>
                      <th>บทบาท</th>
                      <th>งานปัจจุบัน</th>
                    </tr>
                  </thead>
                  <tbody>
                    {initialMembers.map((m) => (
                      <tr key={m.name}>
                        <td>
                          <div className="member-cell">
                            <div className="member-avatar-circle">{m.name.charAt(0)}</div>
                            <span>{m.name}</span>
                          </div>
                        </td>
                        <td style={{ color: "#475569", fontWeight: 500 }}>{m.role}</td>
                        <td>
                          <span className="status-pill status-doing">{m.currentTasks}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SECTION 5: TIMELINE */}
            <div className="section-block">
              <div className="section-header-bar">
                <h2 className="section-header-title">Timeline ประวัติโปรเจกต์</h2>
                <span style={{ fontSize: "12px", color: "#cbd5e1" }}>ช่วยให้สมาชิกตามบริบทโปรเจกต์ได้ทัน</span>
              </div>
              <div className="section-body">
                <div className="timeline-list">
                  {timeline.map((item) => (
                    <div key={item.id} className="timeline-row">
                      <div className="timeline-date">{item.date}</div>
                      <div className="timeline-event">{item.event}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 2: TASKS & STATUS */}
        {(activeTab === "all" || activeTab === "tasks") && (
          <div className="section-block">
            <div className="section-header-bar">
              <h2 className="section-header-title">แบ่งงานและติดตามสถานะ</h2>
              <div style={{ display: "flex", gap: "6px" }}>
                <button onClick={() => setTaskFilterStatus("all")} className="btn-outline" style={{ padding: "4px 10px", fontSize: "11px", height: "auto" }}>ทั้งหมด</button>
                <button onClick={() => setTaskFilterStatus("กำลังทำ")} className="btn-outline" style={{ padding: "4px 10px", fontSize: "11px", height: "auto" }}>กำลังทำ</button>
                <button onClick={() => setTaskFilterStatus("เสร็จแล้ว")} className="btn-outline" style={{ padding: "4px 10px", fontSize: "11px", height: "auto" }}>เสร็จแล้ว</button>
              </div>
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
                <button onClick={() => setIsAddTaskModalOpen(true)} className="btn-navy" style={{ height: "34px" }}>
                  <Plus className="w-4 h-4" /> สร้างงานใหม่
                </button>
              </div>

              <table className="ts-table">
                <thead>
                  <tr>
                    <th>ชื่องาน</th>
                    <th>ผู้รับผิดชอบ</th>
                    <th>วันครบกำหนด</th>
                    <th>สถานะ</th>
                    <th>ที่มาของงาน (Origin)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.map((t) => (
                    <tr key={t.id}>
                      <td style={{ fontWeight: 600 }}>{t.title}</td>
                      <td>{t.assignee}</td>
                      <td>
                        <button
                          onClick={() => setEditingTaskId(editingTaskId === t.id ? null : t.id)}
                          style={{
                            background: "#ffffff",
                            border: "1px solid #cbd5e1",
                            padding: "6px 10px",
                            borderRadius: "8px",
                            fontSize: "12px",
                            color: "#111827",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px"
                          }}
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
                                  const formatted = formatThaiDate(newDate);
                                  setTasks((prev) =>
                                    prev.map((taskItem) =>
                                      taskItem.id === t.id ? { ...taskItem, dueDate: formatted } : taskItem
                                    )
                                  );
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
                      <td>
                        <span className="source-tag">{t.source}</span>
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
          <div className="section-block">
            <div className="section-header-bar">
              <h2 className="section-header-title">บันทึกการประชุม (Meeting Summaries)</h2>
              <button onClick={() => setIsAddMeetingModalOpen(true)} className="btn-outline" style={{ padding: "6px 14px", fontSize: "12px" }}>
                <Plus className="w-3.5 h-3.5" /> บันทึกประชุม
              </button>
            </div>
            <div className="section-body">
              {meetings.map((m) => (
                <div key={m.id} className="meeting-note-card">
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                    <h4>{m.title}</h4>
                    <span style={{ fontSize: "12px", color: "#64748b" }}>วันที่: {m.date}</span>
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

        {/* SECTION 4: FEEDBACK & REVISIONS */}
        {(activeTab === "all" || activeTab === "feedback") && (
          <div className="section-block">
            <div className="section-header-bar">
              <h2 className="section-header-title">เก็บ Feedback และสิ่งที่ต้องปรับแก้</h2>
              <span style={{ fontSize: "12px", color: "#cbd5e1" }}>จุดเด่นที่สุดของระบบ TeamSync</span>
            </div>
            <div className="section-body" style={{ padding: 0 }}>
              <table className="ts-table">
                <thead>
                  <tr>
                    <th>รายการ Feedback</th>
                    <th>ผู้ให้</th>
                    <th>รอบ</th>
                    <th>การตัดสินใจ</th>
                    <th>ผู้รับผิดชอบ</th>
                    <th>สถานะ</th>
                    <th>ผลลัพธ์</th>
                  </tr>
                </thead>
                <tbody>
                  {feedbackList.map((f) => (
                    <tr key={f.id}>
                      <td style={{ fontWeight: 600 }}>{f.topic}</td>
                      <td>{f.provider}</td>
                      <td style={{ color: "#6b7280" }}>{f.round}</td>
                      <td style={{ color: "#166534", fontWeight: 600 }}>{f.decision}</td>
                      <td>{f.assignee}</td>
                      <td>
                        <button
                          onClick={() => handleFeedbackToggle(f.id)}
                          className={`status-pill ${f.status === "แก้ไขแล้ว" ? "status-done" : "status-doing"}`}
                          style={{ border: "none", cursor: "pointer" }}
                        >
                          {f.status}
                        </button>
                      </td>
                      <td style={{ fontSize: "12px", color: "#374151" }}>{f.result}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}



      </div>

      {/* MODAL 1: Add Task */}
      {isAddTaskModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-dialog">
            <div className="modal-title-bar">
              <h3>เพิ่มงานใหม่</h3>
              <button onClick={() => setIsAddTaskModalOpen(false)} style={{ border: "none", background: "none", cursor: "pointer" }}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddTask}>
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

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
                <div>
                  <label className="form-label">ผู้รับผิดชอบ</label>
                  <Combobox
                    options={["Chonticha", "Beam", "Jane"]}
                    value={newTaskAssignee}
                    onChange={(val) => setNewTaskAssignee(val)}
                    placeholder="เลือกผู้รับผิดชอบ..."
                  />
                </div>

                <div style={{ position: "relative" }}>
                  <label className="form-label">วันกำหนดส่ง (Due Date)</label>
                  <button
                    type="button"
                    onClick={() => setShowTaskCalendar(!showTaskCalendar)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0 14px",
                      height: "40px",
                      border: "1px solid #cbd5e1",
                      borderRadius: "10px",
                      backgroundColor: "#ffffff",
                      fontSize: "13px",
                      color: "#111827",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
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
                <label className="form-label">ที่มาของงาน (Origin)</label>
                <input
                  type="text"
                  placeholder="เช่น Feedback จากการประชุมครั้งที่ 2"
                  value={newTaskSource}
                  onChange={(e) => setNewTaskSource(e.target.value)}
                  className="form-input"
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "18px" }}>
                <button type="button" onClick={() => setIsAddTaskModalOpen(false)} className="btn-outline">
                  ยกเลิก
                </button>
                <button type="submit" className="btn-navy">
                  บันทึกสร้างงาน
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Add Feedback */}
      {isAddFeedbackModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-dialog">
            <div className="modal-title-bar">
              <h3>เพิ่ม Feedback ใหม่</h3>
              <button onClick={() => setIsAddFeedbackModalOpen(false)} style={{ border: "none", background: "none", cursor: "pointer" }}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddFeedback}>
              <div className="form-group">
                <label className="form-label">รายการ Feedback *</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น หน้า Monitor ดูข้อมูลยาก"
                  value={newFbTopic}
                  onChange={(e) => setNewFbTopic(e.target.value)}
                  className="form-input"
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
                <div>
                  <label className="form-label">ผู้ให้ Feedback</label>
                  <input type="text" value={newFbProvider} onChange={(e) => setNewFbProvider(e.target.value)} className="form-input" />
                </div>
                <div>
                  <label className="form-label">ผู้รับผิดชอบหลัก</label>
                  <Combobox
                    options={["Chonticha", "Beam", "Jane"]}
                    value={newFbAssignee}
                    onChange={(val) => setNewFbAssignee(val)}
                    placeholder="เลือกผู้รับผิดชอบ..."
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">แนวทางผลลัพธ์ที่จะแก้ไข</label>
                <input
                  type="text"
                  placeholder="เช่น ปรับเป็น Table View และเพิ่ม Filter"
                  value={newFbResult}
                  onChange={(e) => setNewFbResult(e.target.value)}
                  className="form-input"
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "18px" }}>
                <button type="button" onClick={() => setIsAddFeedbackModalOpen(false)} className="btn-outline">
                  ยกเลิก
                </button>
                <button type="submit" className="btn-navy">
                  บันทึก Feedback
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Add Meeting */}
      {isAddMeetingModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-dialog">
            <div className="modal-title-bar">
              <h3>บันทึกผลการประชุม</h3>
              <button onClick={() => setIsAddMeetingModalOpen(false)} style={{ border: "none", background: "none", cursor: "pointer" }}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddMeeting}>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "16px", marginBottom: "20px" }}>
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
                    onClick={() => setShowMeetingCalendar(!showMeetingCalendar)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0 14px",
                      height: "40px",
                      border: "1px solid #cbd5e1",
                      borderRadius: "10px",
                      backgroundColor: "#ffffff",
                      fontSize: "13px",
                      color: "#111827",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <span>{formatThaiDate(meetingDate)}</span>
                    <ChevronDown style={{ width: 16, height: 16, color: "#94a3b8", transform: showMeetingCalendar ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s ease" }} />
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
                <button type="button" onClick={() => setIsAddMeetingModalOpen(false)} className="btn-outline">
                  ยกเลิก
                </button>
                <button type="submit" className="btn-navy">
                  บันทึกผลประชุม
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
