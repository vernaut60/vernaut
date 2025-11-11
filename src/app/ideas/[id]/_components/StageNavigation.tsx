'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { type Stage } from '@/lib/stages'

interface StageNavigationProps {
  ideaId: string
  stages: Stage[]
  progress: number
}

export default function StageNavigation({ ideaId, stages }: StageNavigationProps) {
  const pathname = usePathname()
  
  // Determine current stage from route
  // /ideas/[id] or /ideas/[id]/stage/risk-analysis → Stage 1
  // /ideas/[id]/stage/find-customers → Stage 2
  const getCurrentStage = (): number => {
    if (!pathname.includes('/stage/')) return 1
    const stagePath = pathname.split('/stage/')[1]?.split('/')[0]
    if (stagePath === 'risk-analysis') return 1
    if (stagePath === 'find-customers') return 2
    if (stagePath === 'test-demand') return 3
    if (stagePath === 'mvp-plan') return 4
    if (stagePath === 'go-to-market') return 5
    if (stagePath === 'growth-playbook') return 6
    if (stagePath === 'measure-pmf') return 7
    return 1 // default
  }
  const currentStage = getCurrentStage()

  // Stage 1 and 2 are completed, others are locked
  // TODO: This should come from API/props in the future
  const completedStages = [1, 2]

  // Stage labels with icons
  const stageLabels: Record<number, string> = {
    1: '💡 Risk Analysis',
    2: '🎯 Find Customers',
    3: '🧪 Test Demand',
    4: '🛠️ MVP Plan',
    5: '🚀 Go-to-Market',
    6: '📈 Growth Playbook',
    7: '📊 Measure PMF'
  }

  // Get route for a stage
  const getStageRoute = (ideaId: string, stageId: number): string => {
    const stageRoutes: Record<number, string> = {
      1: 'risk-analysis',
      2: 'find-customers',
      3: 'test-demand',
      4: 'mvp-plan',
      5: 'go-to-market',
      6: 'growth-playbook',
      7: 'measure-pmf'
    }
    const route = stageRoutes[stageId]
    return route ? `/ideas/${ideaId}/stage/${route}` : `/ideas/${ideaId}`
  }

  return (
    <div className="mb-6 sm:mb-8 pt-2 pb-2 sm:pb-1 relative z-20">
      {/* Stage Pills */}
      <div className="flex items-center gap-3 sm:gap-3 overflow-x-auto overflow-y-visible py-3 sm:py-3 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] relative z-20">
        {stages.map((stage, index) => {
          const stageId = stage.id
          const isActive = stageId === currentStage
          const isCompleted = completedStages.includes(stageId)
          const isLocked = !isCompleted && stageId > 1

          return (
            <motion.div
              key={stageId}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="flex-shrink-0 overflow-visible relative z-20"
            >
              {isLocked ? (
                // Locked stage - non-clickable, shows modal on click
                <motion.button
                  onClick={() => {
                    // TODO: Show modal/banner "This stage unlocks with full system"
                    console.log('Locked stage clicked')
                  }}
                  className="px-4 py-3 sm:px-4 sm:py-3 rounded-xl text-sm sm:text-sm font-semibold bg-gradient-to-br from-neutral-800/60 to-neutral-900/60 text-neutral-400 border border-neutral-700/40 cursor-not-allowed hover:bg-gradient-to-br hover:from-neutral-800/80 hover:to-neutral-900/80 hover:border-neutral-700/60 hover:scale-[1.02] hover:shadow-lg min-h-[48px] sm:min-h-[44px] touch-manipulation backdrop-blur-sm transition-all duration-150 flex items-center justify-center whitespace-nowrap relative z-20"
                  disabled={isLocked}
                  title="Unlock to access"
                >
                  <span className="flex items-center gap-1.5 sm:gap-2 relative justify-center">
                    <motion.span
                      animate={{ opacity: [0.6, 0.9, 0.6] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                      className="text-xs sm:text-sm flex-shrink-0"
                      whileTap={{ scale: 1.15 }}
                    >
                      🔒
                    </motion.span>
                    <span className="text-xs sm:text-sm tracking-wide">
                      {stageLabels[stageId] || `Stage ${stageId}`}
                    </span>
                  </span>
                </motion.button>
              ) : (
                // Active or completed stage - clickable Link
                <Link
                  href={getStageRoute(ideaId, stageId)}
                  className={`
                    inline-block px-4 py-3 sm:px-4 sm:py-3 rounded-xl text-sm sm:text-sm font-semibold
                    min-h-[48px] sm:min-h-[44px] touch-manipulation
                    transition-all duration-150
                    tracking-wide
                    flex items-center justify-center
                    whitespace-nowrap
                    relative z-20
                    ${isActive 
                      ? 'bg-gradient-to-br from-[#4361EE] to-[#5B6DFF] text-white border border-[#4361EE]/50 shadow-lg shadow-[#4361EE]/20 hover:scale-[1.02] hover:shadow-xl hover:shadow-[#4361EE]/30 hover:from-[#4D6AFF] hover:to-[#6B7AFF]' 
                      : isCompleted
                      ? 'bg-gradient-to-br from-neutral-800/60 to-neutral-900/60 text-neutral-200 border border-neutral-700/40 hover:bg-gradient-to-br hover:from-neutral-800/80 hover:to-neutral-900/80 hover:border-neutral-600/50 hover:scale-[1.02] hover:shadow-lg hover:shadow-black/20 backdrop-blur-sm'
                      : 'bg-gradient-to-br from-neutral-800/60 to-neutral-900/60 text-neutral-400 border border-neutral-700/40 hover:bg-gradient-to-br hover:from-neutral-800/80 hover:to-neutral-900/80 hover:border-neutral-600/50 hover:scale-[1.02] hover:shadow-lg hover:shadow-black/20 backdrop-blur-sm'
                    }
                  `}
                >
                    <span className="flex items-center gap-1.5 sm:gap-2 relative justify-center pointer-events-none">
                      {isCompleted && !isActive && (
                        <motion.span
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                          className="text-xs sm:text-base flex-shrink-0"
                        >
                          ✓
                        </motion.span>
                      )}
                      <span className="text-xs sm:text-sm tracking-wide">
                        {stageLabels[stageId] || `Stage ${stageId}`}
                      </span>
                    </span>
                  </Link>
              )}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

