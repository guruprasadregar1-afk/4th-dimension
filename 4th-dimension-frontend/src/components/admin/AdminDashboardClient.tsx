'use client';

import { useEffect, useState } from 'react';
import { fetchBff } from '@/lib/client-fetch';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorBanner } from '@/components/ui/ErrorBanner';

interface UserRecord {
  _id: string;
  email: string;
  role: string;
  isSuspended?: boolean;
  createdAt?: string;
}

interface FlaggedSceneRecord {
  _id: string;
  title: string;
  ownerId: string;
  isFlagged: boolean;
  flagReason?: string;
  updatedAt?: string;
}

export function AdminDashboardClient() {
  const [activeTab, setActiveTab] = useState<'users' | 'scenes'>('users');
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [flaggedScenes, setFlaggedScenes] = useState<FlaggedSceneRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  async function loadAdminData() {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'users') {
        const res = await fetchBff('/api/admin/users');
        if (!res.ok) throw new Error('Requires ADMIN role or backend error');
        const data = await res.json();
        setUsers(data.users || []);
      } else {
        const res = await fetchBff('/api/admin/scenes/flagged');
        if (!res.ok) throw new Error('Requires ADMIN role or backend error');
        const data = await res.json();
        setFlaggedScenes(data.scenes || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Admin fetch failed');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAdminData();
  }, [activeTab]);

  async function toggleUserSuspension(user: UserRecord) {
    try {
      const newStatus = !user.isSuspended;
      const res = await fetchBff(`/api/admin/users/${user._id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isSuspended: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update suspension');
      void loadAdminData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error updating user');
    }
  }

  async function toggleSceneFlag(scene: FlaggedSceneRecord) {
    try {
      const res = await fetchBff(`/api/admin/scenes/${scene._id}/flag`, {
        method: 'PATCH',
        body: JSON.stringify({ isFlagged: false }),
      });
      if (!res.ok) throw new Error('Failed to unflag scene');
      void loadAdminData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error updating scene');
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-surface-border pb-2">
        <button
          onClick={() => setActiveTab('users')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
            activeTab === 'users'
              ? 'bg-accent text-white'
              : 'bg-surface-raised text-muted hover:text-foreground'
          }`}
        >
          User Management
        </button>
        <button
          onClick={() => setActiveTab('scenes')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
            activeTab === 'scenes'
              ? 'bg-accent text-white'
              : 'bg-surface-raised text-muted hover:text-foreground'
          }`}
        >
          Flagged Content Review
        </button>
      </div>

      {error ? <ErrorBanner message={error} onRetry={loadAdminData} /> : null}

      {loading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner label="Loading admin data..." />
        </div>
      ) : activeTab === 'users' ? (
        <div className="overflow-x-auto rounded-xl border border-surface-border bg-surface-raised">
          <table className="w-full text-left text-sm text-foreground">
            <thead className="border-b border-surface-border bg-surface text-xs font-semibold text-muted uppercase">
              <tr>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {users.map((u) => (
                <tr key={u._id} className="hover:bg-surface/50">
                  <td className="px-4 py-3 font-medium">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${u.role === 'admin' ? 'bg-purple-900/50 text-purple-300' : 'bg-gray-800 text-gray-300'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {u.isSuspended ? (
                      <span className="text-red-400 font-semibold">Suspended</span>
                    ) : (
                      <span className="text-emerald-400 font-semibold">Active</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => toggleUserSuspension(u)}
                      className={`rounded px-3 py-1 text-xs font-medium transition ${
                        u.isSuspended
                          ? 'bg-emerald-800 text-emerald-100 hover:bg-emerald-700'
                          : 'bg-red-900/60 text-red-200 hover:bg-red-800'
                      }`}
                    >
                      {u.isSuspended ? 'Reactivate' : 'Suspend'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {flaggedScenes.length === 0 ? (
            <div className="rounded-xl border border-surface-border bg-surface-raised p-6 text-center text-sm text-muted">
              No flagged scenes currently pending moderation.
            </div>
          ) : (
            flaggedScenes.map((s) => (
              <div
                key={s._id}
                className="flex items-center justify-between rounded-xl border border-red-900/40 bg-surface-raised p-4"
              >
                <div>
                  <h3 className="font-semibold text-foreground">{s.title}</h3>
                  <p className="mt-1 text-xs text-red-400">
                    Reason: {s.flagReason || 'Flagged for moderation'}
                  </p>
                </div>
                <button
                  onClick={() => toggleSceneFlag(s)}
                  className="rounded-lg bg-surface border border-surface-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface-raised"
                >
                  Unflag Scene
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
