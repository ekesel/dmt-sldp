"use client";
import React from "react";
import Image from "next/image";
import { useAuth } from "../context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { dashboard } from "@dmt/api";

const formatJoinDate = (dateStr?: string) => {
  if (!dateStr) return "";
  try {
    const dateObj = new Date(dateStr);
    if (Number.isNaN(dateObj.getTime()) || !Number.isFinite(dateObj.getTime())) {
      return dateStr || "";
    }
    return dateObj.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch (e) {
    return dateStr;
  }
};

export const WelcomeBanner: React.FC = () => {
  const { user } = useAuth();
  
  const greetingName = user?.first_name || user?.username || "User";
  const fullName = user?.first_name 
    ? `${user.first_name} ${user.last_name || ""}`.trim() 
    : (user?.username || "Guest User");

  const { data: sprintTaskSummary } = useQuery({
    queryKey: ["user-sprint-task-summary"],
    queryFn: () => dashboard.getUserSprintTaskSummary(),
  });

  const completedTasks: number = sprintTaskSummary?.data?.done || 0;
  const totalTasks: number = (sprintTaskSummary?.data?.active || 0) + completedTasks;
  const percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const [mounted, setMounted] = React.useState(false);
  const [greeting, setGreeting] = React.useState("");

  React.useEffect(() => {
    setMounted(true);
    const hours = new Date().getHours();
    if (hours < 12) {
      setGreeting("Good Morning");
    } else if (hours < 17) {
      setGreeting("Good Afternoon");
    } else {
      setGreeting("Good Evening");
    }
  }, []);

  return (
    <div className="relative w-full bg-card rounded-2xl overflow-hidden shadow-sm border border-border/40 min-h-[14rem] sm:min-h-[15rem] md:min-h-[16.25rem] xl:h-[16.25rem] flex flex-col sm:flex-row items-center p-3 sm:p-4 xl:p-0 xl:pr-5 xl:pt-1 xl:pb-0 group">
      <div className="flex flex-col sm:flex-row w-full items-center sm:items-stretch justify-between gap-3 sm:gap-4 xl:gap-6 relative z-10 h-full">
        {/* Left Section: Greeting + Illustration */}
        <div className="flex-1 flex flex-col pt-2 sm:pt-3 pb-0 items-center sm:items-start text-center sm:text-left min-w-0">
          <div className="flex-shrink-0 px-2 sm:px-4 xl:pl-6 xl:pr-4">
            <h1
              suppressHydrationWarning
              className="text-lg sm:text-xl md:text-2xl font-black text-card-foreground leading-tight tracking-tight mb-1 sm:mb-2"
            >
              {mounted ? greeting : "Welcome"}, <span className="text-[var(--color-access)]">{mounted ? greetingName : "User"}!</span>
            </h1>
          </div>

          {/* Illustration Section below Greeting */}
          <div className="flex-1 flex justify-center items-end relative overflow-hidden w-full">
            <div className="relative max-w-full sm:max-w-[34rem] w-full h-28 sm:h-32 md:h-36 lg:h-40 xl:h-[13rem] mix-blend-multiply flex justify-center items-end [mask-image:linear-gradient(to_right,black_55%,transparent_95%)] [-webkit-mask-image:linear-gradient(to_right,black_55%,transparent_95%)]">
              <Image
                src="/assets/welcome2.png"
                alt="Welcome Illustration"
                width={540} 
                height={280}
                className="w-auto max-w-full h-full object-contain object-bottom scale-100 transition-transform duration-500"
                priority
              />
            </div>
          </div>
        </div>

        {/* Right Section: Profile Segment */}
        <div className="flex-shrink-0 flex flex-col items-center justify-center pb-2 sm:pb-0 xl:pr-6 xl:pl-4">
          <div className="flex flex-col items-center">
            <div className="relative w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 mb-2">
              <div className="absolute inset-0 rounded-full border-2 border-border shadow-md" />
              <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center">
                <Image
                  src={user?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(greetingName)}&background=random&color=fff&size=128&bold=true`}
                  alt="Profile"
                  width={80}
                  height={80}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              </div>
            </div>
            <div className="text-center flex flex-col items-center w-full">
              <h3 className="text-sm sm:text-base md:text-lg font-black text-card-foreground leading-tight truncate max-w-[12rem]">{fullName}</h3>
              {user?.date_of_join && (
                <div className="mt-1 flex items-center gap-1.5 text-xs font-bold text-muted-foreground bg-secondary/60 px-2.5 py-0.5 rounded-full border border-border/40 hover:bg-secondary transition-all duration-300">
                  <svg
                    className="w-3.5 h-3.5 text-accent"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <span>Joined: {formatJoinDate(user.date_of_join)}</span>
                </div>
              )}

              {/* Task Done Progress */}
              {totalTasks > 0 && (
                <div className="mt-2 w-full flex flex-col items-center gap-1">
                  <div className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                    <span>Task Done:</span>
                    <span className="text-[var(--color-accent)]">{completedTasks}</span>
                    <span>/ {totalTasks}</span>
                  </div>
                  <div className="w-28 sm:w-32 h-4 sm:h-[1.125rem] rounded-full relative flex items-center bg-[var(--color-accent)]/20 overflow-hidden">
                    <div className="absolute inset-0 bg-[var(--color-accent)] opacity-20 dark:opacity-30 mix-blend-multiply dark:mix-blend-screen rounded-full" />
                    <div className="absolute top-0 left-0 h-full bg-[var(--color-accent)] rounded-full transition-all duration-500" style={{ width: `${percentage}%` }} />
                    <div className="absolute top-0 left-0 h-full w-full flex items-center">
                      <span 
                        className={`text-[0.65rem] font-bold leading-none absolute transition-all duration-500 ${
                          percentage >= 25 
                            ? 'text-accent-foreground' 
                            : 'text-accent'
                        }`}
                        style={{ 
                          left: percentage >= 25 ? `calc(${percentage}% - 0.5rem)` : `calc(${percentage}% + 0.5rem)`,
                          transform: percentage >= 25 ? 'translateX(-100%)' : 'none'
                        }}
                      >
                        {percentage}%
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
