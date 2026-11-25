'use client';

// ==============================================================================
// YUKISHOPMXH — DEDICATED LOGOUT ROUTE (PREVENTS 404 ERROR)
// ==============================================================================

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { LogOut } from 'lucide-react';

export default function LogoutPage() {
  const { signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;
    const performLogout = async () => {
      try {
        await signOut();
      } catch (err) {
        console.error('Logout error:', err);
      } finally {
        if (isMounted) {
          router.replace('/login');
        }
      }
    };
    performLogout();
    return () => {
      isMounted = false;
    };
  }, [signOut, router]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-4 text-center">
      <div className="p-4 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-3 max-w-xs w-full animate-in zoom-in-95 duration-200">
        <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center mx-auto">
          <LogOut className="w-6 h-6 animate-pulse" />
        </div>
        <h2 className="text-base font-black text-slate-100">Đang Đăng Xuất...</h2>
        <p className="text-xs text-slate-400">Đang xóa phiên làm việc an toàn và chuyển tiếp về trang đăng nhập YukiShopMXH.</p>
        <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto pt-1" />
      </div>
    </div>
  );
}
