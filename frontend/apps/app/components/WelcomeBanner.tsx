"use client";
import React from "react";
import Image from "next/image";
import { MessageSquare } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export const WelcomeBanner: React.FC = () => {
  const { user } = useAuth();
  const firstName = user?.first_name || "Danish";
  const role = user?.custom_title || "HR Manager";
  const joinedDate = "Jan 2020";

  return (
    <div className="relative w-full bg-card rounded-[1.5rem] overflow-hidden shadow-sm border border-border/40 min-h-[16.25rem] md:min-h-[30rem] lg:min-h-[22rem] xl:min-h-[16.25rem] xl:h-[16.25rem] flex flex-col xl:flex-row items-center p-4 xl:p-0 xl:pr-5 xl:pt-1 xl:pb-0 group">


      <div className="flex flex-col xl:flex-row w-full items-center xl:items-stretch justify-between gap-4 xl:gap-6 relative z-10 h-full">
        {/* Left Section: Greeting + Illustration */}
        <div className="flex-1 flex flex-col pt-3 pb-0 items-center xl:items-start text-center xl:text-left">
          <div className="flex-shrink-0 px-4 xl:pl-6 xl:pr-4">
            <h1 className="text-[1.25rem] lg:text-[1.375rem] xl:text-[1.5rem] font-black text-card-foreground leading-[1.1] tracking-tight mb-2">
              Good Morning, {firstName}!
            </h1>
          </div>

          {/* Illustration Section below Greeting */}
          <div className="flex-1 flex justify-center items-end relative overflow-hidden">
            <div className="relative max-w-[26.25rem] w-full h-[11.25rem] md:h-[17.5rem] lg:h-[13rem] xl:h-[11.25rem] mix-blend-multiply flex justify-center items-end">
              <Image
                src="/assets/welcome.png"
                alt="Welcome Illustration"
                width={420}
                height={280}
                className="object-contain object-bottom scale-100 transition-transform duration-500"
                priority
              />
            </div>
          </div>
        </div>

        {/* Right Section: Profile Segment */}
        <div className="flex-shrink-0 flex flex-col items-center justify-center gap-3 xl:gap-2 pb-2 xl:pb-0 xl:pr-4">
          <div className="flex flex-col items-center">
            <div className="relative w-14 h-14 mb-1.5">
              <div className="absolute inset-0 rounded-full border-[0.09375rem] border-border shadow-md" />
              <div className="w-full h-full rounded-full overflow-hidden">
                <Image
                  src={user?.avatar_url || "https://i.pravatar.cc/150?u=danish"}
                  alt="Profile"
                  width={56}
                  height={56}
                  className="object-cover"
                  unoptimized
                />
              </div>
            </div>
            <div className="text-center">
              <h3 className="text-[0.9375rem] font-black text-card-foreground leading-tight mb-0.5">{role}</h3>
              <p className="text-[0.625rem] text-muted-foreground font-bold">Joined: {joinedDate}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-0.5">
            <div className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-xl shadow-sm">
              <div className="bg-primary p-1 rounded-md shadow-sm">
                <svg width="0.5rem" height="0.5rem" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-primary-foreground" strokeWidth="0.25rem" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                  <path d="m9 13 2 2 4-4"></path>
                </svg>
              </div>
              <span className="text-primary font-black text-[0.6875rem] whitespace-nowrap">23 Active Tasks</span>
            </div>
            <button className="bg-primary hover:bg-primary/90 p-2 rounded-xl text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95 flex-shrink-0">
              <MessageSquare className="w-3.5 h-3.5 fill-current" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
