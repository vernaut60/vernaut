'use client'

import React from 'react'
import { useParams, useRouter } from 'next/navigation'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { motion } from 'framer-motion'

export default function IdeaDetailPage() {
  const params = useParams()
  const router = useRouter()
  const ideaId = params.id

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900">
        {/* Header */}
        <div className="border-b border-neutral-700/50 bg-neutral-800/30 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.back()}
                  className="text-neutral-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-neutral-700/50"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h1 className="text-2xl font-bold text-white">Idea Analysis</h1>
              </div>
              <div className="text-sm text-neutral-400">
                ID: {ideaId}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-neutral-800/30 border border-neutral-600/30 rounded-lg p-8"
          >
            <div className="text-center">
              <div className="text-6xl mb-4">🚧</div>
              <h2 className="text-3xl font-bold text-white mb-4">
                Coming Soon
              </h2>
              <p className="text-neutral-300 mb-6 max-w-md mx-auto">
                Full idea analysis with detailed risk assessment, competitor insights, and actionable recommendations will be available here.
              </p>
              
              <div className="grid gap-4 md:grid-cols-3 mb-8">
                <div className="bg-neutral-700/30 rounded-lg p-4">
                  <div className="text-2xl mb-2">📊</div>
                  <h3 className="text-white font-semibold mb-2">Risk Analysis</h3>
                  <p className="text-neutral-400 text-sm">Detailed risk breakdown with mitigation strategies</p>
                </div>
                <div className="bg-neutral-700/30 rounded-lg p-4">
                  <div className="text-2xl mb-2">⚔️</div>
                  <h3 className="text-white font-semibold mb-2">Competitor Insights</h3>
                  <p className="text-neutral-400 text-sm">Market positioning and competitive landscape</p>
                </div>
                <div className="bg-neutral-700/30 rounded-lg p-4">
                  <div className="text-2xl mb-2">🎯</div>
                  <h3 className="text-white font-semibold mb-2">Action Plan</h3>
                  <p className="text-neutral-400 text-sm">90-day roadmap with milestones and tasks</p>
                </div>
              </div>

              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => router.back()}
                  className="px-6 py-3 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg transition-colors"
                >
                  ← Back to Dashboard
                </button>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg transition-all"
                >
                  Go to Dashboard
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
