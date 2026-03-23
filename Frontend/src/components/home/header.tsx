import { useState } from "react"
import { Menu, X, Globe } from "lucide-react"
import { Button } from "../ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu"

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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
            <Button variant="ghost" className="text-foreground hover:bg-accent">
              Đăng nhập
            </Button>
            <Button className="bg-[#0068ff] hover:bg-[#0052cc] text-white">
              Đăng ký
            </Button>
            
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
            <Button variant="ghost" className="w-full justify-center text-foreground hover:bg-accent">
              Đăng nhập
            </Button>
            <Button className="w-full justify-center bg-[#0068ff] hover:bg-[#0052cc] text-white">
              Đăng ký
            </Button>
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