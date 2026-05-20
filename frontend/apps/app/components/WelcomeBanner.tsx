"use client";
import React from "react";
import Image from "next/image";
import { useAuth } from "../context/AuthContext";

export const WelcomeBanner: React.FC = () => {
  const { user } = useAuth();
  
  const greetingName = user?.first_name || user?.username || "User";
  const fullName = user?.first_name 
    ? `${user.first_name} ${user.last_name || ""}`.trim() 
    : (user?.username || "Guest User");

  const [greeting, setGreeting] = React.useState("Good Morning");

  React.useEffect(() => {
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
    <div className="relative w-full bg-card rounded-[1.5rem] overflow-hidden shadow-sm border border-border/40 min-h-[16.25rem] md:min-h-[30rem] lg:min-h-[22rem] xl:min-h-[16.25rem] xl:h-[16.25rem] flex flex-col xl:flex-row items-center p-4 xl:p-0 xl:pr-5 xl:pt-1 xl:pb-0 group">


      <div className="flex flex-col xl:flex-row w-full items-center xl:items-stretch justify-between gap-4 xl:gap-6 relative z-10 h-full">
        {/* Left Section: Greeting + Illustration */}
        <div className="flex-1 flex flex-col pt-3 pb-0 items-center xl:items-start text-center xl:text-left">
          <div className="flex-shrink-0 px-4 xl:pl-6 xl:pr-4">
            <h1 className="text-[1.25rem] lg:text-[1.375rem] xl:text-[1.5rem] font-black text-card-foreground leading-[1.1] tracking-tight mb-2">
              {greeting}, <span className="text-accent">{greetingName}!</span>
            </h1>
          </div>

          {/* Illustration Section below Greeting */}
          <div className="flex-1 flex justify-center items-end relative overflow-hidden">
            <div className="relative max-w-[34rem] w-full h-[12.5rem] md:h-[19rem] lg:h-[14.5rem] xl:h-[13rem] mix-blend-multiply flex justify-center items-end [mask-image:linear-gradient(to_right,black_55%,transparent_95%)] [webkit-mask-image:linear-gradient(to_right,black_55%,transparent_95%)]">
              <Image
                src="/assets/welcome2.png"
                alt="Welcome Illustration"
                width={540} 
                height={280}
                className="w-[125%] max-w-none h-full object-cover object-bottom scale-100 transition-transform duration-500"
                priority
              />
            </div>
          </div>
        </div>

        {/* Right Section: Profile Segment */}
        <div className="flex-shrink-0 flex flex-col items-center justify-center pb-4 xl:pb-0 xl:pr-6 xl:pl-4">
          <div className="flex flex-col items-center">
            <div className="relative w-16 h-16 md:w-20 md:h-20 mb-2.5">
              <div className="absolute inset-0 rounded-full border-[0.125rem] border-border shadow-md" />
              <div className="w-full h-full rounded-full overflow-hidden">
                <Image
                  src={user?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(greetingName)}&background=random&color=fff&size=128&bold=true`}
                  alt="Profile"
                  width={80}
                  height={80}
                  className="object-cover"
                  unoptimized
                />
              </div>
            </div>
            <div className="text-center">
              <h3 className="text-[1rem] md:text-[1.125rem] font-black text-card-foreground leading-tight">{fullName}</h3>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
