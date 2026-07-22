# TeamSync Backend API

Backend ใช้ Go `net/http`, PostgreSQL และ session cookie แบบ HttpOnly ทุก endpoint ใต้ `/api/projects` ต้องเข้าสู่ระบบก่อน ส่วนคำสั่งที่เปลี่ยนข้อมูลต้องส่ง `Origin` ตรงกับ `FRONTEND_ORIGIN`

## Environment

| Variable | Required | Example |
| --- | --- | --- |
| `DATABASE_URL` | Yes | `postgres://user:pass@host/db?sslmode=require` |
| `FRONTEND_ORIGIN` | Production | `https://teamsync.vercel.app` |
| `COOKIE_SECURE` | Production | `true` |
| `HTTP_ADDRESS` | No | `:8080` |
| `PORT` | Railway fallback | Railway supplies this automatically |

## Authentication

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/auth/register` | Create an account |
| POST | `/api/auth/login` | Create a session cookie |
| GET | `/api/auth/me` | Read the current account |
| POST | `/api/auth/logout` | Revoke the current session |

## Projects and members

| Method | Path | Permission |
| --- | --- | --- |
| GET / POST | `/api/projects` | Authenticated |
| POST | `/api/projects/ensure` | Authenticated; idempotent frontend migration helper |
| GET | `/api/projects/{projectId}` | Project member |
| PUT | `/api/projects/{projectId}` | Owner or Admin |
| DELETE | `/api/projects/{projectId}` | Owner |
| GET | `/api/projects/{projectId}/members` | Project member |
| PUT | `/api/projects/{projectId}/members/{userId}/profile` | The member themself, Owner, or Admin; edits display name, responsibility, and avatar |
| PUT | `/api/projects/{projectId}/members/{userId}/role` | Owner; body `{ "role": "admin" }` or `member` |
| DELETE | `/api/projects/{projectId}/members/{userId}` | Owner/Admin according to role, or the member themself |

Project write payload:

```json
{
  "title": "Badminton Tournament System",
  "description": "ระบบจัดการแข่งขัน",
  "cover": "/new/newsea.jpg",
  "tags": "blue",
  "deadline": "กำหนดส่ง 30 กันยายน 2026",
  "progress": 65
}
```

## Invitations

| Method | Path | Permission |
| --- | --- | --- |
| POST / GET | `/api/projects/{projectId}/invitations` | Owner or Admin |
| DELETE | `/api/projects/{projectId}/invitations/{invitationId}` | Owner or Admin |
| GET | `/api/invitations/{token}` | Public preview; possession of token required |
| POST | `/api/invitations/{token}/accept` | Authenticated |

Tokens are random 256-bit values. Only SHA-256 hashes are stored. Invitations expire after seven days and currently allow up to 25 joins.

## Tasks

`GET/POST /api/projects/{projectId}/tasks`  
`PUT/DELETE /api/projects/{projectId}/tasks/{taskId}`

```json
{
  "title": "ออกแบบหน้า Monitor ใหม่",
  "assigneeId": "user-uuid-or-empty",
  "dueDate": "2026-07-25",
  "status": "กำลังทำ",
  "priority": "สูง",
  "source": "จากการประชุมทีม",
  "meetingId": "meeting-uuid-or-empty"
}
```

Status: `ยังไม่เริ่ม`, `กำลังทำ`, `รอตรวจ`, `เสร็จแล้ว`  
Priority: `ต่ำ`, `ปานกลาง`, `สูง`

## Meetings

`GET/POST /api/projects/{projectId}/meetings`  
`PUT/DELETE /api/projects/{projectId}/meetings/{meetingId}`

```json
{
  "title": "ประชุมครั้งที่ 2",
  "date": "2026-07-22",
  "summary": ["หน้า Monitor มีข้อมูลเยอะเกินไป"],
  "agreed": ["เปลี่ยน Layout เป็น Table"]
}
```

## Feedback

`GET/POST /api/projects/{projectId}/feedback`  
`PUT/DELETE /api/projects/{projectId}/feedback/{feedbackId}`

```json
{
  "topic": "ออกแบบหน้า Monitor ใหม่",
  "provider": "อาจารย์ที่ปรึกษา",
  "assigneeId": "user-uuid-or-empty",
  "status": "กำลังแก้ไข",
  "result": "ปรับเป็น Table View",
  "meetingId": "meeting-uuid-or-empty",
  "dueDate": "2026-07-25",
  "priority": "สูง"
}
```

การสร้าง Feedback จะสร้าง Task ที่เชื่อมกันอัตโนมัติ การแก้ไขจะอัปเดตทั้งสองรายการใน transaction เดียว และการลบ Feedback จะลบ Task ที่เชื่อมกัน

## Calendar

`GET/POST /api/projects/{projectId}/events`  
`PUT/DELETE /api/projects/{projectId}/events/{eventId}`

```json
{
  "title": "ประชุมทีมออกแบบ",
  "dateKey": "2026-07-23",
  "time": "10:00",
  "location": "Google Meet",
  "tone": "blue"
}
```

Tone: `blue`, `green`, `orange`, `purple`

## Timeline

`GET /api/projects/{projectId}/activity?limit=50`

Timeline is server-generated for project, member, invitation, task, feedback, meeting, and calendar mutations. Clients cannot directly create or edit audit entries.

## Response behavior

- `200` successful read/update
- `201` successful creation
- `204` successful deletion
- `400` invalid body, enum, date, time, or UUID
- `401` missing/expired session
- `403` authenticated without sufficient project permission
- `404` resource or invitation not found
- `409` conflict such as duplicate email
- `429` authentication rate limit

All JSON bodies reject unknown fields and are limited to 1 MiB.
