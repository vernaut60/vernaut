'use client'

import { motion } from 'framer-motion'

interface Stage {
  id: number
  title: string
  description: string
  teaser: string
  lockedContent: string
  estimatedTime: string
  value: string
}

interface LockedStagesProps {
  stages: Stage[]
  unlockPrice: string
}

// Helper functions for enhanced stage content
const getStageDescription = (stageId: number): string => {
  const descriptions: { [key: number]: string } = {
    2: "Get personalized revenue models, pricing strategy, and financial forecasts for your wine grape AI platform.",
    3: "Get a personalized customer acquisition plan for reaching organic wine growers in California.",
    4: "Get a prioritized feature roadmap and MVP definition for your satellite imagery + disease prediction platform.",
    5: "Get a comprehensive team building and equity distribution plan for your wine grape technology startup.",
    6: "Get an investor-ready pitch deck and funding strategy customized to your market and stage.",
    7: "Get a detailed 90-day launch plan with growth metrics and execution timeline for your AI platform."
  }
  return descriptions[stageId] || "Detailed analysis and execution plan for this stage."
}

const getStageOutcome = (stageId: number): string => {
  const outcomes: { [key: number]: string } = {
    2: "Know exactly how much runway you need, when you'll break even, and if your pricing is optimal.",
    3: "Know exactly where to find your first 100 customers and how to reach them efficiently.",
    4: "Build the right features first and avoid 6+ months of wasted development time.",
    5: "Avoid founder conflicts and build a team that can scale with your vision.",
    6: "Get meetings with the right investors and secure funding for your growth stage.",
    7: "Execute your launch with confidence and hit your first revenue milestones."
  }
  return outcomes[stageId] || "Get clear direction and avoid costly mistakes."
}

const getStageBadge = (stageId: number): string => {
  const badges: { [key: number]: string } = {
    2: "💰 High Value",
    3: "🎯 Most Popular", 
    4: "⚡ Quick Win",
    5: "👥 Essential",
    6: "💎 Premium",
    7: "🚀 Action-Ready"
  }
  return badges[stageId] || "High Value"
}

const getStageFeatures = (stageId: number): string[] => {
  const features: { [key: number]: string[] } = {
    2: [
      "3-year revenue projections for YOUR market",
      "Pricing strategy analysis vs competitors",
      "Break-even timeline based on YOUR $50K budget",
      "CAC/LTV calculations for YOUR customer segment",
      "5 growth scenarios (pessimistic to aggressive)"
    ],
    3: [
      "15+ acquisition channels ranked by effectiveness",
      "Launch timeline (Months 1-6) with milestones",
      "Marketing budget allocation strategy",
      "Partnership opportunities (wine associations)",
      "First 10 customers acquisition roadmap"
    ],
    4: [
      "MVP feature prioritization matrix",
      "12-month development timeline",
      "Technical stack recommendations",
      "Integration requirements (weather APIs)",
      "Mobile vs web platform priorities"
    ],
    5: [
      "Key hire timeline (CTO, Sales, Marketing)",
      "Equity distribution recommendations",
      "Advisory board composition",
      "Remote vs local team strategy",
      "Compensation benchmarking"
    ],
    6: [
      "Investor-ready pitch deck template",
      "Target investor list (AgTech VCs)",
      "Funding timeline and milestones",
      "Valuation analysis and projections",
      "Due diligence preparation checklist"
    ],
    7: [
      "90-day launch execution plan",
      "Growth metrics and KPIs dashboard",
      "Customer onboarding process",
      "Revenue optimization strategies",
      "Scaling timeline and resource planning"
    ]
  }
  return features[stageId] || ["Detailed analysis and execution plan"]
}

const getPersonalizationCallouts = (stageId: number): string[] => {
  const callouts: { [key: number]: string[] } = {
    2: [
      "Uses YOUR pricing ($99-199/vineyard) → Revenue projections match your actual business model",
      "Targets YOUR market (California) → Competition analysis reflects regional dynamics",
      "Considers YOUR budget ($50K) → Break-even timeline is realistic for your constraints",
      "Reflects YOUR stage (pre-launch) → Milestones aligned with validation phase"
    ],
    3: [
      "Targets YOUR customer (organic wine growers, 10-200 acres) → Channel recommendations match farm size",
      "Uses YOUR location (California) → Leverages local networks, events, and associations",
      "Considers YOUR budget ($50K) → Affordable channel mix with proven ROI",
      "Reflects YOUR advantage (wine-specific) → Positioning vs generic farm tools"
    ],
    4: [
      "Reflects YOUR solution (AI disease prediction + irrigation) → Features match your unique value prop",
      "Considers YOUR skills (strong tech background) → Faster development timeline assumptions",
      "Targets YOUR users (wine farmers) → Mobile-first design for vineyard use cases",
      "Aligns with YOUR validation approach → Build for feedback, not perfection"
    ],
    5: [
      "Scaling plan for wine tech startup → Team structure matches industry needs",
      "Considers YOUR equity constraints → Realistic equity distribution for your stage",
      "Tailored to YOUR funding stage → Hiring timeline matches cash flow",
      "Reflects YOUR leadership style → Management approach fits your personality"
    ],
    6: [
      "AgTech investor network focus → Targets VCs who understand your market",
      "Based on YOUR market size and growth → Valuation reflects wine tech potential",
      "Considers YOUR funding requirements → Pitch deck matches your ask amount",
      "Tailored to YOUR exit timeline → Investment thesis aligns with your goals"
    ],
    7: [
      "Launch strategy for wine grape platform → Execution plan matches your market",
      "Based on YOUR market research → Customer acquisition reflects your findings",
      "Considers YOUR competitive landscape → Positioning against FarmLogs, AgWorld",
      "Optimized for YOUR growth goals → Metrics aligned with your success definition"
    ]
  }
  return callouts[stageId] || ["Personalized to your specific situation"]
}

