import React from "react";
import { FeaturedNews } from "./FeaturedNews";
import { NewsQueueList } from "./NewsQueueList";

export const LatestNews: React.FC = () => {
  const featured = {
    content: "Excited to welcome everyone to our newly renovated headquarters! The modern design reflects our commitment to innovation and collaboration. Take a peek at the new lobby!",
    author: {
      name: "Sarah Chen",
      role: "Chief Operations Officer",
      avatar: "https://i.pravatar.cc/100?img=5",
    },
    timestamp: "2 hours ago",
    likes: 124,
    comments: 1,
  };

  const list = [
    {
      id: 1,
      content: "Congratulations to the Platform team for securing the 'Excellence in Engin...",
      author: "Alex Rivira",
      timestamp: "Yesterday",
      tag: "Priority",
    },
    {
      id: 2,
      content: "Friday afternoon vibes in the Collaborate Hub. Great to see teams crossing...",
      author: "Jordan Smith",
      timestamp: "2 days ago",
      tag: "Fresh",
    },
  ];

  return (
    <div className="rounded-2xl overflow-hidden shadow-sm bg-background border border-border">
      {/* FEATURED SECTION */}
      <FeaturedNews featured={featured} />

      {/* QUEUE SECTION */}
      <NewsQueueList items={list} />
    </div>
  );
};

export default LatestNews;
