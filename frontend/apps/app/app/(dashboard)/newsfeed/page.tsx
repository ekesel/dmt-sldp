'use client';

import React from 'react';
import { Newspaper } from 'lucide-react';
import { NewsFeed } from '../../../components/NewsFeed';

export default function NewsfeedPage() {
  return (
    <main className="min-h-screen bg-background p-8 selection:bg-primary/30">
      <div className="max-w-7xl mx-auto space-y-8 mt-8">
        <header className="flex justify-between items-end border-b border-border pb-8">
          <div>
            <div className="flex items-center gap-2 text-primary text-sm font-bold tracking-wider uppercase mb-2">
              <Newspaper size={16} />
              Unified Newsfeed
            </div>
            <h1 className="text-4xl font-extrabold text-foreground tracking-tight flex items-center gap-3">
              Live Communications
            </h1>
            <p className="text-muted-foreground mt-2 font-medium">Real-time updates and announcements from team.</p>
          </div>
        </header>

        <section className="bg-muted text-muted-foreground rounded-2xl p-6 border border-border">
          <NewsFeed />
        </section>
      </div>
    </main>
  );
}
