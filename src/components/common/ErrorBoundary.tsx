import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, RotateCcw, ShieldAlert, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackRender?: (props: { error: Error | null; resetError: () => void }) => ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  copied: boolean;
  showDetails: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      copied: false,
      showDetails: false
    };
  }

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('PharmPulse ErrorBoundary caught a render error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      copied: false,
      showDetails: false
    });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleHardReset = () => {
    try {
      // Clear corrupt volatile sessions if any, but keep primary storage
      localStorage.removeItem('pharmpulse_auth_session_v3');
      localStorage.removeItem('pharmpulse_super_admin_v3');
    } catch (e) {
      // ignore
    }
    window.location.href = window.location.pathname;
  };

  private handleCopyDetails = () => {
    const text = `PharmPulse Error Report:
Error: ${this.state.error?.message || 'Unknown Error'}
Stack: ${this.state.error?.stack || 'N/A'}
Component Stack: ${this.state.errorInfo?.componentStack || 'N/A'}
URL: ${window.location.href}
Time: ${new Date().toISOString()}`;

    navigator.clipboard.writeText(text).then(() => {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2500);
    });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallbackRender) {
        return this.props.fallbackRender({
          error: this.state.error,
          resetError: this.handleReset
        });
      }

      return (
        <div
          id="pharmpulse-error-recovery-screen"
          className="min-h-screen min-h-[100dvh] w-full flex items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-4 sm:p-6 select-none"
          style={{ backgroundColor: '#F8FAFC' }}
        >
          <div className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header banner */}
            <div className="p-6 text-center border-b border-slate-100 dark:border-slate-700/60 bg-gradient-to-b from-amber-500/5 to-transparent">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-3.5 border border-amber-500/20 shadow-xs">
                <ShieldAlert className="w-7 h-7" />
              </div>

              <div className="flex items-center justify-center gap-1.5 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  Workspace Safety Recovery
                </span>
              </div>

              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Something interrupted your session
              </h2>

              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 max-w-sm mx-auto leading-relaxed">
                PharmPulse caught an unexpected rendering error. Your pharmacy inventory, transactions, and patient records remain protected in storage.
              </p>
            </div>

            {/* Content & Action buttons */}
            <div className="p-5 sm:p-6 space-y-4">
              {/* Primary Actions Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  id="error-boundary-refresh-btn"
                  onClick={this.handleReload}
                  className="w-full py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-98 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-teal-600/20 transition-all cursor-pointer min-h-[46px]"
                >
                  <RefreshCw className="w-4 h-4 animate-spin" style={{ animationDuration: '3s' }} />
                  <span>Refresh App</span>
                </button>

                <button
                  type="button"
                  id="error-boundary-retry-btn"
                  onClick={this.handleReset}
                  className="w-full py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 active:scale-98 text-slate-800 dark:text-slate-100 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-600 transition-all cursor-pointer min-h-[46px]"
                >
                  <RotateCcw className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                  <span>Try Recovering View</span>
                </button>
              </div>

              {/* Hard Reset / Safe Mode link */}
              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={this.handleHardReset}
                  className="text-[11px] font-semibold text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors underline cursor-pointer"
                >
                  Reset Session & Return to Login
                </button>
              </div>

              {/* Collapsible Error Diagnostics Details */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60">
                <button
                  type="button"
                  onClick={() => this.setState(prev => ({ showDetails: !prev.showDetails }))}
                  className="w-full flex items-center justify-between text-[11px] font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 py-1 cursor-pointer transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    Diagnostic Details
                  </span>
                  {this.state.showDetails ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>

                {this.state.showDetails && (
                  <div className="mt-2 p-3 bg-slate-900 rounded-xl text-slate-200 text-[11px] font-mono overflow-x-auto space-y-2 border border-slate-800">
                    <div className="flex items-center justify-between text-slate-400 text-[10px] pb-1 border-b border-slate-800">
                      <span>Error Stack Trace</span>
                      <button
                        type="button"
                        onClick={this.handleCopyDetails}
                        className="flex items-center gap-1 text-teal-400 hover:text-teal-300 cursor-pointer"
                      >
                        {this.state.copied ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400 font-sans">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span className="font-sans">Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-rose-400 font-bold whitespace-pre-wrap">
                      {this.state.error?.name}: {this.state.error?.message}
                    </p>
                    {this.state.error?.stack && (
                      <p className="text-slate-400 text-[10px] whitespace-pre-wrap max-h-32 overflow-y-auto leading-relaxed">
                        {this.state.error.stack}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