const getStageValue = (stageId: number): string => {
  const values: { [key: number]: string } = {
    2: "2,500 (fractional CFO rates for financial modeling)",
    3: "3,000 (marketing consultant for GTM strategy)", 
    4: "2,000 (product manager for roadmap planning)",
    5: "1,500 (HR consultant for team planning)",
    6: "4,000 (fundraising consultant + pitch deck design)",
    7: "1,000 (project manager for execution planning)"
  }
  return values[stageId] || "1,000"
}

const getRiskMitigation = (stageId: number): string => {
  const mitigations: { [key: number]: string } = {
    2: "This stage helps mitigate 'Business Viability' risk (currently 6.5/10) by validating your financial model and pricing strategy.",
    3: "This stage helps mitigate 'Competition' risk (currently 7.5/10) by finding underserved channels and positioning against established players.",
    4: "This stage helps mitigate 'Execution' risk (currently 6.0/10) by prioritizing the right features and avoiding development waste.",
    5: "This stage helps mitigate 'Execution' risk by building the right team structure and avoiding founder conflicts.",
    6: "This stage helps mitigate 'Business Viability' risk by securing funding and proving market validation to investors.",
    7: "This stage helps mitigate 'Execution' risk by providing a clear launch plan and avoiding common startup mistakes."
  }
  return mitigations[stageId] || "This stage addresses key risks identified in your analysis."
}


