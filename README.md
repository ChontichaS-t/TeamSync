# TeamSync

TeamSync เป็นตัวอย่าง web application แบบแยกส่วน:

- `frontend/` — Next.js + TypeScript + Lucide React
- `backend/` — Go REST API
- PostgreSQL 18 — เก็บผู้ใช้และ session
- `compose.yaml` — เปิด PostgreSQL และ Go API สำหรับ development

## เริ่มใช้งาน

### 1. เปิด Backend และ PostgreSQL

ต้องเปิด Docker Desktop ก่อน แล้วรันจากโฟลเดอร์โปรเจกต์:

```powershell
docker compose up -d --build
```

ตรวจสอบสถานะ:

```powershell
docker compose ps
curl.exe http://localhost:8080/healthz
```

### 2. สร้างบัญชีผู้ใช้

คำสั่งนี้จะถามรหัสผ่านแบบซ่อนตัวอักษร รหัสผ่านต้องยาว 12–128 ตัวอักษร:

```powershell
docker compose run --rm --entrypoint /app/create-user api -email you@example.com -name "Your Name"
```

ระบบเก็บเฉพาะ Argon2id hash ใน PostgreSQL ไม่เก็บรหัสผ่านจริง

### 3. เปิด Frontend

```powershell
cd frontend
npm install
npm run dev
```

ถ้าพอร์ต `3000` ถูกใช้งาน Next.js จะเลือก `http://localhost:3001` อัตโนมัติ

### 4. ปิดระบบ

```powershell
docker compose down
```

คำสั่งด้านบนไม่ลบข้อมูล PostgreSQL ห้ามเติม `-v` ถ้าต้องการเก็บบัญชีและ session ไว้

## API หลัก

| Method | Path | หน้าที่ |
| --- | --- | --- |
| `POST` | `/api/auth/login` | ตรวจรหัสผ่านและสร้าง session |
| `GET` | `/api/auth/me` | อ่านผู้ใช้จาก session cookie |
| `POST` | `/api/auth/logout` | เพิกถอน session และลบ cookie |
| `GET` | `/healthz` | ตรวจ Go API และ PostgreSQL |

อ่านรายละเอียดแนวคิดและ checklist ก่อนขึ้น production ที่ [docs/AUTHENTICATION.md](docs/AUTHENTICATION.md)
