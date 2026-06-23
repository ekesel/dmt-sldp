import React from "react";

export interface DMTTerm {
  id: string;
  title: string;
  description: React.ReactNode;
}

export const dmtTerms: DMTTerm[] = [
  {
    id: "velocity",
    title: "Sprint Velocity",
    description: (
      <div className="space-y-2">
        <p><strong>Meaning:</strong> Shows how much work a team finishes in one sprint (for example, 2 weeks). It helps answer: <em>How fast is the team working?</em></p>
        <p><strong>How it is calculated:</strong> Each task is given <strong>Story Points</strong> based on effort or difficulty. At the end of the sprint, only fully completed tasks are counted.</p>

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
    id: "compliance",
    title: "DMT Compliance",
    description: (
      <div className="space-y-2">
        <p><strong>Meaning:</strong> Shows how well a person follows the company's process rules and standards (like filling ticket descriptions, linking code, updating status).</p>
        <p><strong>How it is calculated:</strong> Count the total number of tasks assigned to the person and the number of tasks that meet all DMT compliance requirements. Divide the number of compliant tasks by the total number of tasks and multiply by 100 to get the compliance percentage.</p>
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
    id: "throughput",
    title: "Throughput",
    description: (
      <div className="space-y-2">
        <p><strong>Meaning:</strong> Shows the total number of tasks or tickets the team completes in one sprint, no matter how big or small they are. It answers: <em>How many items did we finish?</em></p>
        <p><strong>How it is calculated:</strong> Throughput = Count of all Work Items where status = Done</p>
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

      </div>
    )
  },
  {
    id: "defect_density",
    title: "Defect Density",
    description: (
      <div className="space-y-2">
        <p><strong>Meaning:</strong> Checks quality by measuring how many bugs are found compared to the amount of work completed. It answers: <em>Are we maintaining quality while working fast?</em></p>
        <p><strong>How it is calculated:</strong> Count the total number of defects (bugs) reported for the completed work and divide it by the total story points delivered. Multiply the result by 100 to express the value as a percentage.</p>
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
        <p><strong>How it is calculated:</strong> For each pull request, calculate the time between its creation and the first review. Add these times together and divide by the total number of pull requests to get the average review speed.</p>
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
    id: "workload",
    title: "Workload",
    description: (
      <div className="space-y-2">
        <p><strong>Meaning:</strong> How busy the developer is right now based on unfinished tasks.</p>
        <p><strong>How it is calculated:</strong> The system counts the developer's unfinished tasks (To Do + In Progress) for current/latest sprint.</p>
        <ul className="list-disc pl-4 space-y-1 mt-2">
          <li>0 to 2 tasks = Underutilised</li>
          <li>3 to 5 tasks = Balanced</li>
          <li>6 or more tasks = Overloaded</li>
        </ul>
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
        <p><strong>How it is calculated:</strong> Count the total number of work items in the project and the number of work items that pass all DMT quality checks. Divide the compliant work items by the total work items and multiply by 100 to get the compliance percentage.</p>
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
          <h4 className="font-bold text-accent">What it means</h4>
          <p className="mt-1">
            This answers: <em>“Is this developer following DMT rules better or worse than the rest of the team?”</em>
            <br /><br />
            Example Result:<br />
            Developer = 12.5%<br />
            Team Average = 19.9%<br />
            <span className="italic">This means the developer is slightly below the team average.</span>
          </p>
        </div>

        <div>
          <p className="mb-2"><strong>How it is calculated:</strong></p>
          <ul className="list-disc pl-4 space-y-2 mt-2">
            <li>
              <strong className="text-accent">Your Output (e.g., 12.5%):</strong> This is the developer's personal compliance rate.<br />
              <span className="mt-1 block">Count the number of items assigned to the developer that meet all DMT compliance requirements. Divide this by the total number of items assigned to the developer and multiply by 100 to get the developer's compliance rate.</span>
            </li>
            <li>
              <strong className="text-accent">Project Average (e.g., 19.9%):</strong> The system takes the compliance percentage of every developer and calculates the average.
            </li>
          </ul>
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
          <h4 className="font-bold text-accent">What it means</h4>
          <p className="mt-1">The Leaderboard helps motivate the team by giving awards and titles to the top performers each month based on their work, quality, reviews, and AI usage.</p>
        </div>

        <div>
          <p><strong>How it is calculated:</strong> All scores are calculated from sprints whose end date falls within the <strong>current calendar month</strong>. The past month section shows the same calculation for the previous calendar month.</p>
        </div>

        <div>
          <h4 className="font-bold text-accent mb-2">Awards and Rules</h4>
          <ul className="space-y-3">
            <li id="velocity_king" className="bg-muted/30 p-3 rounded-lg transition-all duration-500 border border-border">
              <strong className="text-accent">Velocity King</strong>
              <p className="mt-1 text-primary">Awarded to the person with the highest total Story Points completed.</p>
              <p><strong>How it is calculated:</strong> Add up all story points completed by each developer. The developer with the highest total completed story points is identified as the Velocity King.</p>
            </li>
            <li id="quality_champion" className="bg-muted/30 p-3 rounded-lg transition-all duration-500 border border-border">
              <strong className="text-accent">Quality Champion</strong>
              <p className="mt-1 text-primary">Awarded to the person with the highest compliance rate and best code quality.</p>
              <p><strong>How it is calculated:</strong> Calculate the average DMT compliance rate for each developer over the selected period. The developer with the highest average compliance rate is awarded the Quality Champion title.</p>
            </li>
            <li id="top_reviewer" className="bg-muted/30 p-3 rounded-lg transition-all duration-500 border border-border">
              <strong className="text-accent">Top Reviewer</strong>
              <p className="mt-1 text-primary">Awarded to the person who reviewed the most Pull Requests (PRs) and helped teammates the most.</p>
              <p><strong>How it is calculated:</strong> Count the total number of pull requests reviewed by each developer during the selected period. The developer with the highest number of completed PR reviews is awarded the Top Reviewer title.</p>
            </li>
            <li id="throughput_champion" className="bg-muted/30 p-3 rounded-lg transition-all duration-500 border border-border">
              <strong className="text-accent">Throughput Champion</strong>
              <p className="mt-1 text-primary">Awarded to the person who completed the most work items (tickets) regardless of size.</p>
              <p><strong>How it is calculated:</strong> Count the total number of work items marked as completed by each developer during the selected period. The developer with the highest number of completed work items is awarded the Throughput Champion title.</p>
            </li>
            <li id="coverage_champion" className="bg-muted/30 p-3 rounded-lg transition-all duration-500 border border-border">
              <strong className="text-accent">Coverage Champion</strong>
              <p className="mt-1 text-primary">Awarded to the person with the highest average code coverage across their completed work items.</p>
              <p><strong>How it is calculated:</strong> Calculate the code coverage percentage for each completed work item of every developer. Then calculate the average code coverage for each developer. The developer with the highest average code coverage is awarded the Coverage Champion title.</p>
            </li>
            <li id="ai_specialist" className="bg-muted/30 p-3 rounded-lg transition-all duration-500 border border-border">
              <strong className="text-accent">AI Specialist</strong>
              <p className="mt-1 text-primary">Awarded to the person with the highest self-reported AI tool usage across their work items.</p>
              <p><strong>How it is calculated:</strong> Calculate the AI usage percentage for each developer's completed work items and then determine their average AI usage percentage. The developer with the highest average AI usage is awarded the AI Specialist title.</p>
            </li>
            <li id="objective_ai_master" className="bg-muted/30 p-3 rounded-lg transition-all duration-500 border border-border">
              <strong className="text-accent">Objective AI Master</strong>
              <p className="mt-1 text-primary">Awarded to the person with the highest PR-analyzed AI code contribution, measured automatically by scanning submitted code.</p>
              <p><strong>How it is calculated:</strong> Analyze the code submitted in each developer's pull requests using AI-detection and code-analysis tools. Calculate the AI contribution percentage for each PR and then determine the developer's average AI contribution percentage across all analyzed PRs. The developer with the highest average AI contribution percentage is awarded the Objective AI Master title.</p>
            </li>
            <li id="clean_coder" className="bg-muted/30 p-3 rounded-lg transition-all duration-500 border border-border">
              <strong className="text-accent">Clean Coder</strong>
              <p className="mt-1 text-primary">Awarded to the person with the fewest defects attributed to their work. Lower is better.</p>
              <p><strong>How it is calculated:</strong> Count the total number of defects attributed to each developer's completed work during the selected period. The developer with the fewest attributed defects is awarded the Clean Coder title.</p>
            </li>
          </ul>
        </div>

        
      </div>
    )
  }
];
