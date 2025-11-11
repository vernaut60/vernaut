'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import LoadingState from '../../wizard/_components/LoadingState'
import IdealCustomerProfile from '../../_components/find-customers/IdealCustomerProfile'
import { idealCustomerProfileMockData } from './mockData'

interface ApiIdeaResponse {
  success: boolean
  idea: {
    id: string
    status: string
    idea_text: string
    title?: string
    updated_at?: string
    created_at?: string
  }
  message?: string
}

export default function Stage2Page() {
  const params = useParams()
  const router = useRouter()
  const { session } = useAuth()
  const ideaId = params.id as string
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ideaData, setIdeaData] = useState<ApiIdeaResponse['idea'] | null>(null)

  // Fetch idea data from API
  const fetchIdeaData = useCallback(async () => {
    if (!session?.access_token) {
      setError('Authentication required')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/ideas/${ideaId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      const data: ApiIdeaResponse = await response.json()

      if (!response.ok || !data.success || !data.idea) {
        throw new Error(data.message || 'Failed to fetch idea data')
      }

      setIdeaData(data.idea)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred'
      setError(errorMessage)
      console.error('[Stage2Page] Failed to fetch idea:', err)
    } finally {
      setLoading(false)
    }
  }, [ideaId, session?.access_token])

  // Fetch data on mount
  useEffect(() => {
    fetchIdeaData()
  }, [fetchIdeaData])

  // Show loading state
  if (loading) {
    return (
      <LoadingState 
        message="Loading Stage 2..."
        subMessage="Fetching idea details"
      />
    )
  }

  // Show error state
  if (error || !ideaData) {
    return (
      <div className="text-center py-12">
        <div className="text-red-400 text-4xl mb-4">⚠️</div>
        <h2 className="text-2xl font-bold text-white mb-2">Failed to Load</h2>
        <p className="text-neutral-400 mb-6">{error || 'Unable to fetch idea data'}</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 rounded-lg transition-colors"
          >
            Go to Dashboard
          </button>
          <button
            onClick={fetchIdeaData}
            className="px-4 py-2 bg-[var(--color-primary-500)] hover:bg-[var(--color-primary-600)] rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <IdealCustomerProfile {...idealCustomerProfileMockData} />
    </div>
  )
}
