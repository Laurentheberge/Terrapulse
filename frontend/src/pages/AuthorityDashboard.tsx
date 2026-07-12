import { useCallback, useEffect, useState } from "react"
import toast from "react-hot-toast"
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet"
import L from "leaflet"
import { auth } from "../firebase"
import API from "../api"

function createIcon(color: string, size = 20) {
  return L.divIcon({
    className: "",
    html: `<div style="width:${size}px;height:${size}px;background:${color};border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

const clusterIcon = (count: number, avgScore: number) => {
  const color = avgScore < 60 ? "#dc2626" : avgScore < 80 ? "#d97706" : "#059669"
  return L.divIcon({
    className: "",
    html: `<div style="width:36px;height:36px;background:${color};border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:white;font-size:11px;font-weight:bold">${count}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  })
}

interface Report {
  id: string
  latitude: number
  longitude: number
  damage_type: string
  severity_level: string
  environment_score: number
  status: string
  image_url: string
  address: string
  created_at: string
}

interface Hotspot {
  geohash: string
  latitude: number
  longitude: number
  report_count: number
  average_score: number
}

const statusColors: Record<string, string> = {
  pending_review: "#eab308",
  in_progress: "#8b5cf6",
  resolved: "#22c55e",
  rejected: "#ef4444",
}

const DAMAGE_TYPES = ["", "illegal_dumping", "flooding", "erosion", "water_pollution", "deforestation"]
const STATUSES = ["", "pending_review", "in_progress", "resolved", "rejected"]

