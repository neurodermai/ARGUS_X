// ═══════════════════════════════════════════════════════════════════════
// ARGUS-X — Error Boundary
// Isolates component failures so one crash doesn't kill the entire UI.
// Wrap high-risk panels (canvas, WebGL, complex state) individually.
// ═══════════════════════════════════════════════════════════════════════

import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';

interface Props {
  /** Label shown in the fallback UI (e.g. "Neural Threat Map") */
  label?: string;
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(
      `[ARGUS-X] ErrorBoundary caught crash${this.props.label ? ` in "${this.props.label}"` : ''}:`,
      error,
      info.componentStack,
    );
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[60px] px-4 py-3 bg-[rgba(255,23,68,0.04)] border border-[rgba(255,23,68,0.15)] rounded-md">
          <div className="font-mono text-[9px] text-argus-red tracking-[0.12em] mb-1">
            ⚠ {this.props.label ? `${this.props.label} ` : ''}OFFLINE
          </div>
          <div className="font-mono text-[8px] text-argus-muted">
            Component crashed — isolated from system
          </div>
          <button
            onClick={this.handleRetry}
            className="mt-2 py-0.5 px-3 bg-transparent border border-argus-border rounded text-[#5a7090] font-mono text-[8px] cursor-pointer tracking-[0.1em] hover:border-argus-muted transition-colors"
            aria-label="Retry loading component"
          >
            RETRY
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
