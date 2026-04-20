import type { ReactNode } from 'react'

interface WizardModalProps {
  isOpen: boolean
  onClose?: () => void
  children: ReactNode
}

export function WizardModal({ isOpen, onClose, children }: WizardModalProps) {
  if (!isOpen) return null

  return (
    <div className="wizard-overlay">
      {/* Backdrop */}
      <div className="wizard-backdrop" onClick={onClose} />

      {/* Modal container */}
      <div className="wizard-container">
        {/* Close button (only shown if onClose is provided) */}
        {onClose && (
          <button
            onClick={onClose}
            className="wizard-close"
            aria-label="Close"
          >
            ✕
          </button>
        )}

        {/* Scrollable content area */}
        <div className="wizard-content">
          {children}
        </div>
      </div>
    </div>
  )
}
