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
    <div className="min-h-full lg:h-full flex flex-col bg-[#F3F4F6] px-4 pt-2 pb-3 lg:px-6 lg:pt-3 lg:pb-4">
      {/* Inner container: flex column, fills all available height */}
      <div className="max-w-[100rem] w-full mx-auto flex flex-col gap-4 flex-1 lg:min-h-0">

        {/* ── Row 1: shrinks to content height ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-shrink-0">
          <div className="lg:col-span-8 xl:col-span-6">
            <WelcomeBanner />
          </div>
          <div className="lg:col-span-4 xl:col-span-3">
            <EventsCalendar />
          </div>
          <div className="lg:col-span-12 xl:col-span-3">
            <StarPerformer />
          </div>
        </div>

        {/* ── Row 2: stretches to fill remaining viewport height ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-[11.25rem] lg:min-h-[15.625rem]">

          {/* Quick Access Tiles */}
          <div className="lg:col-span-6 xl:col-span-4 flex flex-col min-h-[11.25rem] lg:min-h-[15.625rem]">
            <QuickAccessTiles />
          </div>

          {/* Social News Feed */}
          <div className="lg:col-span-6 xl:col-span-4 flex flex-col min-h-[11.25rem] lg:min-h-[15.625rem]">
            <SocialNewsFeed />
          </div>

          {/* Celebrations Card */}
          <div className="lg:col-span-12 xl:col-span-4 flex flex-col min-h-[11.25rem] lg:min-h-[15.625rem]">
            <CelebrationsCard />
          </div>
        </div>

      </div>
    </div>
  );
}
