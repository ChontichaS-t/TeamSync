"use client";

import { ArrowRight, CalendarDays, CheckCircle2, Link2, LogIn, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type InvitationPreview = {
  project: {
    id: string;
    title: string;
    description: string;
    cover: string;
    deadline: string;
    memberCount: number;
  };
  invitedBy: string;
  expiresAt: string;
};

export default function JoinProjectPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const token = params.token;
  const [invitation, setInvitation] = useState<InvitationPreview | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function loadInvitation() {
      try {
        const [invitationResponse, sessionResponse] = await Promise.all([
          fetch(`/api/invitations/${encodeURIComponent(token)}`, { cache: "no-store", signal: controller.signal }),
          fetch("/api/auth/me", { credentials: "include", cache: "no-store", signal: controller.signal }),
        ]);
        if (!invitationResponse.ok) {
          const result = (await invitationResponse.json().catch(() => ({}))) as { error?: string };
          setError(result.error || "ไม่พบคำเชิญนี้");
          return;
        }
        setInvitation((await invitationResponse.json()) as InvitationPreview);
        setIsAuthenticated(sessionResponse.ok);
      } catch (loadError) {
        if (!(loadError instanceof DOMException && loadError.name === "AbortError")) {
          setError("ไม่สามารถโหลดคำเชิญได้ กรุณาลองใหม่อีกครั้ง");
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }
    void loadInvitation();
    return () => controller.abort();
  }, [token]);

  async function acceptInvitation() {
    if (!invitation) return;
    setIsJoining(true);
    setError("");
    try {
      const response = await fetch(`/api/invitations/${encodeURIComponent(token)}/accept`, {
        method: "POST",
        credentials: "include",
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        if (response.status === 401) {
          setIsAuthenticated(false);
          return;
        }
        setError(result.error || "ไม่สามารถเข้าร่วมโปรเจกต์ได้");
        return;
      }
      router.replace(`/project?projectId=${encodeURIComponent(invitation.project.id)}&cover=${encodeURIComponent(invitation.project.cover)}&title=${encodeURIComponent(invitation.project.title)}`);
      router.refresh();
    } catch {
      setError("ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้");
    } finally {
      setIsJoining(false);
    }
  }

  const returnPath = `/join/${token}`;

  return (
    <main className="join-project-page">
      <nav className="join-project-nav">
        <Link href="/home" className="brand"><span>TeamSync</span></Link>
      </nav>

      {isLoading ? (
        <section className="join-project-card join-project-loading">กำลังโหลดคำเชิญ...</section>
      ) : !invitation ? (
        <section className="join-project-card join-project-invalid">
          <span className="join-project-mark"><Link2 aria-hidden="true" /></span>
          <h1>ไม่สามารถใช้ลิงก์นี้ได้</h1>
          <p>{error || "ลิงก์เชิญอาจหมดอายุ ถูกยกเลิก หรือใช้ครบจำนวนแล้ว"}</p>
          <Link href="/home" className="join-secondary-button">กลับหน้าหลัก</Link>
        </section>
      ) : (
        <section className="join-project-card">
          <div className="join-cover">
            <Image src={invitation.project.cover} alt="Project cover" fill sizes="560px" priority />
            <div className="join-cover-overlay" />
            <span className="join-invite-badge"><Users aria-hidden="true" /> คำเชิญเข้าร่วมทีม</span>
          </div>
          <div className="join-project-content">
            <p className="join-eyebrow">{invitation.invitedBy} เชิญคุณเข้าร่วม</p>
            <h1>{invitation.project.title}</h1>
            <p className="join-description">{invitation.project.description || "ร่วมวางแผน แบ่งงาน และติดตามความคืบหน้าไปพร้อมกับทีม"}</p>

            <div className="join-project-meta">
              <span><Users aria-hidden="true" /> สมาชิก {invitation.project.memberCount} คน</span>
              {invitation.project.deadline && <span><CalendarDays aria-hidden="true" /> {invitation.project.deadline}</span>}
            </div>

            {error && <p className="join-project-error" role="alert">{error}</p>}

            {isAuthenticated ? (
              <button type="button" className="join-primary-button" onClick={acceptInvitation} disabled={isJoining}>
                <CheckCircle2 aria-hidden="true" />
                {isJoining ? "กำลังเข้าร่วม..." : "ยืนยันเข้าร่วมโปรเจกต์"}
                {!isJoining && <ArrowRight aria-hidden="true" />}
              </button>
            ) : (
              <div className="join-auth-actions">
                <p>เข้าสู่ระบบหรือสร้างบัญชีก่อนยืนยันเข้าร่วมโปรเจกต์</p>
                <Link className="join-primary-button" href={`/login?next=${encodeURIComponent(returnPath)}`}>
                  <LogIn aria-hidden="true" /> เข้าสู่ระบบเพื่อเข้าร่วม
                </Link>
                <Link className="join-secondary-button" href={`/register?next=${encodeURIComponent(returnPath)}`}>สร้างบัญชีใหม่</Link>
              </div>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
