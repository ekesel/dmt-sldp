"use client";

import React, { useState } from "react";
import { Card } from "@dmt/ui";
import {
  MessageSquare,
  Send,
  Trash2,
  Edit3,
  Wifi,
  WifiOff,
  Loader2,
  Newspaper,
} from "lucide-react";
import { useNews, NewsPost } from "../hooks/useNews";
import { useAuth } from "../context/AuthContext";

export function NewsFeed() {
  const { posts, status, error, createPost, updatePost, deletePost } =
    useNews();
  const { user } = useAuth();
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [category, setCategory] = useState("General");

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newContent) return;

    // Use actual author ID from auth context
    if (user?.id) {
      createPost({
        title: newTitle,
        content: newContent,
        category,
        author: user.id,
        media_file: null,
      });
    }

    setNewTitle("");
    setNewContent("");
  };

  const getStatusColor = () => {
    switch (status) {
      case "open":
        return "text-emerald-500"; // Keep emerald for success
      case "connecting":
        return "text-warning";
      case "error":
        return "text-destructive";
      case "closed":
        return "text-muted-foreground";
      default:
        return "text-muted-foreground";
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case "open":
        return <Wifi size={16} />;
      case "connecting":
        return <Loader2 size={16} className="animate-spin" />;
      case "error":
        return <WifiOff size={16} />;
      default:
        return <WifiOff size={16} />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Newspaper className="text-primary" />
          Live Newsfeed
        </h2>
        <div
          className={`flex items-center gap-2 text-sm font-medium ${getStatusColor()}`}
        >
          {getStatusIcon()}
          {status.toUpperCase()}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Post Creation Form (Always visible for demo, should be manager-only) */}
      <Card className="p-6 bg-card text-card-foreground border-border backdrop-blur-xl">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="bg-secondary border border-border rounded-lg px-4 py-2 text-secondary-foreground outline-none focus:border-primary transition-colors"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="bg-secondary border border-border rounded-lg px-4 py-2 text-secondary-foreground outline-none focus:border-primary"
            >
              <option>General</option>
              <option>Tech</option>
              <option>Announcement</option>
              <option>News</option>
            </select>
          </div>
          <textarea
            placeholder="What's happening?"
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            className="w-full bg-secondary border border-border rounded-lg px-4 py-2 text-secondary-foreground outline-none focus:border-primary transition-colors min-h-[100px]"
          />
          <button
            type="submit"
            disabled={status !== "open"}
            className="flex items-center gap-2 px-6 py-2 rounded-lg bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={18} />
            Post Update
          </button>
        </form>
      </Card>

      {/* Posts List */}
      <div className="space-y-4">
        {posts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-2xl">
            No posts yet. Be the first to start the conversation!
          </div>
        ) : (
          posts.map((post) => (
            <Card
              key={post.post_id}
              className="p-6 bg-card text-card-foreground border-border hover:border-primary/20 transition-all group"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                    {post.author.username[0].toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">{post.title}</h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{post.author.username}</span>
                      <span>•</span>
                      <span>{post.category}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => deletePost(post.post_id)}
                    className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <p className="mt-4 text-muted-foreground leading-relaxed text-sm">
                {post.content}
              </p>
              <div className="mt-4 pt-4 border-t border-border text-[10px] text-muted-foreground font-mono">
                {post.created_at}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
