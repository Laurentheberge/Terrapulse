import { useEffect, useState, useRef } from "react"
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet"
import L from "leaflet"
import API from "../api"

const severityColors: Record<string, string> = {
  high: "#dc2626",
  medium: "#d97706",
  low: "#16a34a",
}

function createIcon(color: string) {
  return L.divIcon({
    className: "",
    html: `<div style="width:24px;height:24px;background:${color};border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })
}

const locateIcon = L.divIcon({
  className: "",
  html: `<div style="width:16px;height:16px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
})

function LocateButton() {
  const map = useMap()
  return (
    <div className="leaflet-top leaflet-right" style={{ marginTop: 10, marginRight: 10 }}>
      <button
        onClick={() =>
          navigator.geolocation.getCurrentPosition(
            (pos) => map.flyTo([pos.coords.latitude, pos.coords.longitude], 14, { duration: 1.5 }),
            () => {},
          )
        }
        className="bg-white dark:bg-gray-800 w-9 h-9 flex items-center justify-center rounded-lg shadow-md border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        title="Find my location"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600 dark:text-gray-300">
          <circle cx="12" cy="10" r="3" />
          <path d="M12 2v2m0 16v2m-8-8H2m20 0h-2" />
          <path d="M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M4.93 19.07l1.41-1.41m11.32-11.32l1.41-1.41" />
        </svg>
      </button>
    </div>
  )
}

function UserMarker() {
  const [pos, setPos] = useState<[number, number] | null>(null)
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (p) => setPos([p.coords.latitude, p.coords.longitude]),
      () => {},
      { enableHighAccuracy: true, timeout: 8000 },
    )
  }, [])
  return pos ? <Marker position={pos} icon={locateIcon} /> : null
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

export default function PublicMap() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [center, setCenter] = useState<[number, number]>([4.0511, 9.7679])
  const located = useRef(false)

  useEffect(() => {
    if (!located.current) {
      navigator.geolocation.getCurrentPosition(
        (pos) => { setCenter([pos.coords.latitude, pos.coords.longitude]); located.current = true },
        () => {},
        { enableHighAccuracy: true, timeout: 8000 },
      )
    }
  }, [])

  useEffect(() => {
    fetch(`${API}/reports`)
      .then((r) => { if (!r.ok) throw new Error("HTTP " + r.status); return r.json() })
      .then((data) => { console.log("Reports fetched:", data.length); setReports(Array.isArray(data) ? data : []); setLoading(false) })
      .catch((e) => { console.error("Fetch reports failed:", e); setLoading(false) })
  }, [])

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending_review: "bg-yellow-100 text-yellow-800",
      in_progress: "bg-purple-100 text-purple-800",
      resolved: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
    }
    return `inline-block px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || "bg-gray-100 text-gray-800"}`
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Environmental Reports Map</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{loading ? "Loading..." : `${reports.length} reports across Cameroon`}</p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
              <span className="text-gray-500 dark:text-gray-400">High</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
              <span className="text-gray-500 dark:text-gray-400">Medium</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-green-500 inline-block" />
              <span className="text-gray-500 dark:text-gray-400">Low</span>
            </div>
          </div>
        </div>
      </div>
      <div className="flex-1 relative">
        <MapContainer center={center} zoom={13} className="h-full w-full" scrollWheelZoom={true} key={center.join()}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <LocateButton />
          <UserMarker />
          {reports.map((r) => (
            <Marker
              key={r.id}
              position={[r.latitude, r.longitude]}
              icon={createIcon(severityColors[r.severity_level] || "#6b7280")}
            >
              <Popup>
                <div className="min-w-[220px] dark:text-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-semibold capitalize">{r.damage_type?.replace("_", " ")}</span>
                    <span className={statusBadge(r.status)}>{r.status.replace("_", " ")}</span>
                  </div>
                  {r.image_url && (
                    <img src={r.image_url} alt="" className="w-full h-28 object-cover rounded mb-2" onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }} />
                  )}
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">{r.address || "No description"}</p>
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Score: {r.environment_score}</span>
                    <span className="capitalize">{r.severity_level}</span>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  )
}
