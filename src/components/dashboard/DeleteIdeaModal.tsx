'use client'

import { useState, useRef, useEffect } from 'react'
import Modal from '@/components/ui/Modal'
import { useToast } from '@/contexts/ToastContext'

interface DeleteIdeaModalProps {
  isOpen: boolean
  onClose: () => void
  ideaId: string
  ideaTitle: string
  onDeleteSuccess: () => void
}

export default function DeleteIdeaModal({
  isOpen,
  onClose,
  ideaId,
  ideaTitle,
  onDeleteSuccess
}: DeleteIdeaModalProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const { addToast } = useToast()
  const cancelButtonRef = useRef<HTMLButtonElement>(null)

  // Auto-focus Cancel button when modal opens (reduces accidental confirmations)
  useEffect(() => {
    if (isOpen && cancelButtonRef.current) {
      // Small delay to ensure modal is fully rendered
      const timer = setTimeout(() => {
        cancelButtonRef.current?.focus()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  const handleDelete = async () => {
    if (isDeleting) return

    setIsDeleting(true)

    try {
      // Get auth token
      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        addToast('Please sign in to delete ideas', 'error')
        setIsDeleting(false)
        onClose()
        return
      }

      const response = await fetch(`/api/ideas/${ideaId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to delete idea')
      }

      addToast(`"${ideaTitle}" deleted successfully`, 'success')
      onClose()
      onDeleteSuccess()
    } catch (error) {
      console.error('Error deleting idea:', error)
      addToast(
        error instanceof Error ? error.message : 'Failed to delete idea. Please try again.',
        'error'
      )
      setIsDeleting(false)
    }
  }

  const handleCancel = () => {
    if (isDeleting) return
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleCancel} maxWidthClassName="max-w-md">
      <div className="p-6 sm:p-8">
        {/* Header */}
        <div className="flex items-start gap-4 mb-6">
          <div className="flex-shrink-0 mt-0.5">
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
              <svg 
                className="w-6 h-6 text-red-400" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth="2" 
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" 
                />
              </svg>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl sm:text-2xl font-semibold text-[var(--color-text)] mb-2">
              Delete Idea
            </h2>
            <p className="text-sm sm:text-base text-[var(--color-text-muted)] leading-relaxed">
              Are you sure you want to delete <span className="font-medium text-[var(--color-text)]">&ldquo;{ideaTitle}&rdquo;</span>?
            </p>
          </div>
        </div>

        {/* Warning Message */}
        <div className="mb-8 p-4 rounded-lg border border-amber-500/30 bg-gradient-to-r from-amber-900/20 via-amber-800/10 to-transparent">
          <div className="flex items-start gap-3">
            <svg 
              className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth="2" 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" 
              />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-amber-200/90 leading-relaxed">
                Once deleted, this idea and its analysis can&apos;t be recovered.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-5">
          <button
            ref={cancelButtonRef}
            onClick={handleCancel}
            disabled={isDeleting}
            className="px-4 py-2.5 sm:px-5 sm:py-2.5 text-sm sm:text-base font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors rounded-lg hover:bg-[var(--color-muted)] disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] sm:min-h-0 touch-manipulation focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 focus:ring-offset-[var(--color-background)]"
            aria-label="Cancel deletion"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex items-center justify-center gap-2 px-4 py-2.5 sm:px-5 sm:py-2.5 text-sm sm:text-base font-semibold text-red-400 hover:text-red-300 transition-colors rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 hover:border-red-500/50 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] sm:min-h-0 touch-manipulation"
            aria-label="Yes, delete idea"
          >
            {isDeleting ? (
              <>
                <svg 
                  className="w-5 h-5 animate-spin" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth="2" 
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                  />
                </svg>
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <svg 
                  className="w-5 h-5" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth="2" 
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" 
                  />
                </svg>
                <span>Yes, delete idea</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  )
}

