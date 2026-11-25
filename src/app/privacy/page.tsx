'use client';

import React from 'react';
import { PolicyTabs } from '@/components/common/policy-tabs';
import { ADMIN_TELEGRAM_URL, ADMIN_SUPPORT_LABEL } from '@/lib/constants';
import {
  ShieldCheck,
  CheckCircle2,
  Lock,
  Database,
  EyeOff,
  UserCheck,
  Send,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-28 lg:pb-12">
      <PolicyTabs currentTab="privacy" />

      {/* Header chính sách */}
      <div className="space-y-4 mb-8">
        <div className="flex items-center gap-2.5">
          <span className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-400/30 text-amber-300 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" strokeWidth={1.8} />
          </span>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Chính Sách Bảo Mật Thông Tin
            </h1>
            <p className="text-xs text-slate-400">
              Cam kết bảo mật dữ liệu cá nhân & an toàn thông tin người dùng
            </p>
          </div>
        </div>

        {/* Hộp Tóm Tắt Nhanh 3 Ý Chính */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/[0.07] via-amber-400/[0.04] to-transparent border border-amber-400/25 space-y-2.5 backdrop-blur-xl">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-300 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Tóm Tắt Nhanh 3 Ý Chính (Đọc Trong 5 Giây)</span>
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs text-slate-300">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong className="text-white">Tối giản dữ liệu:</strong> Chỉ lưu Email, Telegram ID/Username và thông tin nhận thanh toán do bạn lưu.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong className="text-white">Không đòi mật khẩu MXH:</strong> Tuyệt đối không bao giờ hỏi mật khẩu, OTP mạng xã hội của khách.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong className="text-white">Mã hóa đa tầng:</strong> Mật khẩu băm một chiều, mã hóa SSL TLS 1.3 và phân lập dữ liệu qua RLS.
              </span>
            </li>
          </ul>
        </div>
      </div>

      {/* Nội dung chi tiết các mục đánh số */}
      <div className="space-y-6 text-sm text-slate-200 leading-relaxed">
        {/* Mục 1 */}
        <section className="p-5 sm:p-6 rounded-3xl bg-[#090D18]/90 border border-white/[0.08] space-y-3">
          <div className="flex items-center gap-2.5 text-base font-extrabold text-white">
            <span className="w-7 h-7 rounded-xl bg-amber-400/10 border border-amber-400/25 text-amber-300 flex items-center justify-center text-xs font-black">
              1
            </span>
            <h2>Dữ Liệu Chúng Tôi Thu Thập</h2>
          </div>
          <div className="space-y-2 text-xs sm:text-sm text-slate-300">
            <p>
              • <strong>Thông tin tài khoản:</strong> Địa chỉ Email dùng để đăng ký tài khoản, mã định danh Telegram (Telegram ID / @username) phục vụ việc nhận thông báo đơn hàng và xác thực cấp mã đổi mật khẩu.
            </p>
            <p>
              • <strong>Lịch sử giao dịch:</strong> Mã đơn hàng, thời gian thanh toán, số tiền biến động ví và nhật ký nạp rút tiền để phục vụ việc đối soát và bảo hành tự động.
            </p>
            <p>
              • <strong>Sổ lưu tài khoản nhận tiền:</strong> Số tài khoản, tên ngân hàng hoặc ảnh QR do chính quý khách chủ động lưu tại mục Rút Tiền để nhận tiền thưởng vòng quay hoặc hoa hồng.
            </p>
            <p>
              • <strong>Tuyệt đối không lưu trữ thông tin ngân hàng cá nhân:</strong> Hệ thống không yêu cầu và không lưu trữ mã PIN, mật khẩu Internet Banking hay mã OTP ngân hàng của khách hàng.
            </p>
          </div>
        </section>

        {/* Mục 2 */}
        <section className="p-5 sm:p-6 rounded-3xl bg-[#090D18]/90 border border-white/[0.08] space-y-3">
          <div className="flex items-center gap-2.5 text-base font-extrabold text-white">
            <span className="w-7 h-7 rounded-xl bg-amber-400/10 border border-amber-400/25 text-amber-300 flex items-center justify-center text-xs font-black">
              2
            </span>
            <h2>Cam Kết Không Yêu Cầu Mật Khẩu MXH</h2>
          </div>
          <div className="space-y-2 text-xs sm:text-sm text-slate-300">
            <p>
              • <strong>Bảo mật tài khoản mạng xã hội:</strong> YUKISHOPMXH cam kết tuyệt đối KHÔNG BAO GIỜ yêu cầu mật khẩu Facebook, TikTok, Instagram, YouTube hay Telegram của khách hàng.
            </p>
            <p>
              • <strong>Chỉ dùng liên kết công khai:</strong> Mọi dịch vụ tăng trưởng tương tác chỉ tiếp nhận đường dẫn (URL) công khai của bài viết, video, fanpage hoặc kênh cộng đồng do khách hàng cung cấp.
            </p>
            <p>
              • <strong>Cảnh báo an toàn:</strong> Bất kỳ ai nhân danh YUKISHOPMXH yêu cầu cung cấp mật khẩu tài khoản mạng xã hội đều là hành vi giả mạo lừa đảo. Quý khách vui lòng báo ngay cho Admin để xử lý.
            </p>
          </div>
        </section>

        {/* Mục 3 */}
        <section className="p-5 sm:p-6 rounded-3xl bg-[#090D18]/90 border border-white/[0.08] space-y-3">
          <div className="flex items-center gap-2.5 text-base font-extrabold text-white">
            <span className="w-7 h-7 rounded-xl bg-amber-400/10 border border-amber-400/25 text-amber-300 flex items-center justify-center text-xs font-black">
              3
            </span>
            <h2>Bảo Vệ & Mã Hóa Dữ Liệu Đa Tầng</h2>
          </div>
          <div className="space-y-2 text-xs sm:text-sm text-slate-300">
            <p>
              • <strong>Mã hóa mật khẩu một chiều:</strong> Mật khẩu tài khoản của quý khách được băm một chiều an toàn bằng thuật toán mã hóa tiêu chuẩn cao (bcrypt/Argon2). Máy chủ và quản trị viên hoàn toàn không thể xem mật khẩu gốc của quý khách.
            </p>
            <p>
              • <strong>Phân lập dữ liệu Row-Level Security (RLS):</strong> Áp dụng chính sách RLS trực tiếp trên cơ sở dữ liệu. Mỗi người dùng chỉ có thể xem và truy vấn dữ liệu thuộc về chính mình.
            </p>
            <p>
              • <strong>Mã hóa kết nối SSL TLS 1.3:</strong> Toàn bộ dữ liệu truyền tải giữa thiết bị của quý khách và máy chủ đều được mã hóa bằng chứng chỉ HTTPS / SSL tiêu chuẩn cao.
            </p>
            <p>
              • <strong>Mã token độc bản dùng một lần:</strong> Mã xác thực đặt lại mật khẩu (Token định dạng YK-XXXXXX) chỉ có hiệu lực 10 phút, chỉ sử dụng một lần duy nhất và lập tức bị vô hiệu hóa sau khi hoàn tất.
            </p>
            <p>
              • <strong>Không chia sẻ cho bên thứ ba:</strong> Chúng tôi cam kết không bán, không cho thuê và không chia sẻ thông tin cá nhân của khách hàng cho bất kỳ bên thứ ba nào vì mục đích quảng cáo thương mại.
            </p>
          </div>
        </section>

        {/* Mục 4 */}
        <section className="p-5 sm:p-6 rounded-3xl bg-[#090D18]/90 border border-white/[0.08] space-y-3">
          <div className="flex items-center gap-2.5 text-base font-extrabold text-white">
            <span className="w-7 h-7 rounded-xl bg-amber-400/10 border border-amber-400/25 text-amber-300 flex items-center justify-center text-xs font-black">
              4
            </span>
            <h2>Quyền Của Người Dùng Đối Với Dữ Liệu</h2>
          </div>
          <div className="space-y-2 text-xs sm:text-sm text-slate-300">
            <p>
              • <strong>Quyền tra cứu & chỉnh sửa:</strong> Quý khách có quyền xem lại, cập nhật thông tin liên hệ và sổ tài khoản nhận tiền tại trang Hồ Sơ (/profile) bất kỳ lúc nào.
            </p>
            <p>
              • <strong>Quyền đổi mật khẩu:</strong> Quý khách có quyền chủ động đổi mật khẩu định kỳ hoặc khôi phục mật khẩu thông qua mã xác thực độc bản từ Bot Telegram.
            </p>
            <p>
              • <strong>Quyền yêu cầu xóa dữ liệu:</strong> Quý khách có quyền yêu cầu xóa thông tin tài khoản hoặc đóng tài khoản vĩnh viễn bằng cách liên hệ trực tiếp Quản trị viên YUKISHOPMXH.
            </p>
          </div>
        </section>
      </div>

      {/* Nút liên hệ Admin hỗ trợ ở cuối trang */}
      <div className="mt-8 pt-6 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-xs text-slate-400 text-center sm:text-left">
          Quý khách có thắc mắc hoặc cần hỗ trợ về quyền riêng tư?
        </div>
        <a
          href={ADMIN_TELEGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/35 text-xs font-bold text-amber-300 transition group shadow-[0_0_20px_rgba(245,158,11,0.15)]"
        >
          <Send className="w-4 h-4" />
          <span>Liên hệ Admin hỗ trợ ({ADMIN_SUPPORT_LABEL})</span>
          <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </a>
      </div>
    </div>
  );
}
