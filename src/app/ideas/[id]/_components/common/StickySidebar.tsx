'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Section {
  id: string
  title: string
  icon?: string
}

interface StickySidebarProps {
  sections: Section[]
  className?: string
  topOffset?: number
}

export default function StickySidebar({ 
  sections, 
  className = '',
  topOffset = 80 
}: StickySidebarProps) {
  const [activeSection, setActiveSection] = useState<string>(sections[0]?.id || '')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const observerRef = useRef<IntersectionObserver | null>(null)

  // Set up Intersection Observer to track active section
  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: `-${topOffset + 20}px 0px -60% 0px`,
      threshold: 0
    }

    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id)
        }
      })
    }, observerOptions)

    // Observe all sections
    sections.forEach((section) => {
      const element = document.getElementById(section.id)
      if (element) {
        observerRef.current?.observe(element)
      }
    })

    return () => {
      observerRef.current?.disconnect()
    }
  }, [sections, topOffset])

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      const elementPosition = element.getBoundingClientRect().top
      const offsetPosition = elementPosition + window.pageYOffset - topOffset

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      })
      
      // Close mobile menu after selection
      setIsMobileMenuOpen(false)
    }
  }

  if (sections.length === 0) return null

  const renderNavItems = () => (
    <>
      {sections.map((section, index) => {
        const isActive = activeSection === section.id
        
        return (
          <motion.button
            key={section.id}
            onClick={() => scrollToSection(section.id)}
            className={`group relative w-full text-left px-3 py-3 sm:py-2.5 rounded-lg transition-all duration-200 min-h-[44px] flex items-center ${
              isActive
                ? 'text-white'
                : 'text-neutral-400 hover:text-neutral-200 active:text-white'
            }`}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2, delay: index * 0.03 }}
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.98 }}
          >
            {/* Active background with brand gradient */}
            {isActive && (
              <motion.div
                layoutId="activeBackground"
                className="absolute inset-0 rounded-lg bg-gradient-to-r from-[#4361EE]/20 to-[#6b73ff]/20 border border-[#4361EE]/30"
                initial={false}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
            )}
            
            {/* Active indicator dot */}
            {isActive && (
              <motion.div
                layoutId="activeDot"
                className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-gradient-to-br from-[#4361EE] to-[#6b73ff]"
                initial={false}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            )}
            
            <div className="relative flex items-center gap-2.5 pl-5 w-full">
              {section.icon && (
                <span className={`text-base sm:text-sm transition-opacity flex-shrink-0 ${isActive ? 'opacity-100' : 'opacity-50 group-hover:opacity-75'}`}>
                  {section.icon}
                </span>
              )}
              <span className={`text-sm sm:text-xs font-medium transition-all flex-1 ${isActive ? 'font-semibold' : ''}`}>
                {section.title}
              </span>
            </div>
            
            {/* Hover glow effect */}
            {!isActive && (
              <motion.div
                className="absolute inset-0 rounded-lg bg-[#4361EE]/5 opacity-0 group-hover:opacity-100 transition-opacity"
                initial={false}
              />
            )}
          </motion.button>
        )
      })}
    </>
  )

  return (
    <>
      {/* Desktop Sidebar - Glassmorphism with floating design */}
      <aside
        className={`hidden lg:block fixed left-4 top-20 bottom-4 w-56 z-30 ${className}`}
      >
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="h-full bg-gradient-to-b from-[#0d0d14]/80 to-[#0b0b10]/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-4 overflow-y-auto"
          style={{ 
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(67, 97, 238, 0.3) transparent',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
          }}
        >
          <nav className="space-y-1">
            {renderNavItems()}
          </nav>

          {/* Progress indicator */}
          <div className="mt-6 pt-4 border-t border-white/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-medium text-neutral-500 uppercase tracking-wider">Progress</span>
              <span className="text-[10px] font-semibold text-[#4361EE]">
                {sections.findIndex(s => s.id === activeSection) + 1}/{sections.length}
              </span>
            </div>
            <div className="h-1 bg-white/5 rounded-full overflow-hidden backdrop-blur-sm">
              <motion.div
                className="h-full bg-gradient-to-r from-[#4361EE] to-[#6b73ff] rounded-full"
                initial={{ width: 0 }}
                animate={{
                  width: `${((sections.findIndex(s => s.id === activeSection) + 1) / sections.length) * 100}%`
                }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
            </div>
          </div>
        </motion.div>
      </aside>

      {/* Mobile/Tablet: Floating Pill Button */}
      <div className="lg:hidden fixed top-20 right-4 z-50">
        <motion.button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="px-3 py-2.5 sm:px-4 sm:py-2.5 bg-gradient-to-r from-[#4361EE] to-[#6b73ff] rounded-full shadow-lg flex items-center gap-2 text-white text-xs sm:text-sm font-medium hover:shadow-xl transition-all backdrop-blur-sm border border-[#4361EE]/30 min-h-[44px]"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.95 }}
          aria-label="Open navigation menu"
        >
          <motion.svg
            className="w-4 h-4 sm:w-5 sm:h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            animate={{ rotate: isMobileMenuOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            {isMobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </motion.svg>
          <span className="hidden sm:inline">Sections</span>
        </motion.button>
      </div>

      {/* Mobile/Tablet: Bottom Sheet Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />
            
            {/* Bottom Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="lg:hidden fixed bottom-0 left-0 right-0 bg-gradient-to-b from-[#0d0d14] to-[#0b0b10] border-t border-white/10 rounded-t-3xl shadow-2xl z-50 max-h-[80vh] overflow-hidden backdrop-blur-xl"
            >
              {/* Handle - Draggable indicator */}
              <div className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing" onClick={() => setIsMobileMenuOpen(false)}>
                <div className="w-12 h-1.5 bg-white/20 rounded-full" />
              </div>
              
              {/* Header */}
              <div className="px-5 sm:px-6 pb-4 border-b border-white/10">
                <h3 className="text-base sm:text-lg font-semibold text-white">Navigate Sections</h3>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-neutral-400">
                    Section {sections.findIndex(s => s.id === activeSection) + 1} of {sections.length}
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-24 bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-[#4361EE] to-[#6b73ff] rounded-full"
                        initial={{ width: 0 }}
                        animate={{
                          width: `${((sections.findIndex(s => s.id === activeSection) + 1) / sections.length) * 100}%`
                        }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Navigation Items */}
              <div className="px-4 sm:px-5 py-4 overflow-y-auto max-h-[calc(80vh-140px)]">
                <nav className="space-y-2">
                  {renderNavItems()}
                </nav>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
