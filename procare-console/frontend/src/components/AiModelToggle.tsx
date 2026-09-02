'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, Zap, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export type AiModelType = 'gemini' | 'groq';

interface AiModelToggleProps {
  className?: string;
  onModelChange?: (model: AiModelType) => void;
}

export function AiModelToggle({ className = '', onModelChange }: AiModelToggleProps) {
  const [activeModel, setActiveModel] = useState<AiModelType>('gemini');
  const [loading, setLoading] = useState<boolean>(true);
  const [updating, setUpdating] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // 1. Fetch current active_chatbot_model from Supabase on component mount
  useEffect(() => {
    let isMounted = true;

    async function fetchModelSetting() {
      try {
        setLoading(true);
        // Query Supabase system_settings table
        const { data, error } = await supabase
          .from('system_settings')
          .select('active_chatbot_model')
          .limit(1)
          .maybeSingle();

        if (error) {
          console.warn('Could not fetch from system_settings table:', error.message);
          // Check localStorage fallback if table is not yet seeded
          const localFallback = (localStorage.getItem('active_chatbot_model') as AiModelType) || 'gemini';
          if (isMounted) {
            setActiveModel(localFallback);
            setStatusMessage({
              type: 'info',
              text: 'Using local cache while system_settings table connects.',
            });
          }
        } else if (data && data.active_chatbot_model) {
          const model = data.active_chatbot_model.toLowerCase() === 'groq' ? 'groq' : 'gemini';
          if (isMounted) {
            setActiveModel(model);
            localStorage.setItem('active_chatbot_model', model);
          }
        } else {
          // If table exists but empty, default to gemini
          if (isMounted) {
            setActiveModel('gemini');
          }
        }
      } catch (err: any) {
        console.warn('Error fetching AI model setting:', err);
        if (isMounted) {
          setActiveModel('gemini');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchModelSetting();

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Toggle Action: Flips value and updates Supabase system_settings table
  const handleToggle = async () => {
    if (updating) return;

    const previousModel = activeModel;
    const nextModel: AiModelType = activeModel === 'gemini' ? 'groq' : 'gemini';

    // Optimistic UI update
    setActiveModel(nextModel);
    setUpdating(true);
    setStatusMessage(null);

    try {
      // 1. Try updating row in Supabase system_settings
      const { error: updateError } = await supabase
        .from('system_settings')
        .update({
          active_chatbot_model: nextModel,
          updated_at: new Date().toISOString(),
        })
        .eq('id', 1);

      if (updateError) {
        // If update failed (e.g. row 1 not present), try upserting
        const { error: upsertError } = await supabase
          .from('system_settings')
          .upsert({
            id: 1,
            active_chatbot_model: nextModel,
            updated_at: new Date().toISOString(),
          });

        if (upsertError) {
          throw upsertError;
        }
      }

      // Persist to local state and notify callback
      localStorage.setItem('active_chatbot_model', nextModel);
      if (onModelChange) {
        onModelChange(nextModel);
      }

      setStatusMessage({
        type: 'success',
        text: `Global chatbot switched to ${nextModel === 'gemini' ? 'Gemini 3.5 Flash' : 'Groq Llama 3.3'}`,
      });

      // Auto-clear message after 4s
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      console.error('Failed to update Supabase system_settings:', err);
      // Fallback: save to localStorage so UI works even if remote table has pending migration
      localStorage.setItem('active_chatbot_model', nextModel);
      if (onModelChange) {
        onModelChange(nextModel);
      }

      setStatusMessage({
        type: 'info',
        text: `Switched locally to ${nextModel.toUpperCase()}. (Note: Ensure system_settings table exists in Supabase).`,
      });
    } finally {
      setUpdating(false);
    }
  };

  const isGemini = activeModel === 'gemini';

  return (
    <div className={`rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all dark:border-slate-800 dark:bg-slate-900 ${className}`}>
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              Global Chatbot AI Model
            </h3>
            {loading ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                <RefreshCw className="h-3 w-3 animate-spin" /> Loading
              </span>
            ) : (
              <span
                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold tracking-wide transition-colors ${
                  isGemini
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50'
                    : 'bg-amber-50 text-amber-700 border border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50'
                }`}
              >
                {isGemini ? (
                  <>
                    <Sparkles className="h-3 w-3" /> Active: Gemini
                  </>
                ) : (
                  <>
                    <Zap className="h-3 w-3" /> Active: Groq
                  </>
                )}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Seamlessly switch between Google Gemini and Groq Llama for patient inquiries.
          </p>
        </div>

        {/* Model Identifier Pill */}
        <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/50 px-2.5 py-1.5 rounded-lg border border-slate-200/60 dark:border-slate-800 self-start sm:self-auto">
          {isGemini ? 'gemini-3.5-flash-lite' : 'llama-3.3-70b-versatile'}
        </div>
      </div>

      {/* Interactive Toggle Switch Component */}
      <div className="pt-5 flex flex-col sm:flex-row items-center justify-between gap-5">
        
        {/* Left Option: Gemini */}
        <button
          type="button"
          onClick={() => isGemini ? null : handleToggle()}
          className={`flex-1 w-full sm:w-auto p-3.5 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
            isGemini
              ? 'border-emerald-500 bg-emerald-50/40 dark:border-emerald-500/80 dark:bg-emerald-950/20 shadow-sm'
              : 'border-slate-200 hover:border-slate-300 bg-slate-50/40 dark:border-slate-800 dark:bg-slate-950/20 dark:hover:border-slate-700 opacity-65 hover:opacity-100'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-lg ${isGemini ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block">
                  Gemini 3.5 Flash
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                  Google DeepMind Clinical Engine
                </span>
              </div>
            </div>
            {isGemini && (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            )}
          </div>
        </button>

        {/* The Physical Sliding Toggle Switch */}
        <div className="flex flex-col items-center justify-center gap-1.5 px-2">
          <button
            type="button"
            role="switch"
            aria-checked={!isGemini}
            aria-label="Toggle AI model between Gemini and Groq"
            disabled={updating || loading}
            onClick={handleToggle}
            className={`relative inline-flex h-9 w-18 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${
              isGemini
                ? 'bg-emerald-500'
                : 'bg-amber-500'
            } ${updating || loading ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            <span className="sr-only">Toggle AI Model</span>
            <span
              aria-hidden="true"
              className={`pointer-events-none flex h-8 w-8 transform items-center justify-center rounded-full bg-white shadow-md ring-0 transition duration-300 ease-in-out dark:bg-slate-100 ${
                isGemini ? 'translate-x-0 text-emerald-600' : 'translate-x-9 text-amber-600'
              }`}
            >
              {updating ? (
                <RefreshCw className="h-4 w-4 animate-spin text-slate-400" />
              ) : isGemini ? (
                <Sparkles className="h-4 w-4" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
            </span>
          </button>
          <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            {updating ? 'Saving...' : 'Click to Toggle'}
          </span>
        </div>

        {/* Right Option: Groq */}
        <button
          type="button"
          onClick={() => !isGemini ? null : handleToggle()}
          className={`flex-1 w-full sm:w-auto p-3.5 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
            !isGemini
              ? 'border-amber-500 bg-amber-50/40 dark:border-amber-500/80 dark:bg-amber-950/20 shadow-sm'
              : 'border-slate-200 hover:border-slate-300 bg-slate-50/40 dark:border-slate-800 dark:bg-slate-950/20 dark:hover:border-slate-700 opacity-65 hover:opacity-100'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-lg ${!isGemini ? 'bg-amber-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                <Zap className="h-4 w-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block">
                  Groq Llama 3.3
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                  High-Speed LPU Inference
                </span>
              </div>
            </div>
            {!isGemini && (
              <CheckCircle2 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            )}
          </div>
        </button>

      </div>

      {/* Notification Toast/Feedback */}
      {statusMessage && (
        <div
          className={`mt-4 flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs transition-all animate-in fade-in slide-in-from-top-1 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
              : statusMessage.type === 'error'
              ? 'bg-rose-50 text-rose-800 border border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
              : 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}
    </div>
  );
}
