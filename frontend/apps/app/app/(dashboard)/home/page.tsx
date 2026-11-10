"use client";

import React from "react";
import { WelcomeBanner } from "../../../components/WelcomeBanner";
import { StarPerformer } from "../../../components/StarPerformer";
import { CelebrationsCard } from "../../../components/CelebrationsCard";
import { SocialNewsFeed } from "../../../components/SocialNewsFeed";
import { QuickAccessTiles } from "../../../components/QuickAccessTiles";
import EventsCalendar from "../../../components/EventsCalendar";

/**
 * HomePage Component
 *
 * Renders the responsive dashboard home view featuring two multi-widget rows:
 * - Row 1: Welcome Banner (hero / greeting & profile), Events Calendar, and Star Performer
 * - Row 2: Quick Links (navigation shortcuts), Newsfeed (latest post & interactions), and Celebrations
 *
 * Responsive behavior:
 * - Mobile (< 768px): Single column stacked layout with touch-friendly spacing and fluid card heights
 * - Tablet & Medium screens (768px - 1279px): Two-column grid (12-col base) with full-width hero and celebrations
 * - Desktop (>= 1280px): Balanced 12-column layout (6/3/3 in row 1, 4/4/4 in row 2) that fits the viewport seamlessly
 */
export default function HomePage() {
  return (
    <main className="min-h-full xl:h-full flex flex-col bg-[#F3F4F6] px-3 py-3 sm:px-4 sm:py-4 md:px-6 md:py-4 xl:px-6 xl:py-4">
      {/* Inner container: flex column, fills available height on xl screens while scrolling naturally on smaller viewports */}
      <div className="max-w-[100rem] w-full mx-auto flex flex-col gap-3 sm:gap-4 flex-1 xl:min-h-0">

        {/* ── Row 1: Welcome Banner, Calendar, Star Performer ── */}
        <div className="grid grid-cols-1 md:grid-cols-12 xl:grid-cols-12 gap-3 sm:gap-4 flex-shrink-0">
          <div className="md:col-span-12 xl:col-span-6">
            <WelcomeBanner />
          </div>
          <div className="md:col-span-6 xl:col-span-3">
            <EventsCalendar />
          </div>
          <div className="md:col-span-6 xl:col-span-3">
            <StarPerformer />
          </div>
        </div>

        {/* ── Row 2: Quick Links, Social Newsfeed, Celebrations ── */}
        <div className="grid grid-cols-1 md:grid-cols-12 xl:grid-cols-12 gap-3 sm:gap-4 flex-1 min-h-[11.25rem] lg:min-h-[15.625rem] xl:min-h-0">
          {/* Quick Access Tiles */}
          <div className="md:col-span-6 xl:col-span-4 flex flex-col min-h-0">
            <QuickAccessTiles />
          </div>

          {/* Social News Feed */}
          <div className="md:col-span-6 xl:col-span-4 flex flex-col min-h-0">
            <SocialNewsFeed />
          </div>

          {/* Celebrations Card */}
          <div className="md:col-span-12 xl:col-span-4 flex flex-col min-h-0">
            <CelebrationsCard />
          </div>
        </div>

      </div>
    </main>
  );
}
