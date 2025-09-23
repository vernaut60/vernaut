export default function HeroSection() {
  return (
    <section className="w-full min-h-screen bg-black text-white flex items-start sm:items-center justify-center py-16">
      <div className="mx-auto w-full max-w-4xl px-4">
        <div className="text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight">
            Turn your startup idea into a clear roadmap in minutes.
          </h1>
          <p className="mt-6 text-base sm:text-lg md:text-xl text-gray-400 max-w-3xl mx-auto">
            Paste your idea. Get problem, audience, solution, and monetization instantly — powered by AI.
          </p>
        </div> 

        <div className="mt-10">
          <div>
            <label htmlFor="idea" className="sr-only">Describe the idea</label>
            <textarea
              id="idea"
              rows={8}
              className="w-full resize-none rounded-2xl bg-neutral-900 border border-neutral-800 focus:border-neutral-700 focus:ring-2 focus:ring-blue-600/40 outline-none p-5 text-base text-white placeholder:text-neutral-500 shadow-lg"
              placeholder="Describe the idea... e.g., An app that connects local chefs with nearby customers for home‑cooked meals, with delivery and subscription options."
            />
          </div>

          <div className="mt-6 flex justify-center">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-xl text-white font-semibold px-4 py-2 sm:px-6 sm:py-3 md:px-8 md:py-4 lg:px-10 lg:py-4 text-xs sm:text-sm md:text-base lg:text-lg shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 w-full sm:w-auto max-w-xs sm:max-w-none active:scale-95 hover:scale-105 transition-transform duration-150 cursor-pointer"
              style={{ backgroundColor: '#667eea' }}
            >
              Refine Idea  🚀
            </button>
          </div>

          <p className="mt-4 text-xs sm:text-sm text-gray-400 text-center">
            ⏱️ Results in 30 seconds, 🛡️ 100% Private & Secure, 🤖 AI-Powered Analysis
          </p>
        </div>
      </div>
    </section>
  );
}


