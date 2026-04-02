import { useEffect, useState, type ReactNode } from "react"
import { Loader2 } from "lucide-react"
import { Navigate } from "react-router"

import { AUTH_PATH } from "@/constants/auth"
import { USER_PATH } from "@/constants/user"
import { authService } from "@/services/auth/auth.service"
import { authTokenStore } from "@/stores/auth-token.store"

interface GuestRouteProps {
  children: ReactNode
}

export default function GuestRoute({ children }: GuestRouteProps) {
  const [loading, setLoading] = useState(() => !authTokenStore.get());
  const [authenticated, setAuthenticated] = useState(() => Boolean(authTokenStore.get()));

  useEffect(() => {
    let mounted = true;
    if (authTokenStore.get()) {
      if (!authenticated) setAuthenticated(true);
      if (loading) setLoading(false);
      return;
    }

    authService.refreshAccessToken()
      .then((response) => {
        const token = response.data.accessToken;
        if (!token) throw new Error("Missing access token");
        authTokenStore.set(token);
        if (mounted) {
          setAuthenticated(true);
        }
      })
      .catch(() => {
        authTokenStore.clear();
        if (mounted) {
          setAuthenticated(false);
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-slate-50 px-4">
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4 text-slate-700 shadow-sm">
          <Loader2 className="size-4 animate-spin" />
          Dang kiem tra phien dang nhap...
        </div>
      </main>
    );
  }

  if (authenticated) {
    return <Navigate to={`${USER_PATH.ROOT}/${USER_PATH.CHAT}`} replace />;
  }

  return <>{children}</>;
}