export default function AuthorityDashboard() {
  const [reports, setReports] = useState<Report[]>([])
  const [hotspots, setHotspots] = useState<Hotspot[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState("")
  const [filterStatus, setFilterStatus] = useState("")
  const [viewMode, setViewMode] = useState<"reports" | "hotspots">("hotspots")
  const [promoteEmail, setPromoteEmail] = useState("")
  const [authorities, setAuthorities] = useState<{ uid: string; email: string }[]>([])
  const [isProtected, setIsProtected] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const tokenResult = await auth.currentUser?.getIdTokenResult(true)
    if (tokenResult?.claims.role !== "authority") {
      toast.error("Session expired. Refreshing...")
      setTimeout(() => window.location.reload(), 1500)
      return
    }
    const token = tokenResult.token
    const params = new URLSearchParams()
    if (filterType) params.set("type", filterType)
    if (filterStatus) params.set("status", filterStatus)
    const qs = params.toString() ? `?${params}` : ""

    const [reportsRes, hotspotsRes] = await Promise.all([
      fetch(`${API}/reports${qs}`, { headers: { Authorization: `Bearer ${token}` } }).catch(e => { console.error("Reports net error:", e); return null }),
      fetch(`${API}/hotspots`).catch(e => { console.error("Hotspots net error:", e); return null }),
    ])

    if (reportsRes?.ok) {
      const data = await reportsRes.json()
      setReports(Array.isArray(data) ? data : [])
    } else {
      console.error("Reports fetch failed")
      setReports([])
    }

    if (hotspotsRes?.ok) {
      const data = await hotspotsRes.json()
      console.log("Hotspots loaded:", data.length, JSON.stringify(data.slice(0, 3)))
      setHotspots(Array.isArray(data) ? data : [])
    } else {
      console.error("Hotspots fetch failed", hotspotsRes?.status)
      setHotspots([])
    }

    const authoritiesRes = await fetch(`${API}/auth/authorities`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    console.log("Authorities response status:", authoritiesRes.status)
    if (authoritiesRes.ok) {
      const data = await authoritiesRes.json()
      console.log("Authorities data:", data)
      setIsProtected(true)
      setAuthorities(data)
    } else {
      const errText = await authoritiesRes.text()
      console.warn("Authorities fetch failed:", authoritiesRes.status, errText)
      setIsProtected(false)
      setAuthorities([])
    }

    setLoading(false)
  }, [filterType, filterStatus])

  useEffect(() => { load() }, [load]) // eslint-disable-line react-hooks/set-state-in-effect

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const tokenResult = await auth.currentUser?.getIdTokenResult(true)
      if (tokenResult?.claims.role !== "authority") {
        toast.error("Session expired. Refreshing...")
        setTimeout(() => window.location.reload(), 1500)
        return
      }
      const res = await fetch(`${API}/reports/${id}/status?new_status=${newStatus}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${tokenResult.token}` },
      })
      if (!res.ok) {
        toast.error(`Failed to update status (${res.status})`)
        return
      }
      load()
    } catch (e) { console.error("Failed to update status", e) }
  }

  const stats = {
    open: reports.filter((r) => r.status !== "resolved" && r.status !== "rejected").length,
    pending: reports.filter((r) => r.status === "pending_review").length,
    resolved: reports.filter((r) => r.status === "resolved").length,
    inProgress: reports.filter((r) => r.status === "in_progress").length,
  }

  const handlePromote = async () => {
    if (!promoteEmail) { toast.error("Enter an email address"); return }
    try {
      const token = await auth.currentUser?.getIdToken()
      const res = await fetch(`${API}/auth/promote`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: promoteEmail }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.detail || "Failed to promote user")
        return
      }
      toast.success(`${promoteEmail} promoted to authority!`)
      setPromoteEmail("")
      load()
    } catch {
      toast.error("Backend not reachable. Try again.")
    }
  }

  const handleDemote = async () => {
    if (!promoteEmail) { toast.error("Enter an email address"); return }
    try {
      const token = await auth.currentUser?.getIdToken()
      const res = await fetch(`${API}/auth/demote`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: promoteEmail }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.detail || "Failed to demote user")
        return
      }
      toast.success(`${promoteEmail} demoted to citizen.`)
      setPromoteEmail("")
      load()
    } catch {
      toast.error("Backend not reachable. Try again.")
    }
  }

  return (
    <div className="min-h-screen relative">
      <img src="https://images.unsplash.com/photo-1668958728314-28cda6653610?w=1600&q=80" alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/60 to-emerald-900/30 animate-gradient" />
      <div className="p-6 max-w-7xl mx-auto relative z-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Authority Control Panel</h1>
        <p className="text-sm text-gray-200">Monitor hotspots and manage environmental reports</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
        {["Open cases","Pending review","In progress","Resolved","Hotspots"].map((label, i) => {
          const values = [stats.open, stats.pending, stats.inProgress, stats.resolved, hotspots.length]
          const colors = ["text-gray-900 dark:text-gray-100","text-yellow-600","text-purple-600","text-green-600","text-emerald-600"]
          return (
            <div key={label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:-translate-y-1 hover:shadow-lg transition-all animate-fade-in" style={{ animationDelay: `${i * 80}ms` }}>
              <p className={`heading text-2xl font-bold ${colors[i]}`}>{values[i]}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
            </div>
          )
        })}
      </div>

      <div className="mb-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Manage authority access</label>
        <div className="flex gap-2 relative">
          <div className="flex-1 relative group">
            <input
              type="email"
              value={promoteEmail}
              onChange={(e) => setPromoteEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {isProtected && authorities.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-20 hidden group-hover:block overflow-hidden">
                {authorities.map((a) => (
                  <button
                    key={a.uid}
                    type="button"
                    onClick={() => setPromoteEmail(a.email)}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer border-none"
                  >
                    {a.email}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={handlePromote}
            className="shrink-0 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 cursor-pointer border-none active:scale-95 transition-all"
          >
            Promote
          </button>
          <button
            onClick={handleDemote}
            className="shrink-0 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 cursor-pointer border-none active:scale-95 transition-all"
          >
            Demote
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode("hotspots")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer border-none active:scale-95 ${viewMode === "hotspots" ? "bg-emerald-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"}`}
            >
              Hotspot clusters
            </button>
            <button
              onClick={() => setViewMode("reports")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer border-none active:scale-95 ${viewMode === "reports" ? "bg-emerald-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"}`}
            >
              All reports
            </button>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-all" style={{ height: 420 }}>
            <MapContainer center={[4.0511, 9.7679]} zoom={12} className="h-full w-full" scrollWheelZoom={true}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {viewMode === "hotspots" ? (
                hotspots.map((h) => (
                  <Marker
                    key={h.geohash}
                    position={[h.latitude, h.longitude]}
                    icon={clusterIcon(h.report_count, h.average_score)}
                  >
                    <Popup>
                      <div className="text-xs dark:text-gray-200">
                        <p className="font-semibold">{h.report_count} reports in this area</p>
                        <p className="text-gray-500 dark:text-gray-400 mt-0.5">Avg score: {h.average_score}</p>
                      </div>
                    </Popup>
                  </Marker>
                ))
              ) : (
                reports.map((r) => (
                  <Marker
                    key={r.id}
                    position={[r.latitude, r.longitude]}
                    icon={createIcon(statusColors[r.status] || "#6b7280")}
                  >
                    <Popup>
                      <div className="min-w-[180px] dark:text-gray-200">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold capitalize">{r.damage_type?.replace("_", " ")}</span>
                          <span className="text-xs text-gray-400">Score: {r.environment_score}</span>
                        </div>
                        {r.image_url && (
                          <img src={r.image_url} alt="" className="w-full h-24 object-cover rounded mb-1" onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }} />
                        )}
                        <p className="text-xs text-gray-500 dark:text-gray-400">{r.address || ""}</p>
                      </div>
                    </Popup>
                  </Marker>
                ))
              )}
            </MapContainer>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-3">
          <div className="flex gap-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 active:scale-[0.98] transition-all"
            >
              <option value="">All types</option>
              {DAMAGE_TYPES.slice(1).map((t) => (
                <option key={t} value={t}>{t.replace("_", " ")}</option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">All statuses</option>
              {STATUSES.slice(1).map((s) => (
                <option key={s} value={s}>{s.replace("_", " ")}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2 max-h-[360px] overflow-y-auto">
            {loading ? (
              <div className="space-y-2">
                {[1,2,3,4].map((i) => (
                  <div key={i} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden animate-fade-in" style={{ animationDelay: `${i * 80}ms` }}>
                    <div className="flex">
                      <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 skeleton" />
                      <div className="flex-1 p-3 space-y-2">
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3 skeleton" />
                        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-1/2 skeleton" />
                        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-full skeleton" />
          </div>
        </div>
        {isProtected && authorities.length > 0 && (
          <div className="mb-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 animate-fade-in">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Current authorities</label>
            <div className="text-sm space-y-1">
              {authorities.map((a) => (
                <div key={a.uid} className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-800 dark:text-gray-200">
                  {a.email}
                </div>
              ))}
            </div>
          </div>
        )}
                  </div>
                ))}
              </div>
            ) : reports.length === 0 ? (
              <p className="text-sm text-gray-300 text-center py-8">No reports match your filters.</p>
            ) : (
              reports.map((r, i) => (
                <div key={r.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:-translate-y-0.5 hover:shadow-md transition-all animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
                  <div className="flex">
                    {r.image_url && (
                      <div className="w-16 h-16 shrink-0 bg-gray-100 dark:bg-gray-700">
                        <img src={r.image_url} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }} />
                      </div>
                    )}
                    <div className="flex-1 p-3 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <p className="text-sm font-medium capitalize text-gray-900 dark:text-gray-100 truncate">
                          {r.damage_type?.replace("_", " ") || "Unknown"}
                        </p>
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 shrink-0">{r.environment_score}</span>
                      </div>
                      <p className="text-xs text-gray-400 truncate">{r.address || `${r.latitude?.toFixed(4)}, ${r.longitude?.toFixed(4)}`}</p>
                      <select
                        value={r.status}
                        onChange={(e) => updateStatus(r.id, e.target.value)}
                        className="mt-1.5 w-full px-2 py-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 active:scale-[0.98] transition-all"
                      >
                        {STATUSES.slice(1).map((s) => (
                          <option key={s} value={s}>{s.replace("_", " ")}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
    </div>
  )
}
