import { useState } from "react"
import { useNavigate } from "react-router"
import { Menu, X, Globe, LogOut, Inbox } from "lucide-react"
import { toast } from "sonner"
import { Button } from "../ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu"
import { AUTH_PATH } from "@/constants/auth"
import { useAuth } from "@/contexts/auth-context"
import { USER_PATH } from "@/constants/user"
import { authService } from "@/services/auth/auth.service"

export function Header() {
  const { isAuthenticated, clearAuthenticated } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await authService.logout()
    } catch {
      // ignore
    } finally {
      clearAuthenticated()
      toast.success("Đã đăng xuất")
      navigate(AUTH_PATH.ROOT, { replace: true })
    }
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <a href="/" className="flex items-center">
            <span className="text-2xl font-bold text-[#0068ff]">Zalo</span>
          </a>

          {/* Desktop Auth Buttons */}
          <div className="hidden sm:flex items-center gap-3">
            {!isAuthenticated ? (
              <>
                <Button 
                  variant="ghost" 
                  className="text-foreground hover:bg-accent"
                  onClick={() => navigate(AUTH_PATH.LOGIN)}
                >
                  Đăng nhập
                </Button>
                <Button 
                  className="bg-[#0068ff] hover:bg-[#0052cc] text-white"
                  onClick={() => navigate(AUTH_PATH.REGISTER)}
                >
                  Đăng ký
                </Button>
              </>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    className="bg-[#0068ff] hover:bg-[#0052cc] text-white"
                  >
                    <Inbox className="h-4 w-4 mr-2" />
                    Chat
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate(`${USER_PATH.ROOT}/${USER_PATH.CHAT}`)}>
                    <Inbox className="h-4 w-4 mr-2" />
                    Vào trang Chat
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                    <LogOut className="h-4 w-4 mr-2" />
                    Đăng xuất
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            
            {/* Language Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-foreground hover:bg-accent">
                  <Globe className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <span className="mr-2">VN</span> Tiếng Việt
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <span className="mr-2">EN</span> English
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="sm:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden bg-background border-b border-border">
          <div className="px-4 py-4 flex flex-col gap-2">
            {!isAuthenticated ? (
              <>
                <Button 
                  variant="ghost" 
                  className="w-full justify-center text-foreground hover:bg-accent"
                  onClick={() => {
                    navigate(AUTH_PATH.LOGIN)
                    setMobileMenuOpen(false)
                  }}
                >
                  Đăng nhập
                </Button>
                <Button 
                  className="w-full justify-center bg-[#0068ff] hover:bg-[#0052cc] text-white"
                  onClick={() => {
                    navigate(AUTH_PATH.REGISTER)
                    setMobileMenuOpen(false)
                  }}
                >
                  Đăng ký
                </Button>
              </>
            ) : (
              <>
                <Button 
                  className="w-full justify-center bg-[#0068ff] hover:bg-[#0052cc] text-white"
                  onClick={() => {
                    navigate(`${USER_PATH.ROOT}/${USER_PATH.CHAT}`)
                    setMobileMenuOpen(false)
                  }}
                >
                  Vào trang Chat
                </Button>
                <Button 
                  className="w-full justify-center text-red-600 hover:bg-red-50"
                  variant="ghost"
                  onClick={() => {
                    handleLogout()
                    setMobileMenuOpen(false)
                  }}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Đăng xuất
                </Button>
              </>
            )}
            <div className="flex justify-center gap-2 pt-2 border-t border-border mt-2">
              <Button variant="ghost" size="sm" className="text-foreground">
                <span className="mr-1">VN</span> VI
              </Button>
              <Button variant="ghost" size="sm" className="text-foreground">
                <span className="mr-1">EN</span> EN
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
