# YukiShopMXH — Hệ Sinh Thái Dịch Vụ Số & Mạng Xã Hội

Nền tảng thương mại điện tử dịch vụ số, tài khoản bản quyền chính chủ và tăng tương tác MXH viết bằng **Next.js 14 App Router**, **TypeScript**, **Tailwind CSS**, hỗ trợ lưu trữ bền vững song song trên **PostgreSQL (`pg`)**, **Supabase**, cùng hệ thống **Telegram Bot 2 chiều** và **MacroDroid Auto-Topup**.

## Tính Năng Cốt Lõi

- **Kho Bản Quyền & Dịch Vụ Buff MXH**: Giá tính và kiểm tra lại phía máy chủ (`/api/orders/create`), hỗ trợ chiết khấu Rank tích lũy, mã giảm giá, mã CTV Partner, và tự động hoàn 2% điểm thưởng khi bàn giao đơn hoàn tất.
- **Nạp Ví VietQR Theo Số Thứ Tự Đơn Hàng**: Tự động sinh mã nội dung chuyển khoản tuần tự theo số đơn (`YukiSp_000001`, `YukiSp_000002`, ...) giúp đối soát minh bạch và tránh sai lệch regex ngân hàng (tự chuẩn hóa cả biến thể ngân hàng bỏ dấu `_`).
- **Webhook MacroDroid Bền Vững**: Đối soát tự động biến động số dư trong vòng 5–15 giây (hạn mức auto ≤ 2.000.000đ/lệnh), khóa chống cộng tiền trùng (idempotent DB claim), lưu nhật ký vào `system_settings` để xem trực tiếp trong `/admin`.
- **Hệ Thống 2 Bot Telegram 2 Chiều Serverless**:
  - **Bot 1 (Quản trị & Giao hàng)**: Hỗ trợ lệnh `/start`, `/status`, `/pending`, `/sleep`, `/duyet`, `/huy`, nút duyệt inline 1 chạm, bàn giao tài khoản 2 bước lưu phiên trong DB, và trả lời Telegram ID cho khách hàng (`/id`).
  - **Bot 2 (Bảo mật OTP Đổi Mật Khẩu)**: Quy trình `/doimk` -> xác minh mã `YK-XXXXXX` gắn chính chủ Telegram ID -> tự động xóa tin nhắn nhạy cảm -> cập nhật mật khẩu mã hóa PBKDF2 vào DB.
  - **Auto-Sync Webhook**: Khi lưu token trong `/admin` hoặc deploy lên domain HTTPS trên Vercel, hệ thống tự động gọi `setWebhook` + `setMyCommands` kèm `x-telegram-bot-api-secret-token`.
- **Bảo Mật Production**: Cookie phiên ký HMAC-SHA256 xác thực trên cả Edge Middleware và Node API Routes, kiểm tra hằng thời gian (`crypto.timingSafeEqual`) cho toàn bộ Webhook, tách biệt token ngắn Telegram khỏi route đổi mật khẩu web, và hỗ trợ `/tmp` fallback trên môi trường serverless read-only.

## Triển Khai Nhanh (Vercel + Supabase / PostgreSQL)

1. Sao chép `.env.example` thành `.env.local` khi chạy local, hoặc cấu hình Environment Variables trên Vercel.
2. Chạy script SQL khởi tạo bảng (idempotent) trong Supabase SQL Editor từ [supabase/VERCEL_FULL_MIGRATION.sql](supabase/VERCEL_FULL_MIGRATION.sql) (hệ thống cũng tự động chạy `autoMigrate` khi kết nối `POSTGRES_URL` / `DATABASE_URL`).
3. Đăng nhập tài khoản Admin, mở `/admin` -> tab **Hệ Thống & Ví** để lưu Token Bot 1, Bot 2 và bấm **Đấu Webhook & Menu Lệnh** (hoặc tự động đồng bộ qua HTTPS production URL).
4. Trên ứng dụng MacroDroid điện thoại, cấu hình HTTP Request POST tới `https://<domain>/api/webhook/macrodroid` kèm `secret` khớp với khóa bảo mật trong Admin.

## Lệnh Phát Triển

```bash
npm install
npx tsc --noEmit
npm run build
npm run dev
```
