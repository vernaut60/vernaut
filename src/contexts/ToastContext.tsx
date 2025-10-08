'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'

interface Toast {
  id: string
  message: string
  type: 'error' | 'success' | 'info'
}

interface ToastContextType {
  toasts: Toast[]
  addToast: (message: string, type: 'error' | 'success' | 'info') => void
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export { ToastContext }

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((message: string, type: 'error' | 'success' | 'info') => {
    const id = Math.random().toString(36).substr(2, 9)
    setToasts(prev => [...prev, { id, message, type }])
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

// Toast Component
interface ToastProps {
  toast: Toast
  onClose: () => void
}

function ToastComponent({ toast, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)

  const handleClose = useCallback(() => {
    setIsLeaving(true)
    // Wait for slide-out animation to complete
    setTimeout(() => {
      onClose()
    }, 300)
  }, [onClose])

  useEffect(() => {
    // Trigger slide-in animation
    const slideInTimer = setTimeout(() => {
      setIsVisible(true)
    }, 10)

    // Auto-close after 4 seconds
    const closeTimer = setTimeout(() => {
      handleClose()
    }, 4000)

    return () => {
      clearTimeout(slideInTimer)
      clearTimeout(closeTimer)
    }
  }, [handleClose])

  const getToastStyles = () => {
    switch (toast.type) {
      case 'error':
        return 'bg-red-900/90 border-red-500 text-red-100'
      case 'success':
        return 'bg-green-900/90 border-green-500 text-green-100'
      case 'info':
        return 'bg-blue-900/90 border-blue-500 text-blue-100'
      default:
        return 'bg-gray-900/90 border-gray-500 text-gray-100'
    }
  }

  return (
    <div className={`transition-all duration-300 ease-in-out transform ${
      isLeaving 
        ? 'translate-x-full opacity-0' 
        : isVisible 
          ? 'translate-x-0 opacity-100' 
          : 'translate-x-full opacity-0'
    }`}>
      <div className={`max-w-sm rounded-lg border p-4 shadow-lg backdrop-blur-sm ${getToastStyles()}`}>
        <div className="flex items-start">
          <div className="flex-shrink-0">
            {toast.type === 'error' && (
              <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            )}
            {toast.type === 'success' && (
              <svg className="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            )}
            {toast.type === 'info' && (
              <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
          <div className="ml-3 flex-1">
            <p className="text-sm font-medium">{toast.message}</p>
          </div>
          <div className="ml-4 flex-shrink-0">
            <button
              type="button"
              onClick={handleClose}
              className="inline-flex rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-white hover:bg-white/10 transition-colors"
            >
              <span className="sr-only">Close</span>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Toast Container
export function ToastContainer() {
  const { toasts, removeToast } = useToast()

  return (
    <div className="fixed top-4 right-4 z-[9999] space-y-2">
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          className="transform transition-all duration-300 ease-in-out"
          style={{
            transform: `translateY(${index * 8}px)`,
            zIndex: 9999 - index
          }}
        >
          <ToastComponent
            toast={toast}
            onClose={() => removeToast(toast.id)}
          />
        </div>
      ))}
    </div>
  )
}
