import { Navigate, useRoutes } from "react-router"

import { ADMIN_PATH } from "@/constants/admin"
import { AUTH_PATH } from "@/constants/auth"
import { USER_PATH } from "@/constants/user"
import { AdminLayout } from "@/layouts/AdminLayout"
import { UserLayout } from "@/layouts/UserLayout"
import { AdminBroadcastsPage } from "@/pages/admin/AdminBroadcastsPage"
import { AdminConversationsPage } from "@/pages/admin/AdminConversationsPage"
import { AdminDashboardPage } from "@/pages/admin/AdminDashboardPage"
import { AdminGroupsPage } from "@/pages/admin/AdminGroupsPage"
import { AdminModerationPage } from "@/pages/admin/AdminModerationPage"
import { AdminReportsPage } from "@/pages/admin/AdminReportsPage"
import { AdminSupportPage } from "@/pages/admin/AdminSupportPage"
import { AdminUsersPage } from "@/pages/admin/AdminUsersPage"
import { AuthCallbackPage } from "@/pages/auth/AuthCallbackPage"
import { AuthPage } from "@/pages/auth/AuthPage"
import { HomePage } from "@/pages/home/HomePage"
import { UserChatPage } from "@/pages/user/UserChatPage"
import { UserFriendsPage } from "@/pages/user/UserFriendsPage"
import { UserNotificationsPage } from "@/pages/user/UserNotificationsPage"
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
          path: USER_PATH.NOTIFICATIONS,
          element: <UserNotificationsPage />,
        },
      ],
    },
    {
      path: ADMIN_PATH.ROOT,
      element: (
        <ProtectedRoute>
          <AdminLayout />
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
        {
          path: ADMIN_PATH.CONVERSATIONS,
          element: <AdminConversationsPage />,
        },
        {
          path: ADMIN_PATH.GROUPS,
          element: <AdminGroupsPage />,
        },
        {
          path: ADMIN_PATH.MODERATION,
          element: <AdminModerationPage />,
        },
        {
          path: ADMIN_PATH.REPORTS,
          element: <AdminReportsPage />,
        },
        {
          path: ADMIN_PATH.BROADCASTS,
          element: <AdminBroadcastsPage />,
        },
        {
          path: ADMIN_PATH.SUPPORT,
          element: <AdminSupportPage />,
        },
      ],
    },
    {
      path: "*",
      element: <Navigate to={AUTH_PATH.LOGIN} replace />,
    },
  ])
}
