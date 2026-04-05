import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"

type AuthContextValue = {
  isAuthenticated: boolean
  setAuthenticated: () => void
  clearAuthenticated: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

let externalAuthStateUpdater: ((authenticated: boolean) => void) | null = null

export const updateAuthState = (authenticated: boolean) => {
  externalAuthStateUpdater?.(authenticated)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    externalAuthStateUpdater = setIsAuthenticated
    return () => {
      if (externalAuthStateUpdater === setIsAuthenticated) {
        externalAuthStateUpdater = null
      }
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated,
      setAuthenticated: () => setIsAuthenticated(true),
      clearAuthenticated: () => setIsAuthenticated(false),
    }),
    [isAuthenticated]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider")
  }
  return context
}

