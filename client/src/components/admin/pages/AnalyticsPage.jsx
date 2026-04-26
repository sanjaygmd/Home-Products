import React, { useState, useEffect } from "react";
import { 
  TrendingUp, Activity, Package, IndianRupee, Download, 
  BarChart3 as BarIcon, PieChart as PieIcon, LayoutGrid, Box,
  ArrowUpRight, RefreshCw
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell, Legend
} from "recharts";
import { cn } from "../../../lib/utils";
import { useToast } from "../../../hooks/use-toast";
import { api } from "../../../services/api";
import { useNavigate } from "react-router-dom";

const RANGES = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'quarterly', label: 'Quarterly' },
  { id: 'halfYearly', label: 'Half Yearly' },
  { id: 'annual', label: 'Annual' },
  { id: 'yearly', label: 'Yearly' },
  { id: 'all', label: 'All Time' },
];

const COLORS = ["#8b5cf6", "#6366f1", "#10b981", "#f59e0b", "#ef4444", "#3b82f6"];

export default function AnalyticsPage() {
  const [range, setRange] = useState('daily');
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState({
    trend: [], categorySales: [], categoryDistribution: [], statusDistribution: [], topProducts: [], summary: null
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => { fetchAnalytics(); }, [range]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const resp = await api.get(`/user/admin/analytics-data?range=${range}`);
      if (resp.data.success) setAnalytics(resp.data.data);
    } catch (err) {
      toast({ title: "Error", description: "Could not load analytics data.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const summary = analytics.summary || {};
  const totalRevenue = Number(summary.total_revenue || 0);
  const totalOrders = Number(summary.total_orders || 0);
  const totalItems = Number(summary.total_items_sold || 0);
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const statCards = [
    { label: 'Total Revenue', value: `₹${totalRevenue.toLocaleString('en-IN')}`, icon: IndianRupee, color: 'text-violet-600', bg: 'bg-violet-50' },
    { label: 'Total Orders', value: totalOrders.toLocaleString(), icon: Activity, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Delivered Items', value: totalItems.toLocaleString(), icon: Package, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Avg Order', value: `₹${Math.round(avgOrderValue).toLocaleString('en-IN')}`, icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  const handleExport = () => {
    toast({ title: "Report Generated", description: "Your analytics report has been downloaded." });
  };

  return (
    <div className="space-y-12 pb-24 max-w-[1700px] mx-auto animate-in fade-in duration-1000">
      {/* Premium Header */}
      <div className="relative overflow-hidden bg-slate-950 p-12 md:p-16 rounded-[4rem] text-white shadow-2xl border border-white/5">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-10">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-2.5 w-2.5 rounded-full bg-violet-500 animate-pulse" />
              <span className="text-[11px] font-black uppercase tracking-[0.4em] text-violet-400">Marketplace Analytics</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-none mb-6">Sales <span className="text-violet-500 italic">Overview</span></h1>
            <p className="text-slate-400 font-bold text-lg max-w-2xl leading-relaxed">
              Detailed breakdown of marketplace revenue, orders, and category growth. Real-time data sync active.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={fetchAnalytics}
              className="h-16 w-16 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white hover:text-slate-950 transition-all active:scale-90"
            >
              <RefreshCw className={cn("h-6 w-6", loading && "animate-spin")} />
            </button>
            <button 
              onClick={handleExport}
              className="h-16 px-10 rounded-2xl bg-violet-600 text-white font-black uppercase text-[10px] tracking-[0.3em] hover:bg-violet-500 transition-all shadow-xl shadow-violet-600/20 active:scale-95 flex items-center gap-3"
            >
              <Download className="h-5 w-5" /> Export Intelligence
            </button>
          </div>
        </div>
        <div className="absolute top-[-20%] right-[-10%] w-96 h-96 bg-violet-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px]" />
      </div>

      {/* Control Strip */}
      <div className="flex flex-wrap items-center justify-between gap-8 bg-white/50 backdrop-blur-xl p-4 rounded-[2.5rem] border border-slate-100 shadow-sm sticky top-4 z-50">
        <div className="flex p-1.5 bg-slate-100 rounded-[1.75rem] gap-1">
          {RANGES.map((r) => (
            <button
              key={r.id}
              onClick={() => setRange(r.id)}
              className={cn(
                "px-8 py-3.5 rounded-[1.25rem] text-[10px] font-black uppercase tracking-widest transition-all duration-500",
                range === r.id 
                  ? "bg-white text-slate-950 shadow-xl" 
                  : "text-slate-400 hover:text-slate-600"
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-6 pr-6">
           <div className="flex items-center gap-2">
             <div className="h-2 w-2 rounded-full bg-emerald-500" />
             <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Live Feed</span>
           </div>
           <div className="h-6 w-px bg-slate-200" />
           <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Last Updated: <span className="text-violet-600">{new Date().toLocaleTimeString()}</span></p>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card, i) => (
          <div key={i} className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-700 group hover:-translate-y-2">
            <div className="flex justify-between items-start mb-8">
              <div className={cn("h-16 w-16 rounded-[1.5rem] flex items-center justify-center transition-transform group-hover:rotate-12 duration-500 shadow-lg", card.bg, card.color)}>
                <card.icon size={28} />
              </div>
              <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
                <ArrowUpRight size={14} /> +12.5%
              </div>
            </div>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{card.label}</p>
            <h3 className="text-4xl font-black text-slate-950 tracking-tighter italic">{card.value}</h3>
          </div>
        ))}
      </div>

      {/* FINANCIAL INTELLIGENCE SECTION */}
      <div className="space-y-8">
        <div className="flex items-center gap-4 px-4">
          <div className="h-1 w-12 bg-violet-600 rounded-full" />
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-[0.3em]">Revenue Performance</h2>
        </div>
        
        <div className="bg-white rounded-[4rem] p-12 border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="flex flex-col xl:flex-row items-center justify-between mb-16 gap-8">
            <div>
              <h3 className="text-4xl font-black text-slate-950 tracking-tight">Revenue Trend</h3>
              <p className="text-slate-400 font-bold mt-2 uppercase tracking-widest text-sm italic">Total Sales vs Operational Costs</p>
            </div>
            <div className="flex flex-wrap items-center gap-8 bg-slate-50 p-6 rounded-[2rem] border border-slate-100 shadow-inner">
               <div className="flex items-center gap-3"><div className="h-4 w-4 rounded-full bg-violet-600 shadow-lg shadow-violet-200" /><span className="text-[11px] font-black uppercase text-slate-500 tracking-widest">Revenue</span></div>
               <div className="flex items-center gap-3"><div className="h-4 w-4 rounded-full bg-rose-500 shadow-lg shadow-rose-200" /><span className="text-[11px] font-black uppercase text-slate-500 tracking-widest">Costs</span></div>
               <div className="flex items-center gap-3"><div className="h-4 w-4 rounded-full bg-emerald-500 shadow-lg shadow-emerald-200" /><span className="text-[11px] font-black uppercase text-slate-500 tracking-widest">Net Profit</span></div>
            </div>
          </div>
          <div className="h-[500px]">
            {loading ? (
              <div className="h-full flex items-center justify-center"><div className="h-16 w-16 border-4 border-violet-100 border-t-violet-600 rounded-full animate-spin" /></div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.trend}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/></linearGradient>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 900, fill: '#94a3b8' }} dy={15} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 900, fill: '#94a3b8' }} tickFormatter={v => `₹${v/1000}k`} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '32px', border: 'none', boxShadow: '0 40px 80px -20px rgba(0,0,0,0.15)', background: '#fff', padding: '32px' }}
                    itemStyle={{ fontWeight: '950', fontSize: '16px' }}
                    formatter={(v, name) => [`₹${Number(v).toLocaleString('en-IN')}`, name.toUpperCase()]}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#8b5cf6" strokeWidth={6} fillOpacity={1} fill="url(#colorRev)" activeDot={{ r: 8, strokeWidth: 0, fill: '#8b5cf6' }} />
                  <Area type="monotone" dataKey="costs" stroke="#f43f5e" strokeWidth={3} strokeDasharray="8 8" fill="transparent" />
                  <Area type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={6} fillOpacity={1} fill="url(#colorProfit)" activeDot={{ r: 8, strokeWidth: 0, fill: '#10b981' }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* OPERATIONAL INTELLIGENCE SECTION */}
      <div className="space-y-8">
        <div className="flex items-center gap-4 px-4">
          <div className="h-1 w-12 bg-blue-600 rounded-full" />
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-[0.3em]">Order Statistics</h2>
        </div>
        
        <div className="grid gap-10 lg:grid-cols-5">
          <div className="lg:col-span-3 bg-white rounded-[4rem] p-12 border border-slate-100 shadow-sm relative overflow-hidden group">
            <div className="flex items-center justify-between mb-12">
               <div>
                  <h3 className="text-3xl font-black text-slate-950 tracking-tight">Order Count</h3>
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-2">Volume trend and fulfillment spikes</p>
               </div>
               <div className="h-14 w-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                  <BarIcon size={24} />
               </div>
            </div>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.trend}>
                  <defs>
                    <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 900, fill: '#94a3b8' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 900, fill: '#94a3b8' }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)', background: '#fff' }}
                    formatter={v => [v, 'ORDERS']}
                  />
                  <Area type="monotone" dataKey="orders" stroke="#3b82f6" strokeWidth={5} fillOpacity={1} fill="url(#colorOrders)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-2 bg-white rounded-[4rem] p-12 border border-slate-100 shadow-sm flex flex-col group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/5 blur-[80px] -mr-24 -mt-24 group-hover:bg-blue-500/10 transition-colors" />
            <div className="flex items-center justify-between mb-10 relative z-10">
               <div>
                  <h3 className="text-3xl font-black text-slate-950 tracking-tight">Fulfillment Status</h3>
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-2">Logistics health distribution</p>
               </div>
               <div className="h-14 w-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400">
                  <LayoutGrid size={24} />
               </div>
            </div>
            <div className="flex-1 min-h-[300px] relative z-10 mb-8">
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                    <Pie
                      data={analytics.statusDistribution}
                      cx="50%" cy="50%"
                      innerRadius={80}
                      outerRadius={120}
                      paddingAngle={10}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {analytics.statusDistribution.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} />
                 </PieChart>
               </ResponsiveContainer>
               <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-4xl font-black text-slate-950 tracking-tighter leading-none">{totalOrders}</span>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2">Total Packets</span>
               </div>
            </div>
            <div className="grid grid-cols-2 gap-4 relative z-10">
               {analytics.statusDistribution.slice(0, 4).map((s, i) => (
                 <div key={s.name} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50/50 hover:bg-white transition-all border border-transparent hover:border-slate-100">
                    <div className="h-3 w-3 rounded-full shadow-sm" style={{ background: COLORS[i % COLORS.length] }} />
                    <div className="flex flex-col">
                       <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{s.name}</span>
                       <span className="text-sm font-black text-slate-950">{s.value}</span>
                    </div>
                 </div>
               ))}
            </div>
          </div>
        </div>
      </div>

      {/* MARKET INTELLIGENCE SECTION */}
      <div className="space-y-8">
        <div className="flex items-center gap-4 px-4">
          <div className="h-1 w-12 bg-emerald-600 rounded-full" />
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-[0.3em]">Category Insights</h2>
        </div>

        <div className="grid gap-10 lg:grid-cols-2">
          <div className="bg-white rounded-[4rem] p-12 border border-slate-100 shadow-sm group relative overflow-hidden">
             <div className="flex items-center justify-between mb-12">
                <div>
                   <h3 className="text-3xl font-black text-slate-950 tracking-tight">Category Performance</h3>
                   <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-2">Revenue generation per category</p>
                </div>
                <div className="h-14 w-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                   <IndianRupee size={24} />
                </div>
             </div>
             <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.categorySales}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 900, fill: '#94a3b8' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 900, fill: '#94a3b8' }} tickFormatter={v => `₹${v/1000}k`} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.12)', background: '#fff' }}
                      itemStyle={{ fontWeight: '950', fontSize: '15px' }}
                      formatter={v => [`₹${Number(v).toLocaleString('en-IN')}`, 'REVENUE']}
                    />
                    <Bar dataKey="revenue" fill="#10b981" radius={[12, 12, 0, 0]} barSize={60} />
                  </BarChart>
                </ResponsiveContainer>
             </div>
          </div>

          <div className="bg-white rounded-[4rem] p-12 border border-slate-100 shadow-sm flex flex-col group relative overflow-hidden">
             <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 blur-[80px] -mr-24 -mt-24 group-hover:bg-emerald-500/10 transition-colors" />
             <div className="flex items-center justify-between mb-10 relative z-10">
                <div>
                   <h3 className="text-3xl font-black text-slate-950 tracking-tight">Inventory Split</h3>
                   <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-2">Catalog distribution by category</p>
                </div>
                <div className="h-14 w-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                   <Box size={24} />
                </div>
             </div>
             <div className="flex-1 min-h-[350px] relative z-10 mb-8">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.categoryDistribution}
                      cx="50%" cy="50%"
                      innerRadius={90}
                      outerRadius={135}
                      paddingAngle={8}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {analytics.categoryDistribution.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="hover:opacity-80 transition-opacity cursor-pointer" />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '20px', border: 'none' }} />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-4xl font-black text-slate-900 tracking-tighter">{analytics.categoryDistribution.reduce((acc, curr) => acc + curr.value, 0)}</span>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2">Unique SKUs</span>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* LOGISTICS INTELLIGENCE SECTION */}
      <div className="space-y-8">
        <div className="flex items-center gap-4 px-4">
          <div className="h-1 w-12 bg-slate-900 rounded-full" />
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-[0.3em]">Logistics Intelligence</h2>
        </div>

        <div className="bg-white rounded-[4rem] p-12 border border-slate-100 shadow-sm overflow-hidden group">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h3 className="text-3xl font-black text-slate-950 tracking-tight">Recent Deliveries</h3>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-2">Live synchronization from the deliveries table</p>
            </div>
            <div className="flex items-center gap-3 bg-emerald-50 text-emerald-600 px-6 py-3 rounded-2xl">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-[10px] font-black uppercase tracking-widest">Database Sync Active</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-50">
                  <th className="pb-8 text-[11px] font-black text-slate-400 uppercase tracking-widest">Order ID</th>
                  <th className="pb-8 text-[11px] font-black text-slate-400 uppercase tracking-widest">Customer</th>
                  <th className="pb-8 text-[11px] font-black text-slate-400 uppercase tracking-widest">Courier</th>
                  <th className="pb-8 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                  <th className="pb-8 text-[11px] font-black text-slate-400 uppercase tracking-widest">Dispatched</th>
                  <th className="pb-8 text-[11px] font-black text-slate-400 uppercase tracking-widest">Delivered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {(analytics.recentDeliveries || []).map((d) => (
                  <tr key={d.delivery_id} className="group/row hover:bg-slate-50/50 transition-colors">
                    <td className="py-8 font-black text-slate-950">#{d.order_id.slice(0, 8)}</td>
                    <td className="py-8 font-bold text-slate-600">{d.customer_name}</td>
                    <td className="py-8">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase text-indigo-600">{d.courier_name}</span>
                        <span className="text-[11px] font-medium text-slate-400">{d.awb_code}</span>
                      </div>
                    </td>
                    <td className="py-8 text-center">
                      <span className={cn(
                        "px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest",
                        d.shipping_status === 'Delivered' ? "bg-emerald-50 text-emerald-600" : 
                        d.shipping_status === 'Shipped' ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-500"
                      )}>
                        {d.shipping_status}
                      </span>
                    </td>
                    <td className="py-8 text-slate-500 text-sm font-medium">
                      {d.dispatched_at ? new Date(d.dispatched_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td className="py-8 text-slate-500 text-sm font-medium">
                      {d.delivered_at ? new Date(d.delivered_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                  </tr>
                ))}
                {(!analytics.recentDeliveries || analytics.recentDeliveries.length === 0) && (
                  <tr>
                    <td colSpan={6} className="py-24 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="h-16 w-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300">
                          <Package size={32} />
                        </div>
                        <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No logistics data found</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
