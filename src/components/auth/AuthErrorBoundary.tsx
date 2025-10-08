'use client'

import React from 'react'
import ErrorBoundary from './ErrorBoundary'

interface AuthErrorBoundaryProps {
  children: React.ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}


export default function AuthErrorBoundary({ children, onError }: AuthErrorBoundaryProps) {
  return (
    <ErrorBoundary
      onError={onError}
    >
      {children}
    </ErrorBoundary>
  )
}
