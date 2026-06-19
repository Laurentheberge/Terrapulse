import { useEffect, useState } from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { onIdTokenChanged } from "firebase/auth"
import { auth } from "./firebase"
import Navbar from "./components/Navbar"
import ProtectedRoute from "./components/ProtectedRoute"
import Home from "./pages/Home"
import Login from "./pages/Login"
import Register from "./pages/Register"
import PublicMap from "./pages/PublicMap"
import DisposalSites from "./pages/DisposalSites"
import AuthorityDashboard from "./pages/AuthorityDashboard"
import "leaflet/dist/leaflet.css"

interface User {
  uid: string
  email: string
  role: string
}

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onIdTokenChanged(auth, async (u) => {
      if (u) {
        const token = await u.getIdTokenResult(true)
        setUser({
          uid: u.uid,
          email: u.email || "",
          role: token.claims.role === "authority" ? "authority" : "citizen",
        })
      } else {
        setUser(null)
      }
      setLoading(false)
    })
    return unsub
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <p className="text-gray-400 dark:text-gray-500 text-sm">Loading...</p>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Navbar user={user} />
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register />} />
        <Route path="/" element={<ProtectedRoute user={user}><Home /></ProtectedRoute>} />
        <Route path="/map" element={<PublicMap />} />
        <Route path="/sites" element={<DisposalSites />} />
        <Route
          path="/authority"
          element={<ProtectedRoute user={user} requireAuthority><AuthorityDashboard /></ProtectedRoute>}
        />
      </Routes>
    </BrowserRouter>
  )
}
