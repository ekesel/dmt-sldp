"use client";
import React, { useEffect, useState, use, useRef } from "react";
import { Card } from "@dmt/ui";
import {
  User,
  TrendingUp,
  ArrowLeft,
  Code,
  CheckCircle2,
  AlertCircle,
  Clock,
  Briefcase,
  Activity,
  ShieldCheck,
  LineChart as ChartIcon,
  Cpu,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import { developers, Developer } from "@dmt/api";
import { useRouter } from "next/navigation";
import { TrendingChart } from "../../../../components/charts/TrendingChart";
import { ActiveFolderSelector } from "../../../../components/ActiveFolderSelector";
import { SprintSelector } from "../../../../components/SprintSelector";

export default function DeveloperDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: developerEmail } = use(params);
  const router = useRouter();
  const [developer, setDeveloper] = useState<Developer | null>(null);
  const [metrics, setMetrics] = useState<any[]>([]);
  const [comparison, setComparison] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [selectedSprintId, setSelectedSprintId] = useState<number | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch dev list to find this specific developer's meta (like project list)
        const devList = await developers.list();
        const currentDev = devList.find(
          (d) => d.id === decodeURIComponent(developerEmail),
        );
        setDeveloper(currentDev || null);

        // Fetch metrics (limit 10 for trends) & comparison
        const normalizedProjectId = selectedProjectId === "all" ? null : selectedProjectId;
        const [metricsData, comparisonData] = await Promise.all([
          developers.getMetrics(
            developerEmail,
            normalizedProjectId,
            selectedSprintId,
          ),
          developers.getComparison(
            developerEmail,
            normalizedProjectId,
            selectedSprintId,
          ),
        ]);

        setMetrics(metricsData);
        setComparison(comparisonData);
      } catch (error) {
        console.error("Failed to fetch developer details", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [developerEmail, selectedProjectId, selectedSprintId]);

  if (loading && !developer) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-muted-foreground font-medium animate-pulse">
            Loading developer performance data...
          </p>
        </div>
      </div>
    );
  }

  if (!developer && !loading) {
    return <div className="p-8 text-foreground">Developer not found.</div>;
  }

  const latestMetrics =
    metrics.find((m: any) => m.is_selected) || metrics[0] || {};

  return (
    <main className="min-h-screen bg-background p-8 pb-20 selection:bg-primary/30">
      <div className="max-w-7xl mx-auto space-y-12 text-foreground">
        <header className="space-y-6">
          <button
            onClick={() => router.back()}
            className="group flex items-center gap-2 text-muted-foreground hover:text-foreground transition-all text-sm font-bold bg-accent px-4 py-2 rounded-full border border-border hover:border-border/80"
          >
            <ArrowLeft
              size={16}
              className="group-hover:-translate-x-1 transition-transform"
            />
            Back to Team
          </button>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 py-4">
            <div className="flex items-center gap-8">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-tr from-primary to-blue-600 rounded-3xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                <div className="relative w-24 h-24 rounded-3xl bg-card flex items-center justify-center text-primary font-black text-4xl border border-border">
                  {(developer?.developer_name as string)?.charAt(0)}
                </div>
              </div>
              <div>
                <h1 className="text-5xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-muted-foreground">
                  {developer?.developer_name}
                </h1>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-muted-foreground font-bold text-lg">
                    {developer?.developer_email}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] uppercase font-black tracking-[0.2em] text-muted-foreground ml-1">
                Current Context
              </label>
              <div className="flex flex-col gap-3">
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen((o) => !o)}
                    className="flex items-center gap-3 bg-card border border-border hover:border-primary/40 p-2 pr-4 rounded-2xl shadow-2xl transition-all duration-300 w-full min-w-[240px]"
                  >
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shrink-0">
                      <Briefcase size={20} />
                    </div>
                    <div className="flex flex-col flex-1 truncate text-left">
                      <span className="text-[10px] uppercase font-black tracking-widest text-muted-foreground leading-none mb-1">
                        Project
                      </span>
                      <span className="font-bold text-sm text-foreground truncate leading-none">
                        {selectedProjectId === "all"
                          ? "All Projects Combined"
                          : (developer?.projects?.find(
                              (p) => String(p.id) === selectedProjectId,
                            )?.name ?? "Project")}
                      </span>
                    </div>
                    <ChevronDown
                      size={18}
                      className={`text-muted-foreground shrink-0 transition-transform duration-300 ${dropdownOpen ? "rotate-180" : ""}`}
                    />
                  </button>

                  {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-full min-w-[240px] z-50 bg-popover/95 backdrop-blur-xl border border-border rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="p-1.5 space-y-0.5 max-h-64 overflow-y-auto">
                        {[
                          { id: "all", name: "All Projects Combined" },
                          ...(developer?.projects ?? []),
                        ].map((p) => {
                          const isActive = String(p.id) === selectedProjectId;
                          return (
                            <button
                              key={p.id}
                              onClick={() => {
                                setSelectedProjectId(String(p.id));
                                setDropdownOpen(false);
                              }}
                              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200 group ${
                                isActive
                                  ? "bg-primary/15 text-primary-foreground"
                                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                              }`}
                            >
                              <div
                                className={`w-1.5 h-1.5 rounded-full shrink-0 transition-all duration-200 ${
                                  isActive
                                    ? "bg-primary shadow-[0_0_6px_var(--color-primary)]"
                                    : "bg-muted group-hover:bg-muted-foreground"
                                }`}
                              />
                              <span className="font-semibold text-sm truncate">
                                {p.name}
                              </span>
                              {isActive && (
                                <span className="ml-auto text-primary shrink-0">
                                  <CheckCircle2 size={14} />
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
                <ActiveFolderSelector
                  projectId={
                    selectedProjectId === "all"
                      ? null
                      : parseInt(selectedProjectId)
                  }
                  onFolderChanged={() => {
                    window.location.reload();
                  }}
                />
                <SprintSelector
                  projectId={
                    selectedProjectId === "all"
                      ? null
                      : parseInt(selectedProjectId)
                  }
                  selectedSprintId={selectedSprintId}
                  onSelect={setSelectedSprintId}
                />
              </div>
            </div>
          </div>
        </header>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6 bg-card border-border hover:border-primary/30 transition-all duration-500 group overflow-hidden relative">
            <div className="absolute -right-4 -top-4 text-primary/5 group-hover:text-primary/10 transition-colors">
              <TrendingUp size={120} strokeWidth={3} />
            </div>
            <div className="flex items-center gap-3 text-primary mb-6 relative">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                <TrendingUp size={20} />
              </div>
              <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                Velocity
              </span>
            </div>
            <div className="relative">
              <div className="text-5xl font-black">
                {latestMetrics.story_points_completed || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-2 font-bold uppercase tracking-wider">
                {selectedProjectId === "all"
                  ? "Points across active sprints"
                  : `Points in ${comparison?.sprint_name || "latest sprint"}`}
              </p>
            </div>
          </Card>

          <Card className="p-6 bg-card border-border hover:border-blue-400/30 transition-all duration-500 group overflow-hidden relative">
            <div className="absolute -right-4 -top-4 text-blue-400/5 group-hover:text-blue-400/10 transition-colors">
              <Sparkles size={120} strokeWidth={3} />
            </div>
            <div className="flex items-center gap-3 text-blue-400 mb-6 relative">
              <div className="w-10 h-10 rounded-xl bg-blue-400/10 flex items-center justify-center border border-blue-400/20">
                <Sparkles size={20} />
              </div>
              <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                AI Usage
              </span>
            </div>
            <div className="relative">
              <div className="text-5xl font-black">
                {latestMetrics.ai_usage_percent?.toFixed(0) || 0}
                <span className="text-xl text-blue-500/50 -ml-1">%</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2 font-bold uppercase tracking-wider">
                {selectedProjectId === "all"
                  ? "Average across active sprints"
                  : `Average in ${comparison?.sprint_name || "latest sprint"}`}
              </p>
            </div>
          </Card>

          <Card className="p-6 bg-card border-border hover:border-warning/30 transition-all duration-500 group overflow-hidden relative">
            <div className="absolute -right-4 -top-4 text-warning/5 group-hover:text-warning/10 transition-colors">
              <ShieldCheck size={120} strokeWidth={3} />
            </div>
            <div className="flex items-center gap-3 text-warning mb-6 relative">
              <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center border border-warning/20">
                <CheckCircle2 size={20} />
              </div>
              <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                Compliance
              </span>
            </div>
            <div className="relative">
              <div className="text-5xl font-black">
                {latestMetrics.dmt_compliance_rate?.toFixed(0) || 0}
                <span className="text-xl text-warning/50 -ml-1">%</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2 font-bold uppercase tracking-wider">
                Standard adherence score
              </p>
            </div>
          </Card>

          <Card className="p-6 bg-card border-border hover:border-destructive/30 transition-all duration-500 group overflow-hidden relative">
            <div className="absolute -right-4 -top-4 text-destructive/5 group-hover:text-destructive/10 transition-colors">
              <AlertCircle size={120} strokeWidth={3} />
            </div>
            <div className="flex items-center gap-3 text-destructive mb-6 relative">
              <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center border border-destructive/20">
                <AlertCircle size={20} />
              </div>
              <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                Quality Gap
              </span>
            </div>
            <div className="relative">
              <div className="text-5xl font-black">
                {latestMetrics.defects_attributed || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-2 font-bold uppercase tracking-wider">
                {selectedProjectId === "all"
                  ? "Bugs across active sprints"
                  : `Bugs in ${comparison?.sprint_name || "current sprint"}`}
              </p>
            </div>
          </Card>
        </div>

        {/* Performance Trends Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black flex items-center gap-4">
                <Activity className="text-primary" />
                Performance Trends
                <span className="px-3 py-1 bg-accent text-accent-foreground text-[10px] font-black uppercase rounded-full border border-border">
                  Last {metrics.length} Sprints
                </span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4">
              <Card className="p-6 bg-card border-border relative group">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                      Velocity History
                    </h3>
                    <p className="text-lg font-bold">Story Points</p>
                  </div>
                  <TrendingUp size={16} className="text-primary" />
                </div>
                <TrendingChart
                  data={metrics}
                  dataKey="story_points_completed"
                  color="#0ea5e9"
                  type="area"
                  label="Story Points"
                />
              </Card>

              <Card className="p-6 bg-card border-border relative group">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                      Compliance Trend
                    </h3>
                    <p className="text-lg font-bold">DMT Score %</p>
                  </div>
                  <ShieldCheck size={16} className="text-warning" />
                </div>
                <TrendingChart
                  data={metrics}
                  dataKey="dmt_compliance_rate"
                  color="#facc15"
                  type="line"
                  valueSuffix="%"
                  label="Compliance"
                />
              </Card>
            </div>

            <h2 className="text-2xl font-black flex items-center gap-4 pt-4">
              <Clock className="text-primary" />
              Sprint History
            </h2>
            <Card className="bg-card border-border overflow-hidden rounded-3xl">
              <table className="w-full text-left">
                <thead className="bg-muted text-[10px] uppercase font-black tracking-widest text-muted-foreground">
                  <tr>
                    <th className="px-8 py-6">Sprint</th>
                    <th className="px-8 py-6">Points</th>
                    <th className="px-8 py-6">AI Usage (Obj)</th>
                    <th className="px-8 py-6">PRs Merged</th>
                    <th className="px-8 py-6">Reviews</th>
                    <th className="px-8 py-6 text-right">DMT Compliance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-medium">
                  {metrics.map((m, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-accent transition-all group"
                    >
                      <td className="px-8 py-6 font-bold group-hover:text-primary transition-colors">
                        {m.sprint_name}
                      </td>
                      <td className="px-8 py-6">{m.story_points_completed}</td>
                      <td className="px-8 py-6">
                        <span className="text-blue-400 font-bold">
                          {m.code_ai_usage_percent?.toFixed(1) || 0}%
                        </span>
                        <span className="text-[10px] text-slate-500 ml-1">
                          ({m.ai_usage_percent?.toFixed(0) || 0}% cust)
                        </span>
                      </td>
                      <td className="px-8 py-6">{m.prs_merged}</td>
                      <td className="px-8 py-6 text-muted-foreground">
                        {m.prs_reviewed || 0}
                      </td>
                      <td className="px-8 py-6 text-right font-black text-primary">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-12 h-1 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary"
                              style={{ width: `${m.dmt_compliance_rate}%` }}
                            />
                          </div>
                          {m.dmt_compliance_rate?.toFixed(0)}%
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>

          <div className="space-y-8">
            <h2 className="text-2xl font-black flex items-center gap-4">
              <ChartIcon className="text-primary" />
              Benchmarks
              {comparison?.sprint_name && (
                <span className="px-3 py-1 bg-accent text-accent-foreground text-[10px] font-black uppercase rounded-full border border-border tracking-wider">
                  {comparison.sprint_name}
                </span>
              )}
            </h2>
            <Card className="p-8 bg-gradient-to-br from-card to-card/50 border-border space-y-10 rounded-3xl shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-[60px]" />

              <div className="space-y-4">
                <div className="flex justify-between text-xs font-black uppercase tracking-widest mb-1 text-muted-foreground">
                  <span>Relative Velocity</span>
                  <span className="text-foreground">
                    {comparison?.velocity?.you || 0} /{" "}
                    {comparison?.velocity?.team_avg?.toFixed(1) || 0} pts
                  </span>
                </div>
                <div className="h-3 w-full bg-muted rounded-full overflow-hidden p-0.5 border border-border">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 to-primary rounded-full shadow-[0_0_15px_var(--color-primary)]"
                    style={{
                      width: `${Math.min(100, comparison?.velocity?.team_avg > 0 ? ((comparison?.velocity?.you || 0) / comparison.velocity.team_avg) * 100 : 0)}%`,
                    }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">
                  Your output vs project average
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between text-xs font-black uppercase tracking-widest mb-1 text-muted-foreground">
                  <span>DMT Standards</span>
                  <span className="text-foreground">
                    {comparison?.compliance?.you?.toFixed(1) || 0}% /{" "}
                    {comparison?.compliance?.team_avg?.toFixed(1) || 0}%
                  </span>
                </div>
                <div className="h-3 w-full bg-muted rounded-full overflow-hidden p-0.5 border border-border">
                  <div
                    className="h-full bg-gradient-to-r from-yellow-600 to-warning rounded-full shadow-[0_0_15px_var(--color-warning)]"
                    style={{ width: `${comparison?.compliance?.you || 0}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">
                  Standards adherence benchmark
                </p>
              </div>

              <div className="p-4 bg-muted/50 rounded-2xl border border-border">
                <p className="text-xs text-muted-foreground italic leading-relaxed">
                  "Your compliance is{" "}
                  <span className="text-primary font-bold">
                    {comparison?.compliance?.you >
                    comparison?.compliance?.team_avg
                      ? "above"
                      : "below"}
                  </span>{" "}
                  average. Maintain strong DMT signoffs to improve overall
                  project governance."
                </p>
              </div>
            </Card>

            <Card className="p-8 bg-blue-600/10 border-blue-500/20 rounded-3xl">
              <h3 className="text-lg font-black flex items-center gap-2 mb-4">
                <Activity className="text-blue-400" size={20} />
                Sprint Snapshot
              </h3>
              <div className="space-y-3">
                {[
                  { label: "PRs Merged", value: latestMetrics.prs_merged ?? 0 },
                  {
                    label: "PRs Reviewed",
                    value: latestMetrics.prs_reviewed ?? 0,
                  },
                  { label: "Commits", value: latestMetrics.commits_count ?? 0 },
                  {
                    label: "Items Completed",
                    value: latestMetrics.items_completed ?? 0,
                  },
                  {
                    label: "Defects",
                    value: latestMetrics.defects_attributed ?? 0,
                  },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-muted-foreground font-medium">
                      {label}
                    </span>
                    <span className="text-foreground font-black">{value}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
