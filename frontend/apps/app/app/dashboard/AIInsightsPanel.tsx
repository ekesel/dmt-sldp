'use client';
import React, { useState, useEffect } from 'react';

interface Suggestion {
  title: string;
  impact: string;
  description: string;
}

interface AIInsight {
  id: number;
  summary: string;
  suggestions: Suggestion[];
  forecast: string;
  created_at: string;
}

export default function AIInsightsPanel() {
  const [insights, setInsights] = useState<AIInsight | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock data for now - will be replaced with API call
    setTimeout(() => {
      setInsights({
        id: 1,
        summary: "Your current DMT compliance is 84.2%. There are recurring issues with traceability.",
        suggestions: [
          {
            title: "Enforce PR Linkage",
            impact: "High",
            description: "75% of non-compliant items lack pull request links. Suggest automated reminders."
          },
          {
            title: "Optimize Code Review Time",
            impact: "Medium",
            description: "Average PR review time is 18 hours. Consider implementing review rotation."
          }
        ],
        forecast: "Moderate risk of delivery delays due to quality debt.",
        created_at: new Date().toISOString()
      });
      setLoading(false);
    }, 500);
  }, []);

  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl min-h-[300px]">
        <h3 className="font-semibold text-white mb-4">AI Insights</h3>
        <div className="flex items-center justify-center h-48">
          <div className="text-slate-500 italic">Loading insights...</div>
        </div>
      </div>
    );
  }

  const impactColors = {
    High: 'bg-red-500/10 border-red-500/20 text-red-300',
    Medium: 'bg-amber-500/10 border-amber-500/20 text-amber-300',
    Low: 'bg-blue-500/10 border-blue-500/20 text-blue-300',
  };

  return (
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-white">AI Insights</h3>
        <button className="text-xs text-slate-400 hover:text-white transition-colors">
          Refresh
        </button>
      </div>

      {insights && (
        <div className="space-y-4">
          <div className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-lg">
            <p className="text-sm text-slate-300">{insights.summary}</p>
          </div>

          <div className="space-y-2">
            {insights.suggestions.map((suggestion, idx) => (
              <div
                key={idx}
                className={`p-3 border rounded-lg ${impactColors[suggestion.impact as keyof typeof impactColors]}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{suggestion.title}</p>
                    <p className="text-xs text-slate-400 mt-1">{suggestion.description}</p>
                  </div>
                  <span className="text-xs font-medium ml-2">{suggestion.impact}</span>
                </div>
              </div>
            ))}
          </div>

          {insights.forecast && (
            <div className="pt-3 border-t border-slate-800">
              <p className="text-xs text-slate-500">
                <span className="font-medium">Forecast:</span> {insights.forecast}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
