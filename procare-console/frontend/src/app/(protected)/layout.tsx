'use client';

import React, { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  FileText,
  Database,
  Image as ImageIcon,
  UserCheck,
  Settings as SettingsIcon,
  LogOut,
  Menu,
  X,
  Stethoscope,
  ChevronRight,
  User,
  ChevronDown
} from 'lucide-react';
import Link from 'next/link';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<any>;
  subItems?: { name: string; href: string; icon: React.ComponentType<any> }[];
}

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [logsDropdownOpen, setLogsDropdownOpen] = useState(true);

  const navigation: NavItem[] = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Users', href: '/users', icon: Users },
    { name: 'Chat Logs', href: '/chat-logs', icon: MessageSquare },
    {
      name: 'Logs & Storage',
      href: '/logs',
      icon: FileText,
      subItems: [
        { name: 'System Logs', href: '/logs', icon: FileText },
        { name: 'Storage Metrics', href: '/storage', icon: Database },
      ],
    },
    { name: 'Gallery', href: '/gallery', icon: ImageIcon },
    { name: 'Team', href: '/team', icon: UserCheck },
    { name: 'Settings', href: '/settings', icon: SettingsIcon },
  ];

  // Helper to determine if a route is active
  const isRouteActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  // Get active page title
  const getActiveTitle = () => {
    for (const item of navigation) {
      if (item.subItems) {
        for (const sub of item.subItems) {
          if (pathname === sub.href) return sub.name;
        }
      }
      if (item.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(item.href)) {
        return item.name;
      }
    }
    return 'Console';
  };

  const pageTitle = getActiveTitle();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-6 w-6 text-slate-800" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-xs text-slate-400 font-semibold tracking-wider uppercase">Loading Session...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-800 antialiased font-sans">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-white border-r border-slate-200">
        {/* Branding */}
        <div className="flex items-center gap-2.5 px-6 py-5 border-b border-slate-100">
          <div className="p-2 bg-slate-900 text-white rounded-lg">
            <Stethoscope className="h-5 w-5" />
          </div>
          <span className="text-base font-bold tracking-tight text-slate-900">
            Procare<span className="text-sky-600 font-semibold">Console</span>
          </span>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const hasSubItems = !!item.subItems;
            const active = isRouteActive(item.href);

            if (hasSubItems) {
              const isSubActive = item.subItems?.some(sub => pathname === sub.href);
              return (
                <div key={item.name} className="space-y-1">
                  <button
                    onClick={() => setLogsDropdownOpen(!logsDropdownOpen)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
                      isSubActive 
                        ? 'text-slate-900 bg-slate-50' 
                        : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <item.icon className="h-4 w-4 stroke-[1.8]" />
                      <span>{item.name}</span>
                    </div>
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${logsDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {logsDropdownOpen && (
                    <div className="pl-4 space-y-1.5 pt-1">
                      {item.subItems?.map((sub) => {
                        const subActive = pathname === sub.href;
                        return (
                          <Link
                            key={sub.name}
                            href={sub.href}
                            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                              subActive
                                ? 'bg-slate-900 text-white font-semibold'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
                            }`}
                          >
                            <sub.icon className={`h-4 w-4 ${subActive ? 'text-white' : 'text-slate-400'}`} />
                            <span>{sub.name}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-slate-900 text-white font-semibold shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <item.icon className={`h-4.5 w-4.5 ${active ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.name}</span>
                </div>
                {active && <ChevronRight className="h-3.5 w-3.5 text-white" />}
              </Link>
            );
          })}
        </nav>

        {/* User profile details bottom */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3 px-2 py-1.5">
            <div className="h-9 w-9 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center text-slate-600">
              <User className="h-5 w-5 stroke-[1.8]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-800 truncate">Administrator</p>
              <p className="text-[10px] text-slate-400 truncate leading-none mt-0.5">{user.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Backdrop */}
          <div className="fixed inset-0 bg-slate-950/20 backdrop-blur-sm animate-fade-in" onClick={() => setMobileSidebarOpen(false)} />

          {/* Drawer Panel */}
          <div className="relative flex flex-col w-64 bg-white border-r border-slate-200 text-slate-700 animate-slide-in">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-slate-900 text-white rounded-lg">
                  <Stethoscope className="h-5 w-5" />
                </div>
                <span className="text-base font-bold text-slate-900">Procare Console</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(false)}
                className="text-slate-400 hover:text-slate-600 focus:outline-none"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
              {navigation.map((item) => {
                const hasSubItems = !!item.subItems;
                const active = isRouteActive(item.href);

                if (hasSubItems) {
                  return (
                    <div key={item.name} className="space-y-1">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3.5 pt-2">
                        {item.name}
                      </div>
                      {item.subItems?.map((sub) => {
                        const subActive = pathname === sub.href;
                        return (
                          <Link
                            key={sub.name}
                            href={sub.href}
                            onClick={() => setMobileSidebarOpen(false)}
                            className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                              subActive
                                ? 'bg-slate-900 text-white font-semibold'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                            }`}
                          >
                            <sub.icon className="h-4.5 w-4.5 text-current" />
                            <span>{sub.name}</span>
                          </Link>
                        );
                      })}
                    </div>
                  );
                }

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileSidebarOpen(false)}
                    className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? 'bg-slate-900 text-white font-semibold shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <item.icon className="h-4.5 w-4.5 text-current" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="p-4 border-t border-slate-100 bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-600">
                  <User className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-800 truncate">Admin</p>
                  <p className="text-[10px] text-slate-400 truncate mt-0.5">{user.email}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:pl-64 min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 h-16 flex items-center justify-between px-6 md:px-8">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="md:hidden text-slate-400 hover:text-slate-600 focus:outline-none"
              aria-label="Open sidebar menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            
            {/* Page title and hierarchy */}
            <div className="flex items-center gap-1 text-slate-400 text-xs">
              <span className="font-semibold text-slate-400">Procare Console</span>
              <ChevronRight className="h-3 w-3 stroke-[2]" />
              <span className="font-bold text-slate-800 text-sm tracking-tight">{pageTitle}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-semibold text-slate-700">Administrator</span>
              <span className="text-[10px] text-slate-400 truncate max-w-[150px] mt-0.5">{user.email}</span>
            </div>
            <button
              type="button"
              onClick={logout}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:border-red-200 hover:bg-red-50 text-slate-600 hover:text-red-600 text-xs font-semibold rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </header>

        {/* Content Viewport */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
