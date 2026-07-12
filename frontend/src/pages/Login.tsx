import { useState, useRef } from "react"
import { Link, useNavigate } from "react-router-dom"
import { signInWithEmailAndPassword, sendPasswordResetEmail, signInWithPopup, GoogleAuthProvider } from "firebase/auth"
import toast from "react-hot-toast"
import { auth } from "../firebase"
import API from "../api"

export default function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [noAccount, setNoAccount] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showReset, setShowReset] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const emailCache = useRef<{ email: string; exists: boolean } | null>(null)
  const navigate = useNavigate()

  const checkEmail = async (e: string) => {
    if (!e) return
    const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/check-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: e }),
    }).then(r => r.json()).then(d => d.exists).catch(() => null)
    if (res !== null) emailCache.current = { email: e, exists: res }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError(""); setNoAccount(false)

    if (emailCache.current?.email === email && !emailCache.current.exists) {
      setNoAccount(true)
      toast.error("No account found with this email.")
      setLoading(false)
      return
    }

    try {
      await signInWithEmailAndPassword(auth, email, password)
      navigate("/")
    } catch {
      setError("Wrong password.")
      toast.error("Wrong password.")
    } finally { setLoading(false) }
  }

  const handleReset = async () => {
    if (!email) { toast.error("Enter your email first."); return }
    try {
      await sendPasswordResetEmail(auth, email)
      setResetSent(true)
      toast.success("Reset link sent! Check your inbox (and spam).")
    } catch {
      toast.error("Failed to send reset email. Check the address and try again.")
    }
  }

  const handleGoogle = async () => {
    setLoading(true)
    try {
      const provider = new GoogleAuthProvider()
      const cred = await signInWithPopup(auth, provider)
      navigate("/")
      const token = await cred.user.getIdToken()
      fetch(`${API}/auth/set-role`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ role: "citizen" }),
      }).catch(() => {})
      await cred.user.getIdToken(true)
    } catch (e) {
      console.error("Google sign-in failed", e)
      toast.error("Google sign-in failed. Try again.")
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
          <h1 className="text-2xl font-bold text-white">Welcome back</h1>
          <p className="text-sm text-gray-300 mt-1">Sign in to your TerraPulse account</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-xl shadow-xl border border-white/10 dark:border-gray-700/50 p-6 space-y-4">
          {noAccount ? (
            <div className="bg-amber-50 dark:bg-amber-900 text-amber-700 dark:text-amber-200 text-sm rounded-lg px-4 py-3">
              No account found with this email.{" "}
              <Link to="/register" className="font-semibold underline text-emerald-600 dark:text-emerald-400 hover:text-emerald-700">Create one</Link>
            </div>
          ) : error && (
            <div className="bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-200 text-sm rounded-lg px-4 py-3">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); emailCache.current = null }}
              onBlur={() => checkEmail(email)}
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
            <button
              type="button"
              onClick={() => setShowReset(!showReset)}
              className="mt-1 text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 bg-transparent border-none cursor-pointer"
            >
              Forgot password?
            </button>
          </div>

          {showReset && (
            <div className="bg-emerald-50 dark:bg-emerald-900/40 rounded-lg p-4 space-y-2">
              {resetSent ? (
                <>
                  <p className="text-sm text-emerald-700 dark:text-emerald-300">Reset link sent to <strong>{email}</strong>. Check your inbox and <strong>spam folder</strong>.</p>
                  <button
                    type="button"
                    onClick={() => { setShowReset(false); setResetSent(false) }}
                    className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 bg-transparent border-none cursor-pointer"
                  >
                    Back to sign in
                  </button>
                </>
              ) : (
                <>
                  <p className="text-sm text-emerald-700 dark:text-emerald-300">Enter your email and we'll send a reset link.</p>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="flex-1 px-3 py-1.5 border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={handleReset}
                      className="shrink-0 px-3 py-1.5 rounded bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 cursor-pointer border-none active:scale-95 transition-all"
                    >
                      Send
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowReset(false)}
                    className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 bg-transparent border-none cursor-pointer"
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Signing in...
              </>
            ) : "Sign in"}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white/95 dark:bg-gray-900/95 px-2 text-gray-400 dark:text-gray-500">or continue with</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-medium border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors cursor-pointer active:scale-[0.98]"
          >
            <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Sign in with Google
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
