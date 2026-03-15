import { Navigate, useRoutes } from "react-router"

import { AUTH_PATH } from "@/constants/auth"
import { AuthCallbackPage } from "@/pages/auth/AuthCallbackPage"
import { AuthPage } from "@/pages/auth/AuthPage"
import { HomePage } from "@/pages/home/HomePage"
import GuestRoute from "@/routes/GuestRoute"
import ProtectedRoute from "@/routes/ProtectedRoute"

export default function useRouteElements() {
  return useRoutes([
    {
      path: AUTH_PATH.ROOT,
      element: <Navigate to={AUTH_PATH.LOGIN} replace />,
    },
    {
      path: AUTH_PATH.LOGIN,
      element: (
        <GuestRoute>
          <AuthPage />
        </GuestRoute>
      ),
    },
    {
      path: AUTH_PATH.REGISTER,
      element: (
        <GuestRoute>
          <AuthPage />
        </GuestRoute>
      ),
    },
    {
      path: AUTH_PATH.CALLBACK,
      element: <AuthCallbackPage />,
    },
    {
      path: AUTH_PATH.HOME,
      element: (
        <ProtectedRoute>
          <HomePage />
        </ProtectedRoute>
      ),
    },
    {
      path: "*",
      element: <Navigate to={AUTH_PATH.LOGIN} replace />,
    },
  ])
}
