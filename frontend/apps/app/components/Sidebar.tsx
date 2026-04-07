"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldCheck,
  BarChart2,
  Settings,
  Shield,
  MessageSquare,
  LayoutDashboard,
  Trophy,
  Sparkles,
  Newspaper,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Gift,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { usePermissions } from "../hooks/usePermissions";

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
}

interface MenuItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
  section?: string;
}

const menuItems: MenuItem[] = [
  {
    icon: LayoutDashboard,
    label: "Dashboard",
    href: "/",
  },
  {
    icon: BarChart2,
    label: "Metrics",
    href: "/metrics",
  },
  {
    icon: Sparkles,
    label: "Sprint Analysis",
    href: "/sprint-analysis",
  },
  {
    icon: BarChart2,
    label: "Sprint Comparison",
    href: "/sprint-comparison",
  },
  {
    icon: ShieldCheck,
    label: "Compliance",
    href: "/compliance",
  },
  {
    icon: MessageSquare,
    label: "Messenger",
    href: "/notifications/send",
  },
  {
    icon: Newspaper,
    label: "Newsfeed",
    href: "/static-ui/newsfeed",
  },

  {
    icon: Trophy,
    label: "Leaderboard",
    href: "/leaderboard",
  },
  {
    icon: BookOpen,
    label: "Knowledge Base",
    href: "/knowledge-base",
  },
  {
    icon: Gift,
    label: "Birthdays",
    href: "/birthdays",
  },
];

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const pathname = usePathname();
  const { user } = useAuth();
  const { features } = usePermissions();
  const [isContentExpanded, setIsContentExpanded] = useState(true);

  // Define items that belong to the collapsible "Content" section
  const contentSectionLabels = [
    "Dashboard",
    "Metrics",
    "Sprint Analysis",
    "Sprint Comparison",
    "Compliance",
  ];

  // Filter and split menu items
  const visibleMenuItems = menuItems.filter((item) => {
    if (item.label === "Messenger") return features.canAccessMessenger;
    if (item.label === "Compliance") return features.canAccessCompliance;
    if (
      item.label === "Metrics" ||
      item.label === "Sprint Analysis" ||
      item.label === "Sprint Comparison"
    )
      return features.canAccessMetrics;
    return true;
  });

  const collapsibleItems = visibleMenuItems.filter(item => contentSectionLabels.includes(item.label));
  const alwaysVisibleItems = visibleMenuItems.filter(item => !contentSectionLabels.includes(item.label));

  const renderMenuItem = (item: MenuItem, isNested = false) => {
    const Icon = item.icon;
    const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onClose}
        className={`flex items-center gap-3 transition-all group/item ${isNested ? "pl-6 pr-3 py-2.5 rounded-md" : "px-4 py-3 rounded-lg"
          } ${isActive
            ? "bg-accent text-accent-foreground font-bold shadow-sm"
            : "text-primary-foreground font-medium hover:bg-muted hover:text-foreground"
          }`}
      >
        <Icon className={`${isNested ? "w-4.5 h-4.5" : "w-5 h-5"} flex-shrink-0 transition-colors ${isActive ? "text-accent-foreground" : "text-primary-foreground group-hover/item:text-foreground"
          }`} />
        <span className={isNested ? "text-[14px]" : "text-[15px]"}>{item.label}</span>
        {item.section && (
          <span
            className={`ml-auto text-[10px] px-1.5 py-0.5 rounded uppercase tracking-widest font-bold ${isActive
              ? "bg-accent-foreground text-accent border border-border"
              : "bg-secondary text-secondary-foreground border border-border"
              }`}
          >
            {item.section}
          </span>
        )}
        {isActive && (
          <div className={`ml-auto bg-accent-foreground rounded-full shadow-sm ${isNested ? "w-1.5 h-1.5" : "w-2 h-2"
            }`} />
        )}
      </Link>
    );
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-background z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-primary border-r border-border backdrop-blur-xl z-40 transition-transform duration-300 flex flex-col lg:translate-x-0 ${isOpen ? "translate-x-0" : "-translate-x-full"
          } lg:static lg:z-0`}
      >
        <nav className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-none">
          {/* Collapsible Content Section */}
          <div className="space-y-1">
            <div
              onClick={() => setIsContentExpanded(!isContentExpanded)}
              className="flex items-center justify-between w-full px-4 py-3 cursor-pointer group hover:bg-muted rounded-lg transition-colors border border-transparent hover:border-border"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-primary-foreground uppercase tracking-widest group-hover:text-foreground transition-colors">
                  DMT
                </span>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-primary-foreground group-hover:text-foreground transition-transform duration-300 ${isContentExpanded ? "rotate-0" : "-rotate-90"
                  }`}
              />
            </div>

            <div
              className={`transition-all duration-300 ease-in-out origin-top border-l-2 border-border ml-4 pl-2 space-y-1 ${isContentExpanded
                ? "opacity-100 max-h-[1000px] mt-1"
                : "opacity-0 max-h-0 overflow-hidden pointer-events-none mt-0"
                }`}
            >
              {collapsibleItems.map(item => renderMenuItem(item, true))}
            </div>
          </div>

          {/* Always Visible Items */}
          <div className="pt-2 space-y-2">
            {alwaysVisibleItems.map(item => renderMenuItem(item, false))}
          </div>
        </nav>


      </aside>
    </>
  );
};
