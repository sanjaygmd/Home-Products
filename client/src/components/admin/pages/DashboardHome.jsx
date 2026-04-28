import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { useAdminSearch } from "../../admin/contexts/AdminSearchContext";
import {
  IndianRupee, ShoppingCart, Package, Users, Activity,
  PackageCheck, Clock, ShieldAlert, Zap, Search, ListFilter,
  ShieldCheck, TrendingUp, TrendingDown, LayoutGrid, BarChart3,
  Rocket
} from "lucide-react";
import { cn } from "../../../lib/utils";
import { api } from "../../../services/api";

const COLORS = ["#8b5cf6", "#10b981", "#f59e0b", "#3b82f6", "#ef4444"];

function ProductImage({ src, name, size = 56 }) {
  const [imgError, setImgError] = useState(false);
  const isRealImage = src && !imgError && (src.startsWith("data:image") || src.startsWith("http") || src.startsWith("/"));

  return (
    <div className="shrink-0 rounded-2xl border border-slate-100 bg-slate-50 flex items-center justify-center overflow-hidden shadow-sm transition-transform group-hover:scale-110 duration-500" style={{ width: size, height: size }}>
      {isRealImage ? (
        <img src={src} alt={name} className="w-full h-full object-cover" onError={() => setImgError(true)} />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-violet-50 text-violet-600 font-black text-lg">
          {name ? name[0] : <Package className="w-5 h-5" />}
        </div>
      )}
    </div>
  );
}

const AdminStatCard = ({ title, value, change, changeType, icon: Icon, color, bg }) => (
  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 group hover:-translate-y-2">
    <div className="flex justify-between items-start">
      <div className={cn("p-5 rounded-2xl shadow-lg transition-transform group-hover:rotate-12 group-hover:scale-110", bg, color)}>
        <Icon size={24} />
      </div>
      {change && (
        <div className={cn("flex items-center gap-1.5 text-[11px] font-black px-3 py-1.5 rounded-xl border-2 transition-all",
          changeType === 'positive' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
            changeType === 'negative' ? 'bg-rose-50 text-rose-600 border-rose-100' :
              'bg-slate-50 text-slate-500 border-slate-100'
        )}>
          {changeType === 'positive' ? <TrendingUp size={12} /> : changeType === 'negative' ? <TrendingDown size={12} /> : null}
          {change}
        </div>
      )}
    </div>
    <div className="mt-8">
      <p className="text-[11px] text-slate-400 font-black uppercase tracking-[0.2em] mb-2 opacity-70">{title}</p>
      <h3 className="text-4xl font-black text-slate-950 tracking-tighter">
        {value}
      </h3>
    </div>
  </div>
);

