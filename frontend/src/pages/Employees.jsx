import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import API from '../api/client';
import { Input } from "@/components/ui/input";
import { Search, X, User, Briefcase, TrendingUp, Clock, BookOpen, DollarSign, AlertTriangle, Activity, Award, ChevronRight } from "lucide-react";

import { EmployeeDetailPanel } from '../components/EmployeeDetailPanel';
import { useCurrency } from '../context/CurrencyContext';
import { useAuth } from '../context/AuthContext';

/* ── Main Page ────────────────────────────────────────────────────── */

export default function Employees() {
    const [employees, setEmployees] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [search, setSearch] = useState('');
    const [dept, setDept] = useState('');
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null);
    const { formatCurrencyShorthand } = useCurrency();
    const { user } = useAuth();

    useEffect(() => {
        API.get('/employees/departments').then((r) => setDepartments(r.data));
    }, []);

    useEffect(() => {
        setLoading(true);
        const params = {};
        if (search) params.search = search;
        if (dept) params.department = dept;
        API.get('/employees/', { params })
            .then((r) => setEmployees(r.data))
            .finally(() => setLoading(false));
    }, [search, dept]);

    const handleSelect = useCallback((emp) => {
        setSelected(emp);
    }, []);

    const handleClose = useCallback(() => {
        setSelected(null);
    }, []);

    return (
        <div className="flex flex-col gap-8">
            <section className="flex flex-wrap gap-4 items-center border-b border-rule pb-6">
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="text" 
                        placeholder="Search ID, name, title..."
                        value={search} 
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 bg-paper rounded-none border-rule focus-visible:ring-0 focus-visible:border-primary font-mono text-sm"
                    />
                </div>
                {user?.role !== 'manager' && (
                    <div className="w-full md:w-64">
                        <select 
                            value={dept} 
                            onChange={(e) => setDept(e.target.value)} 
                            className="flex h-10 w-full bg-paper px-3 py-2 text-sm border border-rule rounded-none focus:outline-none focus:border-primary font-mono"
                        >
                            <option value="">All Departments</option>
                            {departments.map((d) => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </div>
                )}
            </section>

            {/* Employee detail slide-over */}
            <EmployeeDetailPanel employee={selected} onClose={handleClose} />

            {loading ? (
                <div className="flex h-64 items-center justify-center flex-col gap-4">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-rule border-t-primary" />
                    <span className="font-mono text-xs text-muted-foreground uppercase tracking-widest">Compiling records...</span>
                </div>
            ) : (
                <section className="rise border border-rule bg-card">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm border-collapse">
                            <thead>
                                <tr className="border-b border-rule bg-paper/50">
                                    <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-wider text-muted-foreground font-medium whitespace-nowrap">Employee ID</th>
                                    <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-wider text-muted-foreground font-medium whitespace-nowrap">Department</th>
                                    <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-wider text-muted-foreground font-medium whitespace-nowrap">Job Title</th>
                                    <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-wider text-muted-foreground font-medium whitespace-nowrap">Gender</th>
                                    <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-wider text-muted-foreground font-medium whitespace-nowrap text-right">Salary</th>
                                    <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-wider text-muted-foreground font-medium whitespace-nowrap text-center">Tenure</th>
                                    <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-wider text-muted-foreground font-medium whitespace-nowrap text-center">Rating</th>
                                    <th className="py-3 px-4 font-mono text-[10px] uppercase tracking-wider text-muted-foreground font-medium whitespace-nowrap">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-rule/50">
                                {employees.map((e) => (
                                    <tr key={e.EmployeeID} onClick={() => handleSelect(e)} className="hover:bg-accent/20 transition-colors cursor-pointer group">
                                        <td className="py-3 px-4 font-medium text-primary group-hover:underline underline-offset-4">{e.EmployeeID}</td>
                                        <td className="py-3 px-4 text-ink">{e.Department}</td>
                                        <td className="py-3 px-4 text-ink">{e.JobTitle}</td>
                                        <td className="py-3 px-4 text-muted-foreground">{e.Gender}</td>
                                        <td className="py-3 px-4 font-numeric tabular-nums text-right text-ink">{formatCurrencyShorthand(e.Salary)}</td>
                                        <td className="py-3 px-4 font-numeric tabular-nums text-center text-ink">{e.TenureYears}y</td>
                                        <td className="py-3 px-4 font-numeric tabular-nums text-center text-ink">{e.PerformanceRating}</td>
                                        <td className="py-3 px-4">
                                            <span className={`font-numeric text-[10px] px-2 py-0.5 border rounded-sm ${e.AttritionFlag ? 'bg-destructive/10 text-destructive border-destructive/30' : 'bg-success/10 text-success border-success/30'}`}>
                                                {e.AttritionFlag ? 'Left' : 'Active'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}
        </div>
    );
}
