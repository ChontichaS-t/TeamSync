# TeamSync Authentication Guide

## ภาพรวมการทำงาน

```text
Browser
  │  POST /api/auth/login (email + password)
  ▼
Next.js rewrite / same origin
  │
  ▼
Go API ──ตรวจ Argon2id hash──▶ PostgreSQL users
  │
  ├─สร้าง token สุ่ม 256 บิต
  ├─เก็บ SHA-256(token) ใน PostgreSQL sessions
  └─ส่ง token จริงกลับด้วย HttpOnly + SameSite cookie

คำขอครั้งถัดไปส่ง cookie อัตโนมัติ
Go API hash token แล้วค้นหา session ที่ยังไม่หมดอายุ
```

## ทำไมไม่เก็บ JWT ใน localStorage

TeamSync ใช้ opaque session token เพราะเว็บนี้มี Backend Go ของตัวเอง:

- JavaScript อ่าน cookie ไม่ได้เมื่อใช้ `HttpOnly` จึงลดผลกระทบจาก XSS
- Logout ลบ session ในฐานข้อมูลได้ทันที
- ผู้ดูแลสามารถเพิกถอน session รายบัญชีได้
- ข้อมูลสิทธิ์ไม่ค้างอยู่ใน JWT เก่าหลังจากสิทธิ์ผู้ใช้เปลี่ยน

JWT เหมาะกับบางระบบ แต่ไม่ได้ทำให้ authentication ปลอดภัยขึ้นโดยอัตโนมัติ

## การเก็บรหัสผ่าน

ไฟล์ `backend/internal/auth/password.go` ใช้ Argon2id พร้อม:

- memory: 19 MiB
- iterations: 2
- parallelism: 1
- salt สุ่ม 16 bytes ต่อบัญชี
- key 32 bytes
- เปรียบเทียบผลด้วย constant-time comparison

ค่าเหล่านี้เป็น baseline ตาม OWASP และควร benchmark ใหม่บนเครื่อง production เป้าหมาย

## สิ่งที่ Backend ป้องกันแล้ว

- ไม่เก็บ plaintext password
- ข้อความผิดพลาดเหมือนกันทั้งอีเมลไม่มีอยู่และรหัสผ่านผิด
- ทำ dummy Argon2id hash เมื่อไม่พบบัญชี เพื่อลด timing leak
- จำกัด Login 5 ครั้งต่อนาทีต่ออีเมล และ 20 ครั้งต่อนาทีต่อ IP
- session token สุ่ม 256 บิต และเก็บเฉพาะ hash ในฐานข้อมูล
- cookie เป็น `HttpOnly`, `SameSite=Strict`, `Path=/`
- production cookie ใช้ชื่อ `__Host-teamsync_session` เมื่อ `COOKIE_SECURE=true`
- ตรวจ `Origin` สำหรับ Login และ Logout เพื่อลด CSRF
- จำกัด request body และ reject JSON field ที่ไม่รู้จัก
- ตั้ง HTTP timeouts และ security response headers
- session มีวันหมดอายุและถูกลบเมื่อ logout

## Development กับ Production

Development ใช้:

```env
COOKIE_SECURE=false
FRONTEND_ORIGIN=http://localhost:3001
```

Production ต้องใช้ HTTPS และอย่างน้อย:

```env
COOKIE_SECURE=true
FRONTEND_ORIGIN=https://app.example.com
DATABASE_URL=postgres://...?...sslmode=verify-full
```

เก็บ `DATABASE_URL` และรหัสผ่าน PostgreSQL ใน secret manager ห้าม commit `.env`

## Checklist ก่อนเปิดให้อินเทอร์เน็ตใช้งานจริง

ระบบที่ทำไว้เป็น secure baseline แต่ production ยังควรเพิ่ม:

1. ใช้ HTTPS ทุกจุดและ reverse proxy ให้ Frontend/API อยู่ภายใต้ site เดียวกัน
2. ย้าย rate limit ไป Redis หรือ gateway เพื่อให้ทำงานร่วมกันทุก API instance
3. เพิ่ม email verification, password reset token แบบใช้ครั้งเดียว และ MFA/passkeys
4. เพิ่ม audit log สำหรับ login สำเร็จ/ล้มเหลว โดยไม่บันทึกรหัสผ่านหรือ session token
5. เพิ่มระบบเปลี่ยนรหัสผ่านที่เพิกถอน session เดิมทั้งหมด
6. สำรอง PostgreSQL และทดสอบ restore เป็นประจำ
7. ใช้ secret manager และหมุนรหัสผ่านฐานข้อมูล
8. เพิ่ม monitoring/alert สำหรับ 429, login failure และ session anomaly
9. ตรวจ dependency และ container image vulnerabilities ใน CI
10. ทำ penetration test ก่อนรองรับข้อมูลสำคัญ

Google button ในหน้า Login ถูกปิดไว้จนกว่าจะตั้งค่า Google Identity/OAuth client อย่างถูกต้อง ห้ามจำลอง Google Login ด้วยการรับ access token ที่ไม่ตรวจ issuer, audience, nonce และ redirect URI
