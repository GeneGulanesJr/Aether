import { type ReactNode, useEffect, useRef, useCallback } from 'react'

type WizardModalProps = {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
}

export function WizardModal({ isOpen, onClose, children }: WizardModalProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  // Focus trap: keep Tab cycling within modal
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key !== 'Tab' || !containerRef.current) return

      const focusable = containerRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    },
    [onClose]
  )

  // Manage focus and body scroll lock
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement

      // Lock body scroll
      const scrollY = window.scrollY
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.left = '0'
      document.body.style.right = '0'

      // Focus the first focusable element inside the modal
      requestAnimationFrame(() => {
        if (!containerRef.current) return
        const firstFocusable = containerRef.current.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        firstFocusable?.focus()
      })

      document.addEventListener('keydown', handleKeyDown)
    } else {
      document.removeEventListener('keydown', handleKeyDown)

      // Restore body scroll
      const scrollY = document.body.style.top
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.left = ''
      document.body.style.right = ''
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0', 10) * -1)
      }

      // Restore focus
      previousFocusRef.current?.focus()
      previousFocusRef.current = null
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)

      // Restore body scroll in case component unmounts while open
      const scrollY = document.body.style.top
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.left = ''
      document.body.style.right = ''
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0', 10) * -1)
      }
    }
  }, [isOpen, handleKeyDown])

  if (!isOpen) return null

  return (
    <div className="wizard-overlay" role="presentation">
      {/* Backdrop */}
      <div
        className="wizard-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal container */}
      <div
        ref={containerRef}
        className="wizard-container"
        role="dialog"
        aria-modal="true"
        aria-label="PC Build Wizard"
      >
        {/* Close button */}
        {onClose && (
          <button
            onClick={onClose}
            className="wizard-close"
            aria-label="Close build wizard"
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
