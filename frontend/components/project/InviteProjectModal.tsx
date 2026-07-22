"use client";

import { Check, Copy, Link2, ShieldCheck, Users, X } from "lucide-react";
import { useEffect, useState } from "react";

type InviteProjectModalProps = {
  isOpen: boolean;
  projectId: string | null;
  projectTitle: string;
  onClose: () => void;
};

type InvitationResponse = {
  token: string;
  expiresAt: string;
};

export function InviteProjectModal({ isOpen, projectId, projectTitle, onClose }: InviteProjectModalProps) {
  const [inviteLink, setInviteLink] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [error, setError] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setInviteLink("");
      setExpiresAt("");
      setError("");
      setCopied(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  async function createInvitation() {
    if (!projectId) {
      setError("กำลังเตรียมข้อมูลโปรเจกต์ กรุณาลองอีกครั้ง");
      return;
    }
    setIsCreating(true);
    setError("");
    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/invitations`, {
        method: "POST",
        credentials: "include",
      });
      const result = (await response.json().catch(() => ({}))) as Partial<InvitationResponse> & { error?: string };
      if (!response.ok || !result.token) {
        setError(result.error || "ไม่สามารถสร้างลิงก์เชิญได้");
        return;
      }
      setInviteLink(`${window.location.origin}/join/${result.token}`);
      setExpiresAt(result.expiresAt || "");
    } catch {
      setError("ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้");
    } finally {
      setIsCreating(false);
    }
  }

  async function copyInvitation() {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("คัดลอกอัตโนมัติไม่สำเร็จ กรุณาเลือกลิงก์แล้วคัดลอกด้วยตนเอง");
    }
  }

  const expiryLabel = expiresAt
    ? new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short" }).format(new Date(expiresAt))
    : "";

  return (
    <div className="invite-modal-backdrop" onClick={onClose} role="presentation">
      <section
        className="invite-modal-card"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="invite-project-title"
      >
        <header className="invite-modal-header">
          <span className="invite-modal-icon"><Users aria-hidden="true" /></span>
          <div>
            <h2 id="invite-project-title">เชิญเพื่อนเข้าร่วมโปรเจกต์</h2>
            <p>{projectTitle}</p>
          </div>
          <button type="button" className="invite-modal-close" onClick={onClose} aria-label="ปิดหน้าต่าง">
            <X aria-hidden="true" />
          </button>
        </header>

        <div className="invite-modal-body">
          <div className="invite-info-card">
            <ShieldCheck aria-hidden="true" />
            <div>
              <strong>ลิงก์เชิญที่ปลอดภัย</strong>
              <p>ผู้รับต้องเข้าสู่ระบบและกดยืนยันก่อนเข้าร่วม ลิงก์มีอายุ 7 วัน</p>
            </div>
          </div>

          {!inviteLink ? (
            <div className="invite-create-state">
              <span className="invite-link-illustration"><Link2 aria-hidden="true" /></span>
              <h3>สร้างลิงก์สำหรับทีมของคุณ</h3>
              <p>ส่งลิงก์เดียวให้เพื่อนได้หลายคน และสมาชิกที่อยู่ในทีมแล้วจะไม่ถูกเพิ่มซ้ำ</p>
              <button type="button" className="invite-primary-button" onClick={createInvitation} disabled={isCreating || !projectId}>
                <Link2 aria-hidden="true" />
                {isCreating ? "กำลังสร้างลิงก์..." : "สร้างลิงก์เชิญ"}
              </button>
            </div>
          ) : (
            <div className="invite-link-state">
              <label htmlFor="project-invite-link">ลิงก์เชิญเข้าร่วม</label>
              <div className="invite-link-field">
                <input id="project-invite-link" value={inviteLink} readOnly onFocus={(event) => event.currentTarget.select()} />
                <button type="button" onClick={copyInvitation} className={copied ? "copied" : ""}>
                  {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
                  {copied ? "คัดลอกแล้ว" : "คัดลอก"}
                </button>
              </div>
              <p className="invite-expiry">ลิงก์นี้ใช้ได้ถึง {expiryLabel}</p>
            </div>
          )}

          {error && <p className="invite-error" role="alert">{error}</p>}
        </div>

        <footer className="invite-modal-footer">
          <button type="button" className="btn-outline" onClick={onClose}>เสร็จสิ้น</button>
        </footer>
      </section>
    </div>
  );
}
