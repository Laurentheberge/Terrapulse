import { Navigate } from "react-router-dom"

interface ProtectedRouteProps {
  user: { uid: string; email: string; role: string } | null
  requireAuthority?: boolean
  children: React.ReactNode
}

export default function ProtectedRoute({ user, requireAuthority, children }: ProtectedRouteProps) {
  if (!user) return <Navigate to="/login" replace />
  if (requireAuthority && user.role !== "authority") return <Navigate to="/" replace />
  return <>{children}</>
}
