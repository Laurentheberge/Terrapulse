import { useCallback, useEffect, useState } from "react"
import toast from "react-hot-toast"
import { auth } from "../firebase"
import API from "../api"
import ReportForm from "../components/ReportForm"

interface Report {
  id: string
  latitude: number
  longitude: number
  image_url: string
  damage_type: string
  severity_level: string
  environment_score: number
  status: string
  address: string
  created_at: string
}

const statusStyles: Record<string, string> = {
  pending_review: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  in_progress: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  resolved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
}

export default function Home() {
  const [showForm, setShowForm] = useState(false)
  const [myReports, setMyReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [showHelp, setShowHelp] = useState(false)
  const [locationDenied, setLocationDenied] = useState(false)

  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.permissions?.query({ name: "geolocation" }).then((p) => {
      if (p.state === "denied") setLocationDenied(true)
      p.addEventListener("change", () => setLocationDenied(p.state === "denied"))
    }).catch(() => {})
  }, [])

  const requestLocation = () => {
    navigator.geolocation.getCurrentPosition(
      () => setLocationDenied(false),
      () => {
        if (navigator.permissions) {
          navigator.permissions.query({ name: "geolocation" }).then((p) => {
            if (p.state === "denied") setLocationDenied(true)
          })
        }
      },
      { enableHighAccuracy: true, timeout: 8000 },
    )
  }

  const loadReports = async () => {
    try {
      const token = await auth.currentUser?.getIdToken()
      const res = await fetch(`${API}/reports/my`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      setMyReports(Array.isArray(data) ? data : [])
    } catch { console.error("Failed to load reports") }
    setLoading(false)
  }

  useEffect(() => { loadReports() }, []) // eslint-disable-line

  const updateStatus = useCallback(async (id: string) => {
    try {
      const token = await auth.currentUser?.getIdToken(true)
      const res = await fetch(`${API}/reports/${id}/status?new_status=resolved`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const text = await res.text()
        toast.error(`Failed to resolve: ${res.status} ${text}`)
        return
      }
      loadReports()
    } catch { console.error("Failed to update status") }
  }, [])

  const user = auth.currentUser
  const stats = {
    total: myReports.length,
    pending: myReports.filter((r) => r.status === "pending_review").length,
    resolved: myReports.filter((r) => r.status === "resolved").length,
  }

  if (showForm) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <button
          onClick={() => setShowForm(false)}
          className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-4 bg-transparent border-none cursor-pointer active:scale-95 transition-all"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5m7-7l-7 7 7 7" /></svg>
          Back to dashboard
        </button>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <ReportForm onSuccess={() => { setShowForm(false); loadReports() }} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative">
      <img src="https://images.unsplash.com/photo-1761252987156-8518404632cd?w=1600&q=80" alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/60 to-emerald-900/30 animate-gradient" />
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8 relative z-10">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Welcome, <span className="text-emerald-300">{user?.email?.split("@")[0] || "Citizen"}</span>
          </h1>
          <p className="text-sm text-gray-200 mt-1">
            Track your environmental reports and submit new ones.
          </p>
        </div>
        <button
          onClick={() => setShowHelp(!showHelp)}
          className="p-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 bg-transparent border-none cursor-pointer active:scale-90 transition-all"
          title="Help"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
            <path d="M12 17h.01" />
          </svg>
        </button>
      </div>

      {showHelp && (
        <div className="bg-emerald-900/40 backdrop-blur-sm border border-emerald-700/50 rounded-xl p-5 text-sm text-emerald-200 space-y-2">
          <p className="font-semibold">How it works</p>
          <ul className="list-disc list-inside space-y-1 text-emerald-700 dark:text-emerald-300">
            <li><strong>Submit a report</strong> — Take or upload a photo of environmental damage, pin the location on the map.</li>
            <li><strong>Classify damage</strong> — Select the hazard type and severity from the options provided.</li>
            <li><strong>Track status</strong> — Authorities review and update the status of your report.</li>
            <li><strong>View on map</strong> — All reports are visible on the public map for transparency.</li>
          </ul>
        </div>
      )}

      {locationDenied && (
        <div className="bg-amber-900/40 backdrop-blur-sm border border-amber-600/50 rounded-xl p-4 flex items-start gap-3 animate-fade-in">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 shrink-0 mt-0.5 text-amber-400">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4m0 4h.01" />
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-200">Location access required</p>
            <p className="text-xs text-amber-300/80 mt-0.5">This app uses your location to pin reports on the map and find nearby dump sites. Please enable location access in your browser settings.</p>
          </div>
          <button
            onClick={requestLocation}
            className="shrink-0 px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-medium hover:bg-amber-700 transition-colors cursor-pointer border-none active:scale-95"
          >
            Turn on location
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <button
          onClick={() => setShowForm(true)}
          className="md:col-span-2 bg-gradient-to-br from-emerald-600 to-emerald-700 text-white rounded-xl p-6 text-left hover:from-emerald-500 hover:to-emerald-600 transition-all shadow-md hover:shadow-lg border-none cursor-pointer active:scale-[0.98]"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14m-7-7h14" />
              </svg>
            </div>
            <span className="heading text-lg font-semibold">New Report</span>
          </div>
          <p className="text-sm text-emerald-100">Report environmental damage with a photo and location</p>
        </button>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center hover:-translate-y-1 hover:shadow-lg transition-all">
          <p className="heading text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.total}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Total reports</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center hover:-translate-y-1 hover:shadow-lg transition-all">
          <p className="heading text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.pending}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Pending review</p>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">My Reports</h2>
          {myReports.length > 0 && (
            <span className="text-xs text-gray-300">{myReports.length} total</span>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map((i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
                <div className="flex">
                  <div className="w-24 h-24 bg-gray-200 dark:bg-gray-700 skeleton" />
                  <div className="flex-1 p-4 space-y-2">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 skeleton" />
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3 skeleton" />
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4 skeleton" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : myReports.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
            <svg className="mx-auto mb-3 text-gray-300 dark:text-gray-600" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 13h6m-3-3v6m-7 4h14a1 1 0 001-1V7a1 1 0 00-1-1H5a1 1 0 00-1 1v10a1 1 0 001 1z" />
            </svg>
            <p className="text-gray-500 dark:text-gray-400 font-medium">No reports yet</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Click "New Report" to submit your first environmental report.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {myReports.map((r, i) => (
              <div key={r.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:-translate-y-1 hover:shadow-lg transition-all animate-fade-in" style={{ animationDelay: `${i * 80}ms` }}>
                <div className="flex">
                  {r.image_url && (
                    <div className="w-24 h-24 shrink-0 bg-gray-100 dark:bg-gray-700">
                      <img src={r.image_url} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }} />
                    </div>
                  )}
                  <div className="flex-1 p-4 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {r.damage_type ? r.damage_type.replace("_", " ") : "Unknown type"}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{r.address || `${r.latitude?.toFixed(4)}, ${r.longitude?.toFixed(4)}`}</p>
                      </div>
                      <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[r.status] || "bg-gray-100 text-gray-800"}`}>
                        {r.status?.replace("_", " ")}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400 dark:text-gray-500 flex-wrap">
                      <span>Score: {r.environment_score}</span>
                      {r.severity_level && <span className="capitalize">Severity: {r.severity_level}</span>}
                      {r.created_at && <span>{new Date(r.created_at).toLocaleDateString()}</span>}
                      {r.status !== "resolved" && r.status !== "rejected" && (
                        <button
                          onClick={() => updateStatus(r.id)}
                          className="ml-auto px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-800 font-medium border-none cursor-pointer active:scale-95 transition-all"
                        >
                          Mark resolved
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
    </div>
  )
}
