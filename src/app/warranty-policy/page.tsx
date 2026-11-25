'use client';

import React from 'react';
import { PolicyTabs } from '@/components/common/policy-tabs';
import { ADMIN_TELEGRAM_URL, ADMIN_SUPPORT_LABEL } from '@/lib/constants';
import {
  RefreshCw,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Coins,
  Send,
  ArrowUpRight,
  Sparkles,
  AlertCircle,
} from 'lucide-react';

export default function WarrantyPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-28 lg:pb-12">
      <PolicyTabs currentTab="warranty-policy" />

      {/* Header chính sách */}
      <div className="space-y-4 mb-8">
        <div className="flex items-center gap-2.5">
          <span className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-400/30 text-amber-300 flex items-center justify-center shrink-0">
            <RefreshCw className="w-5 h-5" strokeWidth={1.8} />
          </span>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Chính Sách Bảo Hành & Hoàn Tiền
            </h1>
            <p className="text-xs text-slate-400">
              Quy định chi tiết về thời hạn, điều kiện bảo hành và cơ chế hoàn tiền về ví
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
                <strong className="text-white">Bản quyền chính chủ:</strong> Bảo hành 1 đổi 1 suốt thời hạn cam kết; gói KBH hỗ trợ đổi 1:1 trong 24h đầu.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong className="text-white">Buff MXH minh bạch:</strong> Bảo hành bù tụt (Refill) theo đúng thời hạn niêm yết trên từng server.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong className="text-white">Hoàn tiền 100% ví:</strong> Đơn lỗi máy chủ hoặc hết hàng được hoàn 100% ví, được rút bank 0đ phí.
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
            <h2>Đối Với Tài Khoản AI & Bản Quyền Phần Mềm</h2>
          </div>
          <div className="space-y-2 text-xs sm:text-sm text-slate-300">
            <p>
              • <strong>Gói có bảo hành ([BH: 30 Ngày], [BH: 90 Ngày], [BH: Trọn Đời]):</strong> Trong suốt thời hạn bảo hành ghi trên gói sản phẩm, nếu tài khoản bị gián đoạn hoặc mất quyền lợi tính năng, YUKISHOPMXH cam kết hỗ trợ khắc phục hoặc đổi mới 1:1 trong vòng 15 đến 60 phút làm việc.
            </p>
            <p>
              • <strong>Gói Không Bảo Hành (Tag [KBH]):</strong> Là các gói tài khoản siêu tiết kiệm. Chúng tôi cam kết bàn giao tài khoản hoạt động chuẩn xác 100% tại thời điểm giao dịch, và hỗ trợ đổi mới 1:1 trong vòng 24 giờ đầu tiên nếu phát sinh sự cố không thể đăng nhập. Sau 24 giờ, shop không áp dụng bảo hành gia hạn thêm.
            </p>
            <p>
              • <strong>Điều kiện từ chối bảo hành:</strong> Khách hàng tự ý thay đổi thông tin cấu hình tài khoản (với các gói slot), thay đổi mật khẩu/thông tin thanh toán, chia sẻ tài khoản cho nhiều người ngoài thỏa thuận hoặc vi phạm điều khoản nội dung của nhà phát hành gốc (OpenAI, Google, Canva...).
            </p>
          </div>
        </section>

        {/* Mục 2 */}
        <section className="p-5 sm:p-6 rounded-3xl bg-[#090D18]/90 border border-white/[0.08] space-y-3">
          <div className="flex items-center gap-2.5 text-base font-extrabold text-white">
            <span className="w-7 h-7 rounded-xl bg-amber-400/10 border border-amber-400/25 text-amber-300 flex items-center justify-center text-xs font-black">
              2
            </span>
            <h2>Đối Với Dịch Vụ Buff Mạng Xã Hội</h2>
          </div>
          <div className="space-y-2 text-xs sm:text-sm text-slate-300">
            <p>
              • <strong>Phân loại chế độ bảo hành server:</strong> Mỗi server ghi rõ thời gian bảo hành như [BH: 30N], [BH: 60N], [BH: VĨNH VIỄN] hoặc [KBH]. Quý khách có thể chủ động lựa chọn server phù hợp với nhu cầu.
            </p>
            <p>
              • <strong>Cơ chế tự động bù tụt (Refill):</strong> Đối với các gói có bảo hành, nếu số lượng tương tác bị tụt giảm quá 10% trong thời hạn cam kết, quý khách chỉ cần bấm nút yêu cầu bảo hành tại mục <strong>Đơn hàng</strong> (/orders) để hệ thống kiểm tra và kích hoạt lệnh bù tự động.
            </p>
            <p>
              • <strong>Trường hợp bị hủy quyền bảo hành:</strong> Khách hàng đổi tên người dùng (username), đổi liên kết (URL), xóa bài viết khi đơn đang chạy; chuyển tài khoản sang chế độ Riêng tư (Private); hoặc đồng thời mua dịch vụ cùng loại ở nhiều nơi khác nhau gây sai lệch số liệu ban đầu.
            </p>
          </div>
        </section>

        {/* Mục 3 */}
        <section className="p-5 sm:p-6 rounded-3xl bg-[#090D18]/90 border border-white/[0.08] space-y-3">
          <div className="flex items-center gap-2.5 text-base font-extrabold text-white">
            <span className="w-7 h-7 rounded-xl bg-amber-400/10 border border-amber-400/25 text-amber-300 flex items-center justify-center text-xs font-black">
              3
            </span>
            <h2>Cơ Chế Hoàn Tiền Về Ví Mua Hàng</h2>
          </div>
          <div className="space-y-2 text-xs sm:text-sm text-slate-300">
            <p>
              • <strong>Trường hợp được hoàn tiền 100%:</strong> Đơn hàng gặp sự cố từ phía máy chủ hạ tầng, nhà mạng bảo trì kéo dài hoặc sản phẩm hết hàng mà YUKISHOPMXH không thể triển khai cho quý khách.
            </p>
            <p>
              • <strong>Hình thức hoàn tiền:</strong> Toàn bộ số tiền tương ứng được hoàn trả tự động và lập tức 100% vào <strong>Số dư ví mua hàng</strong> trên YUKISHOPMXH.
            </p>
            <p>
              • <strong>Rút tiền về tài khoản ngân hàng:</strong> Số dư hoàn ví có thể dùng ngay để mua bất kỳ sản phẩm/dịch vụ nào khác trên hệ thống, hoặc quý khách có thể gửi yêu cầu rút về tài khoản ngân hàng / ví điện tử cá nhân qua Sổ Lưu Tài Khoản hoàn toàn miễn phí (0đ phí).
            </p>
          </div>
        </section>
      </div>

      {/* Nút liên hệ Admin hỗ trợ ở cuối trang */}
      <div className="mt-8 pt-6 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-xs text-slate-400 text-center sm:text-left">
          Cần hỗ trợ bảo hành hoặc hoàn tiền cho đơn hàng của bạn?
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
