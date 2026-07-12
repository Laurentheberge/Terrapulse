import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { createUserWithEmailAndPassword } from "firebase/auth"
import { auth } from "../firebase"
import API from "../api"

export default function Register() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password)
      const token = await cred.user.getIdToken()
      await fetch(`${API}/auth/set-role`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ role: "citizen" }),
      })
      await cred.user.getIdToken(true)
      navigate("/")
    } catch (err) {
      const msg = String(err)
      const code = msg.match(/\((\w+\/\w+)\)/)?.[1] || ""
      const friendly: Record<string, string> = {
        "auth/email-already-in-use": "An account with this email already exists.",
        "auth/invalid-email": "Invalid email format.",
        "auth/weak-password": "Password must be at least 6 characters.",
        "auth/too-many-requests": "Too many attempts. Try again later.",
      }
      setError(friendly[code] || msg.replace("Firebase: ", "").replace(/\(.*\)/, "").trim() || "Registration failed.")
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 relative overflow-hidden bg-gray-900"
      style={{ backgroundImage: "url(https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=1600&q=80)", backgroundSize: "cover", backgroundPosition: "center" }}>
      <div className="absolute inset-0 bg-black/60" />
      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-500 mb-3 overflow-hidden">
            <img src="/logo.png" alt="TerraPulse" className="w-8 h-8 object-cover" />
          </div>
          <h1 className="text-2xl font-bold text-white">Create account</h1>
          <p className="text-sm text-gray-300 mt-1">Join TerraPulse to help protect Cameroon's environment</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-xl shadow-xl border border-white/10 dark:border-gray-700/50 p-6 space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-200 text-sm rounded-lg px-4 py-3">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="•••••••• (min 6 chars)"
              minLength={6}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Creating account...
              </>
            ) : "Create account"}
          </button>

          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            Already have an account?{" "}
            <Link to="/login" className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 font-medium no-underline">
              Sign in
            </Link>
          </p>
        </form>

        <div className="mt-6 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-xl shadow-xl border border-white/10 dark:border-gray-700/50 p-5 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            <strong className="text-emerald-600 dark:text-emerald-400">TerraPulse</strong> empowers citizens to report environmental hazards — illegal dumping, flooding, erosion, water pollution, and deforestation — and helps authorities track and resolve them across Cameroon.
          </p>
        </div>
      </div>
    </div>
  )
}
