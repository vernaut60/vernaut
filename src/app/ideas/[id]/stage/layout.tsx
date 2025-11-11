'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { STAGE_CONFIG, calculateProgress } from '@/lib/stages'
import StageNavigation from '../_components/StageNavigation'
import StageHeader from '../_components/StageHeader'

export default function StageLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const params = useParams()
  const ideaId = params.id as string
  const { session } = useAuth()
  const [ideaTitle, setIdeaTitle] = useState<string | null>(null)

  // Prepare stages data for navigation
  const allStages = [...STAGE_CONFIG] as typeof STAGE_CONFIG[number][]
  const completedStageIds = [1, 2] // TODO: Get from API in the future
  const progress = calculateProgress(completedStageIds)

  // Fetch idea title
  const fetchIdeaTitle = useCallback(async () => {
    if (!session?.access_token) return

    try {
      const response = await fetch(`/api/ideas/${ideaId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.idea) {
          setIdeaTitle(data.idea.title || data.idea.idea_text?.substring(0, 50) || null)
        }
      }
    } catch (err) {
      // Silently fail - title is optional
      console.error('[StageLayout] Failed to fetch idea title:', err)
    }
  }, [ideaId, session?.access_token])

  useEffect(() => {
    fetchIdeaTitle()
  }, [fetchIdeaTitle])

  return (
    <div className="w-full text-white relative min-h-screen">
      {/* Decorative background elements */}
      <div className="fixed inset-0 w-full h-full z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-900/10 via-transparent to-transparent"></div>
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(rgba(99,102,241,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(99,102,241,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
          }}
        ></div>
        <div className="absolute inset-0">
          <div 
            className="absolute w-1 h-1 sm:w-1.5 sm:h-1.5 bg-blue-400/60 rounded-full animate-[ideaSpark_6s_ease-out_infinite]"
            style={{ left: '15%', top: '15%', animationDelay: '0s' }}
          ></div>
          <div 
            className="absolute w-1.5 h-1.5 sm:w-2 sm:h-2 bg-purple-400/60 rounded-full animate-[ideaSpark_8s_ease-out_infinite]"
            style={{ left: '85%', top: '20%', animationDelay: '2s' }}
          ></div>
          <div 
            className="absolute w-1 h-1 sm:w-1.5 sm:h-1.5 bg-cyan-400/60 rounded-full animate-[ideaSpark_7s_ease-out_infinite]"
            style={{ left: '60%', top: '10%', animationDelay: '4s' }}
          ></div>
        </div>
      </div>

      {/* Content container */}
      <div className="relative z-10 mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 pt-20 pb-6 sm:pt-24 sm:pb-8 lg:pt-28 lg:pb-12">
        {/* Stage Navigation - Persistent across route changes */}
        <StageNavigation 
          ideaId={ideaId} 
          stages={allStages} 
          progress={progress} 
        />

        {/* Stage Header - Idea Title and Stage Name */}
        <StageHeader ideaTitle={ideaTitle || undefined} />

        {/* Page content - Changes on route navigation */}
        {children}
      </div>
    </div>
  )
}

