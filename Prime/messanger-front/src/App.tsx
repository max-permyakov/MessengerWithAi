import type { ReactNode } from "react"
import { Navigate, Route, Routes } from "react-router-dom"
import { Toaster } from "sonner"
import { LoginForm } from "@/components/ui/auth/LoginForm"
import { RegisterForm } from "@/components/ui/auth/RegisterForm"
import { getToken } from "@/lib/auth"
import { MessengerPage } from "@/pages/MessengerPage"
import { ProfilePage } from "@/pages/ProfilePage"

function ProtectedRoute({ children }: { children: ReactNode }) {
  if (!getToken()) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Navigate to={getToken() ? "/chat" : "/login"} replace />} />
        <Route path="/login" element={<LoginForm />} />
        <Route path="/register" element={<RegisterForm />} />
        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <MessengerPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster richColors position="top-right" />
    </>
  )
}

export default App
