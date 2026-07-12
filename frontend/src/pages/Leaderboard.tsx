import { useEffect, useState } from "react"
import API from "../api"

interface LeaderboardEntry {
  uid: string
  email: string
  report_count: number
  resolved_count: number
}

export default function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/leaderboard`)
        if (res.ok) setEntries(await res.json())
      } catch (e) {
        console.error("Failed to load leaderboard", e)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-start justify-center px-4 py-12 relative overflow-hidden bg-gray-900"
      style={{ backgroundImage: "url(https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?w=1600&q=80)", backgroundSize: "cover", backgroundPosition: "center" }}>
      <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/60 to-emerald-900/30 animate-gradient" />
      <div className="w-full max-w-2xl relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">Top Reporters</h1>
          <p className="text-sm text-gray-300 mt-1">Citizens leading the charge for a cleaner environment</p>
        </div>

        {loading ? (
          <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 animate-pulse">
                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700" />
                <div className="flex-1 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="w-16 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
              </div>
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center text-sm text-gray-500 dark:text-gray-400">
            No reports yet. Be the first!
          </div>
        ) : (
          <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {entries.map((entry, i) => {
              const medal = i === 0 ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 mx-auto"><circle cx="12" cy="8" r="4"/><path d="M12 12v4"/><path d="M16 20l-4-2-4 2V12h8z"/></svg>
              ) : i === 1 ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 mx-auto"><circle cx="12" cy="8" r="4"/><path d="M12 12v4"/><path d="M16 20l-4-2-4 2V12h8z"/></svg>
              ) : i === 2 ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 mx-auto"><circle cx="12" cy="8" r="4"/><path d="M12 12v4"/><path d="M16 20l-4-2-4 2V12h8z"/></svg>
              ) : ""
              return (
                <div
                  key={entry.uid}
                  className={`flex items-center gap-3 px-5 py-3.5 ${i % 2 === 0 ? "bg-gray-50/50 dark:bg-gray-800/30" : ""} ${i < 3 ? "border-l-4 border-emerald-500" : ""}`}
                >
                  <span className="w-8 text-center text-lg font-bold text-gray-400 dark:text-gray-500">
                    {medal || `#${i + 1}`}
                  </span>
                  <span className="flex-1 text-sm text-gray-800 dark:text-gray-200 truncate">
                    {entry.email}
                  </span>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{entry.report_count}</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">reports</span>
                    {entry.resolved_count > 0 && (
                      <span className="text-xs text-green-500 ml-2">({entry.resolved_count} resolved)</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
