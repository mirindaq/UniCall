import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router"

import "./index.css"
import App from "./App.tsx"
import { ThemeProvider } from "@/components/theme-provider.tsx"
import { AuthProvider } from "@/contexts/auth-context.tsx"
import { Toaster } from "@/components/ui/sonner.tsx"
import { TooltipProvider } from "@/components/ui/tooltip.tsx"

createRoot(document.getElementById("root")!).render(
  <>
    <ThemeProvider>
      <TooltipProvider>
        <AuthProvider>
          <BrowserRouter>
            <App />
            <Toaster />
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </>
)
