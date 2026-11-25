'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  MessageSquare,
  ShieldAlert,
  AlertTriangle,
  Clock,
  RefreshCw,
  Lock,
  CheckCircle,
  XCircle,
  Info,
} from 'lucide-react';

export default function SmsModulePage() {
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState('Vừa xong');

  const handleCheckStatus = () => {
    setIsChecking(true);
    setTimeout(() => {
      setIsChecking(false);
      setLastChecked('Mới kiểm tra (07:45)');
    }, 500);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-2">
      {/* 1. Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-slate-400">
        <Link href="/" className="hover:text-white transition-colors">Trang Chủ</Link>
        <span>/</span>
        <span className="text-sky-400 font-medium">Cổng Dịch Vụ SMS</span>
      </nav>

      {/* 2. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-300 flex items-center gap-1">
              <Lock className="w-3 h-3 text-amber-400" />
              BẢO MẬT VIỄN THÔNG
            </span>
            <span className="text-xs text-slate-400">Kiểm soát chặt chẽ</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display tracking-tight text-white mt-1">
            Cổng Dịch Vụ SMS & Thông Báo Viễn Thông
          </h1>
        </div>

        <button
          type="button"
          onClick={handleCheckStatus}
          disabled={isChecking}
          className="touch-target px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-sky-500 text-slate-200 text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin text-sky-400' : ''}`} />
          <span>Kiểm Tra Trạng Thái</span>
        </button>
      </div>

      {/* 3. System Status Banner (Explicitly Disabled per prompt guidelines) */}
      <div className="p-5 rounded-2xl bg-[#0F172E] border border-amber-500/40 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-400 animate-pulse" />
            <span className="font-bold text-sm text-amber-300">
              Trạng Thái Hệ Thống: CHƯA KHẢ DỤNG (DISABLED)
            </span>
          </div>
          <span className="text-[11px] font-mono text-slate-400">{lastChecked}</span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Theo nguyên tắc bảo mật và chính sách viễn thông, tính năng SMS mặc định ở trạng thái <strong>SMS_ENABLED=false</strong> và kích hoạt Kill-switch toàn cục. Hệ thống đang chờ thẩm định nhà cung cấp mạng hợp pháp có hợp đồng khai thác chính thức.
        </p>

        <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400">
          Chỉ Quản trị viên (Admin) mới có quyền cấu hình API Key và kích hoạt Provider sau khi hoàn tất kiểm thử thực tế.
        </div>
      </div>

      {/* 4. Strict Compliance & Anti-Spam Guidelines */}
      <div className="p-4 rounded-xl bg-red-950/20 border border-red-800/40 text-xs text-red-200 space-y-2">
        <div className="flex items-center gap-2 font-bold text-red-300">
          <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
          <span>Quy Định Sử Dụng & Phòng Chống Vi Phạm Pháp Luật:</span>
        </div>
        <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-300">
          <li>Chỉ hỗ trợ gửi tin nhắn thông báo giao dịch có sự đồng ý rõ ràng của chủ thuê bao (Opt-in).</li>
          <li>Nghiêm cấm tuyệt đối hành vi phát tán tin nhắn rác (Spam), quấy rối hoặc lừa đảo tài chính.</li>
          <li>Nghiêm cấm hành vi gửi hàng loạt không kiểm soát hoặc cố ý đánh chặn, vượt qua mã xác thực OTP bảo vệ tài khoản ngân hàng.</li>
        </ul>
      </div>

      {/* 5. SMS Technical Specs & Quota Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="p-4 rounded-2xl bg-[#0F172E] border border-slate-800 space-y-1">
          <span className="text-slate-400">Tần Suất Giới Hạn (Rate Limit)</span>
          <div className="text-lg font-bold font-mono text-white">5 SMS / phút</div>
          <p className="text-[10px] text-slate-500">Chống dồn lệnh quá tải</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#0F172E] border border-slate-800 space-y-1">
          <span className="text-slate-400">Thời Gian Chờ (Cooldown)</span>
          <div className="text-lg font-bold font-mono text-white">60 giây / số</div>
          <p className="text-[10px] text-slate-500">Tránh gửi lặp số điện thoại</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#0F172E] border border-slate-800 space-y-1">
          <span className="text-slate-400">Kill-Switch Bảo Mật</span>
          <div className="text-lg font-bold font-mono text-emerald-400">Đang Bật (Active)</div>
          <p className="text-[10px] text-slate-500">Ngăn rò rỉ chi phí phát sinh</p>
        </div>
      </div>

      {/* 6. Request History (Empty State with clear feedback) */}
      <div className="p-5 rounded-2xl bg-[#0F172E] border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-white">Lịch Sử Yêu Cầu SMS Cá Nhân</h3>
          <span className="text-xs text-slate-400">Ghi vết Audit Log</span>
        </div>

        <div className="py-12 text-center text-xs text-slate-500 space-y-2">
          <MessageSquare className="w-8 h-8 text-slate-600 mx-auto" />
          <p>Chưa có giao dịch SMS nào được tạo.</p>
          <p className="text-[11px] text-slate-600">Khi cổng kết nối được kích hoạt bởi Ban quản trị, lịch sử gửi sẽ hiển thị chi tiết tại đây.</p>
        </div>
      </div>
    </div>
  );
}
