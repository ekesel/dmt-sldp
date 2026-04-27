"use client";

import React from "react";
import { WelcomeBanner } from "../../../components/WelcomeBanner";
import { StarPerformer } from "../../../components/StarPerformer";
import { CelebrationsCard } from "../../../components/CelebrationsCard";
import { SocialNewsFeed } from "../../../components/SocialNewsFeed";
import { QuickAccessTiles } from "../../../components/QuickAccessTiles";
import EventsCalendar from "../../../components/EventsCalendar";

export default function HomePage() {
  return (
    <main className="bg-[#F3F4F6] px-4 pt-2 pb-10 lg:px-6 lg:pt-3 lg:pb-12 xl:pb-0 min-h-[calc(100vh-4rem)] xl:overflow-y-hidden">
      <div className="max-w-[100rem] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Row 1: Welcome Banner (6) + Calendar (3) + Star (3) */}
        {/* Row 1: Welcome Banner + Calendar + Star */}
        <div className="lg:col-span-8 xl:col-span-6">
          <WelcomeBanner />
        </div>
        <div className="lg:col-span-4 xl:col-span-3">
          <EventsCalendar />
        </div>
        <div className="lg:col-span-12 xl:col-span-3">
          <StarPerformer />
        </div>

        {/* Dynamic Bento Layout Below */}

        {/* Column 1: Quick Access Tiles */}
        <div className="lg:col-span-6 xl:col-span-4">
          <QuickAccessTiles />
        </div>

        {/* Column 2: Social News Feed */}
        <div className="lg:col-span-6 xl:col-span-4 flex flex-col h-full">
          <SocialNewsFeed />
        </div>

        {/* Column 3: Celebrations Card */}
        <div className="lg:col-span-12 xl:col-span-4 flex flex-col h-full">
          <CelebrationsCard />
        </div>
      </div>
    </main>
  );
}
