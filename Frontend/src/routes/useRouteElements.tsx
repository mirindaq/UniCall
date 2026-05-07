import { Navigate, useRoutes } from "react-router"

import { ADMIN_PATH } from "@/constants/admin"
import { AUTH_PATH } from "@/constants/auth"
import { USER_PATH } from "@/constants/user"
import { AdminLayout } from "@/layouts/AdminLayout"
import { UserLayout } from "@/layouts/UserLayout"
import { AdminDashboardPage } from "@/pages/admin/AdminDashboardPage"
import { AdminUsersPage } from "@/pages/admin/AdminUsersPage"
import { AdminLoginPage } from "@/pages/auth/AdminLoginPage"
import { AuthPage } from "@/pages/auth/AuthPage"
import { HomePage } from "@/pages/home/HomePage"
import { UserChatPage } from "@/pages/user/UserChatPage"
import { UserFriendsPage } from "@/pages/user/UserFriendsPage"
import { UserNotificationsPage } from "@/pages/user/UserNotificationsPage"
import { UserPostsPage } from "@/pages/user/UserPostsPage"
import AdminGuestRoute from "@/routes/AdminGuestRoute"
import AdminRoute from "@/routes/AdminRoute"
import GuestRoute from "@/routes/GuestRoute"
import ProtectedRoute from "@/routes/ProtectedRoute"

export default function useRouteElements() {
  return useRoutes([
    {
      path: AUTH_PATH.ROOT,
      element: <HomePage />,
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
      path: AUTH_PATH.ADMIN_LOGIN,
      element: (
        <AdminGuestRoute>
          <AdminLoginPage />
        </AdminGuestRoute>
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
      path: USER_PATH.ROOT,
      element: (
        <ProtectedRoute>
          <UserLayout />
        </ProtectedRoute>
      ),
      children: [
        {
          index: true,
          element: <Navigate to={`${USER_PATH.ROOT}/${USER_PATH.CHAT}`} replace />,
        },
        {
          path: USER_PATH.CHAT,
          element: <UserChatPage />,
        },
        {
          path: USER_PATH.FRIENDS,
          element: <UserFriendsPage />,
        },
        {
          path: USER_PATH.POSTS,
          element: <UserPostsPage />,
        },
        {
          path: USER_PATH.NOTIFICATIONS,
          element: <UserNotificationsPage />,
        },
      ],
    },
    {
      path: ADMIN_PATH.ROOT,
      element: (
        <ProtectedRoute redirectTo={AUTH_PATH.ADMIN_LOGIN}>
          <AdminRoute>
            <AdminLayout />
          </AdminRoute>
        </ProtectedRoute>
      ),
      children: [
        {
          index: true,
          element: <Navigate to={ADMIN_PATH.DASHBOARD} replace />,
        },
        {
          path: ADMIN_PATH.DASHBOARD,
          element: <AdminDashboardPage />,
        },
        {
          path: ADMIN_PATH.USERS,
          element: <AdminUsersPage />,
        },
      ],
    },
    {
      path: "*",
      element: <Navigate to={AUTH_PATH.LOGIN} replace />,
    },
  ])
}
