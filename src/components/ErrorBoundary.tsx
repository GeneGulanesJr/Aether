import { Component, type ReactNode, type ErrorInfo } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '2rem',
            fontFamily: "'Inter Variable', system-ui, sans-serif",
            fontFeatureSettings: "'cv01', 'ss03'",
            color: '#d0d6e0',
            backgroundColor: '#08090a',
          }}
        >
          <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#f7f8f8', fontWeight: 590 }}>
            Something went wrong
          </h1>
          <p style={{ marginBottom: '1.5rem', color: '#8a8f98' }}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              fontWeight: 510,
              backgroundColor: '#5e6ad2',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontFamily: "'Inter Variable', system-ui, sans-serif",
              fontFeatureSettings: "'cv01', 'ss03'",
            }}
          >
            Reload Page
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
