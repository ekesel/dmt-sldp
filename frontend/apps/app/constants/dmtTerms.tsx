import React from "react";

export interface DMTTerm {
  id: string;
  title: string;
  description: React.ReactNode;
}

export const dmtTerms: DMTTerm[] = [
  {
    id: "velocity",
    title: "Velocity",
    description: (
      <div className="space-y-2">
        <p><strong>Meaning:</strong> Shows how much work a team finishes in one sprint (for example, 2 weeks). It helps answer: <em>How fast is the team working?</em></p>
        <p><strong>How it is calculated:</strong> Each task is given <strong>Story Points</strong> based on effort or difficulty. At the end of the sprint, only fully completed tasks are counted.</p>
        <p><strong>Formula:</strong> Velocity = ∑(Story Points of all Done Work Items)</p>
      </div>
    )
  },
  {
    id: "throughput",
    title: "Throughput",
    description: (
      <div className="space-y-2">
        <p><strong>Meaning:</strong> Shows the total number of tasks or tickets the team completes in one sprint, no matter how big or small they are. It answers: <em>How many items did we finish?</em></p>
        <p><strong>Formula:</strong> Throughput = Count of all Work Items where status = Done</p>
      </div>
    )
  },
  {
    id: "item_volume",
    title: "Item Volume",
    description: (
      <div className="space-y-2">
        <p><strong>Meaning:</strong> Item Volume is simply the number of tasks (tickets) in a sprint. It doesn't care how big or hard the tasks are; it just counts them.</p>
        <p><strong>How it's calculated:</strong></p>
        <ul className="list-disc pl-4 space-y-1">
          <li><strong>Total Volume:</strong> The total number of tasks you were supposed to do.</li>
          <li><strong>Completed Volume:</strong> The number of tasks you actually finished (moved to "Done").</li>
        </ul>
        <p><strong>Example:</strong> If you were given 10 tasks and you finished 7 of them:</p>
        <ul className="list-disc pl-4 space-y-1">
          <li>Your Total Volume is 10.</li>
          <li>Your Completed Volume is 7.</li>
        </ul>
      </div>
    )
  },
  {
    id: "defect_density",
    title: "Defect Density",
    description: (
      <div className="space-y-2">
        <p><strong>Meaning:</strong> Checks quality by measuring how many bugs are found compared to the amount of work completed. It answers: <em>Are we maintaining quality while working fast?</em></p>
        <p><strong>Formula:</strong> (Total Bugs / Total Story Points Delivered) × 100</p>
      </div>
    )
  },
  {
    id: "cycle_time",
    title: "Cycle Time",
    description: (
      <div className="space-y-2">
        <p><strong>Meaning:</strong> Shows how long it takes to complete a task after work has started. It answers: <em>Once we start a task, how quickly is it finished?</em></p>
        <p><strong>How it is calculated:</strong> Finds the difference between the start date and the finish date for each completed task, then calculates the average.</p>
      </div>
    )
  },
  {
    id: "forecast",
    title: "Delivery Forecast (Monte Carlo Simulation)",
    description: (
      <div className="space-y-2">
        <p><strong>Meaning:</strong> Helps predict when the remaining tasks of a project will be completed. It answers: <em>When will this project be finished?</em></p>
        <p><strong>How it is calculated:</strong> Uses Monte Carlo Simulation. It checks past Cycle Time and runs thousands of random simulations to find the most likely completion date.</p>
      </div>
    )
  },
  {
    id: "pr_health",
    title: "PR Health (Code Review Speed)",
    description: (
      <div className="space-y-2">
        <p><strong>Meaning:</strong> Measures how long it takes for code to get its first review after a developer submits it.</p>
        <p><strong>Formula:</strong> Average Review Speed = ∑(Time to First Reviews) / Total Pull Requests</p>
      </div>
    )
  },
  {
    id: "ai_usage",
    title: "AI Usage",
    description: (
      <div className="space-y-2">
        <p><strong>Meaning:</strong> Represents the self-reported (or custom-tracked) percentage of AI assistance the developer used to complete their tasks.</p>
        <p><strong>How it is calculated:</strong> Extracts values from work items and averages the percentages of all completed Work Items during the sprint.</p>
      </div>
    )
  },
  {
    id: "objective_ai",
    title: "Objective AI",
    description: (
      <div className="space-y-2">
        <p><strong>Meaning:</strong> A smart, automated system that directly reads the code written by the developer and automatically figures out how much of that code was actually written by AI (like ChatGPT or Copilot).</p>
        <p><strong>How it is calculated:</strong> Code is scanned via PRDiffAnalyzer which identifies patterns to assign an AI percentage score for the new code submitted.</p>
      </div>
    )
  },

  {
    id: "compliance",
    title: "Compliance",
    description: (
      <div className="space-y-2">
        <p><strong>Meaning:</strong> Shows how well a person follows the company's process rules and standards (like filling ticket descriptions, linking code, updating status).</p>
        <p><strong>Formula:</strong> (Number of Compliant Tasks / Total Number of Tasks) × 100</p>
      </div>
    )
  },
  {
    id: "bugs_resolved",
    title: "Bugs Resolved",
    description: (
      <div className="space-y-2">
        <p><strong>Meaning:</strong> Indicates the exact number of defects the team has successfully fixed in recent sprints.</p>
        <p><strong>How it is calculated:</strong> Counts all tickets labeled as "Bug" that were moved to "Done" in the last 5 sprints.</p>
      </div>
    )
  },
  {
    id: "quality_gap",
    title: "Quality Gap / Bugs",
    description: (
      <div className="space-y-2">
        <p><strong>Meaning:</strong> Indicates the number of errors, defects, or quality issues found in the delivered work.</p>
      </div>
    )
  },
  {
    id: "relative_velocity",
    title: "Relative Velocity",
    description: (
      <div className="space-y-2">
        <p><strong>Meaning:</strong> Compares how much work a developer completed relative to the team's average.</p>
      </div>
    )
  },
  {
    id: "what_dmt_means",
    title: "What DMT Means",
    description: (
      <div className="space-y-2">
        <p><strong>DMT</strong> stands for <strong>Done Means Tested</strong>.</p>
        <p>It is a quality control framework ensuring a work item is only considered truly "Done" if it passes all required testing, documentation, and review standards.</p>
      </div>
    )
  },
  {
    id: "dmt_rules",
    title: "DMT Compliance Rules",
    description: (
      <div className="space-y-2">
        <p>A work item passes only if it meets all these checks:</p>
        <ul className="list-decimal pl-4 space-y-1">
          <li>Acceptance Criteria (AC) Quality</li>
          <li>Unit Testing (completed)</li>
          <li>Code Coverage (meets threshold)</li>
          <li>Pull Request (PR) Link included</li>
          <li>CI Evidence (successful build)</li>
          <li>Peer Review + DMT Signoff</li>
          <li>Exception Management (if applicable)</li>
        </ul>
      </div>
    )
  },
  {
    id: "dmt_compliance",
    title: "Overall Health (Project Compliance Rate)",
    description: (
      <div className="space-y-2">
        <p><strong>Meaning:</strong> The project's overall "passing grade". Shows the percentage of work items that successfully pass all DMT quality checks.</p>
        <p><strong>Formula:</strong> (Compliant Work Items / Total Work Items) × 100</p>
      </div>
    )
  },
  {
    id: "critical_violations",
    title: "Critical / Blocking Violations",
    description: (
      <div className="space-y-2">
        <p><strong>Meaning:</strong> Major rule failures. A task was moved to Done even though mandatory DMT requirements were still missing.</p>
      </div>
    )
  },
  {
    id: "warnings",
    title: "Warnings / Non-blocking Flags",
    description: (
      <div className="space-y-2">
        <p><strong>Meaning:</strong> Minor quality issues where the work item is still in progress, allowing the developer time to fix it.</p>
      </div>
    )
  },
  {
    id: "compliant_items",
    title: "Compliant Items",
    description: (
      <div className="space-y-2">
        <p><strong>Meaning:</strong> Raw count of perfect tasks versus total tasks. Items with zero violations.</p>
      </div>
    )
  },
  {
    id: "active_violations",
    title: "Active Violations (Detailed Issue List)",
    description: (
      <div className="space-y-2">
        <p><strong>Meaning:</strong> Tells managers exactly who created the issue, what rule was broken, and what must be fixed (e.g., missing AC, no unit tests).</p>
      </div>
    )
  },
  {
    id: "dmt_standards_benchmark",
    title: "DMT Standards (Benchmark)",
    description: (
      <div className="space-y-4 text-sm">
        <div>
          <h4 className="font-bold text-foreground">What it means</h4>
          <p className="mt-1">This answers: <em>“Is this developer following DMT rules better or worse than the rest of the team?”</em></p>
        </div>

        <div>
          <h4 className="font-bold text-foreground">How it is calculated</h4>
          <ul className="list-disc pl-4 space-y-2 mt-2 text-muted-foreground">
            <li>
              <strong className="text-foreground">Your Output (e.g., 12.5%):</strong> This is the developer's personal compliance rate.<br />
              <span className="text-xs font-mono mt-1 block bg-muted/50 p-2 rounded border border-border">Developer Compliance Rate = (Compliant Items by Developer / Total Items Assigned) × 100</span>
            </li>
            <li>
              <strong className="text-foreground">Project Average (e.g., 19.9%):</strong> The system takes the compliance percentage of every developer and calculates the average.
            </li>
          </ul>
        </div>

        <div className="bg-muted/30 p-3 rounded-lg border border-border">
          <h4 className="font-bold text-foreground mb-2">Example Result</h4>
          <ul className="space-y-1 mb-2">
            <li><span className="font-medium text-foreground">Developer</span> = 12.5%</li>
            <li><span className="font-medium text-foreground">Team Average</span> = 19.9%</li>
          </ul>
          <p className="text-muted-foreground italic">This means the developer is slightly below the team average.</p>
        </div>
      </div>
    )
  },
  {
    id: "leaderboard",
    title: "Leaderboard (Gamification)",
    description: (
      <div className="space-y-4 text-sm">
        <div>
          <h4 className="font-bold text-foreground">What it means</h4>
          <p className="mt-1">The Leaderboard helps motivate the team by giving awards and titles to the top performers each month based on their work, quality, reviews, and AI usage.</p>
        </div>

        <div>
          <h4 className="font-bold text-foreground">How it is calculated</h4>
          <p className="mt-1">The system checks each team member’s performance and compares their scores using different metrics like Story Points, Compliance Rate, PR Reviews, and AI Usage.</p>
        </div>

        <div>
          <h4 className="font-bold text-foreground mb-2">Awards and Rules</h4>
          <ul className="space-y-3">
            <li className="bg-muted/30 p-3 rounded-lg border border-border">
              <strong className="text-foreground">Velocity King</strong>
              <p className="mt-1 text-muted-foreground">Awarded to the person with the highest total Story Points completed.</p>
              <span className="text-xs font-mono mt-2 block text-muted-foreground">Velocity King = max(Σ Story Points Completed)</span>
            </li>
            <li className="bg-muted/30 p-3 rounded-lg border border-border">
              <strong className="text-foreground">Quality Champion</strong>
              <p className="mt-1 text-muted-foreground">Awarded to the person with the highest compliance rate and best code quality.</p>
              <span className="text-xs font-mono mt-2 block text-muted-foreground">Quality Champion = max(Average Compliance Rate %)</span>
            </li>
            <li className="bg-muted/30 p-3 rounded-lg border border-border">
              <strong className="text-foreground">Top Reviewer</strong>
              <p className="mt-1 text-muted-foreground">Awarded to the person who reviewed the most Pull Requests (PRs) and helped teammates the most.</p>
              <span className="text-xs font-mono mt-2 block text-muted-foreground">Top Reviewer = max(Count of PRs Reviewed)</span>
            </li>
            <li className="bg-muted/30 p-3 rounded-lg border border-border">
              <strong className="text-foreground">AI Specialist</strong>
              <p className="mt-1 text-muted-foreground">Awarded to the person who uses AI tools most effectively.</p>
              <span className="text-xs font-mono mt-2 block text-muted-foreground">AI Specialist = max(Average AI Usage %)</span>
            </li>
          </ul>
        </div>

        <div className="bg-muted/50 p-3 rounded-lg border border-border">
          <h4 className="font-bold text-foreground mb-2">Example</h4>
          <p className="text-muted-foreground italic">If person A completed the most Story Points, he gets Velocity King. If person B reviewed the most PRs, she gets Top Reviewer.</p>
        </div>
      </div>
    )
  }
];
