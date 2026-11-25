'use client';

import React from 'react';
import { PolicyTabs } from '@/components/common/policy-tabs';
import { ADMIN_TELEGRAM_URL, ADMIN_SUPPORT_LABEL } from '@/lib/constants';
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  Coins,
  ShieldAlert,
  Send,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-28 lg:pb-12">
      <PolicyTabs currentTab="terms" />

      {/* Header chính sách */}
      <div className="space-y-4 mb-8">
        <div className="flex items-center gap-2.5">
          <span className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-400/30 text-amber-300 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" strokeWidth={1.8} />
          </span>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Điều Khoản Sử Dụng Dịch Vụ
            </h1>
            <p className="text-xs text-slate-400">
              Quy chế vận hành & cam kết trách nhiệm giữa YUKISHOPMXH và khách hàng
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
                <strong className="text-white">Minh bạch:</strong> Cung cấp tài khoản AI bản quyền chính chủ & tương tác MXH qua liên kết công khai.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong className="text-white">Trách nhiệm:</strong> Kiểm tra đúng link, mở công khai, không đặt trùng nhiều đơn cùng lúc trên 1 link.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong className="text-white">Tài chính an toàn:</strong> Nạp VietQR tự động 24/7, hoàn điểm 2%, rút thưởng vòng quay & hoa hồng 0đ phí.
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
            <h2>Phạm Vi Cung Cấp Dịch Vụ</h2>
          </div>
          <div className="space-y-2 text-xs sm:text-sm text-slate-300">
            <p>
              • <strong>Tài khoản AI & Bản quyền phần mềm:</strong> YUKISHOPMXH chuyên cung cấp tài khoản nâng cấp chính chủ hoặc tài khoản dùng riêng ổn định (bao gồm ChatGPT Plus/Pro, Google Gemini, Claude Pro, Canva Pro, JetBrains...). Mọi thông số, thời hạn và chế độ kích hoạt được niêm yết công khai trên từng sản phẩm.
            </p>
            <p>
              • <strong>Dịch vụ tăng trưởng Mạng xã hội:</strong> Hệ thống cung cấp các giải pháp tăng tương tác (lượt xem, lượt thích, người theo dõi, bình luận) cho các nền tảng Facebook, TikTok, Instagram, YouTube, Telegram.
            </p>
            <p>
              • <strong>Cam kết đường dẫn công khai:</strong> Mọi dịch vụ mạng xã hội chỉ xử lý thông qua liên kết (URL) công khai của bài viết, video hoặc trang đích. YUKISHOPMXH tuyệt đối không bao giờ yêu cầu mật khẩu, OTP hay quyền đăng nhập vào mạng xã hội của khách hàng.
            </p>
          </div>
        </section>

        {/* Mục 2 */}
        <section className="p-5 sm:p-6 rounded-3xl bg-[#090D18]/90 border border-white/[0.08] space-y-3">
          <div className="flex items-center gap-2.5 text-base font-extrabold text-white">
            <span className="w-7 h-7 rounded-xl bg-amber-400/10 border border-amber-400/25 text-amber-300 flex items-center justify-center text-xs font-black">
              2
            </span>
            <h2>Trách Nhiệm Khi Đặt Đơn Hàng</h2>
          </div>
          <div className="space-y-2 text-xs sm:text-sm text-slate-300">
            <p>
              • <strong>Kiểm tra tính chính xác của liên kết:</strong> Khách hàng có nghĩa vụ kiểm tra kỹ đường dẫn (URL) và đảm bảo bài viết/video/kênh đã bật chế độ công khai (Public) trước khi bấm tạo đơn.
            </p>
            <p>
              • <strong>Không thay đổi thông tin khi đơn đang chạy:</strong> Tuyệt đối không đổi tên người dùng (username), không đổi đường dẫn URL, không xóa bài viết và không chuyển tài khoản sang chế độ riêng tư (Private) trong suốt quá trình đơn hàng đang xử lý.
            </p>
            <p>
              • <strong>Tránh xung đột số liệu ban đầu:</strong> Không đặt trùng nhiều đơn cùng loại cho cùng một liên kết tại YUKISHOPMXH hoặc các bên thứ ba khác khi đơn hàng trước đó chưa hoàn tất, tránh gây xung đột số liệu đối soát ban đầu.
            </p>
          </div>
        </section>

        {/* Mục 3 */}
        <section className="p-5 sm:p-6 rounded-3xl bg-[#090D18]/90 border border-white/[0.08] space-y-3">
          <div className="flex items-center gap-2.5 text-base font-extrabold text-white">
            <span className="w-7 h-7 rounded-xl bg-amber-400/10 border border-amber-400/25 text-amber-300 flex items-center justify-center text-xs font-black">
              3
            </span>
            <h2>Quy Định Số Dư, Hoàn Điểm 2%, Vòng Quay & Affiliate</h2>
          </div>
          <div className="space-y-2 text-xs sm:text-sm text-slate-300">
            <p>
              • <strong>Số dư nạp ví:</strong> Số dư được nạp qua VietQR tự động 24/7 và dùng để thanh toán các dịch vụ trên hệ thống. Số dư được bảo toàn an toàn theo cơ chế phân lập dữ liệu.
            </p>
            <p>
              • <strong>Hoàn điểm tích lũy 2%:</strong> Mọi đơn hàng từ 20.000đ trở lên đều được tự động cộng 2% điểm hoàn tiền vào ví mua hàng ngay sau khi hoàn tất.
            </p>
            <p>
              • <strong>Vé Quay May Mắn & Thưởng Tiền Mặt:</strong> Nạp ví từ 100.000đ nhận 1 vé quay, tuyến dưới (F1) nạp từ 200.000đ nhận thêm 1 vé quay. Tiền mặt trúng thưởng từ Vòng Quay (lên đến 200.000đ) được cộng thẳng vào Sổ Hoa Hồng.
            </p>
            <p>
              • <strong>Rút tiền hoa hồng & tiền thưởng:</strong> Tiền hoa hồng Affiliate (5%) và tiền thưởng vòng quay hợp lệ được rút qua Sổ Lưu Tài Khoản theo đúng ngưỡng quy định (rút về Ví từ 50.000đ, rút về Ngân hàng / Ví điện tử từ 100.000đ) và hoàn toàn miễn phí (0đ phí).
            </p>
          </div>
        </section>

        {/* Mục 4 */}
        <section className="p-5 sm:p-6 rounded-3xl bg-[#090D18]/90 border border-white/[0.08] space-y-3">
          <div className="flex items-center gap-2.5 text-base font-extrabold text-white">
            <span className="w-7 h-7 rounded-xl bg-amber-400/10 border border-amber-400/25 text-amber-300 flex items-center justify-center text-xs font-black">
              4
            </span>
            <h2>Hành Vi Nghiêm Cấm</h2>
          </div>
          <div className="space-y-2 text-xs sm:text-sm text-slate-300">
            <p>
              • <strong>Gian lận hệ thống:</strong> Nghiêm cấm tạo nhiều tài khoản ảo nhằm mục đích trục lợi mã mời giới thiệu, vé quay may mắn hoặc khai thác kẽ hở số dư.
            </p>
            <p>
              • <strong>Tấn công và dò quét:</strong> Nghiêm cấm sử dụng các công cụ tự động tấn công từ chối dịch vụ (DDoS), dò quét lỗ hổng (scanner) hoặc can thiệp trái phép vào máy chủ YUKISHOPMXH.
            </p>
            <p>
              • <strong>Nội dung vi phạm pháp luật:</strong> Tuyệt đối nghiêm cấm đặt đơn cho các liên kết có nội dung vi phạm pháp luật Việt Nam, bạo lực, khiêu dâm, lừa đảo, cờ bạc hoặc chống phá an ninh trật tự. Mọi đơn vi phạm sẽ bị hủy ngay lập tức và khóa tài khoản vĩnh viễn không hoàn tiền.
            </p>
          </div>
        </section>
      </div>

      {/* Nút liên hệ Admin hỗ trợ ở cuối trang */}
      <div className="mt-8 pt-6 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-xs text-slate-400 text-center sm:text-left">
          Quý khách cần giải đáp thêm về điều khoản dịch vụ?
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
