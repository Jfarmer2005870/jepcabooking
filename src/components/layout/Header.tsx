import React, { useState, forwardRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, LogOut, User, Building2, MessageSquare, MapPin, Search, Home, Compass, LayoutDashboard, UserCircle } from "lucide-react";
import NotificationBell from "@/components/notifications/NotificationBell";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ChatDialog from "@/components/chat/ChatDialog";

const Header = forwardRef<HTMLElement>((props, ref) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const { user, userRole, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const tabs = [
    { label: "Home", icon: Home, path: "/" },
    { label: "Browse", icon: Compass, path: "/services" },
    { label: "Orders", icon: LayoutDashboard, path: "/dashboard" },
    { label: "Account", icon: UserCircle, path: user ? "/profile" : "/auth" },
  ];

  return (
    <>
      <header ref={ref} className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-14 md:h-16 gap-3">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 shrink-0">
              <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg font-display">J</span>
              </div>
              <span className="hidden sm:inline text-lg font-bold font-display text-foreground">Jepca</span>
            </Link>

            {/* Address pill (desktop) */}
            <button
              onClick={() => navigate(user ? "/profile" : "/auth")}
              className="hidden md:flex items-center gap-2 px-3 h-10 rounded-full bg-secondary hover:bg-secondary/80 transition-colors max-w-[260px]"
            >
              <MapPin className="w-4 h-4 text-primary shrink-0" />
              <span className="text-sm font-medium truncate">Set your address</span>
            </button>

            {/* Inline search (desktop) */}
            <button
              onClick={() => navigate("/services")}
              className="hidden md:flex flex-1 items-center gap-2 px-4 h-10 rounded-full bg-secondary hover:bg-secondary/80 transition-colors text-left max-w-md"
            >
              <Search className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Search services</span>
            </button>

            {/* Right cluster */}
            <div className="flex items-center gap-2 shrink-0">
              {loading ? (
                <div className="w-20 h-9 bg-secondary animate-pulse rounded-full" />
              ) : user ? (
                <>
                  <NotificationBell />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsChatOpen(true)}
                    className="rounded-full"
                  >
                    <MessageSquare className="w-5 h-5" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="hidden md:flex items-center gap-2 h-10 px-3 rounded-full bg-secondary hover:bg-secondary/80 transition-colors">
                        {userRole === "business" ? (
                          <Building2 className="w-4 h-4" />
                        ) : (
                          <User className="w-4 h-4" />
                        )}
                        <span className="text-sm font-medium max-w-[100px] truncate">
                          {user.email?.split("@")[0]}
                        </span>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem className="text-muted-foreground text-xs">
                        {userRole === "business" ? "Business Account" : "Consumer Account"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => navigate("/dashboard")}>
                        Dashboard
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate("/profile")}>
                        Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setIsChatOpen(true)}>
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Messages
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                        <LogOut className="w-4 h-4 mr-2" />
                        Sign out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <>
                  <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
                    <Link to="/auth">Sign In</Link>
                  </Button>
                  <Button size="sm" asChild className="rounded-full">
                    <Link to="/auth">Get Started</Link>
                  </Button>
                </>
              )}

              {/* Mobile menu button */}
              <button
                className="md:hidden p-2 hover:bg-secondary rounded-full transition-colors"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label={isMenuOpen ? "Close menu" : "Open menu"}
              >
                {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile sheet menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-background border-t border-border"
            >
              <div className="container mx-auto px-4 py-3">
                <button
                  onClick={() => { navigate(user ? "/profile" : "/auth"); setIsMenuOpen(false); }}
                  className="flex items-center gap-2 w-full px-3 py-3 rounded-xl bg-secondary mb-2"
                >
                  <MapPin className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Set your address</span>
                </button>
                <Link
                  to="/services"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-2 w-full px-3 py-3 rounded-xl bg-secondary mb-2"
                >
                  <Search className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Search services</span>
                </Link>
                {user ? (
                  <Button variant="destructive" className="w-full mt-2" onClick={() => { handleSignOut(); setIsMenuOpen(false); }}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign out
                  </Button>
                ) : (
                  <Button className="w-full mt-2" asChild>
                    <Link to="/auth" onClick={() => setIsMenuOpen(false)}>Sign In</Link>
                  </Button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <ChatDialog open={isChatOpen} onOpenChange={setIsChatOpen} />
      </header>

      {/* Mobile bottom tab bar (app-style) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-t border-border pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-4">
          {tabs.map((t) => {
            const active = location.pathname === t.path || (t.path !== "/" && location.pathname.startsWith(t.path));
            return (
              <Link
                key={t.label}
                to={t.path}
                className={`flex flex-col items-center justify-center gap-1 py-2.5 ${active ? "text-primary" : "text-muted-foreground"}`}
              >
                <t.icon className="w-5 h-5" />
                <span className="text-[11px] font-medium">{t.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
});

Header.displayName = "Header";

export default Header;
