'use client'

import Link from 'next/link'
import ProtectedRoute from '@/components/auth/ProtectedRoute'

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <main className="min-h-screen w-full bg-black text-white">
        <div className="mx-auto max-w-4xl px-4 py-20">
          <div className="rounded-2xl border border-white/10 bg-neutral-900/70 backdrop-blur-md shadow-2xl p-8">
            <h1 className="text-3xl font-bold mb-2">📊 Dashboard</h1>
            <p className="text-neutral-300 mb-6">
              Welcome to your dashboard! You&apos;re successfully authenticated.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-neutral-700 bg-neutral-800/40 p-4">
                <p className="text-sm text-neutral-400">Recent Activity</p>
                <p className="mt-2 text-neutral-300">No activity yet.</p>
              </div>
              <div className="rounded-xl border border-neutral-700 bg-neutral-800/40 p-4">
                <p className="text-sm text-neutral-400">Saved Ideas</p>
                <p className="mt-2 text-neutral-300">You haven&apos;t saved any ideas.</p>
              </div>
            </div>

            <div className="mt-8">
              <Link href="/" className="text-sm text-blue-400 hover:text-blue-300 underline">← Back to Home</Link>
            </div>
          </div>
        </div>
      </main>
    </ProtectedRoute>
  )
}



