import React from 'react';
import { Pill, Sparkles } from 'lucide-react';

interface FallbackLoaderProps {
  message?: string;
  subtitle?: string;
  fullScreen?: boolean;
}

export const FallbackLoader: React.FC<FallbackLoaderProps> = ({
  message = 'Loading Store Workspace...',
  subtitle = 'PharmPulse • Loading Store Workspace...',
  fullScreen = true
}) => {
  return (
    <div
      id="pharmpulse-fallback-loader"
      className={`${
        fullScreen ? 'fixed inset-0 min-h-screen min-h-[100dvh]' : 'w-full py-16'
      } flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 z-50 select-none p-6 transition-colors duration-200`}
      style={{ backgroundColor: '#F8FAFC' }}
    >
      <div className="flex flex-col items-center text-center max-w-sm mx-auto animate-in fade-in duration-300">
        {/* Sleek Pulsing App Logo Container */}
        <div className="relative mb-5">
          {/* Outer glow ring with soft pulse */}
          <div className="absolute -inset-2 bg-gradient-to-r from-teal-400 to-emerald-400 rounded-3xl blur-md opacity-30 dark:opacity-20 animate-pulse" />
          
          {/* Inner Logo Box */}
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-teal-600 via-teal-500 to-emerald-500 text-white flex items-center justify-center shadow-lg shadow-teal-500/25 border border-white/20">
            <Pill className="w-8 h-8 sm:w-10 sm:h-10 text-white animate-pulse" />
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
              <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-400 items-center justify-center text-[8px] text-teal-950 font-black">
                <Sparkles className="w-2.5 h-2.5" />
              </span>
            </span>
          </div>
        </div>

        {/* Brand Title */}
        <div className="flex items-center gap-1.5 justify-center mb-1.5">
          <span className="text-lg sm:text-xl font-black tracking-tight text-slate-900 dark:text-white">
            Pharm<span className="text-teal-600 dark:text-teal-400">Pulse</span>
          </span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
            PRO
          </span>
        </div>

        {/* Required Subtitle in text-slate-500 */}
        <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 tracking-wide mb-4">
          {subtitle}
        </p>

        {/* Animated Loading Bar & Indicator */}
        <div className="w-48 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden relative">
          <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full w-1/2 animate-[pulse_1.5s_ease-in-out_infinite] translate-x-0" style={{
            animation: 'loaderSlide 1.6s infinite ease-in-out'
          }} />
        </div>

        <style>{`
          @keyframes loaderSlide {
            0% { transform: translateX(-100%); width: 40%; }
            50% { transform: translateX(60%); width: 60%; }
            100% { transform: translateX(200%); width: 40%; }
          }
        `}</style>
      </div>
    </div>
  );
};
