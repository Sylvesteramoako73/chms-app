import { Component, type ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: '2rem', fontFamily: 'monospace', background: '#0B1120', color: '#C9A84C', minHeight: '100vh' }}>
          <h1 style={{ color: '#ef4444', marginBottom: '1rem' }}>Runtime Error</h1>
          <pre style={{ whiteSpace: 'pre-wrap', color: '#F5F5F0', background: '#1a2540', padding: '1rem', borderRadius: '8px' }}>
            {this.state.error.message}
            {'\n\n'}
            {this.state.error.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
