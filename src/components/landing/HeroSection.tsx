'use client'

import { useEffect, useState } from 'react'
import InteractiveDemo from './InteractiveDemo'

const BENEFITS = [
  'competitor insights',
  'audience profiles', 
  'roadmaps you can build on'
]

export default function HeroSection() {
  // Animated subheadline state
  const [currentBenefitIndex, setCurrentBenefitIndex] = useState(0)
  const [displayedText, setDisplayedText] = useState('')

  const handleReset = () => {
    // This will be handled by InteractiveDemo
  }

  // Animated subheadline typing effect
  useEffect(() => {
    let currentIndex = 0
    let isDeleting = false
    let timeoutId: number

    const typeText = () => {
      const currentBenefit = BENEFITS[currentBenefitIndex]
      
      if (isDeleting) {
        setDisplayedText(currentBenefit.substring(0, currentIndex - 1))
        currentIndex--
        if (currentIndex === 0) {
          isDeleting = false
          setCurrentBenefitIndex((prev) => (prev + 1) % BENEFITS.length)
        }
        timeoutId = window.setTimeout(typeText, 50) // Faster deleting
      } else {
        setDisplayedText(currentBenefit.substring(0, currentIndex + 1))
        currentIndex++
        if (currentIndex === currentBenefit.length) {
          timeoutId = window.setTimeout(() => {
            isDeleting = true
            typeText()
          }, 2000) // Pause for 2 seconds before deleting
        } else {
          timeoutId = window.setTimeout(typeText, 100) // Slower typing
        }
      }
    }

    typeText() // Start the typing effect

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [currentBenefitIndex])



  return (
    <section className="relative w-full min-h-screen bg-black text-white flex items-center justify-center py-16 overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0">
        {/* Gradient shimmer overlay */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            background: 'linear-gradient(45deg, transparent 30%, rgba(59, 130, 246, 0.1) 50%, rgba(147, 51, 234, 0.1) 70%, transparent 100%)',
            backgroundSize: '200% 200%',
            animation: 'shimmer 8s ease-in-out infinite'
          }}
        ></div>
        
        {/* Subtle grid pattern */}
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
            animation: 'gridPulse 4s ease-in-out infinite'
          }}
        ></div>
        
        {/* Floating idea sparks */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Spark 1 */}
          <div 
            className="absolute w-1 h-1 bg-blue-400 rounded-full animate-[ideaSpark_6s_ease-out_infinite]"
            style={{ 
              left: '20%', 
              top: '80%',
              animationDelay: '0s'
            }}
          ></div>
          
          {/* Spark 2 */}
          <div 
            className="absolute w-1.5 h-1.5 bg-purple-400 rounded-full animate-[ideaSpark_8s_ease-out_infinite]"
            style={{ 
              left: '70%', 
              top: '85%',
              animationDelay: '2s'
            }}
          ></div>
          
          {/* Spark 3 */}
          <div 
            className="absolute w-1 h-1 bg-cyan-400 rounded-full animate-[ideaSpark_7s_ease-out_infinite]"
            style={{ 
              left: '15%', 
              top: '90%',
              animationDelay: '4s'
            }}
          ></div>
          
          {/* Spark 4 */}
          <div 
            className="absolute w-1 h-1 bg-indigo-400 rounded-full animate-[ideaSpark_9s_ease-out_infinite]"
            style={{ 
              left: '80%', 
              top: '75%',
              animationDelay: '1s'
            }}
          ></div>
          
          {/* Spark 5 */}
          <div 
            className="absolute w-1.5 h-1.5 bg-pink-400 rounded-full animate-[ideaSpark_6.5s_ease-out_infinite]"
            style={{ 
              left: '60%', 
              top: '88%',
              animationDelay: '3s'
            }}
          ></div>
          
          {/* Spark 6 */}
          <div 
            className="absolute w-1 h-1 bg-blue-300 rounded-full animate-[ideaSpark_8.5s_ease-out_infinite]"
            style={{ 
              left: '30%', 
              top: '82%',
              animationDelay: '5s'
            }}
          ></div>
        </div>
      </div>
      
      <div className="relative z-10 mx-auto w-full max-w-4xl px-4">
        <div className="text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight">
            💡 Turn any idea into a clear business roadmap.
          </h1>
          <p className="mt-6 text-base sm:text-lg md:text-xl text-gray-400 max-w-3xl mx-auto">
            From raw thoughts to{' '}
            <span className="text-white font-medium">
              {displayedText}
              <span className="animate-pulse">|</span>
            </span>
            {' '}— in seconds.
          </p>
        </div>

        {/* Interactive Demo Component */}
        <div className="mt-16">
          <InteractiveDemo 
            onReset={handleReset}
          />
        </div>
      </div>
    </section>
  );
}


