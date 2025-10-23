'use client'

import { motion } from 'framer-motion'

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
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="mb-6"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-1 h-8 bg-gradient-to-b from-green-400 to-blue-400 rounded-full"></div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white">
            {hasDemoData ? "Your Original Input" : "Your Startup Idea"}
          </h2>
        </div>
        <p className="text-neutral-400 text-sm sm:text-base ml-4">
          {hasDemoData 
            ? "Here's what you shared in the demo. We've used this to personalize every part of your analysis:"
            : "Here's the idea you're validating. This forms the foundation for your entire personalized analysis:"
          }
        </p>
      </motion.div>

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
