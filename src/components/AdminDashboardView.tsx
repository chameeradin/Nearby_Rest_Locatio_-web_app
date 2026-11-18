import React, { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { Activity, CalendarCheck, Plus, Shield, Users } from 'lucide-react';
import type {
  ActivityLogRecord,
  BookingRecord,
  PlaceCategory,
  PromotionRecord,
  UserProfile,
} from '../types/app';
import {
  createPromotionAdmin,
  fetchAllPromotionsAdmin,
  logActivity,
  subscribeActivityLogsAdmin,
  subscribeAllBookingsAdmin,
  subscribeAllUsersAdmin,
  togglePromotionAdmin,
  updateBookingStatusAdmin,
  updateUserRoleOrStatusAdmin,
} from '../lib/firestoreService';

interface AdminDashboardViewProps {
  currentUser: User | null;
  isAdmin: boolean;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  currentUser,
  isAdmin,
}) => {
  const [tab, setTab] = useState<'users' | 'logs' | 'bookings' | 'promotions'>('users');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [logs, setLogs] = useState<ActivityLogRecord[]>([]);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [promotions, setPromotions] = useState<PromotionRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // New Promo Form
  const [promoTitle, setPromoTitle] = useState('');
  const [promoDesc, setPromoDesc] = useState('');
  const [promoDiscount, setPromoDiscount] = useState('20% OFF');
  const [promoCategory, setPromoCategory] = useState<PlaceCategory>('hotel');
  const [promoValidUntil, setPromoValidUntil] = useState('2026-12-31');
  const [savingPromo, setSavingPromo] = useState(false);

  useEffect(() => {
    if (!currentUser || !isAdmin) return;
    const unsubUsers = subscribeAllUsersAdmin(setUsers);
    const unsubLogs = subscribeActivityLogsAdmin(setLogs);
    const unsubBookings = subscribeAllBookingsAdmin(setBookings);
    void fetchAllPromotionsAdmin().then(setPromotions).catch(() => undefined);

    return () => {
      unsubUsers();
      unsubLogs();
      unsubBookings();
    };
  }, [currentUser, isAdmin]);

  if (!isAdmin || !currentUser) {
    return (
      <div className="bg-white border border-stone-200 rounded-2xl p-10 text-center space-y-2">
        <Shield className="w-10 h-10 text-stone-400 mx-auto" />
        <h2 className="font-display text-xl font-semibold text-stone-900">
          Administrator Access Required
        </h2>
        <p className="text-sm text-stone-600">
          Sign in with an authorized administrator account to manage users and view activity logs.
        </p>
      </div>
    );
  }

  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoTitle.trim() || !promoDesc.trim()) return;
    setSavingPromo(true);
    try {
      await createPromotionAdmin(currentUser.uid, {
        title: promoTitle.trim(),
        description: promoDesc.trim(),
        category: promoCategory,
        discountLabel: promoDiscount.trim() || 'Special Offer',
        validUntil: promoValidUntil,
        active: true,
      });
      await logActivity({
        user: currentUser,
        action: 'promotion_created',
        details: `Published offer "${promoTitle.trim()}" (${promoDiscount})`,
        category: 'admin',
      });
      setPromoTitle('');
      setPromoDesc('');
      const refreshed = await fetchAllPromotionsAdmin();
      setPromotions(refreshed);
    } finally {
      setSavingPromo(false);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredLogs = logs.filter(
    (l) =>
      l.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.details.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Admin Header & KPI Strip */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-stone-900">
            Admin Control Console
          </h1>
          <p className="text-sm text-stone-600 mt-1">
            Manage registered users, monitor real-time activity logs, oversee bookings, and publish
            promotional push offers.
          </p>
        </div>

        <input
          type="search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Filter users or logs..."
          className="px-3.5 py-2 text-sm border border-stone-300 rounded-lg bg-white w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-teal-700"
        />
      </div>

      {/* Flat 4-metric overview row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-stone-200 rounded-xl p-4">
          <p className="text-xs text-stone-500">Registered Users</p>
          <p className="font-mono text-2xl font-bold text-stone-900 mt-1 tabular-nums">
            {users.length}
          </p>
        </div>
        <div className="bg-white border border-stone-200 rounded-xl p-4">
          <p className="text-xs text-stone-500">Total Bookings</p>
          <p className="font-mono text-2xl font-bold text-stone-900 mt-1 tabular-nums">
            {bookings.length}
          </p>
        </div>
        <div className="bg-white border border-stone-200 rounded-xl p-4">
          <p className="text-xs text-stone-500">Activity Events</p>
          <p className="font-mono text-2xl font-bold text-stone-900 mt-1 tabular-nums">
            {logs.length}
          </p>
        </div>
        <div className="bg-white border border-stone-200 rounded-xl p-4">
          <p className="text-xs text-stone-500">Active Promotions</p>
          <p className="font-mono text-2xl font-bold text-stone-900 mt-1 tabular-nums">
            {promotions.filter((p) => p.active).length}
          </p>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex flex-wrap items-center gap-1 p-1 bg-stone-100 rounded-lg w-fit">
        {[
          { id: 'users', label: 'Users Data', icon: Users },
          { id: 'logs', label: 'Activity Logs', icon: Activity },
          { id: 'bookings', label: 'All Bookings', icon: CalendarCheck },
          { id: 'promotions', label: 'Promotional Offers', icon: Plus },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id as typeof tab)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                tab === item.id
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Users Table */}
      {tab === 'users' && (
        <div className="bg-white border border-stone-200 rounded-xl overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-xs text-stone-500">
                <th className="py-3 px-4 font-semibold">User</th>
                <th className="py-3 px-4 font-semibold">Email</th>
                <th className="py-3 px-4 font-semibold">Role</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredUsers.map((u) => (
                <tr key={u.uid} className="hover:bg-stone-50/70">
                  <td className="py-3 px-4 font-medium text-stone-900">{u.displayName}</td>
                  <td className="py-3 px-4 font-mono text-xs text-stone-600">{u.email}</td>
                  <td className="py-3 px-4 capitalize text-xs font-semibold text-teal-800">
                    {u.role}
                  </td>
                  <td
                    className={`py-3 px-4 capitalize text-xs font-semibold ${
                      u.status === 'active' ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {u.status}
                  </td>
                  <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() =>
                        void updateUserRoleOrStatusAdmin(u, {
                          role: u.role === 'admin' ? 'user' : 'admin',
                        })
                      }
                      className="px-2.5 py-1 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-md"
                    >
                      {u.role === 'admin' ? 'Set User' : 'Make Admin'}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void updateUserRoleOrStatusAdmin(u, {
                          status: u.status === 'active' ? 'suspended' : 'active',
                        })
                      }
                      className="px-2.5 py-1 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-md"
                    >
                      {u.status === 'active' ? 'Suspend' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-stone-500">
                    No matching users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Activity Logs Table */}
      {tab === 'logs' && (
        <div className="bg-white border border-stone-200 rounded-xl overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-xs text-stone-500">
                <th className="py-3 px-4 font-semibold">Category</th>
                <th className="py-3 px-4 font-semibold">Action</th>
                <th className="py-3 px-4 font-semibold">User Email</th>
                <th className="py-3 px-4 font-semibold">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredLogs.map((l) => (
                <tr key={l.id} className="hover:bg-stone-50/70">
                  <td className="py-3 px-4 text-xs font-semibold uppercase text-teal-800">
                    {l.category}
                  </td>
                  <td className="py-3 px-4 font-mono text-xs text-stone-900">{l.action}</td>
                  <td className="py-3 px-4 font-mono text-xs text-stone-600">{l.userEmail}</td>
                  <td className="py-3 px-4 text-xs text-stone-700">{l.details}</td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-stone-500">
                    No activity logs recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Bookings Oversight Table */}
      {tab === 'bookings' && (
        <div className="bg-white border border-stone-200 rounded-xl overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-xs text-stone-500">
                <th className="py-3 px-4 font-semibold">Place</th>
                <th className="py-3 px-4 font-semibold">Guest</th>
                <th className="py-3 px-4 font-semibold">Date</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Update</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {bookings.map((b) => (
                <tr key={b.id} className="hover:bg-stone-50/70">
                  <td className="py-3 px-4 font-medium text-stone-900">{b.placeName}</td>
                  <td className="py-3 px-4 text-xs text-stone-600">
                    {b.userName} · {b.userEmail}
                  </td>
                  <td className="py-3 px-4 font-mono text-xs tabular-nums">{b.checkInDate}</td>
                  <td className="py-3 px-4 capitalize text-xs font-semibold">{b.status}</td>
                  <td className="py-3 px-4 text-right">
                    <select
                      value={b.status}
                      onChange={(e) =>
                        void updateBookingStatusAdmin(
                          b.id,
                          e.target.value as BookingRecord['status']
                        )
                      }
                      className="px-2.5 py-1 text-xs border border-stone-300 rounded-md bg-white"
                    >
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                </tr>
              ))}
              {bookings.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-stone-500">
                    No bookings submitted yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Promotional Offers Publisher */}
      {tab === 'promotions' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={(e) => void handleCreatePromo(e)}
            className="lg:col-span-5 bg-white border border-stone-200 rounded-xl p-5 space-y-4"
          >
            <h3 className="font-display text-base font-semibold text-stone-900">
              Publish Promotional Offer
            </h3>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Offer Title</label>
              <input
                type="text"
                required
                value={promoTitle}
                onChange={(e) => setPromoTitle(e.target.value)}
                placeholder="Weekend Cabana & Breakfast Package"
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Discount</label>
                <input
                  type="text"
                  required
                  value={promoDiscount}
                  onChange={(e) => setPromoDiscount(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Category</label>
                <select
                  value={promoCategory}
                  onChange={(e) => setPromoCategory(e.target.value as PlaceCategory)}
                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg bg-white"
                >
                  <option value="all">All</option>
                  <option value="hotel">Hotels</option>
                  <option value="restaurant">Restaurants</option>
                  <option value="cabana">Cabanas</option>
                  <option value="cafe">Cafes</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Valid Until</label>
              <input
                type="date"
                required
                value={promoValidUntil}
                onChange={(e) => setPromoValidUntil(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Description</label>
              <textarea
                rows={3}
                required
                value={promoDesc}
                onChange={(e) => setPromoDesc(e.target.value)}
                placeholder="Describe offer eligibility and booking window..."
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg"
              />
            </div>
            <button
              type="submit"
              disabled={savingPromo}
              className="w-full py-2.5 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg disabled:opacity-50"
            >
              {savingPromo ? 'Publishing...' : 'Publish Offer & Notify Users'}
            </button>
          </form>

          <div className="lg:col-span-7 bg-white border border-stone-200 rounded-xl p-5 space-y-3">
            <h3 className="font-display text-base font-semibold text-stone-900">
              Published Offers ({promotions.length})
            </h3>
            {promotions.length === 0 ? (
              <p className="text-sm text-stone-500">No promotional offers published yet.</p>
            ) : (
              <div className="divide-y divide-stone-100">
                {promotions.map((p) => (
                  <div key={p.id} className="py-3 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold text-teal-800">
                        {p.discountLabel} · {p.category} · Valid until {p.validUntil}
                      </p>
                      <p className="text-sm font-semibold text-stone-900">{p.title}</p>
                      <p className="text-xs text-stone-600 mt-0.5">{p.description}</p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        await togglePromotionAdmin(p.id, !p.active);
                        setPromotions(await fetchAllPromotionsAdmin());
                      }}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md shrink-0 ${
                        p.active
                          ? 'bg-emerald-50 text-emerald-800'
                          : 'bg-stone-100 text-stone-600'
                      }`}
                    >
                      {p.active ? 'Active' : 'Paused'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
