# blogger-post-sites

Next.js trên Vercel: **OAuth2 Google** → lưu token trong MongoDB **`account_api`** → làm mới theo lịch **`GET /api/cron/refresh-tokens`**. Tuỳ chọn: xử lý hàng đợi đăng bài qua collection **`post_queue`** và **`GET /api/cron/publish-posts`** (cấu hình / nhập bài từ hệ thống khác của bạn).

## Cấu hình

1. Copy `.env.example` → `.env` và điền `MONGODB_URI`, **`MONGODB_DB_NAME=databases`**, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `CRON_SECRET`, `NEXT_PUBLIC_APP_URL` (local: `http://localhost:3000`).

   Token OAuth lưu **`account_api`**: `email`, `refreshToken`, `accessToken`, `expired`, `scope` (nếu có), `createdAt` / `updatedAt`.

2. **Google Cloud Console**: bật Blogger API; OAuth client Web; redirect URI: `.../api/auth/google/callback`.

3. **Vercel**: cùng biến môi trường; **đặt `CRON_SECRET`**. Scheduler có thể gọi `GET /api/cron/refresh-tokens` và (nếu dùng) `GET /api/cron/publish-posts` với `Authorization: Bearer <CRON_SECRET>`. Bài chờ nằm ở `post_queue` (`status: pending`) nếu bạn dùng luồng publish này.

## Luồng OAuth

1. `GET /api/auth/google` → Google → `GET /api/auth/google/callback` lưu token vào **`account_api`**.
2. Dùng token: `getBloggerClient()` trong `lib/google-auth.ts` (tự refresh khi cần) hoặc `lib/blogger-post.ts` khi post qua hàng đợi.

## API

| Phương thức | Đường dẫn | Mô tả |
|-------------|-----------|--------|
| GET | `/api/auth/google` | Bắt đầu OAuth (redirect Google) |
| GET | `/api/auth/google/callback` | Callback OAuth (tự động) |
| GET | `/api/cron/refresh-tokens` | Làm mới access token (batch theo `expired`). Query: `withinMinutes`, `max`. Bearer `CRON_SECRET` |
| GET | `/api/cron/publish-posts` | (Tuỳ chọn) Lấy bài `pending` từ `post_queue`, đăng lên Blogger. Query: `limit`. Bearer `CRON_SECRET` |

## Chạy local

```bash
npm install
npm run dev
```

Mở `http://localhost:3000/login` để kết nối Google. Nếu mở dev qua IP LAN mà `/_next` bị chặn, thêm host vào `allowedDevOrigins` trong `next.config.ts`.
