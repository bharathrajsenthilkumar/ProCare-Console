'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Lock, Mail, AlertCircle, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
      } else if (data.session) {
        router.push('/dashboard');
      } else {
        setError('Authentication succeeded, but no session was created.');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12 sm:px-6 lg:px-8 relative">
      {/* Subtle graphic layout elements */}
      <div className="absolute top-0 right-0 w-[40%] h-[35%] bg-sky-500/5 rounded-bl-[120px] blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[40%] h-[35%] bg-emerald-500/5 rounded-tr-[120px] blur-3xl pointer-events-none" />

      <div className="max-w-md w-full space-y-6 bg-white p-8 rounded-2xl border border-slate-200/80 shadow-sm relative z-10">
        <div>
          {/* Logo / Branding */}
          <div className="flex justify-center items-center gap-2.5">
            <div className="relative h-12 w-12 flex items-center justify-center shrink-0">
              <img src="/logo.png" alt="ProCare Logo" className="h-full w-full object-contain" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-slate-900">
              Procare<span className="text-sky-600 font-semibold">Console</span>
            </span>
          </div>
          <h2 className="mt-6 text-center text-base font-bold text-slate-800 tracking-tight">
            Administrator Gateway
          </h2>
          <p className="mt-1 text-center text-xs text-slate-400">
            Secure sign in to access administration metrics and patient directories.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div className="text-xs text-red-700 leading-relaxed font-medium">{error}</div>
          </div>
        )}

        <form className="space-y-5" onSubmit={handleLogin}>
          <Input
            id="email-address"
            name="email"
            type="email"
            label="Email Address"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@procare.com"
            icon={<Mail className="h-4 w-4" />}
          />

          <div className="space-y-1">
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                label="Password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                icon={<Lock className="h-4 w-4" />}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-[32px] text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              isLoading={loading}
              className="w-full flex justify-center py-3 text-sm font-bold shadow-sm"
            >
              {!loading && <ShieldCheck className="h-4 w-4 mr-2" />}
              <span>Secure Sign In</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
