// ═══════════════════════════════════════════════════════════════════════
// ARGUS-X — Error Boundary
// Isolates component failures so one crash doesn't kill the entire UI.
// Wrap high-risk panels (canvas, WebGL, complex state) individually.
// ═══════════════════════════════════════════════════════════════════════

import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import { fonts } from '../theme';

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
    // Log to console — can be wired to Sentry/telemetry later
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
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            minHeight: 60,
            padding: '12px 16px',
            background: 'rgba(255,23,68,0.04)',
            border: '1px solid rgba(255,23,68,0.15)',
            borderRadius: 6,
          }}
        >
          <div
            style={{
              fontFamily: fonts.mono,
              fontSize: 9,
              color: '#ff1744',
              letterSpacing: '0.12em',
              marginBottom: 4,
            }}
          >
            ⚠ {this.props.label ? `${this.props.label} ` : ''}OFFLINE
          </div>
          <div
            style={{
              fontFamily: fonts.mono,
              fontSize: 8,
              color: '#3a5070',
            }}
          >
            Component crashed — isolated from system
          </div>
          <button
            onClick={this.handleRetry}
            style={{
              marginTop: 8,
              padding: '3px 12px',
              background: 'transparent',
              border: '1px solid #1a2845',
              borderRadius: 4,
              color: '#5a7090',
              fontFamily: fonts.mono,
              fontSize: 8,
              cursor: 'pointer',
              letterSpacing: '0.1em',
            }}
          >
            RETRY
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
