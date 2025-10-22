export default function Loading() {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 text-white flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-neutral-300">Loading analysis...</p>
      </div>
    </div>
  )
}


