import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { signInWithEmailAndPassword } from "firebase/auth"
import { auth } from "../firebase"

export default function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await signInWithEmailAndPassword(auth, email, password)
      navigate("/")
    } catch (err) {
      setError(String(err).replace("Firebase: ", "").replace(/\(.*\)/, ""))
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 relative overflow-hidden bg-gray-900"
      style={{ backgroundImage: "url(https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=1600&q=80)", backgroundSize: "cover", backgroundPosition: "center" }}>
      <div className="absolute inset-0 bg-black/60" />
      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-500 mb-3">
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="16" r="14" fill="white" />
              <path d="M16 6c-5.523 0-10 3.806-10 8.5 0 2.5 1.2 4.8 3.2 6.5L16 26l6.8-5c2-1.7 3.2-4 3.2-6.5C26 9.806 21.523 6 16 6z" fill="#059669" />
              <path d="M18 12l-2 4h3l-2 4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Welcome back</h1>
          <p className="text-sm text-gray-300 mt-1">Sign in to your TerraPulse account</p>
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
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-emerald-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors cursor-pointer"
          >
            Sign in
          </button>

          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            Don't have an account?{" "}
            <Link to="/register" className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 font-medium no-underline">
              Register
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
