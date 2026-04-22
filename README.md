# blogger-post-sites

Next.js trên Vercel: **OAuth2 Google** (app trong Google Console, scope Blogger) → lưu **refresh token** + **access token** trong MongoDB → mỗi lần gọi Blogger API, server **tự refresh access token** nếu cần → đăng bài qua **Blogger API v3** (ví dụ `POST /api/blogger/posts`).

## Cấu hình

1. Copy `.env.example` → `.env` và điền `MONGODB_URI`, **`MONGODB_DB_NAME=databases`** (database MongoDB chứa dữ liệu), `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `CRON_SECRET`, `NEXT_PUBLIC_APP_URL` (local: `http://localhost:3000`).

   Token OAuth được lưu collection **`account_api`**: `email`, `refreshToken`, `accessToken`, `expired` (hết hạn access token), `scope` (nếu có), `createdAt`, `updatedAt` (Mongoose timestamps).

2. **Google Cloud Console**: bật Blogger API; OAuth client dạng Web; thêm redirect URI đúng `.../api/auth/google/callback`.

3. **Vercel**: thêm cùng các biến môi trường; **đặt `CRON_SECRET`** — cron trong `vercel.json` gọi `GET /api/cron/refresh-google-token` **mỗi phút** (`* * * * *`), kèm `Authorization: Bearer <CRON_SECRET>`, server **refresh access token** nếu cần và ghi log `[cron/refresh-google-token]`, `[cron/refresh]` (xem **Functions** → Logs trên Vercel). (Một số gói Vercel giới hạn tần suất cron (Hobby) — nếu deploy báo lỗi, nới lịch trong `vercel.json` hoặc nâng gói.)

## Luồng OAuth → đăng bài

1. Một lần (trình duyệt): `GET /api/auth/google` → đăng nhập Google → callback lưu vào **`account_api`**: refresh token, access token, trường **`expired`**, cùng `createdAt` / `updatedAt`.
2. Mọi lần gọi API đăng bài sau đó: server đọc token trong DB; nếu access token gần hết hạn thì dùng **refresh_token** để lấy access token mới (xem `lib/google-auth.ts` → `getBloggerClient()`).
3. Gọi Blogger: `google.blogger({ version: 'v3' }).posts.insert(...)` — không cần tự cầm access token ở phía client; chỉ cần đã OAuth xong một lần.

## API

| Phương thức | Đường dẫn | Mô tả |
|-------------|-----------|--------|
| GET | `/api/auth/google` | Bắt đầu OAuth (redirect Google) |
| GET | `/api/auth/google/callback` | Callback OAuth (tự động) |
| GET | `/api/auth/status` | JSON trạng thái đã lưu token chưa |
| POST | `/api/blogger/posts` | Đăng bài ngay. Header `Authorization: Bearer CRON_SECRET`. Body: `{ blogId, title, content, labels? }` |
| GET | `/api/cron/refresh-google-token` | Cron (mỗi phút): refresh access token; Bearer `CRON_SECRET` (Vercel Cron tự gửi khi đã set `CRON_SECRET`) |

Access token được làm mới từ refresh token khi gọi đăng bài (trong `lib/google-auth.ts`).

## Chạy local

```bash
npm install
npm run dev
```

Mở `http://localhost:3000/login` để kết nối Google.
