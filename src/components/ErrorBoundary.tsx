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
        <div className="xai-error-boundary">
          <h1 className="font-mono text-2xl font-light tracking-tight">
            Something went wrong
          </h1>
          <p className="mt-4 max-w-md text-center text-sm text-xai-text-2 leading-relaxed">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="xai-btn xai-btn-primary mt-6"
          >
            RELOAD PAGE
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
