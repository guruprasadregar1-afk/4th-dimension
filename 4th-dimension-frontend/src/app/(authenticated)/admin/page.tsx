import type { Metadata } from 'next';
import { AdminDashboardClient } from '@/components/admin/AdminDashboardClient';

export const metadata: Metadata = {
  title: 'Admin Moderation Portal',
};

export default function AdminPage() {
  return (
    <div className="flex h-full flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Admin Moderation Portal
        </h1>
        <p className="mt-1 text-sm text-muted">
          Manage platform user accounts, account suspensions, and content moderation flags.
        </p>
      </div>

      <AdminDashboardClient />
    </div>
  );
}
