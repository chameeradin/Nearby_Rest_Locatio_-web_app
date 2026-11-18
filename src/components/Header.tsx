import React, { useState } from 'react';
import { Bell, LogOut, Menu, X } from 'lucide-react';
import type { AppView, PushNotificationItem, UserProfile } from '../types/app';
import { APP_NAME } from '../lib/constants';
import { LogoMark } from './LogoMark';

interface HeaderProps {
  activeView: AppView;
  onNavigate: (view: AppView) => void;
  userProfile: UserProfile | null;
  isAdmin: boolean;
  notifications: PushNotificationItem[];
  onMarkAllRead: () => void;
  onOpenAuth: () => void;
  onSignOut: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeView,
  onNavigate,
  userProfile,
  isAdmin,
  notifications,
  onMarkAllRead,
  onOpenAuth,
  onSignOut,
}) => {
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const navItems: Array<{ id: AppView; label: string }> = [
    { id: 'explore', label: 'Explore' },
    { id: 'map', label: 'Live Map' },
    { id: 'bookings', label: 'Bookings' },
    { id: 'settings', label: 'Settings' },
    ...(isAdmin ? [{ id: 'admin' as AppView, label: 'Admin' }] : []),
  ];

  const handleNav = (id: AppView) => {
    onNavigate(id);
    setMobileMenuOpen(false);
    setAccountMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Title (single line, no descriptor tags) */}
        <button
          type="button"
          onClick={() => handleNav('explore')}
          className="flex items-center gap-2.5 text-left whitespace-nowrap shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 rounded-lg"
        >
          <LogoMark className="w-8 h-8 shrink-0" />
          <span className="font-display text-lg font-bold tracking-tight text-stone-900 whitespace-nowrap shrink-0">
            {APP_NAME}
          </span>
        </button>

        {/* Zone 2: Clean single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-6" aria-label="Primary Navigation">
          {navItems.map((item) => {
            const active = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNav(item.id)}
                className={`text-sm font-medium whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
                  active
                    ? 'text-teal-800 border-teal-700'
                    : 'text-stone-600 border-transparent hover:text-stone-900 hover:border-stone-300'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Single Primary Action (Sign In or Account Menu) + Mobile Nav Toggle */}
        <div className="flex items-center gap-2 shrink-0 relative">
          {userProfile ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setAccountMenuOpen((prev) => !prev);
                  if (!accountMenuOpen && unreadCount > 0) {
                    onMarkAllRead();
                  }
                }}
                className="flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm font-medium text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <span className="max-w-[120px] truncate">{userProfile.displayName}</span>
                {unreadCount > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[11px] font-mono font-semibold text-white bg-teal-700 rounded-md tabular-nums">
                    {unreadCount}
                  </span>
                )}
              </button>

              {accountMenuOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-stone-200 rounded-xl shadow-lg p-4 z-50">
                  <div className="pb-3 border-b border-stone-200">
                    <p className="text-sm font-semibold text-stone-900 truncate">
                      {userProfile.displayName}
                    </p>
                    <p className="text-xs text-stone-500 truncate">{userProfile.email}</p>
                    <p className="mt-1 text-xs text-teal-700 font-medium capitalize">
                      {userProfile.role} account
                    </p>
                  </div>

                  <div className="py-3 border-b border-stone-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
                        <Bell className="w-3.5 h-3.5 text-teal-700" />
                        Notifications &amp; Offers
                      </span>
                      <span className="text-[11px] text-stone-400 tabular-nums">
                        {notifications.length} total
                      </span>
                    </div>
                    {notifications.length === 0 ? (
                      <p className="text-xs text-stone-500 py-2">
                        No upcoming appointment alerts or active offer notifications yet.
                      </p>
                    ) : (
                      <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                        {notifications.slice(0, 5).map((n) => (
                          <div key={n.id} className="text-xs p-2 rounded-lg bg-stone-50 border border-stone-100">
                            <p className="font-semibold text-stone-900">{n.title}</p>
                            <p className="text-stone-600 mt-0.5">{n.body}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleNav('settings')}
                      className="text-xs font-medium text-stone-700 hover:text-stone-900 px-2.5 py-1.5 rounded-lg hover:bg-stone-100 transition-colors"
                    >
                      Preferences
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAccountMenuOpen(false);
                        onSignOut();
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="px-4 py-2 text-xs sm:text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              Sign In
            </button>
          )}

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="md:hidden p-2 text-stone-700 hover:bg-stone-100 rounded-lg"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-stone-200 bg-white px-4 py-3 space-y-1">
          {navItems.map((item) => {
            const active = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNav(item.id)}
                className={`block w-full text-left px-3 py-2.5 text-sm font-medium rounded-lg ${
                  active ? 'bg-teal-50 text-teal-800' : 'text-stone-700 hover:bg-stone-50'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};
