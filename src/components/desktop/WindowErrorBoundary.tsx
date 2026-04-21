/**
 * Window Error Boundary — wraps each window's content.
 * Prevents one broken app from killing the entire desktop.
 */

import { Component, type ReactNode, type ErrorInfo } from 'react'

interface Props {
  children: ReactNode
  onRetry?: () => void
  onClose?: () => void
}

interface State {
  hasError: boolean
  error: Error | null
}

export class WindowErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[WindowErrorBoundary]', error, info.componentStack)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
    this.props.onRetry?.()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-6 gap-4">
          <div className="text-xai-error text-2xl" aria-hidden="true">⚠</div>
          <p className="font-mono text-xs uppercase tracking-wider text-xai-error">
            Something went wrong
          </p>
          <p className="text-xai-text-4 text-xs max-w-xs text-center leading-relaxed">
            {this.state.error?.message ?? 'An unexpected error occurred.'}
          </p>
          <div className="flex gap-2 mt-2">
            <button
              onClick={this.handleRetry}
              className="xai-btn xai-btn-ghost text-[0.625rem] py-1.5 px-3"
            >
              Retry
            </button>
            {this.props.onClose && (
              <button
                onClick={this.props.onClose}
                className="xai-btn xai-btn-ghost text-[0.625rem] py-1.5 px-3"
              >
                Close
              </button>
            )}
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
