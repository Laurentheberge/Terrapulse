import { useEffect, useState } from "react"
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet"
import L from "leaflet"
import API from "../api"

const typeIcons: Record<string, { color: string; label: string }> = {
  poubelle: { color: "#059669", label: "Trash Bin" },
  recyclage: { color: "#2563eb", label: "Recycling" },
}

function createIcon(color: string) {
  return L.divIcon({
    className: "",
    html: `<div style="width:28px;height:28px;background:${color};border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3)"></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
}

const userIcon = L.divIcon({
  className: "",
  html: `<div style="width:16px;height:16px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
})

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function directionsUrl(fromLat: number, fromLng: number, toLat: number, toLng: number) {
  return `https://www.openstreetmap.org/directions?from=${fromLat}%2C${fromLng}&to=${toLat}%2C${toLng}#map=15/${toLat}/${toLng}`
}

interface Site {
  id: string
  name: string
  latitude: number
  longitude: number
  type: string
  hours: string
  distance?: number
}

export default function DisposalSites() {
  const [sites, setSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(true)
  const [userPos, setUserPos] = useState<[number, number] | null>(null)
  const [sortByDistance, setSortByDistance] = useState(true)

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserPos([pos.coords.latitude, pos.coords.longitude]),
      () => {},
      { enableHighAccuracy: true, timeout: 8000 },
    )
  }, [])

  useEffect(() => {
    fetch(`${API}/sites`)
      .then((r) => r.json())
      .then((data) => {
        setSites(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  let displaySites = [...sites]
  if (userPos && sortByDistance) {
    displaySites = displaySites.map((s) => ({
      ...s,
      distance: haversineKm(userPos[0], userPos[1], s.latitude, s.longitude),
    }))
    displaySites.sort((a, b) => (a.distance || 0) - (b.distance || 0))
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] p-4 sm:p-6 relative overflow-hidden bg-gray-900"
      style={{ backgroundImage: "url(https://images.unsplash.com/photo-1662611527358-7855c4fe8398?w=1600&q=80)", backgroundSize: "cover", backgroundPosition: "center" }}>
      <div className="absolute inset-0 bg-black/60" />
      <div className="max-w-7xl mx-auto relative z-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Disposal & Recycling Sites</h1>
        <p className="text-sm text-gray-300">
          {loading
            ? "Loading..."
            : userPos
              ? `${displaySites.length} sites near you`
              : `${displaySites.length} sites in Cameroon`}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden" style={{ height: 500 }}>
          <MapContainer center={userPos || [4.0511, 9.7679]} zoom={userPos ? 13 : 7} className="h-full w-full" scrollWheelZoom={true}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {userPos && <Marker position={userPos} icon={userIcon} />}
            {displaySites.map((s) => (
              <Marker key={s.id} position={[s.latitude, s.longitude]} icon={createIcon(typeIcons[s.type]?.color || "#6b7280")}>
                <Popup>
                  <div className="min-w-[180px]">
                    <p className="text-sm font-semibold mb-1">{s.name}</p>
                    <p className="text-xs text-gray-500 capitalize">{typeIcons[s.type]?.label || s.type}</p>
                    <p className="text-xs text-gray-400">{s.hours}</p>
                    {s.distance !== undefined && (
                      <p className="text-xs text-emerald-600 font-medium mt-1">{s.distance.toFixed(1)} km away</p>
                    )}
                    {userPos && (
                      <a
                        href={directionsUrl(userPos[0], userPos[1], s.latitude, s.longitude)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-block bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition-colors no-underline"
                      >
                        Get directions →
                      </a>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        <div className="lg:col-span-2 space-y-3">
          <button
            onClick={() => setSortByDistance(!sortByDistance)}
            className={`w-full px-3 py-2 rounded-lg text-sm font-medium border transition-colors cursor-pointer ${
              sortByDistance
                ? "bg-emerald-600 text-white border-emerald-600"
                : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700"
            }`}
          >
            {userPos ? "Nearest first" : "All sites"}
          </button>

          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {displaySites.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">No sites found.</p>
            )}
            {displaySites.map((s, i) => (
              <div key={s.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-white text-xs font-bold"
                    style={{ background: typeIcons[s.type]?.color || "#6b7280" }}
                  >
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{s.name}</p>
                    <p className="text-xs text-gray-400 capitalize">{typeIcons[s.type]?.label || s.type}</p>
                    <p className="text-xs text-gray-400">{s.hours}</p>
                    {s.distance !== undefined && (
                      <p className="text-xs text-emerald-600 font-medium mt-0.5">{s.distance.toFixed(1)} km</p>
                    )}
                  </div>
                  <div className="shrink-0">
                    {userPos && (
                      <a
                        href={directionsUrl(userPos[0], userPos[1], s.latitude, s.longitude)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-800 transition-colors no-underline"
                        title="Get directions"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 18l6-6-6-6" />
                        </svg>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
    </div>
  )
}
