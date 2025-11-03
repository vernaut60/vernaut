'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface RefinementPromptModalProps {
  isOpen: boolean
  onAccept: () => void
  onReject: () => void
  refinedText: string
  originalText: string
}

export default function RefinementPromptModal({
  isOpen,
  onAccept,
  onReject,
  refinedText,
  originalText
}: RefinementPromptModalProps) {
  const [isProcessing, setIsProcessing] = useState(false)

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsProcessing(false)
    }
  }, [isOpen])

  const handleAccept = async () => {
    if (isProcessing) return
    
    try {
      setIsProcessing(true)
      await onAccept()
    } catch (error) {
      console.error('Error accepting refinement:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReject = async () => {
    if (isProcessing) return
    
    try {
      setIsProcessing(true)
      await onReject()
    } catch (error) {
      console.error('Error rejecting refinement:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  // "Don't ask again" functionality removed per requirements

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto"
          >
            {/* Modal glow effect */}
            <div className="absolute inset-0 rounded-3xl opacity-60" 
              style={{ boxShadow: '0 0 120px rgba(99,102,241,0.45)' }} 
              aria-hidden="true"
            />
            
            <div className="relative modal-panel">
              {/* Header */}
              <div className="relative p-6 pb-4 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                      <span className="text-white text-lg">✨</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-white">AI Suggestion</h3>
                      <p className="text-sm text-neutral-400">Found a clearer version of your idea</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="relative p-6 overflow-hidden">
                <div className="space-y-4">
                {/* Original vs Refined Comparison */}
                <div className="space-y-3">
                  {/* Original */}
                  <div className="bg-neutral-900/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs text-neutral-400 font-medium">Your version:</span>
                    </div>
                    <p className="text-sm text-neutral-300 leading-relaxed break-words overflow-wrap-anywhere">
                      {originalText}
                    </p>
                  </div>

                  {/* Refined */}
                  <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs text-blue-400 font-medium">✨ AI Refined:</span>
                    </div>
                    <p className="text-sm text-white leading-relaxed break-words overflow-wrap-anywhere">
                      {refinedText}
                    </p>
                  </div>
                </div>

                {/* Explanation */}
                <div className="bg-neutral-900/20 rounded-lg p-4">
                  <p className="text-sm text-neutral-300 leading-relaxed">
                    The refined version is clearer and helps Vernaut&apos;s AI generate more accurate insights. 
                    Would you like to use it instead?
                  </p>
                </div>

                {/* Preference checkbox removed */}
              </div>

              {/* Action buttons */}
              <div className="relative p-6 pt-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleReject}
                    disabled={isProcessing}
                    className="flex-1 btn-ghost disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-neutral-400/30 border-t-neutral-400 rounded-full animate-spin" />
                        <span>Processing...</span>
                      </div>
                    ) : (
                      'No, continue with mine'
                    )}
                  </button>
                  
                  <button
                    onClick={handleAccept}
                    disabled={isProcessing}
                    className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Applying...</span>
                      </div>
                    ) : (
                      'Use refined version'
                    )}
                  </button>
                </div>
              </div>

              {/* Preference save removed */}
            </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
