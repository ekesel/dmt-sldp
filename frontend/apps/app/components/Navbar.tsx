"use client";
import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { dashboard, getFileUrl } from "@dmt/api";
import { Menu, LogOut, User, ChevronDown, Search, FileText } from "lucide-react";
import Image from "next/image";
import { NotificationBell } from "./NotificationBell";

interface NavbarProps {
  onMenuClick?: () => void;
  isMenuOpen: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ onMenuClick, isMenuOpen }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>("");
  const [searchValue, setSearchValue] = useState<string>("");
  const [dropdownResults, setDropdownResults] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    const q = searchParams?.get("q") || "";
    setSearchValue(q);
    setShowDropdown(false);
  }, [searchParams]);

  useEffect(() => {
    // TODO: When backend API search is ready, replace this logic with an API call 
    // to fetch the top 5 suggestions for `searchValue`.
    if (!searchValue.trim() || !isFocused) {
      setDropdownResults([]);
      setShowDropdown(false);
      return;
    }

    const fetchResults = async () => {
      try {
        const [policiesData, learningData] = await Promise.all([
           dashboard.getPolicies().catch(() => []),
           dashboard.getLearningAndDevelopment().catch(() => [])
        ]);

        const policies = Array.isArray(policiesData) ? policiesData : [];
        const learningDocs = Array.isArray(learningData) ? learningData : [];

        const allDocs = [
          ...policies.map((p: any) => ({ ...p, type: 'Policy', file: p.policy_file })),
          ...learningDocs.map((l: any) => ({ ...l, type: 'Learning', file: l.learning_and_development_file }))
        ];

        const query = searchValue.toLowerCase();
        const getFileName = (url: string) => {
            if (!url) return '';
            const parts = url.split('/');
            return decodeURIComponent(parts[parts.length - 1]);
        };

        const filteredDocs = allDocs.filter(doc => {
            const fileName = getFileName(doc.file).toLowerCase();
            return fileName.startsWith(query);
        });

        setDropdownResults(filteredDocs.slice(0, 5));
        setShowDropdown(true);
      } catch (err) {
        console.error("Failed to fetch dropdown search results", err);
      }
    };

    const debounce = setTimeout(fetchResults, 300);
    return () => clearTimeout(debounce);
  }, [searchValue, isFocused]);

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

        {/* Middle Section: Search Bar */}
        <div className="hidden md:flex flex-1 max-w-xl px-4 lg:px-8 relative">
          <div className="relative w-full">
            <input 
              type="text" 
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="Search documents..." 
              className="w-full bg-primary-foreground/10 hover:bg-primary-foreground/20 focus:bg-primary-foreground/20 border border-primary-foreground/10 rounded-md py-1.5 px-4 pr-10 text-primary-foreground placeholder:text-primary-foreground/60 outline-none transition-colors text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchValue.trim()) {
                  setShowDropdown(false);
                  router.push(`/search?q=${encodeURIComponent(searchValue.trim())}`);
                }
              }}
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <Search className="w-4 h-4 text-primary-foreground/60" />
            </div>

            {/* Dropdown for search results */}
            {showDropdown && dropdownResults.length > 0 && (
              <div 
                className="absolute top-full left-0 right-0 mt-2 bg-card text-card-foreground border border-border rounded-md shadow-lg z-50 overflow-hidden"
                onMouseDown={(e) => e.preventDefault()}
              >
                {dropdownResults.map((doc, idx) => {
                  const getFileName = (url: string) => {
                    if (!url) return '';
                    const parts = url.split('/');
                    return decodeURIComponent(parts[parts.length - 1]);
                  };
                  const fileName = getFileName(doc.file).replace(/\.[^/.]+$/, "");
                  const fileUrl = getFileUrl(doc.file);
                  const lowerUrl = fileUrl.toLowerCase();
                  const isOfficeFile = lowerUrl.match(/\.(doc|docx|xls|xlsx|ppt|pptx)$/);
                  const viewerUrl = isOfficeFile ? `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(fileUrl)}` : fileUrl;
                  
                  return (
                    <a 
                      key={`${doc.type}-${doc.id}-${idx}`}
                      href={viewerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setShowDropdown(false)}
                      className="flex items-center gap-3 p-3 hover:bg-muted cursor-pointer transition-colors border-b border-border last:border-b-0"
                    >
                      <div className="bg-primary/10 p-2 rounded-md text-primary shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{fileName}</p>
                        <p className="text-xs text-muted-foreground">{doc.type}</p>
                      </div>
                    </a>
                  );
                })}
                <div 
                  className="p-2 text-center text-xs font-semibold text-primary hover:bg-muted cursor-pointer transition-colors"
                  onClick={() => {
                    setShowDropdown(false);
                    router.push(`/search?q=${encodeURIComponent(searchValue.trim())}`);
                  }}
                >
                  View all results
                </div>
              </div>
            )}
            
            {showDropdown && dropdownResults.length === 0 && searchValue.trim() && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-card text-card-foreground border border-border rounded-md shadow-lg z-50 overflow-hidden p-4 text-center">
                <p className="text-sm text-muted-foreground">No documents found.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Section: Time, Notifications, Actions */}
        <div className="flex items-center gap-[0.5rem] md:gap-[1rem]">
          {/* Time Display */}
          <div className="hidden lg:block text-[0.875rem] font-semibold text-primary-foreground/90 whitespace-nowrap">
            {currentTime}
          </div>

          {/* Notifications */}
          <NotificationBell />


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
