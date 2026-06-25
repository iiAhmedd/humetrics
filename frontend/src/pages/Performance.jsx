import { useState, useEffect } from 'react';
import API from '../api/client';
import {
    BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
    PieChart, Pie, Cell, Legend
} from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { EmployeeDetailPanel } from '../components/EmployeeDetailPanel';

const BAND_COLORS = { 'High Performer': 'var(--chart-2)', 'Solid Performer': 'var(--chart-1)', 'At Risk': 'var(--chart-5)' };
const STRAIN_COLORS = { 'Low Risk': 'var(--chart-2)', 'Medium Risk': 'var(--chart-4)', 'High Risk': 'var(--chart-5)' };

function CurrentPerformanceTab() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedEmployee, setSelectedEmployee] = useState(null);

    useEffect(() => {
        API.get('/dashboard/performance')
            .then((r) => setData(r.data))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return (
        <div className="flex h-64 items-center justify-center flex-col gap-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-rule border-t-primary" />
            <span className="font-mono text-xs text-muted-foreground uppercase tracking-widest">Loading...</span>
        </div>
    );

    return (
        <div className="flex flex-col gap-8 rise">
            <EmployeeDetailPanel employee={selectedEmployee} onClose={() => setSelectedEmployee(null)} />
            <section className="grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-rule pb-6">
                <div 
                    className="relative px-6 py-8 rounded-2xl shadow-lg border border-zinc-800/50 transition-colors"
                    style={{ backgroundColor: "#141210" }}
                >
                    <p className="font-mono text-sm uppercase tracking-widest text-zinc-300 mb-2">Avg Rating</p>
                    <div className="font-display text-5xl text-white">
                        {data.avg_overall?.toFixed(1)}
                        <span className="text-xl text-zinc-500 ml-2 font-mono">/ 5.0</span>
                    </div>
                </div>
                <div 
                    className="relative px-6 py-8 rounded-2xl shadow-lg border border-zinc-800/50 transition-colors"
                    style={{ backgroundColor: "#141210" }}
                >
                    <p className="font-mono text-sm uppercase tracking-widest text-emerald-400 mb-2">High Performers</p>
                    <div className="font-display text-5xl text-white">
                        {(data.high_performer_pct * 100).toFixed(1)}%
                    </div>
                    <p className="mt-3 font-display italic text-base text-zinc-500">Of workforce</p>
                </div>
            </section>

            <section className={`grid grid-cols-1 gap-8 ${data.by_department?.length > 1 ? 'lg:grid-cols-2' : ''}`}>
                <div className="border border-rule bg-card p-6">
                    <h3 className="font-display text-xl text-ink mb-6">Rating Distribution</h3>
                    <ChartContainer config={{ count: { label: "Employees", color: "var(--chart-1)" } }} className="h-[280px] w-full">
                        <LineChart data={data.rating_distribution} margin={{ left: -20, right: 10, top: 10, bottom: 0 }}>
                            <CartesianGrid vertical={false} stroke="var(--rule)" strokeDasharray="2 4" />
                            <XAxis dataKey="PerformanceRating" tickLine={false} axisLine={false} tickMargin={10} fontSize={11} tick={{ fill: "var(--muted-foreground)" }} />
                            <YAxis domain={['dataMin', 'auto']} tickLine={false} axisLine={false} fontSize={11} tick={{ fill: "var(--muted-foreground)" }} />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Line 
                                type="monotone" 
                                dataKey="count" 
                                stroke="var(--color-count)" 
                                strokeWidth={2} 
                                dot={{ fill: "var(--color-count)", r: 4 }} 
                                activeDot={{ r: 6 }} 
                            />
                        </LineChart>
                    </ChartContainer>
                </div>

                {data.by_department?.length > 1 && (
                <div className="border border-rule bg-card p-6">
                    <div className="mb-6 flex items-baseline justify-between">
                        <h3 className="font-display text-xl text-ink">Department Avg vs Company Avg</h3>
                        <span className="font-mono text-xs text-muted-foreground">Company Avg: {data.avg_overall?.toFixed(1)}</span>
                    </div>
                    <ChartContainer config={{ diff: { label: "Diff from Avg" } }} className="h-[280px] w-full">
                        <BarChart data={data.by_department?.map(d => ({ ...d, diff: Number((d.avg_rating - data.avg_overall).toFixed(2)) }))} layout="vertical" margin={{ left: 0, right: 10, top: 0, bottom: 0 }}>
                            <CartesianGrid horizontal={false} stroke="var(--rule)" strokeDasharray="2 4" />
                            <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} tick={{ fill: "var(--muted-foreground)" }} />
                            <YAxis dataKey="Department" type="category" tickLine={false} axisLine={false} fontSize={11} width={100} tick={{ fill: "var(--muted-foreground)" }} />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="diff" radius={2}>
                                {data.by_department?.map((entry, index) => {
                                    const diff = entry.avg_rating - data.avg_overall;
                                    return <Cell key={`cell-${index}`} fill={diff >= 0 ? "var(--color-success)" : "var(--color-destructive)"} />;
                                })}
                            </Bar>
                        </BarChart>
                    </ChartContainer>
                </div>
                )}
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="border border-rule bg-card overflow-hidden">
                    <div className="p-4 border-b border-rule bg-paper/50 flex items-center justify-between">
                        <h3 className="font-display text-xl text-ink">Top 10 Performers</h3>
                        <span className="font-mono text-[10px] text-success px-2 py-1 bg-success/10 border border-success/20 rounded-sm">Leading</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm border-collapse">
                            <thead>
                                <tr className="border-b border-rule bg-paper/20">
                                    <th className="py-2 px-4 font-mono text-[10px] uppercase tracking-wider text-muted-foreground whitespace-nowrap">ID</th>
                                    <th className="py-2 px-4 font-mono text-[10px] uppercase tracking-wider text-muted-foreground whitespace-nowrap">Department</th>
                                    <th className="py-2 px-4 font-mono text-[10px] uppercase tracking-wider text-muted-foreground whitespace-nowrap">Job Title</th>
                                    <th className="py-2 px-4 font-mono text-[10px] uppercase tracking-wider text-muted-foreground whitespace-nowrap text-right">Score</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-rule/50">
                                {data.top_performers?.map((e) => (
                                    <tr key={e.EmployeeID} onClick={() => setSelectedEmployee(e)} className="hover:bg-accent/10 cursor-pointer group transition-colors">
                                        <td className="py-2 px-4 font-medium text-primary group-hover:underline underline-offset-4">{e.EmployeeID}</td>
                                        <td className="py-2 px-4 text-muted-foreground">{e.Department}</td>
                                        <td className="py-2 px-4 text-muted-foreground truncate max-w-[120px]">{e.JobTitle}</td>
                                        <td className="py-2 px-4 font-numeric tabular-nums text-right text-success font-medium">{e.AvgOverallScore?.toFixed(1)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="border border-rule bg-card overflow-hidden">
                    <div className="p-4 border-b border-rule bg-paper/50 flex items-center justify-between">
                        <h3 className="font-display text-xl text-ink">Bottom 10 Performers</h3>
                        <span className="font-mono text-[10px] text-destructive px-2 py-1 bg-destructive/10 border border-destructive/20 rounded-sm">At Risk</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm border-collapse">
                            <thead>
                                <tr className="border-b border-rule bg-paper/20">
                                    <th className="py-2 px-4 font-mono text-[10px] uppercase tracking-wider text-muted-foreground whitespace-nowrap">ID</th>
                                    <th className="py-2 px-4 font-mono text-[10px] uppercase tracking-wider text-muted-foreground whitespace-nowrap">Department</th>
                                    <th className="py-2 px-4 font-mono text-[10px] uppercase tracking-wider text-muted-foreground whitespace-nowrap">Job Title</th>
                                    <th className="py-2 px-4 font-mono text-[10px] uppercase tracking-wider text-muted-foreground whitespace-nowrap text-right">Score</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-rule/50">
                                {data.bottom_performers?.map((e) => (
                                    <tr key={e.EmployeeID} onClick={() => setSelectedEmployee(e)} className="hover:bg-accent/10 cursor-pointer group transition-colors">
                                        <td className="py-2 px-4 font-medium text-primary group-hover:underline underline-offset-4">{e.EmployeeID}</td>
                                        <td className="py-2 px-4 text-muted-foreground">{e.Department}</td>
                                        <td className="py-2 px-4 text-muted-foreground truncate max-w-[120px]">{e.JobTitle}</td>
                                        <td className="py-2 px-4 font-numeric tabular-nums text-right text-destructive font-medium">{e.AvgOverallScore?.toFixed(1)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>
        </div>
    );
}

function PredictedPerformanceTab() {
    const [performance, setPerformance] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        API.get('/predictions/performance')
            .then((r) => setPerformance(r.data))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return (
        <div className="flex h-64 items-center justify-center flex-col gap-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-rule border-t-primary" />
            <span className="font-mono text-xs text-muted-foreground uppercase tracking-widest">Running AI models...</span>
        </div>
    );

    const bandPie = [
        { name: 'High Performer', value: performance.band_summary.high_performer },
        { name: 'Solid Performer', value: performance.band_summary.solid_performer },
        { name: 'At Risk', value: performance.band_summary.at_risk },
    ];

    return (
        <div className="flex flex-col gap-8 rise">
            <section className="grid grid-cols-1 md:grid-cols-3 gap-6 border-b border-rule pb-6">
                <div 
                    className="relative px-6 py-8 rounded-2xl shadow-lg border border-zinc-800/50 group"
                    style={{ backgroundColor: "#141210" }}
                >
                    <p className="font-mono text-sm uppercase tracking-widest text-emerald-400 mb-2">High Performers</p>
                    <div className="font-display text-4xl text-white">{performance.band_summary.high_performer}</div>
                    <p className="mt-3 font-display italic text-base text-zinc-500">Predicted ≥ 4.0</p>
                </div>
                <div 
                    className="relative px-6 py-8 rounded-2xl shadow-lg border border-zinc-800/50 group"
                    style={{ backgroundColor: "#141210" }}
                >
                    <p className="font-mono text-sm uppercase tracking-widest text-amber-400 mb-2">Solid Performers</p>
                    <div className="font-display text-4xl text-white">{performance.band_summary.solid_performer}</div>
                    <p className="mt-3 font-display italic text-base text-zinc-500">Predicted 3.0 – 3.99</p>
                </div>
                <div 
                    className="relative px-6 py-8 rounded-2xl shadow-lg border border-zinc-800/50 group"
                    style={{ backgroundColor: "#141210" }}
                >
                    <p className="font-mono text-sm uppercase tracking-widest text-rose-400 mb-2">At Risk</p>
                    <div className="font-display text-4xl text-white">{performance.band_summary.at_risk}</div>
                    <p className="mt-3 font-display italic text-base text-zinc-500">Predicted &lt; 3.0</p>
                </div>
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="border border-rule bg-card p-6">
                    <h3 className="font-display text-xl text-ink mb-6">Performance Band Distribution</h3>
                    <ChartContainer config={{}} className="h-[280px] w-full">
                        <PieChart>
                            <Pie data={bandPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} innerRadius={60} stroke="var(--bg-card)" strokeWidth={2}>
                                {bandPie.map((d) => <Cell key={d.name} fill={BAND_COLORS[d.name]} />)}
                            </Pie>
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Legend verticalAlign="bottom" height={36} iconType="circle" />
                        </PieChart>
                    </ChartContainer>
                </div>
                <div className="border border-rule bg-card p-6">
                    <h3 className="font-display text-xl text-ink mb-6">Top Predictors of Performance</h3>
                    <ChartContainer config={{ importance: { label: "Importance", color: "var(--chart-3)" } }} className="h-[280px] w-full">
                        <BarChart data={performance.feature_importance?.slice(0, 6)} layout="vertical" margin={{ left: 0, right: 10, top: 0, bottom: 0 }}>
                            <CartesianGrid horizontal={false} stroke="var(--rule)" strokeDasharray="2 4" />
                            <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} tick={{ fill: "var(--muted-foreground)" }} />
                            <YAxis dataKey="feature" type="category" tickLine={false} axisLine={false} fontSize={10} width={120} tick={{ fill: "var(--muted-foreground)" }} />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="importance" fill="var(--color-importance)" radius={[0, 2, 2, 0]} />
                        </BarChart>
                    </ChartContainer>
                </div>
            </section>

            <section className="border border-rule bg-card overflow-hidden">
                <div className="p-4 border-b border-rule bg-paper/50 flex flex-wrap items-center justify-between gap-4">
                    <h3 className="font-display text-xl text-ink">Department – At Risk %</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                        <thead>
                            <tr className="border-b border-rule bg-paper/20">
                                <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-wider text-muted-foreground whitespace-nowrap">Department</th>
                                <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-wider text-muted-foreground whitespace-nowrap">Employees</th>
                                <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-wider text-muted-foreground whitespace-nowrap text-right">Avg Predicted</th>
                                <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-wider text-muted-foreground whitespace-nowrap text-center">At Risk</th>
                                <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-wider text-muted-foreground whitespace-nowrap">At Risk %</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-rule/50">
                            {performance.department_summary?.map((d, i) => (
                                <tr key={i} className="hover:bg-accent/10">
                                    <td className="py-3 px-4 font-medium text-ink">{d.Department}</td>
                                    <td className="py-3 px-4 font-numeric tabular-nums text-muted-foreground">{d.Employees}</td>
                                    <td className="py-3 px-4 font-numeric tabular-nums text-right text-ink">{d.AvgPredicted?.toFixed(2)}</td>
                                    <td className="py-3 px-4 font-numeric tabular-nums text-center text-destructive font-medium">{d.AtRisk}</td>
                                    <td className="py-3 px-4">
                                        <span className={`font-numeric text-[10px] px-2 py-0.5 border rounded-sm ${d.AtRiskPct > 30 ? 'bg-destructive/10 text-destructive border-destructive/30' : d.AtRiskPct > 15 ? 'bg-warning/10 text-warning border-warning/30' : 'bg-success/10 text-success border-success/30'}`}>
                                            {d.AtRiskPct}%
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}

function BehavioralRiskTab() {
    const [behavioral, setBehavioral] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        API.get('/predictions/behavioral-risk')
            .then((r) => setBehavioral(r.data))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return (
        <div className="flex h-64 items-center justify-center flex-col gap-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-rule border-t-primary" />
            <span className="font-mono text-xs text-muted-foreground uppercase tracking-widest">Running AI models...</span>
        </div>
    );

    const strainPie = Object.entries(behavioral.summary).map(([k, v]) => ({ name: k, value: v }));

    return (
        <div className="flex flex-col gap-8 rise">
            <section className="grid grid-cols-1 md:grid-cols-3 gap-6 border-b border-rule pb-6">
                {Object.entries(behavioral.summary).map(([level, count]) => {
                    const colorClass = level === 'High Risk' ? 'text-rose-400' : level === 'Medium Risk' ? 'text-amber-400' : 'text-emerald-400';
                    return (
                        <div 
                            key={level} 
                            className="relative px-6 py-8 rounded-2xl shadow-lg border border-zinc-800/50 group"
                            style={{ backgroundColor: "#141210" }}
                        >
                            <p className={`font-mono text-sm uppercase tracking-widest mb-2 ${colorClass}`}>{level}</p>
                            <div className="font-display text-4xl text-white">{count}</div>
                            <p className="mt-3 font-display italic text-base text-zinc-500">Employees</p>
                        </div>
                    );
                })}
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="border border-rule bg-card p-6">
                    <h3 className="font-display text-xl text-ink mb-6">Risk Distribution</h3>
                    <ChartContainer config={{}} className="h-[280px] w-full">
                        <PieChart>
                            <Pie data={strainPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} innerRadius={60} stroke="var(--bg-card)" strokeWidth={2}>
                                {strainPie.map((d) => <Cell key={d.name} fill={STRAIN_COLORS[d.name] || 'var(--chart-1)'} />)}
                            </Pie>
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Legend verticalAlign="bottom" height={36} iconType="circle" />
                        </PieChart>
                    </ChartContainer>
                </div>
                <div className="border border-rule bg-card p-6">
                    <h3 className="font-display text-xl text-ink mb-6">Decision States</h3>
                    <ChartContainer config={{ count: { label: "Employees", color: "var(--chart-1)" } }} className="h-[280px] w-full">
                        <BarChart data={Object.entries(behavioral.decision_states).map(([k, v]) => ({ state: k, count: v }))} layout="vertical" margin={{ left: 0, right: 10, top: 0, bottom: 0 }}>
                            <CartesianGrid horizontal={false} stroke="var(--rule)" strokeDasharray="2 4" />
                            <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} tick={{ fill: "var(--muted-foreground)" }} />
                            <YAxis dataKey="state" type="category" tickLine={false} axisLine={false} fontSize={10} width={130} tick={{ fill: "var(--muted-foreground)" }} />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="count" fill="var(--color-count)" radius={[0, 2, 2, 0]} />
                        </BarChart>
                    </ChartContainer>
                </div>
            </section>

            <section className="border border-rule bg-card p-6">
                <h3 className="font-display text-xl text-ink mb-6">High Risk % by Department</h3>
                <ChartContainer config={{ high_risk_pct: { label: "High Risk %", color: "var(--chart-5)" } }} className="h-[280px] w-full">
                    <BarChart data={behavioral.by_department} layout="vertical" margin={{ left: 0, right: 10, top: 0, bottom: 0 }}>
                        <CartesianGrid horizontal={false} stroke="var(--rule)" strokeDasharray="2 4" />
                        <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} unit="%" domain={[0, 30]} tick={{ fill: "var(--muted-foreground)" }} />
                        <YAxis dataKey="Department" type="category" tickLine={false} axisLine={false} fontSize={10} width={120} tick={{ fill: "var(--muted-foreground)" }} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="high_risk_pct" fill="var(--color-high_risk_pct)" radius={[0, 2, 2, 0]} />
                    </BarChart>
                </ChartContainer>
            </section>
        </div>
    );
}

export default function Performance() {
    return (
        <div className="flex flex-col gap-6">
            <Tabs defaultValue="current" className="w-full">
                <TabsList 
                    className="grid w-full grid-cols-3 max-w-[600px] mb-8 border border-zinc-800/50 rounded-xl h-12 p-1 shadow-lg"
                    style={{ backgroundColor: "#141210" }}
                >
                    <TabsTrigger value="current" className="rounded-lg data-[state=active]:bg-zinc-800 data-[state=active]:text-white data-[state=active]:shadow-sm text-zinc-400 hover:text-zinc-200 font-mono text-xs uppercase tracking-wider">Current</TabsTrigger>
                    <TabsTrigger value="predicted" className="rounded-lg data-[state=active]:bg-zinc-800 data-[state=active]:text-white data-[state=active]:shadow-sm text-zinc-400 hover:text-zinc-200 font-mono text-xs uppercase tracking-wider">Predicted</TabsTrigger>
                    <TabsTrigger value="behavioral" className="rounded-lg data-[state=active]:bg-zinc-800 data-[state=active]:text-white data-[state=active]:shadow-sm text-zinc-400 hover:text-zinc-200 font-mono text-xs uppercase tracking-wider">Behavioral Risk</TabsTrigger>
                </TabsList>
                <TabsContent value="current"><CurrentPerformanceTab /></TabsContent>
                <TabsContent value="predicted"><PredictedPerformanceTab /></TabsContent>
                <TabsContent value="behavioral"><BehavioralRiskTab /></TabsContent>
            </Tabs>
        </div>
    );
}
