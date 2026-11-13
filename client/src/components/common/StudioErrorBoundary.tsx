import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Copy, Check } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  copied: boolean;
}

export class StudioErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      copied: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[StudioErrorBoundary]: Caught render exception:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleCopyDiagnostics = () => {
    const diagnostic = `Studio Error Diagnostic:
Error: ${this.state.error?.message}
Stack: ${this.state.error?.stack}
Component Stack: ${this.state.errorInfo?.componentStack}`;
    navigator.clipboard.writeText(diagnostic);
    this.setState({ copied: true });
    setTimeout(() => this.setState({ copied: false }), 2000);
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-screen bg-app text-text-primary flex items-center justify-center p-6 select-none">
          <div className="max-w-md w-full bg-surface border border-subtle rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-text-primary">Studio Exception Caught</h2>
                <p className="text-xs text-text-muted">An error occurred in the spatial interface</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-card border border-subtle text-xs font-mono text-red-400 break-words max-h-40 overflow-y-auto">
              {this.state.error?.message || 'Unknown runtime error'}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={this.handleReload}
                className="flex-1 py-2 px-3 bg-accent-primary hover:opacity-90 text-app font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition shadow-lg"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reload Studio</span>
              </button>

              <button
                onClick={this.handleCopyDiagnostics}
                className="py-2 px-3 bg-card hover:bg-subtle border border-subtle text-text-primary text-xs font-semibold rounded-xl flex items-center gap-1.5 transition"
                title="Copy error stack trace"
              >
                {this.state.copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-text-muted" />}
                <span>{this.state.copied ? 'Copied' : 'Diagnostics'}</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