export default function LockedStages({ stages }: LockedStagesProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="mb-8"
    >
      {/* Progress Journey Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="mb-8"
      >
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <span className="text-3xl">🚀</span>
          Your Startup Journey Progress
        </h2>
        <p className="text-neutral-400 text-sm sm:text-base">
          You&apos;ve completed Stage 1! Here&apos;s your roadmap to a funded startup:
        </p>
        
        {/* Progress Percentage */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-4 bg-white/5 border border-white/10 rounded-xl p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-neutral-300">Progress</span>
            <span className="text-lg font-bold text-white">14% Complete</span>
          </div>
          <div className="w-full bg-neutral-700/50 rounded-full h-2">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "14%" }}
              transition={{ duration: 1, delay: 0.5 }}
              className="h-2 bg-gradient-to-r from-green-500 to-blue-500 rounded-full"
            ></motion.div>
          </div>
          <p className="text-xs text-neutral-400 mt-2">
            📈 You&apos;re 14% of the way to your full business roadmap.
          </p>
        </motion.div>
      </motion.div>

      {/* Collapsed Gradient Roadmap */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="mt-8 bg-white/5 border border-white/10 rounded-2xl p-6 shadow-sm"
      >
        {/* Roadmap Header */}
        <div className="text-center mb-6">
          <h3 className="text-xl font-bold text-white mb-2">🚀 Your Startup Journey</h3>
          <div className="w-16 h-1 bg-gradient-to-r from-[#4361EE] to-[#6B73FF] rounded-full mx-auto"></div>
        </div>

        {/* All 7 Stages in Vertical Timeline */}
        <div className="space-y-4">
          {/* Stage 1 - Completed */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="bg-green-500/10 rounded-lg border border-green-500/30 p-4"
          >
            <div className="flex items-start gap-3">
              <span className="text-xl">✅</span>
              <div className="flex-1">
                <p className="font-semibold text-green-300">Stage 1: Idea Validation</p>
                <p className="text-sm text-green-400 italic">Completed — You&apos;ve validated your startup idea!</p>
              </div>
            </div>
          </motion.div>

          {/* Enhanced Stages 2-7 - Locked with Detailed Descriptions */}
          {stages.map((stage, index) => (
            <motion.div
              key={stage.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.6 + index * 0.1 }}
              className="bg-white/5 border border-white/10 rounded-lg p-5 hover:bg-white/10 transition-all duration-200"
            >
              {/* Stage Header */}
              <div className="flex items-start gap-3 mb-4">
                <span className="text-xl">🔒</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-white">Stage {stage.id}: {stage.title}</p>
                    <span className="px-2 py-1 text-xs font-medium bg-[#4361EE]/20 text-[#4361EE] rounded-full">
                      {getStageBadge(stage.id)}
                    </span>
                  </div>
                  <p className="text-sm text-neutral-400 mb-2">
                    {getStageDescription(stage.id)}
                  </p>
                  <div className="bg-[#4361EE]/10 border border-[#4361EE]/20 rounded-lg p-2">
                    <p className="text-xs text-[#4361EE] font-medium">
                      🎯 Outcome: {getStageOutcome(stage.id)}
                    </p>
                  </div>
                </div>
              </div>

              {/* What&apos;s Included */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-white mb-2">📊 Key Deliverables:</h4>
                <div className="space-y-1">
                  {getStageFeatures(stage.id).map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-start gap-2 text-sm text-neutral-300">
                      <span className="text-green-400 mt-0.5">✓</span>
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Personalization Callouts */}
              <div className="mb-4 p-3 bg-[#4361EE]/10 rounded-lg border border-[#4361EE]/20">
                <h4 className="text-xs font-medium text-[#4361EE] mb-2">Why It&apos;s Personalized:</h4>
                <div className="space-y-1">
                  {getPersonalizationCallouts(stage.id).map((callout, calloutIndex) => (
                    <div key={calloutIndex} className="flex items-start gap-2 text-xs text-neutral-300">
                      <span className="text-[#4361EE] mt-0.5">•</span>
                      <span>{callout}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Risk Mitigation Tie-In */}
              <div className="mb-4 p-3 bg-orange-500/10 rounded-lg border border-orange-500/20">
                <h4 className="text-xs font-medium text-orange-300 mb-2">💡 Addresses Your Risks:</h4>
                <p className="text-xs text-orange-200">
                  {getRiskMitigation(stage.id)}
                </p>
              </div>

              {/* Value Indicators */}
              <div className="flex items-center gap-4 mb-4 text-xs text-neutral-400">
                <span>⏱️ Generated in: ~10 minutes</span>
                <span>📄 Output: 15-page detailed report</span>
                <span>💰 Consulting equivalent: ${getStageValue(stage.id)}</span>
              </div>

            </motion.div>
          ))}
        </div>

        {/* Progress Summary */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 1.2 }}
          className="mt-6 text-center"
        >
          <p className="text-sm text-neutral-400">
            📈 You&apos;re 14% of the way to your full business roadmap.
          </p>
        </motion.div>
      </motion.div>

      {/* Enhanced Final CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 1.0 }}
        className="mt-8 bg-white/5 border border-white/10 rounded-xl p-5 shadow-sm hover:shadow-md transition-all"
      >
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-white mb-4">🎯 Ready to Build Your Wine Grape Platform?</h2>
          <p className="text-neutral-300">
            Get your complete personalized roadmap with <span className="font-semibold text-[#4361EE]">6 AI-powered execution stages</span>
          </p>
        </div>

        {/* What&apos;s Included */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">What&apos;s Included:</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              {[
                "✓ Financial Projections",
                "✓ Go-to-Market Strategy", 
                "✓ Product Roadmap",
                "✓ Team & Hiring Plan",
                "✓ Funding Strategy",
                "✓ Execution Plan"
              ].map((item, index) => (
                <div key={index} className="flex items-center gap-2 text-sm text-neutral-300">
                  <span>{item}</span>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              {[
                "✓ 100+ pages of AI-powered analysis",
                "✓ Customized to YOUR wine grape platform",
                "✓ Generated in under 10 minutes",
                "✓ Based on YOUR wizard answers",
                "✓ Lifetime access to all stages",
                "✓ All future updates included"
              ].map((item, index) => (
                <div key={index} className="flex items-center gap-2 text-sm text-neutral-300">
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Guarantee */}
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-6">
          <h4 className="text-sm font-semibold text-green-300 mb-2">✓ Guarantee:</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-green-400">
            <span>✓ One-time payment (no subscriptions)</span>
            <span>✓ Lifetime access to all stages</span>
            <span>✓ 30-day money-back guarantee</span>
          </div>
        </div>

        {/* CTA Button */}
        <div className="text-center">
          <motion.button
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 1.2 }}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            className="px-8 py-3 bg-[#4361EE] hover:bg-[#3649CC] text-white font-semibold rounded-xl shadow-lg transition-all"
          >
            🔓 Unlock Complete System – $79
          </motion.button>
          
        </div>
      </motion.div>
    </motion.div>
  )
}