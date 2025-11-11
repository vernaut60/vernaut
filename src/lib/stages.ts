/**
 * Stage configuration and constants
 * Shared across the application for consistency
 */

export interface Stage {
  id: number
  title: string
  icon: string
  description?: string
  teaser?: string
  lockedContent?: string
  estimatedTime?: string
  value?: string
}

/**
 * Complete stage configuration for all 7 stages
 */
export const STAGE_CONFIG: readonly Stage[] = [
  {
    id: 1,
    title: "Idea Validation",
    icon: "🧩",
    description: "Validate your startup idea with AI-powered analysis",
  },
  {
    id: 2,
    title: "Solution & Launch Priorities",
    icon: "🧩",
    description: "MVP definition, what to launch first, and phased approach",
    teaser: "Product roadmap with feature prioritization, development timeline, and MVP definition...",
    lockedContent: "Complete product roadmap with feature prioritization using RICE scoring, development timeline, MVP definition, user stories, and technical architecture. Includes design system and UX guidelines.",
    estimatedTime: "2-3 weeks",
    value: "$2,000"
  },
  {
    id: 3,
    title: "Financial Projections",
    icon: "💰",
    description: "Revenue models, pricing strategies, and financial forecasting",
    teaser: "Detailed financial projections including revenue models, pricing strategies, and 3-year financial forecasts...",
    lockedContent: "Complete financial modeling with multiple scenarios, break-even analysis, funding requirements, and investor-ready financial statements. Includes SaaS metrics, unit economics, and growth projections.",
    estimatedTime: "2-3 weeks",
    value: "$2,500"
  },
  {
    id: 4,
    title: "Go-to-Market Strategy",
    icon: "🎯",
    description: "Customer acquisition, marketing channels, and launch plan",
    teaser: "Comprehensive go-to-market strategy with customer acquisition funnels, marketing channel analysis...",
    lockedContent: "Detailed GTM strategy including customer personas, acquisition funnels, marketing channel analysis, content strategy, PR plan, and launch sequence. Includes competitor analysis and positioning strategy.",
    estimatedTime: "3-4 weeks",
    value: "$3,000"
  },
  {
    id: 5,
    title: "Team & Resources",
    icon: "👥",
    description: "Key roles, hiring, and team structure",
    teaser: "Team structure and hiring plan with key roles, equity distribution, and recruitment strategy...",
    lockedContent: "Organizational structure, key hire requirements, equity distribution plan, recruitment strategy, and compensation benchmarks. Includes founder agreements and vesting schedules.",
    estimatedTime: "1-2 weeks",
    value: "$1,500"
  },
  {
    id: 6,
    title: "Capital Requirements",
    icon: "💎",
    description: "Funding needs, capital sources, and runway",
    teaser: "Funding strategy with investor targeting, pitch deck structure, and funding timeline...",
    lockedContent: "Complete funding strategy including investor targeting, pitch deck templates, valuation analysis, term sheet negotiation, and funding timeline. Includes demo day preparation and investor relations.",
    estimatedTime: "3-4 weeks",
    value: "$4,000"
  },
  {
    id: 7,
    title: "Execution Plan",
    icon: "🚀",
    description: "90-day action plan, milestones, and success metrics",
    teaser: "90-day execution plan with specific milestones, success metrics, and accountability framework...",
    lockedContent: "Detailed 90-day execution plan with specific milestones, success metrics, accountability framework, and weekly check-ins. Includes risk mitigation strategies and contingency plans.",
    estimatedTime: "1-2 weeks",
    value: "$1,000"
  }
] as const

/**
 * Total number of stages
 */
export const TOTAL_STAGES = STAGE_CONFIG.length

/**
 * Get stage by ID
 */
export function getStageById(id: number): Stage | undefined {
  return STAGE_CONFIG.find(stage => stage.id === id)
}

/**
 * Get stage icon by ID (fallback to default)
 */
export function getStageIcon(id: number): string {
  const stage = getStageById(id)
  return stage?.icon || '📋'
}

/**
 * Get locked stages (stages that are not yet accessible)
 */
export function getLockedStages(completedStageIds: number[]): Stage[] {
  return STAGE_CONFIG.filter(stage => !completedStageIds.includes(stage.id))
}

/**
 * Calculate progress percentage
 */
export function calculateProgress(completedStageIds: number[]): number {
  return Math.round((completedStageIds.length / TOTAL_STAGES) * 100)
}


