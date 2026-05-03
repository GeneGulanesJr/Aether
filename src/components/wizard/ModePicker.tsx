// ═════════════════════════════════════════════════════════════════════════════
// ModePicker
// ─────────────────────────────────────────────────────────────────────────────
// First step of the wizard. Lets the user choose between Guided and Custom
// build modes.
//
// NOTE: Sound effects (sound.pop()) are handled by the caller
//       (WizardStepRenderer) before dispatching chooseGuided/chooseCustom.
// ═════════════════════════════════════════════════════════════════════════════

interface ModePickerProps {
  onGuided: () => void
  onCustom: () => void
  onBack: () => void
}

export function ModePicker({ onGuided, onCustom, onBack }: ModePickerProps) {
  return (
    <div className="flex flex-col h-full min-h-0">
      <button onClick={onBack} className="xai-btn xai-btn-ghost mb-4">← BACK</button>

      <p className="font-mono text-[0.625rem] text-xai-text-4 uppercase tracking-[0.2em] mb-1">
        Step 0
      </p>
      <h2 className="xai-heading text-xai-text">
        How do you want to build?
      </h2>
      <p className="mt-1 text-xai-text-3 text-sm leading-[1.6]">
        Two ways to get to your perfect rig.
      </p>

      <div className="mt-6 flex-1 grid grid-cols-1 gap-3 sm:grid-cols-2 content-center">
        {/* Guided */}
        <button
          onClick={onGuided}
          className="xai-card-lg text-left"
          aria-label="Guided build mode — answer questions and get recommendations"
        >
          <span className="text-2xl mb-2 block" aria-hidden="true">🗺️</span>
          <p className="font-mono text-sm text-xai-text uppercase tracking-wider">
            Guided Build
          </p>
          <p className="text-xai-text-3 text-xs mt-1.5 leading-snug">
            Answer a few questions — budget, use case — then pick your platform and parts.
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5" aria-hidden="true">
            <span className="xai-tag text-[0.5625rem]">Budget Pick</span>
            <span className="xai-tag text-[0.5625rem]">AMD vs Intel</span>
            <span className="xai-tag text-[0.5625rem]">Step-by-step</span>
          </div>
        </button>

        {/* Custom */}
        <button
          onClick={onCustom}
          className="xai-card-lg text-left"
          aria-label="Custom build mode — pick your own platform and parts"
        >
          <span className="text-2xl mb-2 block" aria-hidden="true">🔧</span>
          <p className="font-mono text-sm text-xai-text uppercase tracking-wider">
            Custom Build
          </p>
          <p className="text-xai-text-3 text-xs mt-1.5 leading-snug">
            You know what you want. Pick your platform and socket,
            then select from only compatible parts.
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5" aria-hidden="true">
            <span className="xai-tag text-[0.5625rem]">AM4 / AM5</span>
            <span className="xai-tag text-[0.5625rem]">LGA 1700 / 1851</span>
            <span className="xai-tag text-[0.5625rem]">Compatibility Filter</span>
          </div>
        </button>
      </div>
    </div>
  )
}
