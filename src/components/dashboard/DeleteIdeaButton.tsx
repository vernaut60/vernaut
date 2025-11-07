'use client'

import { useState } from 'react'
import DeleteIdeaModal from './DeleteIdeaModal'

interface DeleteIdeaButtonProps {
  ideaId: string
  ideaTitle: string
  onDeleteSuccess: () => void
  className?: string
}

export default function DeleteIdeaButton({
  ideaId,
  ideaTitle,
  onDeleteSuccess,
  className = ''
}: DeleteIdeaButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleOpenModal = () => {
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
  }

  const handleDeleteSuccess = () => {
    onDeleteSuccess()
    setIsModalOpen(false)
  }

  return (
    <>
      <button
        onClick={handleOpenModal}
        className={`text-[var(--color-text-muted)] hover:text-red-400 transition-colors p-2 sm:p-1 rounded hover:bg-red-500/10 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center touch-manipulation ${className}`}
        aria-label={`Delete idea: ${ideaTitle}`}
        title="Delete idea"
      >
        <svg className="w-5 h-5 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>

      <DeleteIdeaModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        ideaId={ideaId}
        ideaTitle={ideaTitle}
        onDeleteSuccess={handleDeleteSuccess}
      />
    </>
  )
}

