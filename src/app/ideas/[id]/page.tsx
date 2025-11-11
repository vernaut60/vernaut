'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function IdeaDetailPage() {
  const params = useParams()
  const router = useRouter()
  const ideaId = params.id as string

  useEffect(() => {
    // Redirect to Stage 1 (default stage)
    router.replace(`/ideas/${ideaId}/stage/risk-analysis`)
  }, [ideaId, router])

  return null
}
