import { useState, useRef, useCallback, useEffect } from "react"
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet"
import L from "leaflet"
import markerIcon from "leaflet/dist/images/marker-icon.png"
import markerShadow from "leaflet/dist/images/marker-shadow.png"
import { auth } from "../firebase"
import API from "../api"

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

async function uploadToCloudinary(file: File): Promise<string> {
  const form = new FormData()
  form.append("file", file)
  form.append("upload_preset", UPLOAD_PRESET)
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: "POST",
    body: form,
  })
  if (!res.ok) throw new Error("Image upload failed")
  const data = await res.json()
  return data.secure_url
}

const defaultIcon = L.icon({ iconUrl: markerIcon, shadowUrl: markerShadow, iconSize: [25, 41], iconAnchor: [12, 41] })
L.Marker.prototype.options.icon = defaultIcon

function LocationPicker({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) { onPick(e.latlng.lat, e.latlng.lng) },
  })
  return null
}

function FlyTo({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  useEffect(() => { map.flyTo([lat, lng], 14, { duration: 1.5 }) }, [map, lat, lng])
  return null
}

interface ReportFormProps {
  onSuccess: () => void
}

const ICONS = {
  illegal_dumping: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 mx-auto"><path d="M3 6h18" /><path d="M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" /><path d="M10 10v6" /><path d="M14 10v6" /></svg>,
  flooding: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 mx-auto"><path d="M12 2L2 12h3v8h4v-6h6v6h4v-8h3L12 2z" /><path d="M8 18h8" /></svg>,
  erosion: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 mx-auto"><path d="M4 20l4-8 4 4 4-8 4 12" /><path d="M2 20h20" /><path d="M12 2v6" /><path d="M9 5l3 3 3-3" /></svg>,
  water_pollution: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 mx-auto"><path d="M12 2a8 8 0 00-8 8c0 5 8 12 8 12s8-7 8-12a8 8 0 00-8-8z" /><path d="M9 9l6 6" /><path d="M15 9l-6 6" /></svg>,
  deforestation: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 mx-auto"><path d="M12 2L8 10h8L12 2z" /><path d="M12 10v10" /><path d="M4 20h16" /><path d="M8 14h8" /></svg>,
}

const DAMAGE_TYPES = [
  { value: "illegal_dumping", label: "Illegal Dumping", icon: ICONS.illegal_dumping },
  { value: "flooding", label: "Flooding", icon: ICONS.flooding },
  { value: "erosion", label: "Erosion", icon: ICONS.erosion },
  { value: "water_pollution", label: "Water Pollution", icon: ICONS.water_pollution },
  { value: "deforestation", label: "Deforestation", icon: ICONS.deforestation },
]

const SEVERITY_LEVELS = [
  { value: "low", label: "Low", color: "text-green-600 bg-green-50 dark:bg-green-900/30" },
  { value: "medium", label: "Medium", color: "text-amber-600 bg-amber-50 dark:bg-amber-900/30" },
  { value: "high", label: "High", color: "text-red-600 bg-red-50 dark:bg-red-900/30" },
]

export default function ReportForm({ onSuccess }: ReportFormProps) {
  const [lat, setLat] = useState(4.0511)
  const [lng, setLng] = useState(9.7679)
  const [address, setAddress] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [damageType, setDamageType] = useState("")
  const [severity, setSeverity] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [locating, setLocating] = useState(true)
  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLat(pos.coords.latitude); setLng(pos.coords.longitude); setLocating(false) },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 },
    )
  }, [])

  const handlePick = useCallback((lat: number, lng: number) => { setLat(lat); setLng(lng) }, [])

  const handleFile = (file: File | null) => {
    if (!file) return
    setImageFile(file)
    setImageUrl(URL.createObjectURL(file))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!imageFile) { setError("Please take or upload a photo"); return }
    if (!damageType) { setError("Please select the type of environmental damage"); return }
    if (!severity) { setError("Please select the severity level"); return }
    setSubmitting(true); setError("")

    try {
      if (!CLOUD_NAME || !UPLOAD_PRESET) throw new Error("Cloudinary not configured")
      const url = await uploadToCloudinary(imageFile)

      const token = await auth.currentUser?.getIdToken()
      const res = await fetch(`${API}/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          image_url: url,
          latitude: lat,
          longitude: lng,
          address,
          damage_type: damageType,
          severity_level: severity,
        }),
      })
      if (!res.ok) throw new Error("Failed to submit")
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit report. Check backend is running.")
    } finally { setSubmitting(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600 dark:text-emerald-400">
            <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Submit a Report</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">Take or upload a photo of the environmental issue</p>
        </div>
      </div>

      {error && <div className="bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-200 text-sm rounded-lg px-4 py-3">{error}</div>}

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Photo</label>
        {imageUrl ? (
          <div className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
            <img src={imageUrl} alt="Preview" className="w-full max-h-64 object-contain bg-gray-50 dark:bg-gray-900" />
            <button
              type="button"
              onClick={() => { setImageUrl(""); setImageFile(null) }}
              className="absolute top-2 right-2 bg-black/50 text-white rounded-full w-7 h-7 flex items-center justify-center hover:bg-black/70 cursor-pointer border-none active:scale-90 transition-all"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => cameraRef.current?.click()}
              className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 sm:p-6 text-center cursor-pointer hover:border-emerald-400 dark:hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all bg-transparent active:scale-[0.97]"
            >
              <svg className="mx-auto mb-2 text-gray-400 dark:text-gray-500" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Take Photo</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Use your camera</p>
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 sm:p-6 text-center cursor-pointer hover:border-emerald-400 dark:hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all bg-transparent active:scale-[0.97]"
            >
              <svg className="mx-auto mb-2 text-gray-400 dark:text-gray-500" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Upload Photo</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">From your device</p>
            </button>
          </div>
        )}
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFile(e.target.files?.[0] || null)} />
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0] || null)} />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Location <span className="text-gray-400 dark:text-gray-500 font-normal">— click on the map to set the exact pin</span>
        </label>
        <div className="h-56 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 relative">
          {locating && (
            <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 z-[1000] flex items-center justify-center text-sm text-gray-400 dark:text-gray-500">
              Detecting your location...
            </div>
          )}
          <MapContainer center={[lat, lng]} zoom={14} className="h-full w-full" preferCanvas={true}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <LocationPicker onPick={handlePick} />
            <FlyTo lat={lat} lng={lng} />
            <Marker position={[lat, lng]} />
          </MapContainer>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">{lat.toFixed(4)}, {lng.toFixed(4)}</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Hazard type</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {DAMAGE_TYPES.map((d) => (
            <button
              key={d.value}
              type="button"
              onClick={() => setDamageType(d.value)}
              className={`px-3 py-3 rounded-lg text-sm font-medium border transition-all cursor-pointer active:scale-[0.97] ${
                damageType === d.value
                  ? "bg-emerald-50 dark:bg-emerald-900/40 border-emerald-500 text-emerald-700 dark:text-emerald-300"
                  : "bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-emerald-300"
              }`}
            >
              <div className="mb-1 text-emerald-600 dark:text-emerald-400">{d.icon}</div>
              <span className="text-xs">{d.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Severity</label>
        <div className="grid grid-cols-3 gap-2">
          {SEVERITY_LEVELS.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setSeverity(s.value)}
              className={`px-3 py-2.5 rounded-lg text-sm font-medium border transition-all cursor-pointer active:scale-[0.97] ${
                severity === s.value
                  ? `${s.color} border-current`
                  : "bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-gray-400"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address (optional)</label>
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          placeholder="e.g. Near Mvog-Mbi junction, Yaoundé"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-emerald-600 text-white py-2.5 px-4 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors cursor-pointer flex items-center justify-center gap-2 active:scale-[0.98]"
      >
        {submitting ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Submitting...
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            Submit Report
          </>
        )}
      </button>
    </form>
  )
}
