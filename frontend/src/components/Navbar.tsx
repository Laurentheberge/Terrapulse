import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { signOut } from "firebase/auth"
import { auth } from "../firebase"

interface NavbarProps {
  user: { uid: string; email: string; role: string } | null
}

export default function Navbar({ user }: NavbarProps) {
  const navigate = useNavigate()
  const [dark, setDark] = useState(() => localStorage.getItem("theme") === "dark")

  useEffect(() => {
    const root = document.documentElement
    if (dark) {
      root.classList.add("dark")
      localStorage.setItem("theme", "dark")
    } else {
      root.classList.remove("dark")
      localStorage.setItem("theme", "light")
    }
  }, [dark])

  const handleLogout = async () => {
    await signOut(auth)
    navigate("/login")
  }

  return (
    <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 no-underline">
            <img src="/logo.png" alt="TerraPulse" className="h-8 w-8 rounded-lg object-cover" />
            <span className="text-sm sm:text-xl font-bold font-['Montserrat'] text-emerald-700 dark:text-emerald-400">TerraPulse</span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-4">
            <Link to="/map" className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors no-underline">
              Map
            </Link>
            <Link to="/sites" className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors no-underline">
              Sites
            </Link>
            {user?.role === "authority" && (
              <Link to="/authority" className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors no-underline">
                Dashboard
              </Link>
            )}
            {user ? (
              <>
                <span className="hidden sm:inline text-sm text-gray-400 dark:text-gray-500 truncate max-w-[120px]">{user.email}</span>
                <button
                  onClick={handleLogout}
                  className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors bg-transparent border-none cursor-pointer active:scale-90"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link to="/login" className="text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 font-medium no-underline">
                Sign in
              </Link>
            )}

            <button
              onClick={() => setDark(!dark)}
              className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors bg-transparent border-none cursor-pointer active:scale-90"
              title="Toggle theme"
            >
              {dark ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5" />
                  <path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
