import { redirect } from 'next/navigation';
import { verifyAdminRequest } from '@/lib/admin-auth';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isAdmin = await verifyAdminRequest();
  if (!isAdmin) {
    redirect('/login?expired=1');
  }

  return <>{children}</>;
}
