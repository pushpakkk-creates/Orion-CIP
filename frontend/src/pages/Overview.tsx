import { useState } from 'react';
import {
  Zap,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  ShieldCheck,
  Info,
  Download,
  Database,
  Loader2,
} from 'lucide-react';
import PageHeader from '../components/shared/PageHeader';
import Card from '../components/shared/Card';
import StatCard from '../components/shared/StatCard';
import EmptyState from '../components/shared/EmptyState';
import {
  useOverviewKpis,
  useOverviewNarrative,
  useOverviewTrends,
  useAgentsSummary,
} from '../api/hooks';
import { PALETTE } from '../utils/colors';
import type { KpiData } from '../types';
import { useActiveWorkspace } from '../contexts/workspaceContextValue';
import { ACTIVE_WORKSPACE_STORAGE_KEY, ACTIVE_WORKSPACE_TOKEN_STORAGE_KEY, ADMIN_TOKEN_STORAGE_KEY } from '../constants/workspace';

type NarrativeMetric = { label: string; value: string | number };

function formatMetricValue(value: string | number | undefined): string {
  if (value == null) return 'N/A';
  return typeof value === 'number' ? value.toLocaleString() : value;
}

function getMetricValue(metrics: NarrativeMetric[], label: string): string {
  return formatMetricValue(metrics.find((metric) => metric.label === label)?.value);
}

function buildNarrativeSignificance(metrics: NarrativeMetric[]): string {
  const churn = getMetricValue(metrics, 'Avg Churn Probability');
  const highRisk = getMetricValue(metrics, 'High-Risk Accounts');
  const sentiment = getMetricValue(metrics, 'Avg Sentiment');
  const anomalies = getMetricValue(metrics, 'Anomalies');

  return (
    `The operating priority is ${highRisk} high-risk accounts against a ${churn} average churn probability. ` +
    `Read that alongside ${sentiment} average sentiment and ${anomalies} anomalies to decide whether leadership attention should go first to retention coverage, customer experience recovery, or anomaly review.`
  );
}

function HeroSkeleton() {
  return (
    <Card variant="hero" className="animate-fade-in-up">
      <div className="h-3 w-32 rounded-md shimmer" />
      <div className="mt-4 h-10 w-24 rounded-md shimmer" />
      <div className="mt-2 h-3 w-20 rounded-md shimmer" />
      <div className="mt-3 h-[50px] w-[72px] rounded-md shimmer" />
    </Card>
  );
}

function SecondaryKpiSkeleton() {
  return (
    <Card variant="elevated" className="animate-fade-in-up">
      <div className="h-3 w-24 rounded-md shimmer" />
      <div className="mt-4 h-8 w-16 rounded-md shimmer" />
      <div className="mt-2 h-3 w-20 rounded-md shimmer" />
    </Card>
  );
}

