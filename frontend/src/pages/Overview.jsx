import { useState, useEffect } from 'react';
import API from '../api/client';
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownRight,
  ArrowUpRight,
  AlertTriangle,
} from "lucide-react";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { useCurrency } from '../context/CurrencyContext';

const deptChartConfig = {
  headcount: { label: "Employees", color: "var(--chart-1)" },
};

export default function Overview() {
  const [kpis, setKpis] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { formatCurrencyShorthand } = useCurrency();

  useEffect(() => {
    Promise.all([
      API.get('/dashboard/overview'),
      API.get('/dashboard/departments'),
      API.get('/alerts/')
    ]).then(([kRes, dRes, aRes]) => {
      setKpis(kRes.data);
      const sortedDeps = [...dRes.data].sort((a, b) => b.attrition_rate - a.attrition_rate);
      setDepartments(sortedDeps);
      setAlerts(aRes.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center flex-col gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-rule border-t-primary" />
        <span className="font-mono text-xs text-muted-foreground uppercase tracking-widest">Loading dashboard...</span>
      </div>
    );
  }

  const highSeverityAlerts = alerts.filter(a => a.severity === 'high').length;
  const attritionPct = (kpis.attrition_rate * 100).toFixed(1);
  const isHighAttrition = kpis.attrition_rate > 0.15;

  const dynamicKpis = [
    { n: "I", label: "Total Headcount", value: kpis.total_employees?.toLocaleString(), delta: "-", trend: "up", positive: true, note: "Active employees" },
    { n: "II", label: "Overall Attrition", value: attritionPct, unit: "%", delta: isHighAttrition ? "High" : "Normal", trend: isHighAttrition ? "up" : "down", positive: !isHighAttrition, note: isHighAttrition ? "Needs attention" : "Healthy retention" },
    { n: "III", label: "Avg Engagement", value: kpis.avg_engagement?.toFixed(2), unit: "/5", delta: "-", trend: "up", positive: kpis.avg_engagement >= 3.5, note: "Company-wide rating" },
    { n: "IV", label: "Critical Alerts", value: highSeverityAlerts.toString(), delta: highSeverityAlerts > 0 ? "+" + highSeverityAlerts : "0", trend: highSeverityAlerts > 0 ? "up" : "down", positive: highSeverityAlerts === 0, note: "High-severity notices" },
  ];

  return (
    <div className="flex flex-col gap-10">
      {/* KPI ROW — separate cards */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {dynamicKpis.map((kpi, i) => {
          const TrendIcon = kpi.trend === "up" ? ArrowUpRight : ArrowDownRight;
          return (
            <div
              key={kpi.label}
              className="relative px-6 py-8 rise rounded-2xl shadow-lg border border-zinc-800/50"
              style={{ animationDelay: `${i * 70}ms`, backgroundColor: "#141210" }}
            >

              <p className="font-mono text-2xl uppercase tracking-widest mt-4 text-zinc-300">{kpi.label}</p>
              <p className="mt-2 font-display text-5xl leading-none text-white">
                {kpi.value}
                {kpi.unit && (
                  <span className="ml-1 font-numeric text-base text-zinc-500 align-top">
                    {kpi.unit}
                  </span>
                )}
              </p>
              <p className="mt-3 font-display italic text-lg text-zinc-500">
                {kpi.note}
              </p>
            </div>
          );
        })}
      </section>

      {/* CHARTS */}
      <section className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <article className="lg:col-span-7 rise">
          <header className="border-b border-rule pb-4 mb-6">
            <h2 className="font-display text-4xl leading-tight text-ink">
              {departments.length === 1 ? 'Department Profile' : 'Headcount, by department'}
            </h2>
          </header>
          {departments.length === 1 ? (
            <div className="h-[300px] w-full rounded-2xl border border-zinc-800/50 p-8 flex flex-col items-center justify-center text-center relative overflow-hidden group" style={{ backgroundColor: "#141210" }}>
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,color-mix(in_oklab,var(--primary)_15%,transparent),transparent_50%)] opacity-20" />
                <p className="font-mono text-sm uppercase tracking-widest text-zinc-400 mb-4 relative z-10">Viewing Single Department</p>
                <h3 className="font-display text-4xl md:text-5xl text-white mb-8 relative z-10">{departments[0].Department}</h3>
                <div className="flex flex-wrap justify-center gap-8 md:gap-16 relative z-10">
                    <div>
                        <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest mb-1.5">Headcount</p>
                        <p className="font-display text-3xl text-white">{departments[0].headcount}</p>
                    </div>
                    <div>
                        <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest mb-1.5">Avg Salary</p>
                        <p className="font-display text-3xl text-white">{formatCurrencyShorthand(departments[0].avg_salary)}</p>
                    </div>
                    <div>
                        <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest mb-1.5">Attrition</p>
                        <p className="font-display text-3xl text-white">{(departments[0].attrition_rate * 100).toFixed(1)}%</p>
                    </div>
                </div>
            </div>
          ) : (
            <ChartContainer config={deptChartConfig} className="h-[300px] w-full">
              <BarChart data={[...departments].sort((a, b) => b.headcount - a.headcount)} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--rule)" strokeDasharray="2 4" />
                <XAxis
                  dataKey="Department"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={12}
                  fontSize={10}
                  tick={{ fill: "var(--muted-foreground)", fontFamily: "var(--font-mono)" }}
                />
                <YAxis
                  domain={['dataMin - 100', 'dataMax + 100']}
                  tickLine={false}
                  axisLine={false}
                  fontSize={10}
                  width={36}
                  tick={{ fill: "var(--muted-foreground)", fontFamily: "var(--font-mono)" }}
                />
                <ChartTooltip content={<ChartTooltipContent />} cursor={{fill: 'var(--accent)', opacity: 0.1}} />
                <Bar dataKey="headcount" fill="var(--color-headcount)" radius={[4, 4, 0, 0]} maxBarSize={60} />
              </BarChart>
            </ChartContainer>
          )}
        </article>

        <article className="lg:col-span-5 rise" style={{ animationDelay: "120ms" }}>
          <header className="flex items-end justify-between gap-4 border-b border-rule pb-3 mb-5">
            <div>
              <p className="eyebrow">Feature · §II</p>
              <h2 className="font-display text-3xl leading-tight text-ink mt-1">
                Active Alerts
              </h2>
            </div>
            <span className="font-numeric text-[11px] text-destructive">{highSeverityAlerts} critical</span>
          </header>

          <ol className="divide-y divide-rule">
            {alerts.slice(0, 5).map((a, idx) => (
              <li
                key={idx}
                className="grid grid-cols-[auto_1fr] items-start gap-4 py-4"
              >
                <span className={`p-2 rounded-sm ${a.severity === 'high' ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'}`}>
                  <AlertTriangle className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="font-display text-lg leading-snug text-ink">
                    {a.title || a.message}
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{a.message}</p>
                </div>
              </li>
            ))}
            {alerts.length === 0 && (
              <li className="py-8 text-center text-sm text-muted-foreground italic font-display">No active alerts.</li>
            )}
          </ol>
        </article>
      </section>

      {departments.length > 1 && (
      <section className="rise" style={{ animationDelay: "200ms" }}>
        <header className="border-b border-rule pb-3 mb-5">
          <p className="eyebrow">Directory</p>
          <h2 className="font-display text-2xl leading-tight text-ink mt-1">
            Department Summary
          </h2>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-rule">
                <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Department</th>
                <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Headcount</th>
                <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Attrition Rate</th>
                <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Avg Salary</th>
                <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Engagement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule/50">
              {departments.map((d) => {
                const attrPct = (d.attrition_rate * 100).toFixed(1);
                let badgeStyle = "bg-success/10 text-success border-success/30";
                if (d.attrition_rate > 0.15) badgeStyle = "bg-destructive/10 text-destructive border-destructive/30";
                else if (d.attrition_rate > 0.10) badgeStyle = "bg-warning/10 text-warning border-warning/30";

                return (
                  <tr key={d.Department} className="hover:bg-accent/20 transition-colors">
                    <td className="py-3 px-4 font-medium text-ink">{d.Department}</td>
                    <td className="py-3 px-4 font-numeric tabular-nums">{d.headcount}</td>
                    <td className="py-3 px-4">
                      <span className={`font-numeric text-[10px] px-2 py-0.5 border rounded-sm ${badgeStyle}`}>
                        {attrPct}%
                      </span>
                    </td>
                    <td className="py-3 px-4 font-numeric tabular-nums">{formatCurrencyShorthand(d.avg_salary)}</td>
                    <td className="py-3 px-4 font-numeric tabular-nums">{d.avg_engagement?.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      )}
    </div>
  );
}
