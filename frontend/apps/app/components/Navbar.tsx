"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { Menu, LogOut, User, ChevronDown } from "lucide-react";
import { NotificationBell } from "./NotificationBell";

interface NavbarProps {
  onMenuClick?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onMenuClick }) => {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error("Logout failed", err);
    } finally {
      router.push("/auth/login");
    }
  };

  return (
    <nav className="bg-muted/80 border-b border-border backdrop-blur-2xl sticky top-0 z-40 shadow-sm">
      <div className="px-6 py-4 flex items-center justify-between">
        {/* Left Section */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="p-2 hover:bg-accent hover:text-accent-foreground rounded-lg transition lg:hidden"
          >
            <Menu className="w-5 h-5 text-muted-foreground" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center font-bold text-primary-foreground shadow-lg shadow-primary/20">
              E
            </div>
            <h1 className="text-lg font-bold text-foreground hidden sm:inline tracking-tight">
              {user?.tenant_name || "Company Portal"}
            </h1>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2">
          <NotificationBell />

          {/* User Profile */}
          <div className="hidden sm:flex flex-col items-end">
            <p className="text-sm font-medium text-foreground">
              {user?.first_name || user?.username || "Guest"}
            </p>
            <p className="text-xs text-muted-foreground">
              {user?.custom_title || "Company User"}
            </p>
          </div>

          {/* User Avatar */}
          <div className="w-10 h-10 rounded-lg overflow-hidden shadow-lg shadow-primary/20">
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                <span className="text-primary-foreground font-semibold text-sm">
                  {(
                    user?.first_name?.[0] ||
                    user?.username?.[0] ||
                    "U"
                  ).toUpperCase()}
                </span>
              </div>
            )}
          </div>

          {/* Dropdown Menu */}
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="p-2 hover:bg-accent hover:text-accent-foreground rounded-lg transition"
            >
              <ChevronDown
                className={`w-5 h-5 text-muted-foreground transition ${isDropdownOpen ? "rotate-180 text-foreground" : "group-hover:text-foreground"}`}
              />
            </button>

            {/* Dropdown Items */}
            <div
              className={`absolute right-0 mt-2 w-48 bg-popover border border-border rounded-lg shadow-xl transition-all duration-200 z-[100] ${isDropdownOpen ? "opacity-100 visible translate-y-0" : "opacity-0 invisible -translate-y-2"}`}
            >
              <button
                onClick={() => {
                  setIsDropdownOpen(false);
                  router.push("/profile");
                }}
                className="w-full px-4 py-3 text-left text-sm bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground flex items-center gap-2 rounded-t-lg transition"
              >
                <User className="w-4 h-4" />
                <span>My Profile</span>
              </button>
              <hr className="border-border" />
              <button
                onClick={handleLogout}
                className="w-full px-4 py-3 text-left text-sm bg-transparent text-destructive hover:bg-destructive/10 hover:text-destructive flex items-center gap-2 rounded-b-lg transition"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};
