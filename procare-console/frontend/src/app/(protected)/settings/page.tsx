'use client';

import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Sun, 
  Moon, 
  Palette
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';

export default function SettingsPage() {
  // Appearance State
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Notifications State
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [securityAlerts, setSecurityAlerts] = useState(true);
  const [weeklyReports, setWeeklyReports] = useState(false);

  // Load and apply theme from localStorage
  useEffect(() => {
    const savedTheme = (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
    setTheme(savedTheme);
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Console Configurations" 
        description="Configure notification preferences and manage interface appearance themes."
        actions={<Badge variant="success">Active System Config</Badge>}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Section 1: Notification Preferences */}
        <Card className="border-slate-200 shadow-sm overflow-hidden dark:border-slate-800 dark:bg-slate-900">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-5 dark:border-slate-800 dark:bg-slate-950/20">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-slate-500 dark:text-slate-400" />
              <div>
                <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-200">Notification Preferences</CardTitle>
                <CardDescription className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Control system event notifications and updates</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="!p-6 space-y-5">
            <div className="space-y-4">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={emailAlerts}
                  onChange={(e) => setEmailAlerts(e.target.checked)}
                  className="rounded border-slate-350 text-slate-800 focus:ring-slate-500 w-4 h-4 cursor-pointer mt-0.5 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
                />
                <div>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200 block">Email Alerts for Storage Limit Warnings</span>
                  <span className="text-[10px] text-slate-450 dark:text-slate-400 mt-0.5 block leading-normal">
                    Receive direct email alerts when database limits exceed 90% capacity.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={securityAlerts}
                  onChange={(e) => setSecurityAlerts(e.target.checked)}
                  className="rounded border-slate-355 text-slate-800 focus:ring-slate-500 w-4 h-4 cursor-pointer mt-0.5 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
                />
                <div>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200 block">Audit Security Logs Alerts</span>
                  <span className="text-[10px] text-slate-450 dark:text-slate-400 mt-0.5 block leading-normal">
                    Notify administrators when a login attempt fails or security parameters change.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={weeklyReports}
                  onChange={(e) => setWeeklyReports(e.target.checked)}
                  className="rounded border-slate-355 text-slate-800 focus:ring-slate-500 w-4 h-4 cursor-pointer mt-0.5 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
                />
                <div>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200 block">Weekly Analytics Summaries</span>
                  <span className="text-[10px] text-slate-450 dark:text-slate-400 mt-0.5 block leading-normal">
                    Receive weekly chatbot conversation summary summaries and server analytics.
                  </span>
                </div>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Appearance (Theme Controls) */}
        <Card className="border-slate-200 shadow-sm overflow-hidden dark:border-slate-800 dark:bg-slate-900">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-5 dark:border-slate-800 dark:bg-slate-950/20">
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-slate-500 dark:text-slate-400" />
              <div>
                <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-200">Appearance</CardTitle>
                <CardDescription className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Customize the color scheme of the administration dashboard</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="!p-6 space-y-4">
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-550 dark:text-slate-300 block uppercase tracking-wider">Interface Theme Mode</span>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => handleThemeChange('light')}
                  className={`flex flex-col items-center gap-2.5 p-4 rounded-xl border transition-all ${
                    theme === 'light'
                      ? 'border-slate-900 bg-slate-50 text-slate-900 font-bold ring-1 ring-slate-900 dark:border-sky-500 dark:text-sky-400 dark:bg-sky-950/20 dark:ring-sky-500'
                      : 'border-slate-200 hover:border-slate-350 text-slate-500 bg-white hover:bg-slate-50/50 dark:text-slate-400 dark:border-slate-700 dark:hover:bg-slate-800/50 dark:bg-slate-900'
                  }`}
                >
                  <Sun className={`h-6 w-6 ${theme === 'light' ? 'text-sky-500' : 'text-slate-400'}`} />
                  <span className="text-xs font-semibold">Light Theme</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleThemeChange('dark')}
                  className={`flex flex-col items-center gap-2.5 p-4 rounded-xl border transition-all ${
                    theme === 'dark'
                      ? 'border-slate-900 bg-slate-50 text-slate-900 font-bold ring-1 ring-slate-900 dark:border-sky-500 dark:text-sky-400 dark:bg-sky-950/20 dark:ring-sky-500'
                      : 'border-slate-200 hover:border-slate-350 text-slate-500 bg-white hover:bg-slate-50/50 dark:text-slate-400 dark:border-slate-700 dark:hover:bg-slate-800/50 dark:bg-slate-900'
                  }`}
                >
                  <Moon className={`h-6 w-6 ${theme === 'dark' ? 'text-violet-400' : 'text-slate-400'}`} />
                  <span className="text-xs font-semibold">Dark Theme</span>
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
