'use client'

import { usePathname, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'

interface StageHeaderProps {
  ideaTitle?: string
}

// Get stage name from pathname
function getStageName(pathname: string): string {
  if (!pathname.includes('/stage/')) return '💡 Risk Analysis'
  const stagePath = pathname.split('/stage/')[1]?.split('/')[0]
  const stageMap: Record<string, string> = {
    'risk-analysis': '💡 Risk Analysis',
    'find-customers': '🎯 Find Customers',
    'test-demand': '🧪 Test Demand',
    'mvp-plan': '🛠️ MVP Plan',
    'go-to-market': '🚀 Go-to-Market',
    'growth-playbook': '📈 Growth Playbook',
    'measure-pmf': '📊 Measure PMF'
  }
  return stageMap[stagePath] || '💡 Risk Analysis'
}

export default function StageHeader({ ideaTitle }: StageHeaderProps) {
  const pathname = usePathname()
  const router = useRouter()
  const stageName = getStageName(pathname)
  
  // Truncate idea title for mobile
  const displayTitle = ideaTitle || 'Untitled Idea'
  const truncatedTitle = displayTitle.length > 40 
    ? `${displayTitle.substring(0, 40)}...` 
    : displayTitle

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mb-4 sm:mb-5"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        {/* Left side: Back button + Idea Title */}
        <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-neutral-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-neutral-700/50 flex-shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Back to dashboard"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          {/* Idea Title */}
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-white sm:hidden truncate">
              {truncatedTitle}
            </h1>
            <h1 className="hidden sm:block text-lg sm:text-xl lg:text-2xl font-bold text-white truncate">
              {displayTitle}
            </h1>
          </div>
        </div>

        {/* Right side: Stage Name */}
        <div className="flex-shrink-0 self-start sm:self-auto">
          <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-neutral-300 whitespace-nowrap">
            {stageName}
          </h2>
        </div>
      </div>
    </motion.div>
  )
}

