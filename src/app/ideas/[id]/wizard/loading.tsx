export default function WizardLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[var(--color-bg)] to-[var(--color-surface)] flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-[var(--color-primary-500)]/30 border-t-[var(--color-primary-500)] rounded-full animate-spin mx-auto mb-4" />
        <p className="text-[var(--color-text-muted)]">Loading wizard...</p>
      </div>
    </div>
  )
}

