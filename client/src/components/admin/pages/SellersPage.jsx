import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { StatCard } from "../../admin/components/StatCard";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import {
  Search, Plus, Store, UserCheck, UserX, ShieldCheck, Clock,
  Star, Mail, Phone, MapPin, FileText, CheckCircle2, XCircle,
  AlertTriangle, Ban, Eye, TrendingUp, History, Download, X, Loader2
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { api } from "../../../services/api";
import { useToast } from "../../../hooks/use-toast";
import { cn } from "../../../lib/utils";

const CHART_COLORS = ['#8b5cf6', '#10b981', '#f59e0b', '#3b82f6', '#ef4444'];

const statusStyle = {
  Active: "bg-emerald-50 text-emerald-600 border-emerald-100",
  "Pending KYC": "bg-amber-50 text-amber-600 border-amber-100",
  Suspended: "bg-rose-50 text-rose-600 border-rose-100",
  Banned: "bg-slate-50 text-slate-600 border-slate-100",
};

export default function SellersPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockReason, setBlockReason] = useState("");
  const [sellerToBlock, setSellerToBlock] = useState(null);

  useEffect(() => {
    fetchSellers();
  }, []);

  const fetchSellers = async () => {
    setLoading(true);
    try {
      const resp = await api.get('/user/admin/sellers-data');
      if (resp.data.success) {
        setSellers(resp.data.data);
      }
    } catch (err) {
      console.error("Fetch sellers error:", err);
      toast({ title: "Fetch Failed", description: "Could not load sellers data.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (seller, isBlocking) => {
    if (isBlocking) {
      setSellerToBlock(seller);
      setBlockReason("");
      setShowBlockModal(true);
    } else {
      await updateSellerStatus(seller.id, true, null);
    }
  };

  const updateSellerStatus = async (id, is_active, reason) => {
    setUpdating(true);
    try {
      const resp = await api.patch(`/user/admin/seller/${id}/status`, { is_active, block_reason: reason });
      if (resp.data.success) {
        toast({ 
          title: is_active ? "Seller Unblocked" : "Seller Blocked", 
          description: `Store status has been updated successfully.` 
        });
        setSellers(prev => prev.map(s => s.id === id ? { 
          ...s, 
          is_active: resp.data.is_active, 
          status: resp.data.is_active ? (s.is_verified ? 'Active' : 'Pending KYC') : 'Suspended',
          block_reason: resp.data.block_reason
        } : s));
        if (selectedSeller?.id === id) {
          setSelectedSeller(prev => ({ 
            ...prev, 
            is_active: resp.data.is_active,
            status: resp.data.is_active ? (prev.is_verified ? 'Active' : 'Pending KYC') : 'Suspended',
            block_reason: resp.data.block_reason
          }));
        }
        setShowBlockModal(false);
      }
    } catch (err) {
      console.error(err);
      toast({ title: "Update Failed", description: "Could not change seller status.", variant: "destructive" });
    } finally {
      setUpdating(false);
    }
  };

  const performanceData = useMemo(() => {
    return sellers.filter(s => s.status === "Active").map(s => ({
      name: s.name.split(" ")[0],
      orders: parseInt(s.orders) || 0,
      rating: (parseFloat(s.rating) || 0) * 20
    })).slice(0, 8);
  }, [sellers]);

  const stats = useMemo(() => {
    return {
      total: sellers.length,
      active: sellers.filter(s => s.status === 'Active').length,
      pending: sellers.filter(s => s.status === 'Pending KYC').length,
      suspended: sellers.filter(s => s.status === 'Suspended').length
    };
  }, [sellers]);

  const filtered = useMemo(() => {
    return sellers.filter((s) => {
      const matchSearch = s.name?.toLowerCase().includes(search.toLowerCase()) ||
        s.owner?.toLowerCase().includes(search.toLowerCase()) ||
        s.email?.toLowerCase().includes(search.toLowerCase());
      if (tab === "all") return matchSearch;
      if (tab === "active") return matchSearch && s.status === "Active";
      if (tab === "pending") return matchSearch && s.status === "Pending KYC";
      if (tab === "suspended") return matchSearch && (s.status === "Suspended" || s.status === "Banned");
      return matchSearch;
    });
  }, [sellers, search, tab]);

  return (
    <div className="space-y-8 pb-12 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Seller Ecosystem</h1>
          <p className="text-sm text-slate-500 font-bold italic mt-1">Onboarding, verification, and performance governance</p>
        </div>
      </div>

      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Partners" value={stats.total.toLocaleString()} change="Marketplace Scale" changeType="positive" icon={Store} iconColor="bg-violet-600" />
        <StatCard title="Active Status" value={stats.active.toLocaleString()} change={`${Math.round((stats.active / stats.total) * 100 || 0)}% of total`} changeType="positive" icon={UserCheck} iconColor="bg-emerald-600" />
        <StatCard title="Pending KYC" value={stats.pending.toLocaleString()} change="Awaiting Action" changeType="neutral" icon={Clock} iconColor="bg-amber-600" />
        <StatCard title="Suspended" value={stats.suspended.toLocaleString()} change="Risk Mitigation" changeType="negative" icon={UserX} iconColor="bg-rose-600" />
      </div>

      {/* Seller Performance Chart */}
      <div className="bg-white rounded-[32px] p-8 border shadow-sm group overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/5 blur-3xl -mr-32 -mt-32" />
        <div className="flex items-center justify-between mb-8 relative z-10">
          <div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Partner Performance</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Order velocity and rating score</p>
          </div>
          <TrendingUp className="text-slate-200 h-8 w-8" />
        </div>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={performanceData} margin={{ top: 0, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }} />
              <Tooltip
                contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', background: '#fff' }}
                itemStyle={{ fontWeight: 900 }}
              />
              <Bar dataKey="orders" name="Total Orders" fill="#8b5cf6" radius={[10, 10, 0, 0]} />
              <Bar dataKey="rating" name="Rating Score" fill="#10b981" radius={[10, 10, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-white p-4 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            placeholder="Search partners, owners, or store IDs..."
            className="w-full h-14 pl-14 pr-6 rounded-2xl bg-slate-50/50 border-none text-sm font-bold focus:ring-4 focus:ring-violet-500/10 transition-all placeholder:text-slate-400"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
          {[
            { key: "all", label: "All Assets" },
            { key: "active", label: "Verified" },
            { key: "pending", label: "KYC Pending" },
            { key: "suspended", label: "Restricted" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setTab(f.key)}
              className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${f.key === tab ? "bg-slate-900 text-white shadow-xl" : "bg-white text-slate-400 hover:bg-slate-50 border border-slate-100"
                }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Seller Grid */}
      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-96 bg-slate-100 rounded-[32px] animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => (
            <div key={s.id} className="bg-white rounded-[32px] p-8 border shadow-sm hover:shadow-xl transition-all group relative overflow-hidden flex flex-col">
              <div className={cn(
                "absolute top-0 right-0 w-1.5 h-full transition-colors",
                s.is_active ? 'bg-emerald-500' : 'bg-rose-500'
              )} />

              <div className="flex items-start justify-between mb-6">
                <div className="h-14 w-14 rounded-2xl bg-slate-50 border flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Store className="h-7 w-7 text-slate-400" />
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={cn(
                    "px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border",
                    statusStyle[s.status] || "bg-slate-50 text-slate-600 border-slate-100"
                  )}>
                    {s.status}
                  </span>
                  {!s.is_active && s.block_reason && (
                    <span className="text-[8px] font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-md max-w-[150px] truncate" title={s.block_reason}>
                      Reason: {s.block_reason}
                    </span>
                  )}
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">{s.name}</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Lead: {s.owner}</p>
              </div>

              <div className="space-y-3 mb-8 text-[11px] font-bold text-slate-500">
                <div className="flex items-center gap-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100/50">
                  <Mail className="h-3.5 w-3.5 text-violet-500" />
                  <span className="truncate">{s.email}</span>
                </div>
                <div className="flex items-center gap-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100/50">
                  <Phone className="h-3.5 w-3.5 text-emerald-500" />
                  <span>{s.phone}</span>
                </div>
              </div>

              {/* Performance Metrics */}
              <div className="grid grid-cols-3 gap-4 py-6 border-y border-slate-50 text-center mb-8 mt-auto">
                <div>
                  <p className="text-xl font-black text-slate-900">{s.products || 0}</p>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Assets</p>
                </div>
                <div>
                  <p className="text-xl font-black text-slate-900">{s.orders || 0}</p>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Orders</p>
                </div>
                <div>
                  <p className="text-xl font-black text-slate-900">{s.rating || '—'}</p>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Score</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => handleToggleStatus(s, s.is_active)}
                  disabled={updating}
                  className={cn(
                    "flex-1 h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all shadow-sm flex items-center justify-center",
                    s.is_active 
                      ? "bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-600 hover:text-white" 
                      : "bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-600 hover:text-white"
                  )}
                >
                  {updating ? <Loader2 size={18} className="animate-spin" /> : (s.is_active ? "Suspend" : "Activate")}
                </button>
                <button 
                  onClick={() => setSelectedSeller(s)}
                  className="h-14 w-14 flex items-center justify-center rounded-2xl bg-slate-900 text-white hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                >
                  <Eye className="h-6 w-6" />
                </button>
              </div>
            </div>
          ))}

          {filtered.length === 0 && !loading && (
            <div className="col-span-full py-32 text-center bg-white rounded-[40px] border border-dashed border-slate-200">
              <div className="h-24 w-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-8">
                <Store className="h-12 w-12 text-slate-200" />
              </div>
              <h3 className="text-2xl font-black text-slate-900">No Partners Found</h3>
              <p className="text-sm font-bold text-slate-400 mt-2 italic max-w-xs mx-auto">Refine your search parameters or tab filters to find specific sellers</p>
            </div>
          )}
        </div>
      )}

      {/* Seller Detail Overlay */}
      {selectedSeller && (
        <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center z-[100] p-4 backdrop-blur-xl animate-in fade-in duration-500">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 border border-slate-200/50 relative">
            <button
              onClick={() => setSelectedSeller(null)}
              className="absolute top-8 right-8 h-12 w-12 flex items-center justify-center rounded-2xl bg-white/10 hover:bg-white/20 transition-all z-30 text-white border border-white/20 backdrop-blur-md"
            >
              <X size={24} />
            </button>

            {/* Modal Header/Cover */}
            <div className="h-48 bg-gradient-to-br from-slate-800 to-slate-950 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-violet-600/30 blur-[100px] -mr-48 -mt-48 rounded-full" />
              <div className="absolute bottom-0 left-12 translate-y-1/2">
                <div className="h-32 w-32 rounded-[2.5rem] bg-white p-2 shadow-2xl border border-slate-100">
                  <div className="h-full w-full rounded-[2rem] bg-slate-900 flex items-center justify-center text-white text-5xl font-black">
                    {selectedSeller.name?.charAt(0)}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Content */}
            <div className="pt-24 px-12 pb-12">
              <div className="flex justify-between items-start mb-10">
                <div>
                  <h2 className="text-4xl font-black text-slate-950 tracking-tight">{selectedSeller.name}</h2>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[11px] font-black text-violet-600 uppercase tracking-widest">Store ID:</span>
                    <span className="font-mono text-[11px] font-bold text-slate-400 uppercase tracking-widest">#{selectedSeller.id.split('-')[0]}</span>
                  </div>
                </div>
                <div className={cn(
                  "px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border shadow-sm",
                  selectedSeller.is_active ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-600 border-rose-100"
                )}>
                  {selectedSeller.status}
                </div>
              </div>

              {selectedSeller.block_reason && !selectedSeller.is_active && (
                <div className="mb-10 p-6 bg-rose-50 border border-rose-100 rounded-[2rem] flex items-start gap-4">
                  <AlertTriangle className="h-6 w-6 text-rose-500 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">Restriction Reason</p>
                    <p className="text-sm font-bold text-rose-700 leading-relaxed">{selectedSeller.block_reason}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-6 mb-12">
                {[
                  { icon: Mail, label: "Official Email", value: selectedSeller.email, color: "text-violet-600", bg: "bg-violet-50" },
                  { icon: Phone, label: "Contact Phone", value: selectedSeller.phone || 'N/A', color: "text-emerald-600", bg: "bg-emerald-50" },
                  { icon: Clock, label: "Onboarded Date", value: selectedSeller.joinDate, color: "text-blue-600", bg: "bg-blue-50" },
                  { icon: ShieldCheck, label: "Verification Status", value: selectedSeller.is_verified ? "KYC Verified" : "Verification Pending", color: "text-amber-600", bg: "bg-amber-50" }
                ].map((item, idx) => (
                  <div key={idx} className="p-5 rounded-[2rem] border border-slate-100 bg-slate-50/30 group hover:bg-white hover:shadow-xl hover:border-transparent transition-all duration-300">
                    <div className="flex items-center gap-4">
                      <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", item.bg)}>
                        <item.icon className={cn("h-5 w-5", item.color)} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{item.label}</p>
                        <p className="text-sm font-black text-slate-900 truncate">{item.value}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-4">
                <Button 
                  onClick={() => toast({ title: "Feature Coming Soon", description: "Direct editing is being developed." })}
                  className="flex-1 h-16 rounded-[1.5rem] bg-slate-950 text-white font-black uppercase text-[11px] tracking-[0.2em] hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
                >
                  Manage Store
                </Button>
                <button 
                  onClick={() => handleToggleStatus(selectedSeller, selectedSeller.is_active)}
                  disabled={updating}
                  className={cn(
                    "px-8 h-16 rounded-[1.5rem] font-black uppercase text-[11px] tracking-[0.2em] border transition-all flex items-center justify-center",
                    selectedSeller.is_active ? "text-rose-600 border-rose-200 hover:bg-rose-50" : "text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                  )}
                >
                  {updating ? <Loader2 className="animate-spin" /> : (selectedSeller.is_active ? <Ban size={20} /> : <UserCheck size={20} />)}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Block Reason Modal */}
      {showBlockModal && (
        <div className="fixed inset-0 bg-slate-950/90 flex items-center justify-center z-[110] p-4 backdrop-blur-2xl animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95 duration-300 border border-slate-200">
            <div className="h-20 w-20 bg-rose-50 rounded-3xl flex items-center justify-center mb-8">
              <Ban className="h-10 w-10 text-rose-500" />
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Suspend Partner</h2>
            <p className="text-slate-500 font-bold mb-8 text-sm">Please provide a reason for restricting <span className="text-slate-900">"{sellerToBlock?.name}"</span>. This will be shown to the seller.</p>
            
            <textarea
              className="w-full h-40 p-6 rounded-[2rem] bg-slate-50 border-none text-sm font-bold focus:ring-4 focus:ring-rose-500/10 transition-all placeholder:text-slate-300 mb-8 resize-none"
              placeholder="e.g. Violation of terms, repeated order cancellations, invalid documentation..."
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
            />

            <div className="flex gap-4">
              <button
                onClick={() => setShowBlockModal(false)}
                className="flex-1 h-14 rounded-2xl bg-slate-100 text-slate-600 font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => updateSellerStatus(sellerToBlock.id, false, blockReason)}
                disabled={!blockReason.trim() || updating}
                className="flex-1 h-14 rounded-2xl bg-rose-600 text-white font-black uppercase text-[10px] tracking-widest hover:bg-rose-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-rose-100"
              >
                {updating ? <Loader2 className="animate-spin" /> : "Confirm Suspend"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
