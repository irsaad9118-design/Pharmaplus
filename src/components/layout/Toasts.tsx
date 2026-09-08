import React from 'react';
import { usePharmacy } from '../../context/PharmacyContext';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = usePharmacy();

  return (
    <div id="toast-container" className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none px-4 sm:px-0">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            id={`toast-${toast.id}`}
            className="pointer-events-auto rounded-xl p-4 shadow-lg border backdrop-blur-md bg-white/95 text-slate-800 border-slate-200 flex items-start gap-3"
          >
            <div className="mt-0.5 shrink-0">
              {toast.type === 'success' && (
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              )}
              {toast.type === 'warning' && (
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              )}
              {toast.type === 'error' && (
                <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5" />
                </div>
              )}
              {toast.type === 'info' && (
                <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-600 flex items-center justify-center">
                  <Info className="w-5 h-5" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-slate-900 tracking-tight">{toast.title}</h4>
              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{toast.message}</p>
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors"
              aria-label="Close notification"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export const Toasts = ToastContainer;
