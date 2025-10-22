export default function Loading() {
  return (
    <div className="min-h-screen w-full bg-black text-white flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-neutral-300">Loading dashboard...</p>
      </div>
    </div>
  )
}


