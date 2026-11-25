'use client';

import React, { useEffect, useState } from 'react';
import { AuthProvider } from '@/contexts/auth-context';
import { CustomDialogProvider } from '@/components/common/custom-dialog';
import { SmoothScrollProvider } from '@/components/providers/smooth-scroll-provider';
import { Navbar } from '@/components/layout/navbar';
import { DesktopSidebar } from '@/components/layout/desktop-sidebar';
import { Footer } from '@/components/layout/footer';
import { BottomNav } from '@/components/layout/bottom-nav';
import { SidebarDrawer } from '@/components/layout/sidebar-drawer';
import AnnouncementModal from '@/components/AnnouncementModal';
import { VfxBackdrop } from '@/components/common/vfx-backdrop';
import { CommandSearchModal } from '@/components/common/command-search-modal';
import { MonthlyRewardModal } from '@/components/common/monthly-reward-modal';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCommandOpen, setIsCommandOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <SmoothScrollProvider>
      <VfxBackdrop />
      <AuthProvider>
        <CustomDialogProvider>
          <AnnouncementModal />
          <MonthlyRewardModal />
          <CommandSearchModal
            isOpen={isCommandOpen}
            onClose={() => setIsCommandOpen(false)}
          />
          <Navbar
            onOpenDrawer={() => setIsDrawerOpen(true)}
            onOpenSearch={() => setIsCommandOpen(true)}
          />
          <DesktopSidebar onOpenSearch={() => setIsCommandOpen(true)} />
          <SidebarDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
          <main className="flex-1 max-w-[1440px] w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-28 lg:pb-8 lg:pl-64">
            {children}
          </main>
          <BottomNav />
          <Footer />
        </CustomDialogProvider>
      </AuthProvider>
    </SmoothScrollProvider>
  );
}
