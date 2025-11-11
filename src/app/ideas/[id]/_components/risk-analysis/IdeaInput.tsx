'use client'

import { motion } from 'framer-motion'
import { SectionHeader } from '../common'

interface IdeaInputProps {
  problem: string
  audience: string
  solution: string
  monetization: string
  hasDemoData?: boolean
}

export default function IdeaInput({ problem, audience, solution, monetization, hasDemoData = true }: IdeaInputProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="mb-8"
    >
      {/* Section Header */}
      <SectionHeader
        title={hasDemoData ? "Your Original Input" : "Your Startup Idea"}
        description={
          hasDemoData 
            ? "Here's what you shared in the demo. We've used this to personalize every part of your analysis:"
            : "Here's the idea you're validating. This forms the foundation for your entire personalized analysis:"
        }
        gradientFrom="from-green-400"
        gradientTo="to-blue-400"
        titleClassName="text-2xl sm:text-3xl"
        descriptionClassName="ml-4"
        className="mb-6"
      />

      {/* Personalization confirmation message - show after full analysis (when hasDemoData is false) */}
      {!hasDemoData && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="mb-6 bg-gradient-to-r from-[#4361EE]/10 to-[#7209B7]/10 border border-[#4361EE]/20 rounded-xl p-4"
        >
          <div className="flex items-start gap-3">
            <span className="text-xl flex-shrink-0">✨</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white mb-1">
                Analysis personalized based on your answers
              </p>
              <p className="text-xs text-neutral-300 leading-relaxed">
                These values were refined using your specific budget, market, and approach for more accurate insights.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Demo Input Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Problem */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-white/5 border border-white/10 rounded-xl p-5 shadow-sm hover:shadow-md transition-all"
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">🎯</span>
            <h3 className="text-lg font-semibold text-white">Problem</h3>
          </div>
          <p className="text-sm text-neutral-300 leading-relaxed">
            {problem}
          </p>
        </motion.div>

        {/* Audience */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="bg-white/5 border border-white/10 rounded-xl p-5 shadow-sm hover:shadow-md transition-all"
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">👥</span>
            <h3 className="text-lg font-semibold text-white">Target Audience</h3>
          </div>
          <p className="text-sm text-neutral-300 leading-relaxed">
            {audience}
          </p>
        </motion.div>

        {/* Solution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="bg-white/5 border border-white/10 rounded-xl p-5 shadow-sm hover:shadow-md transition-all"
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">💡</span>
            <h3 className="text-lg font-semibold text-white">Solution</h3>
          </div>
          <p className="text-sm text-neutral-300 leading-relaxed">
            {solution}
          </p>
        </motion.div>

        {/* Monetization */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="bg-white/5 border border-white/10 rounded-xl p-5 shadow-sm hover:shadow-md transition-all"
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">💰</span>
            <h3 className="text-lg font-semibold text-white">Monetization</h3>
          </div>
          <p className="text-sm text-neutral-300 leading-relaxed">
            {monetization}
          </p>
        </motion.div>
      </div>

      {/* Personalization Note */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className="mt-6 bg-[#4361EE]/10 border border-[#4361EE]/20 rounded-xl p-4"
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">✨</span>
          <h4 className="text-sm font-semibold text-[#4361EE]">
            {hasDemoData ? "How We Personalized Your Analysis" : "Built Just For You"}
          </h4>
        </div>
        <p className="text-xs text-neutral-300">
          {hasDemoData 
            ? "Everything below is customized to YOUR wine grape AI platform: ✓ Risk mitigation strategies use YOUR budget ($50K) ✓ Competitor positioning targets YOUR market (California) ✓ Recommendations reflect YOUR approach (validation-first) ✓ Financial projections use YOUR pricing ($99-199/vineyard)"
            : "Your analysis below is customized based on your idea and wizard answers. Every recommendation, risk assessment, and execution plan is tailored to your specific market and business model."
          }
        </p>
      </motion.div>
    </motion.div>
  )
}
