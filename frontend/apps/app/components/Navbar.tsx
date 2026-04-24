"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { Menu, LogOut, User, ChevronDown, Search, Plus } from "lucide-react";
import Image from "next/image";
import { NotificationBell } from "./NotificationBell";

interface NavbarProps {
  onMenuClick?: () => void;
  isMenuOpen: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ onMenuClick, isMenuOpen }) => {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      };

      // Format: Oct 23, 2023 - 10:15 AM
      const formatted = new Intl.DateTimeFormat('en-US', options).format(now);
      const [date, time] = formatted.split(', ');
      // The split/reformat might vary by locale, let's use a simpler approach
      const parts = new Intl.DateTimeFormat('en-US', options).formatToParts(now);
      const month = parts.find(p => p.type === 'month')?.value;
      const day = parts.find(p => p.type === 'day')?.value;
      const year = parts.find(p => p.type === 'year')?.value;
      const hour = parts.find(p => p.type === 'hour')?.value;
      const minute = parts.find(p => p.type === 'minute')?.value;
      const dayPeriod = parts.find(p => p.type === 'dayPeriod')?.value;

      setCurrentTime(`${month} ${day}, ${year} - ${hour}:${minute} ${dayPeriod}`);
    };

    updateTime();
    const timer = setInterval(updateTime, 60000);
    return () => clearInterval(timer);
  }, []);

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
    <nav className="bg-primary text-primary-foreground sticky top-0 z-40 h-[4rem] border-b border-primary-foreground/10">
      <div className="px-[1rem] md:px-[1.5rem] h-full flex items-center justify-between gap-[0.5rem] md:gap-[1rem]">
        {/* Left Section: Logo & Branding */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onMenuClick}
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMenuOpen}
            aria-controls="navbar-menu"
            className="p-[0.5rem] hover:bg-primary-foreground/10 rounded-[0.5rem] transition lg:hidden"
          >
            <Menu className="w-[1.25rem] h-[1.25rem] text-primary-foreground" />
          </button>

          <div className="flex items-center">
            <Image
              src="/assets/image.png"
              alt="Samta Logo"
              width={250}
              height={56}
              className="h-[2rem] sm:h-[2.5rem] md:h-[3rem] w-auto object-left brightness-0 invert transform scale-125 sm:scale-150 origin-left ml-[0.5rem]"
              priority
            />
          </div>
        </div>

        {/* Center Section: Search Bar (Responsive) */}
        <div className="flex-1 max-w-[36rem] hidden min-[1366px]:flex items-center">
          <div className="relative w-full group">
            <input
              type="text"
              placeholder="Search people, documents..."
              className="w-full bg-primary-foreground/10 backdrop-blur-md border border-primary-foreground/20 rounded-[0.375rem] py-[0.5rem] pl-[1rem] pr-[2.5rem] text-[0.875rem] text-primary-foreground placeholder:text-primary-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary-foreground/30 transition-all font-medium"
            />
            <Search className="absolute right-[0.75rem] top-1/2 -translate-y-1/2 w-[1rem] h-[1rem] text-primary-foreground/60 group-hover:text-primary-foreground transition-colors" />
          </div>
        </div>

        {/* Right Section: Time, Notifications, Avatars, Actions */}
        <div className="flex items-center gap-[0.5rem] md:gap-[1rem]">
          {/* Time Display */}
          <div className="hidden lg:block text-[0.875rem] font-semibold text-primary-foreground/90 whitespace-nowrap">
            {currentTime}
          </div>

          {/* Search Icon: Visible only on screens < 1366px */}
          <button className="flex min-[1366px]:hidden p-[0.5rem] hover:bg-primary-foreground/10 rounded-[0.5rem] transition">
            <Search className="w-[1rem] h-[1rem] md:w-[1.25rem] md:h-[1.25rem] text-primary-foreground" />
          </button>

          {/* Notifications */}
          <NotificationBell />

          {/* Avatar Group */}
          <div className="hidden xl:flex items-center -space-x-[0.5rem] mr-[0.5rem]">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="w-[2rem] h-[2rem] rounded-full border-2 border-primary bg-muted overflow-hidden ring-1 ring-black/5">
                <Image
                  src={`https://i.pravatar.cc/150?u=${i + 10}`}
                  alt={`Team Member ${i}`}
                  width={32}
                  height={32}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              </div>
            ))}
            <div className="w-[2rem] h-[2rem] rounded-full bg-primary border-2 border-primary flex items-center justify-center text-[0.625rem] font-bold text-primary-foreground ring-1 ring-black/5">
              +12
            </div>
          </div>

          {/* Action Button */}
          <button className="bg-accent hover:bg-accent/90 text-accent-foreground p-[0.5rem] rounded-[0.5rem] shadow-md hover:shadow-lg transition-all active:scale-95 shrink-0">
            <Plus className="w-[1.25rem] h-[1.25rem]" />
          </button>

          {/* User Profile */}
          <div className="relative flex items-center pl-[0.5rem] ml-[0.5rem] md:pl-[0.75rem] md:ml-[0.75rem] border-l border-primary-foreground/20">
            <div className="relative group cursor-pointer" onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
              <div className="w-[2.25rem] h-[2.25rem] md:w-[2.5rem] md:h-[2.5rem] rounded-full border-2 border-primary-foreground/40 overflow-hidden hover:border-primary-foreground transition-colors">
                {user?.avatar_url ? (
                  <Image
                    src={user.avatar_url}
                    alt="Profile"
                    width={40}
                    height={40}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full bg-primary-foreground/20 flex items-center justify-center">
                    <span className="text-primary-foreground font-semibold text-sm">
                      {(user?.first_name?.[0] || user?.username?.[0] || "U").toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              {/* Status Indicator */}
              <div className="absolute bottom-0 right-0 w-[0.75rem] h-[0.75rem] bg-green-500 border-2 border-primary rounded-full"></div>
            </div>

            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              aria-label="Toggle profile menu"
              aria-expanded={isDropdownOpen}
              aria-haspopup="true"
              aria-controls="profile-dropdown"
              className="ml-[0.25rem] p-[0.25rem] hover:bg-primary-foreground/10 rounded-[0.25rem] transition"
            >
              <ChevronDown
                className={`w-[1rem] h-[1rem] text-primary-foreground transition ${isDropdownOpen ? "rotate-180" : ""}`}
              />
            </button>

            {/* Dropdown Menu */}
            <div
              id="profile-dropdown"
              className={`absolute right-0 top-[3.5rem] md:top-[3.75rem] w-[12rem] bg-popover text-popover-foreground rounded-[0.5rem] shadow-2xl transition-all duration-200 z-[100] border border-border ${isDropdownOpen ? "opacity-100 visible translate-y-0" : "opacity-0 invisible -translate-y-2"
                }`}
            >
              <div className="px-[1rem] py-[0.75rem] border-b border-border">
                <p className="text-[0.875rem] font-bold truncate">{user?.first_name || user?.username || "Guest"}</p>
                <p className="text-[0.75rem] text-muted-foreground truncate">{user?.custom_title || "Company User"}</p>
              </div>
              <button
                onClick={() => {
                  setIsDropdownOpen(false);
                  router.push("/profile");
                }}
                className="w-full px-[1rem] py-[0.625rem] text-left text-[0.875rem] hover:bg-accent hover:text-accent-foreground flex items-center gap-[0.5rem] transition"
              >
                <User className="w-[1rem] h-[1rem] text-muted-foreground" />
                <span>My Profile</span>
              </button>
              <hr className="border-border" />
              <button
                onClick={handleLogout}
                className="w-full px-[1rem] py-[0.625rem] text-left text-[0.875rem] text-destructive hover:bg-destructive/10 flex items-center gap-[0.5rem] rounded-b-[0.5rem] transition"
              >
                <LogOut className="w-[1rem] h-[1rem]" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};
