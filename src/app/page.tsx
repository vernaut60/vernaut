'use client'

import { useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useToast } from '@/contexts/ToastContext'
import LandingPage from "../components/landing/LandingPage";

function HomeContent() {
  const searchParams = useSearchParams()
  const { addToast } = useToast()
  const hasShownToast = useRef(false)

  useEffect(() => {
    if (searchParams.get('access_denied') === 'true' && !hasShownToast.current) {
      hasShownToast.current = true
      addToast('Access denied. Please log in to continue.', 'error')
      // Clean up the URL
      window.history.replaceState({}, '', '/')
    } else if (searchParams.get('session_expired') === 'true' && !hasShownToast.current) {
      hasShownToast.current = true
      addToast('Your session has expired. Please sign in again.', 'error')
      // Clean up the URL
      window.history.replaceState({}, '', '/')
    } else if (searchParams.get('logout') === 'true') {
      // Clean up logout parameter without showing toast
      window.history.replaceState({}, '', '/')
    }
  }, [searchParams, addToast])

  return <LandingPage />;
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen w-full bg-black text-white flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
    </div>}>
      <HomeContent />
    </Suspense>
  );
}