export default function DashboardHome() {
  const { searchQuery: search, setSearchQuery: setSearch } = useAdminSearch();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const resp = await api.get('/user/admin/dashboard-data');
        if (resp.data.success) setDashboardData(resp.data.data);
      } catch (err) {
        console.error("Fetch dashboard error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredPerformance = useMemo(() => {
    const list = dashboardData?.productPerformance || [];
    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter(p =>
      p.name?.toLowerCase().includes(q) ||
      p.sku?.toLowerCase().includes(q) ||
      p.room?.toLowerCase().includes(q)
    );
  }, [dashboardData, search]);

  if (loading) return (
    <div className="flex h-[70vh] flex-col items-center justify-center gap-6">
      <div className="w-20 h-20 relative">
        <div className="absolute inset-0 border-4 border-slate-100 rounded-full" />
        <div className="absolute inset-0 border-4 border-violet-600 rounded-full border-t-transparent animate-spin" />
      </div>
      <p className="text-sm font-black text-slate-400 uppercase tracking-[0.3em] animate-pulse">Loading Dashboard Data...</p>
    </div>
  );

  const { currentUser } = useAuth();
  const stats = dashboardData?.stats || {};
  const admin = currentUser || { name: "Administrator" };

  return (
    <div className="space-y-10 pb-16 px-2 animate-in fade-in duration-1000">

      {/* Admin Overview Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-violet-950 to-indigo-950 p-10 md:p-14 rounded-[3.5rem] shadow-2xl shadow-indigo-200 border border-white/5">
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-10">
          <div className="flex items-center gap-8 text-center lg:text-left">
            <div className="w-24 h-24 bg-white/10 backdrop-blur-2xl text-white rounded-[2rem] flex items-center justify-center shadow-2xl border border-white/20 transition-transform hover:scale-110 duration-500">
              <ShieldCheck size={48} className="text-violet-400" />
            </div>
            <div>
              <div className="flex items-center gap-3 justify-center lg:justify-start mb-3">
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.8)]" />
                <span className="text-[11px] font-black text-violet-300 uppercase tracking-[0.3em]">Platform Status: Active</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-none">
                Welcome, {admin.name.split(' ')[0]}!
              </h2>
              <p className="text-violet-200/70 mt-4 font-bold text-lg max-w-xl">
                You are orchestrating the marketplace at peak performance. {stats.today_orders > 0 ? `${stats.today_orders} new nodes deployed today.` : "All systems stable."}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 w-full lg:w-auto justify-center">
            <button
              onClick={() => navigate('/admin/orders')}
              className="h-16 px-10 rounded-[1.5rem] bg-white text-slate-950 text-xs font-black uppercase tracking-widest hover:bg-violet-50 transition-all shadow-xl active:scale-95"
            >
              Order History
            </button>
            <button
              onClick={() => navigate('/admin/analytics')}
              className="h-16 px-10 rounded-[1.5rem] bg-violet-600/20 backdrop-blur-xl text-white border border-white/20 text-xs font-black uppercase tracking-widest hover:bg-violet-600/40 transition-all active:scale-95 flex items-center gap-3"
            >
              <Zap size={18} className="text-violet-400 fill-violet-400" /> Sales Insights
            </button>
          </div>
        </div>
        {/* Abstract Background Accents */}
        <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-30%] left-[-5%] w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-[100px]"></div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard
          title="Total Revenue"
          value={`₹${Number(stats.total_revenue || 0).toLocaleString('en-IN')}`}
          change={`+${Math.round((stats.today_revenue / (stats.total_revenue || 1)) * 100)}%`}
          changeType="positive"
          icon={IndianRupee}
          color="text-violet-600"
          bg="bg-violet-50"
        />
        <AdminStatCard
          title="Total Orders"
          value={stats.total_orders || 0}
          change={stats.today_orders || 0}
          changeType="positive"
          icon={ShoppingCart}
          color="text-blue-600"
          bg="bg-blue-50"
        />
        <AdminStatCard
          title="Product Inventory"
          value={stats.total_products || 0}
          change={stats.today_new_products || 0}
          changeType="neutral"
          icon={Package}
          color="text-emerald-600"
          bg="bg-emerald-50"
        />
        <AdminStatCard
          title="Total Customers"
          value={stats.total_customers || 0}
          change={stats.today_new_customers || 0}
          changeType="positive"
          icon={Users}
          color="text-amber-600"
          bg="bg-amber-50"
        />
      </div>

      {/* Main Grid: Orders & Actions */}
      <div className="grid gap-10 lg:grid-cols-5 items-start">
        {/* Recent Transactions Matrix */}
        <div className="lg:col-span-3 bg-white rounded-[3.5rem] p-12 border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-700">
          <div className="flex justify-between items-center mb-12">
            <div>
              <h3 className="text-3xl font-black text-slate-950 tracking-tight leading-none">Latest Orders</h3>
              <p className="text-sm text-slate-400 font-bold mt-3 uppercase tracking-widest opacity-70 italic">Real-time marketplace activity</p>
            </div>
            <button
              onClick={() => navigate('/admin/orders')}
              className="h-14 px-8 rounded-2xl bg-slate-950 text-white font-black text-[10px] uppercase tracking-widest hover:bg-violet-600 transition-all shadow-xl active:scale-95 flex items-center gap-2"
            >
              View Full Feed <Rocket size={14} />
            </button>
          </div>

          <div className="space-y-6">
            {(dashboardData?.recentOrders || []).map((o) => (
              <div key={o.id} className="flex items-center justify-between p-7 rounded-[2.5rem] bg-slate-50/50 hover:bg-white transition-all duration-500 border border-transparent hover:border-slate-100 group/row cursor-pointer shadow-sm hover:shadow-xl hover:shadow-slate-200/50">
                <div className="flex items-center gap-6">
                  <div className="h-16 w-16 rounded-[1.5rem] bg-white border border-slate-100 flex items-center justify-center text-violet-600 shadow-sm group-hover/row:scale-110 group-hover/row:rotate-6 transition-all duration-500">
                    <PackageCheck size={32} />
                  </div>
                  <div>
                    <h4 className="text-xl font-black text-slate-900 tracking-tight group-hover/row:text-violet-600 transition-colors">{o.customer}</h4>
                    <p className="text-[11px] font-black text-slate-400 mt-2 uppercase tracking-[0.15em] flex items-center gap-2">
                      ORDER: <span className="text-slate-950 font-black">#{o.id.split('-')[0].toUpperCase()}</span> <span className="h-1 w-1 rounded-full bg-slate-300" /> {o.items} Units
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-slate-950 tracking-tighter italic">₹{o.total}</p>
                  <span className={cn("inline-flex items-center gap-2 mt-3 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest",
                    o.status === 'Delivered' ? 'bg-emerald-50 text-emerald-600' :
                      o.status === 'Cancelled' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
                  )}>
                    <div className={cn("h-1.5 w-1.5 rounded-full",
                      o.status === 'Delivered' ? 'bg-emerald-500' :
                        o.status === 'Cancelled' ? 'bg-rose-500' : 'bg-amber-500'
                    )} />
                    {o.status}
                  </span>
                </div>
              </div>
            ))}
            {(!dashboardData?.recentOrders?.length) && (
              <div className="p-20 text-center bg-slate-50 rounded-[3rem] border border-dashed border-slate-200">
                <p className="text-slate-400 font-black uppercase tracking-widest italic">No recent transactions recorded</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Intelligence Tools */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          <div className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-700">
            <h3 className="text-2xl font-black text-slate-900 mb-8 tracking-tight">Rapid Access</h3>
            <div className="grid grid-cols-1 gap-5">
              {[
                { label: 'Manage Products', sub: 'Update catalog', icon: Package, color: 'text-violet-600', bg: 'bg-violet-50', hover: 'hover:bg-violet-600', path: '/admin/products' },
                { label: 'Manage Orders', sub: 'Fulfill new orders', icon: LayoutGrid, color: 'text-indigo-600', bg: 'bg-indigo-50', hover: 'hover:bg-indigo-600', path: '/admin/orders' },
                { label: 'Manage Customers', sub: 'Directory & Profiles', icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50', hover: 'hover:bg-emerald-600', path: '/admin/customers' },
              ].map((item, i) => (
                <button
                  key={i}
                  onClick={() => navigate(item.path)}
                  className={cn("flex items-center gap-6 p-6 rounded-[2rem] bg-slate-50 transition-all group border border-transparent shadow-sm hover:shadow-xl hover:text-white active:scale-95", item.hover)}
                >
                  <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center transition-colors shadow-sm bg-white", item.color)}>
                    <item.icon size={24} />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-black uppercase tracking-[0.2em]">{item.label}</p>
                    <p className="text-[10px] opacity-60 font-black mt-1 uppercase tracking-widest">{item.sub}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-slate-950 p-10 rounded-[3.5rem] text-white shadow-2xl relative overflow-hidden group hover:-translate-y-2 transition-all duration-700 h-full flex flex-col justify-between">
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20">
                  <Activity size={24} className="text-violet-400" />
                </div>
                <h4 className="text-2xl font-black tracking-tight">Market Intelligence</h4>
              </div>
              <p className="text-violet-200/60 text-sm leading-relaxed font-bold italic">
                Analyze velocity metrics and scale your marketplace operations via the consolidated Analytics Hub.
              </p>
            </div>
            <button
              onClick={() => navigate('/admin/analytics')}
              className="mt-8 w-full bg-white text-slate-950 py-5 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.4em] hover:bg-violet-50 transition-all active:scale-95 shadow-xl"
            >
              Enter Hub <BarChart3 size={14} className="inline ml-2" />
            </button>
            <div className="absolute top-[-20%] left-[-20%] w-60 h-60 bg-violet-600/20 rounded-full blur-[80px]" />
          </div>
        </div>
      </div>

      {/* Optimized Catalog Overview */}
      <div className="bg-white rounded-[3.5rem] border border-slate-100 shadow-sm overflow-hidden hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-700 group">
        <div className="p-12 border-b border-slate-50 flex flex-col xl:flex-row xl:items-center justify-between gap-8">
          <div>
            <h3 className="text-4xl font-black text-slate-950 tracking-tight leading-none">Inventory Overview</h3>
            <p className="text-sm text-slate-400 font-bold mt-3 uppercase tracking-widest opacity-70 italic">Global Product Stock Management</p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                placeholder="Search products..."
                className="w-full h-16 pl-14 pr-6 rounded-[1.5rem] border-2 border-slate-50 bg-slate-50/50 text-sm font-black focus:outline-none focus:border-violet-500/30 focus:ring-8 focus:ring-violet-500/5 transition-all shadow-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button
              onClick={() => navigate('/admin/products')}
              className="h-16 w-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-950 hover:text-white transition-all shadow-sm active:scale-90"
            >
              <ListFilter className="h-6 w-6" />
            </button>
          </div>
        </div>
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-12 py-8 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Product Name</th>
                <th className="px-8 py-8 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Room/Category</th>
                <th className="px-8 py-8 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Price</th>
                <th className="px-8 py-8 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Stock Level</th>
                <th className="px-12 py-8 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-slate-600">
              {filteredPerformance.map(p => (
                <tr key={p.id} className="hover:bg-slate-50/40 transition-all duration-300 group/row cursor-pointer" onClick={() => navigate('/admin/products')}>
                  <td className="px-12 py-10">
                    <div className="flex items-center gap-8">
                      <ProductImage src={p.image} name={p.name} />
                      <div className="min-w-0">
                        <p className="text-xl font-black text-slate-950 truncate tracking-tight group-hover/row:text-violet-600 transition-colors">{p.name}</p>
                        <p className="text-[11px] font-black text-slate-400 uppercase mt-2 tracking-widest flex items-center gap-2">
                          SKU: <span className="text-slate-950">{p.sku || 'UNALLOCATED'}</span>
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-10">
                    <span className="px-5 py-2 rounded-2xl bg-violet-50 text-violet-600 text-[10px] font-black uppercase tracking-widest border border-violet-100">
                      {p.room || 'General'}
                    </span>
                  </td>
                  <td className="px-8 py-10 text-right">
                    <p className="text-2xl font-black text-slate-950 italic tracking-tighter">₹{Number(p.price).toLocaleString('en-IN')}</p>
                  </td>
                  <td className="px-8 py-10 text-right">
                    <div className="flex flex-col items-end">
                      <span className={cn("text-2xl font-black tracking-tighter", (p.stock || 0) < 10 ? 'text-rose-500' : 'text-slate-950')}>
                        {p.stock || 0}
                      </span>
                      <div className="w-24 h-2 bg-slate-100 rounded-full mt-3 overflow-hidden shadow-inner">
                        <div className={cn("h-full rounded-full transition-all duration-1500 ease-out", (p.stock || 0) < 10 ? 'bg-rose-500' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]')}
                          style={{ width: `${Math.min(100, ((p.stock || 0) / 50) * 100)}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="px-12 py-10 text-center">
                    <span className={cn("inline-flex items-center px-6 py-2.5 rounded-[1.25rem] text-[10px] font-black uppercase tracking-[0.2em] border-2",
                      (p.stock || 0) > 0 ? 'bg-emerald-50/50 text-emerald-600 border-emerald-100' : 'bg-rose-50/50 text-rose-600 border-rose-100'
                    )}>
                      {(p.stock || 0) > 0 ? 'Active' : 'Depleted'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