export default function Overview() {
  const { activeWorkspace } = useActiveWorkspace();
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const { data: kpis, isLoading, isError } = useOverviewKpis();
  const { data: narrative, isLoading: narrativeLoading } =
    useOverviewNarrative();
  const { data: trends } = useOverviewTrends();
  const { data: agentData } = useAgentsSummary();

  const kpiList: KpiData[] = kpis
    ? [
        kpis.total_customers,
        kpis.monthly_revenue,
        kpis.churn_rate,
        kpis.avg_sentiment,
        kpis.active_anomalies,
      ]
    : [];

  // Split into hero (first 2) and secondary (remaining 3)
  const heroKpis = kpiList.slice(0, 2);
  const secondaryKpis = kpiList.slice(2);

  // Real 8-week series from workspace data (no fabricated sparklines):
  // cumulative customers for the first hero card, weekly completed-order
  // revenue for the second.
  const heroSparklines = [
    trends?.customers.length
      ? { data: trends.customers.map((p) => p.value), color: PALETTE.indigo }
      : undefined,
    trends?.revenue.length
      ? { data: trends.revenue.map((p) => p.value) }
      : undefined,
  ];

  // Pipeline health from agent runs
  const latestRuns = agentData?.runs ?? [];

  async function downloadWorkspaceData() {
    const workspaceId = activeWorkspace?.id || localStorage.getItem(ACTIVE_WORKSPACE_STORAGE_KEY);
    const workspaceToken = localStorage.getItem(ACTIVE_WORKSPACE_TOKEN_STORAGE_KEY);
    if (!workspaceId) {
      setExportError('Select a workspace before downloading its datasets.');
      return;
    }
    setIsExporting(true);
    setExportError(null);
    try {
      const headers = new Headers();
      const adminToken = localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY) ||
        import.meta.env?.VITE_ADMIN_API_TOKEN || import.meta.env?.VITE_ADMIN_TOKEN;
      if (adminToken) headers.set('X-Admin-Token', adminToken);
      if (workspaceToken) {
        headers.set('X-Workspace-ID', workspaceId);
        headers.set('X-Workspace-Token', workspaceToken);
      }
      const apiBase = (import.meta.env?.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '');
      const response = await fetch(`${apiBase || ''}/api/workspaces/${workspaceId}/export-data`, { headers });
      if (!response.ok) {
        let message = `Download failed (${response.status}).`;
        try {
          const payload = await response.json() as { detail?: string };
          if (payload.detail) message = payload.detail;
        } catch { /* keep the status-based message */ }
        throw new Error(message);
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `orion-${workspaceId}-datasets.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Could not download workspace data.');
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Executive Overview"
        description="Operational pulse check on customer health, revenue, and risk"
      />

      <Card variant="elevated" className="mb-6 animate-fade-in-up">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-500/10 text-[var(--color-primary-400)]">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Download workspace data</h3>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-[rgba(255,255,255,0.5)]">
                Export the exact customer, subscription, order, behavior-event, support-ticket, feedback, campaign, and available intelligence tables used by this dashboard as CSV files in one ZIP.
              </p>
              {activeWorkspace && <p className="mt-1 text-[11px] text-[rgba(255,255,255,0.38)]">Workspace: {activeWorkspace.company_name} · {activeWorkspace.customer_count.toLocaleString()} customers</p>}
              {exportError && <p role="alert" className="mt-2 text-xs text-[var(--color-danger)]">{exportError}</p>}
            </div>
          </div>
          <button type="button" onClick={downloadWorkspaceData} disabled={isExporting || !activeWorkspace || activeWorkspace.status !== 'ready'} className="btn-primary shrink-0 disabled:cursor-not-allowed disabled:opacity-50">
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {isExporting ? 'Preparing ZIP…' : 'Download datasets'}
          </button>
        </div>
        {activeWorkspace?.status !== 'ready' && <p className="mt-3 text-[11px] text-[rgba(255,255,255,0.38)]">Data export becomes available after the workspace pipeline completes.</p>}
      </Card>

      {isLoading ? (
        <>
          {/* Hero skeleton */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <HeroSkeleton />
            <HeroSkeleton />
          </div>
          {/* Secondary skeleton */}
          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-3">
            <SecondaryKpiSkeleton />
            <SecondaryKpiSkeleton />
            <SecondaryKpiSkeleton />
          </div>
        </>
      ) : isError ? (
        <Card className="border-danger/20 bg-danger/10">
          <p className="flex items-center gap-2 text-sm text-danger">
            <AlertTriangle className="h-4 w-4" />
            Failed to load overview data.
          </p>
        </Card>
      ) : kpiList.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="No metrics available"
          description="Executive KPIs will appear here once the intelligence pipeline has processed this workspace's data."
        />
      ) : (
        <>
          {/* Hero KPI Row — 2 large cards */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {heroKpis.map((kpi, i) => (
              <StatCard
                key={kpi.label}
                title={kpi.label}
                value={kpi.value}
                variant="hero"
                trend={{ value: kpi.trend, label: kpi.trend_label }}
                sparkline={heroSparklines[i]}
                className={`animate-fade-in-up stagger-${i + 1}`}
              />
            ))}
          </div>

          {/* Secondary KPI Row — 3 smaller cards */}
          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-3">
            {secondaryKpis.map((kpi, i) => (
              <StatCard
                key={kpi.label}
                title={kpi.label}
                value={kpi.value}
                trend={{ value: kpi.trend, label: kpi.trend_label }}
                // Churn's trend is a count of high/critical-risk accounts —
                // a rising number is bad, so don't paint it green.
                trendTone={kpi.label === 'Churn Rate' ? 'inverse' : 'auto'}
                className={`animate-fade-in-up stagger-${i + 3}`}
              />
            ))}
          </div>
        </>
      )}

      {/* Bottom Section: Narrative + Pipeline Health */}
      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-5">
        {/* Narrative */}
        <Card variant="hero" className="animate-fade-in-up stagger-5 xl:col-span-3">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 rounded-full border border-primary-400/40 bg-primary-600/45 px-2.5 py-1 text-[11px] font-semibold text-white shadow-[0_0_18px_rgba(129,140,248,0.22)]">
              <Zap className="h-3 w-3" />
              Generated summary
            </span>
            {narrative && !narrativeLoading && (
              <span className="text-[11px] text-[rgba(255,255,255,0.56)]">
                Updated {new Date(narrative.generated_at).toLocaleString()}
              </span>
            )}
          </div>

          {narrativeLoading ? (
            <div className="space-y-2">
              <div className="h-4 w-3/4 rounded-md shimmer" />
              <div className="h-4 w-1/2 rounded-md shimmer" />
            </div>
          ) : narrative ? (
            <div className="space-y-5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-accent)]">
                  Executive significance
                </p>
                <p className="mt-2 text-sm leading-6 text-[rgba(255,255,255,0.86)]">
                  {narrative.executive_summary}
                </p>
              </div>

              {narrative.key_metrics.length > 0 && (
                <div className="border-l-2 border-primary-400/60 pl-4">
                  <p className="flex items-center gap-2 text-xs font-semibold text-[var(--color-text-accent)]">
                    <Info className="h-3.5 w-3.5" />
                    Why this matters
                  </p>
                  <p className="mt-1.5 text-xs leading-5 text-[rgba(255,255,255,0.74)]">
                    {buildNarrativeSignificance(narrative.key_metrics)}
                  </p>
                </div>
              )}

              {narrative.key_metrics.length > 0 && (
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
                  {narrative.key_metrics.map((metric) => (
                    <div
                      key={metric.label}
                      className="min-w-0 border-t border-[rgba(255,255,255,0.10)] pt-3"
                    >
                      <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-[rgba(255,255,255,0.48)]">
                        {metric.label}
                      </p>
                      <p className="mt-1 font-mono text-sm font-semibold text-white">
                        {formatMetricValue(metric.value)}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {(narrative.highlights.length > 0 || narrative.concerns.length > 0) && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {narrative.highlights.length > 0 && (
                    <div className="space-y-2 border-t border-success/25 pt-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-success)]">
                        Positive signals
                      </p>
                      {narrative.highlights.map((h) => (
                        <p
                          key={h}
                          className="flex items-start gap-2 text-xs leading-5 text-[rgba(255,255,255,0.76)]"
                        >
                          <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-success)]" />
                          {h}
                        </p>
                      ))}
                    </div>
                  )}

                  {narrative.concerns.length > 0 && (
                    <div className="space-y-2 border-t border-warning/25 pt-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-warning)]">
                        Risks to watch
                      </p>
                      {narrative.concerns.map((c) => (
                        <p
                          key={c}
                          className="flex items-start gap-2 text-xs leading-5 text-[rgba(255,255,255,0.76)]"
                        >
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-warning)]" />
                          {c}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm leading-relaxed text-[rgba(255,255,255,0.55)]">
              The executive narrative will appear here once the
              intelligence pipeline has processed this workspace.
            </p>
          )}
        </Card>

        {/* Pipeline Health — 40% */}
        <Card className="animate-fade-in-up stagger-6 xl:col-span-2">
          <div className="panel-title-bar">
            <ShieldCheck className="h-4 w-4 text-[var(--color-success)]" />
            <h3 className="text-sm font-semibold">
              Pipeline Health
            </h3>
          </div>

          {latestRuns.length > 0 ? (
            <div className="space-y-2">
              {latestRuns.map((run) => (
                <div
                  key={run.id}
                  className="flex items-center justify-between gap-4 rounded-lg bg-[rgba(255,255,255,0.04)] px-3 py-2.5"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    {run.status === 'completed' ? (
                      <CheckCircle className="h-3.5 w-3.5 text-[var(--color-success)]" />
                    ) : run.status === 'failed' ? (
                      <AlertTriangle className="h-3.5 w-3.5 text-[var(--color-danger)]" />
                    ) : (
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[rgba(255,255,255,0.1)] border-t-[var(--color-primary-400)]" />
                    )}
                    <span className="truncate text-xs font-medium text-[rgba(255,255,255,0.78)]">
                      {run.agent_name}
                    </span>
                  </div>
                  {run.duration_ms != null && (
                    <span className="shrink-0 rounded-md bg-[rgba(255,255,255,0.05)] px-2 py-0.5 font-mono text-[11px] text-[rgba(255,255,255,0.58)]">
                      {(run.duration_ms / 1000).toFixed(1)}s
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[rgba(255,255,255,0.4)]">
              Pipeline status will appear after generation completes.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
