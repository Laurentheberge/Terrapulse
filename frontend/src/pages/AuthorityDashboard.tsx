import { useCallback, useEffect, useState } from "react"
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
  const [dbg, setDbg] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    const tokenResult = await auth.currentUser?.getIdTokenResult(true)
    if (tokenResult?.claims.role !== "authority") {
      alert("Your session doesn't have authority role. Redirecting...")
      window.location.reload()
      return
    }
    const token = tokenResult.token
    const params = new URLSearchParams()
    if (filterType) params.set("type", filterType)
    if (filterStatus) params.set("status", filterStatus)
    const qs = params.toString() ? `?${params}` : ""

    const [reportsRes, hotspotsRes, debugRes] = await Promise.all([
      fetch(`${API}/reports${qs}`, { headers: { Authorization: `Bearer ${token}` } }).catch(e => { console.error("Reports net error:", e); return null }),
      fetch(`${API}/hotspots`).catch(e => { console.error("Hotspots net error:", e); return null }),
      fetch(`${API}/debug/reports-count`).catch(e => { console.error("Debug net error:", e); return null }),
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

    const debugText = debugRes?.ok
      ? "Total in DB: " + ((await debugRes.json()).total ?? "?")
      : "debug unavailable"
    setDbg(debugText)

    setLoading(false)
  }, [filterType, filterStatus])

  useEffect(() => { load() }, [load]) // eslint-disable-line react-hooks/set-state-in-effect

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const tokenResult = await auth.currentUser?.getIdTokenResult(true)
      if (tokenResult?.claims.role !== "authority") {
        alert("Not authorized as authority. Refreshing...")
        window.location.reload()
        return
      }
      const res = await fetch(`${API}/reports/${id}/status?new_status=${newStatus}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${tokenResult.token}` },
      })
      if (!res.ok) {
        const text = await res.text()
        console.error("Status update failed:", res.status, text)
        alert(`Failed to update status (${res.status})`)
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

  return (
    <div className="min-h-screen relative">
      <img src="https://images.unsplash.com/photo-1668958728314-28cda6653610?w=1600&q=80" alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-black/60" />
      <div className="p-6 max-w-7xl mx-auto relative z-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Authority Control Panel</h1>
        <p className="text-sm text-gray-200">Monitor hotspots and manage environmental reports</p>
      </div>

      {dbg && <div className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded mb-4">DBG: {dbg}</div>}

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.open}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Open cases</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Pending review</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-2xl font-bold text-purple-600">{stats.inProgress}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">In progress</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Resolved</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-2xl font-bold text-emerald-600">{hotspots.length}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Hotspots</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode("hotspots")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer border-none ${viewMode === "hotspots" ? "bg-emerald-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"}`}
            >
              Hotspot clusters
            </button>
            <button
              onClick={() => setViewMode("reports")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer border-none ${viewMode === "reports" ? "bg-emerald-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"}`}
            >
              All reports
            </button>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden" style={{ height: 420 }}>
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
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
              <p className="text-sm text-gray-300 text-center py-8">Loading...</p>
            ) : reports.length === 0 ? (
              <p className="text-sm text-gray-300 text-center py-8">No reports match your filters.</p>
            ) : (
              reports.map((r) => (
                <div key={r.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
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
                        className="mt-1.5 w-full px-2 py-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
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
