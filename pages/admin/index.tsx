import { useState, useEffect } from 'react';
import Head from 'next/head';

interface Gym {
  id: string;
  name: string;
  email: string;
  status: string;
  subscription_tier: string;
  subscription_status: string;
  subscription_tier_actual: string;
  member_count: number;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  current_period_end: string;
  created_at: string;
}

interface Stats {
  total: number;
  active: number;
  trial: number;
  cancelled: number;
  totalMembers: number;
}

interface EditForm {
  name: string;
  email: string;
  status: string;
  tier: string;
}

export default function AdminDashboard() {
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingGym, setEditingGym] = useState<Gym | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ name: '', email: '', status: '', tier: '' });
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchGyms();
  }, []);

  const fetchGyms = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/gyms');
      if (res.status === 401 || res.status === 403) {
        window.location.href = '/auth/login';
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setGyms(data.gyms);
      setStats(data.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (gym: Gym) => {
    setEditingGym(gym);
    setEditForm({
      name: gym.name,
      email: gym.email,
      status: gym.subscription_status || gym.status,
      tier: gym.subscription_tier_actual || gym.subscription_tier || 'starter',
    });
  };

  const saveEdit = async () => {
    if (!editingGym) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/gym/${editingGym.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEditingGym(null);
      setActionMessage('Gym updated successfully');
      fetchGyms();
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const deleteGym = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/gym/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDeleteConfirm(null);
      setActionMessage('Gym deleted');
      fetchGyms();
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const quickActivate = async (gym: Gym) => {
    try {
      const res = await fetch(`/api/admin/gym/${gym.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active', tier: gym.subscription_tier_actual || gym.subscription_tier || 'starter' }),
      });
      if (!res.ok) throw new Error('Failed');
      setActionMessage(`${gym.name} activated`);
      fetchGyms();
    } catch {
      setActionMessage('Activation failed');
    }
  };

  const quickSuspend = async (gym: Gym) => {
    try {
      const res = await fetch(`/api/admin/gym/${gym.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });
      if (!res.ok) throw new Error('Failed');
      setActionMessage(`${gym.name} suspended`);
      fetchGyms();
    } catch {
      setActionMessage('Suspension failed');
    }
  };

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      trial: 'bg-yellow-100 text-yellow-800',
      cancelled: 'bg-red-100 text-red-800',
      past_due: 'bg-orange-100 text-orange-800',
      payment_failed: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {status || 'trial'}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <a href="/auth/login" className="text-blue-600 underline">Go to Login</a>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head><title>Admin — Gym Retention</title></Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-sm text-gray-500">Gym Retention — Platform Management</p>
            </div>
            <div className="flex items-center gap-4">
              <button onClick={fetchGyms} className="text-sm text-blue-600 hover:text-blue-800">
                ↻ Refresh
              </button>
              <button
                onClick={async () => {
                  await fetch('/api/auth/logout', { method: 'POST' });
                  window.location.href = '/auth/login';
                }}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Sign Out
              </button>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Action Message */}
          {actionMessage && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex justify-between items-center">
              <p className="text-blue-800">{actionMessage}</p>
              <button onClick={() => setActionMessage(null)} className="text-blue-600 hover:text-blue-800">✕</button>
            </div>
          )}

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              {[
                { label: 'Total Gyms', value: stats.total, color: 'text-gray-900' },
                { label: 'Active', value: stats.active, color: 'text-green-600' },
                { label: 'Trial', value: stats.trial, color: 'text-yellow-600' },
                { label: 'Cancelled', value: stats.cancelled, color: 'text-red-600' },
                { label: 'Total Members', value: stats.totalMembers, color: 'text-blue-600' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-white rounded-lg shadow p-4 text-center">
                  <p className={`text-3xl font-bold ${color}`}>{value}</p>
                  <p className="text-sm text-gray-500 mt-1">{label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Gyms Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">All Gyms ({gyms.length})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {['Gym Name', 'Email', 'Plan', 'Status', 'Members', 'Joined', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {gyms.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-500">No gyms registered yet</td>
                    </tr>
                  ) : gyms.map((gym) => (
                    <tr key={gym.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{gym.name}</div>
                        <div className="text-xs text-gray-400">{gym.id.slice(0, 8)}...</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{gym.email}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className="capitalize font-medium">{gym.subscription_tier_actual || gym.subscription_tier || '—'}</span>
                      </td>
                      <td className="px-4 py-3">{statusBadge(gym.subscription_status || gym.status)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{gym.member_count || 0}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(gym.created_at).toLocaleDateString('en-GB')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => openEdit(gym)}
                            className="text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 px-2 py-1 rounded"
                          >
                            Edit
                          </button>
                          {gym.subscription_status !== 'active' ? (
                            <button
                              onClick={() => quickActivate(gym)}
                              className="text-xs bg-green-100 text-green-700 hover:bg-green-200 px-2 py-1 rounded"
                            >
                              Activate
                            </button>
                          ) : (
                            <button
                              onClick={() => quickSuspend(gym)}
                              className="text-xs bg-orange-100 text-orange-700 hover:bg-orange-200 px-2 py-1 rounded"
                            >
                              Suspend
                            </button>
                          )}
                          <button
                            onClick={() => setDeleteConfirm(gym.id)}
                            className="text-xs bg-red-100 text-red-700 hover:bg-red-200 px-2 py-1 rounded"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editingGym && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Edit Gym</h3>
              <button onClick={() => setEditingGym(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gym Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
                <select
                  value={editForm.tier}
                  onChange={e => setEditForm({ ...editForm, tier: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="starter">Starter (£39.95/mo)</option>
                  <option value="pro">Pro (£89.95/mo)</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subscription Status</label>
                <select
                  value={editForm.status}
                  onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="active">Active</option>
                  <option value="trial">Trial</option>
                  <option value="cancelled">Cancelled / Suspended</option>
                  <option value="past_due">Past Due</option>
                </select>
              </div>
              {editingGym.stripe_subscription_id && (
                <p className="text-xs text-gray-400">
                  Stripe Sub: {editingGym.stripe_subscription_id}
                </p>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setEditingGym(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                disabled={saving}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Gym?</h3>
            <p className="text-gray-600 text-sm mb-6">
              This will permanently delete the gym, all their members, and their subscription. This cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteGym(deleteConfirm)}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
