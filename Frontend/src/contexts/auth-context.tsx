import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { userService } from "@/services/user/user.service"

type AuthContextValue = {
  isAuthenticated: boolean
  identityUserId: string | null
  setAuthenticated: (identityUserId?: string | null) => void
  setIdentityUserId: (identityUserId: string | null) => void
  clearAuthenticated: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

let externalAuthStateUpdater:
  | ((authenticated: boolean, identityUserId?: string | null) => void)
  | null = null

export const updateAuthState = (authenticated: boolean, identityUserId?: string | null) => {
  externalAuthStateUpdater?.(authenticated, identityUserId)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [identityUserId, setIdentityUserId] = useState<string | null>(null)

  useEffect(() => {
    externalAuthStateUpdater = (authenticated, nextIdentityUserId) => {
      setIsAuthenticated(authenticated)
      if (!authenticated) {
        userService.clearMyProfileCache()
        setIdentityUserId(null)
        return
      }
      if (nextIdentityUserId !== undefined) {
        setIdentityUserId(nextIdentityUserId ?? null)
      }
    }
    return () => {
      externalAuthStateUpdater = null
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated,
      identityUserId,
      setAuthenticated: (nextIdentityUserId) => {
        setIsAuthenticated(true)
        if (nextIdentityUserId !== undefined) {
          setIdentityUserId(nextIdentityUserId ?? null)
        }
      },
      setIdentityUserId,
      clearAuthenticated: () => {
        userService.clearMyProfileCache()
        setIsAuthenticated(false)
        setIdentityUserId(null)
      },
    }),
    [identityUserId, isAuthenticated]
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
