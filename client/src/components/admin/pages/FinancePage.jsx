import { useState, useEffect, useMemo } from "react";
import { 
  IndianRupee, TrendingUp, CreditCard, Receipt, Search,
  Download, Calendar, History, TrendingDown, Wallet, ShieldCheck, 
  ArrowUpRight, ArrowDownRight, LayoutDashboard, Landmark, ArrowRight, Eye, CheckCircle2, XCircle
} from "lucide-react";
import { Button } from "../../ui/button";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { cn } from "../../../lib/utils";
import { useToast } from "../../../hooks/use-toast";
import { api } from "../../../services/api";
import { updatePayoutStatus } from "../../../services/payoutService";
import { useAuth } from "../../../context/AuthContext.jsx";

const CHART_COLORS = ['#8b5cf6', '#10b981', '#f59e0b', '#3b82f6', '#ef4444'];
const fmt = (n) => `₹${Number(n).toLocaleString("en-IN")}`;
const fmtK = (v) => `₹${(v / 1000).toFixed(0)}k`;

const FinanceStatCard = ({ title, value, label, icon: Icon, color, change }) => (
  <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-xl transition-all duration-500">
    <div className={`absolute top-0 right-0 w-32 h-32 ${color} opacity-[0.03] -mr-16 -mt-16 rounded-full group-hover:scale-150 transition-transform duration-700`} />
    <div className="flex items-center gap-6 relative z-10">
      <div className={cn("h-16 w-16 rounded-2xl flex items-center justify-center shadow-lg", color.replace('bg-', 'bg- opacity-10').replace('opacity-10', ''), "bg-opacity-10")}>
        <Icon className={cn("h-8 w-8", color.replace('bg-', 'text-'))} />
      </div>
      <div>
        <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{title}</p>
        <div className="flex items-baseline gap-2">
          <h3 className="text-3xl font-black text-slate-900 tracking-tight">{value}</h3>
          {change && (
            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", change.startsWith('+') ? "text-emerald-600 bg-emerald-50" : "text-rose-600 bg-rose-50")}>
              {change}
            </span>
          )}
        </div>
        <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{label}</p>
      </div>
    </div>
  </div>
);

export default function FinancePage() {
  const [range, setRange] = useState('monthly');
  const { currentUser } = useAuth();
  const handleDownloadReport = async () => {
    try {
      const year = new Date().getFullYear();
      
      const resp = await api.get(`/user/admin/finance-report?year=${year}`, {
        responseType: 'blob'
      });
      
      const blob = new Blob([resp.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Bank_Statement_${year}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({ title: "Report Downloaded", description: `Financial statement for ${year} is ready.` });
    } catch (err) {
      console.error("Download report error:", err);
      toast({ title: "Download Failed", description: "Could not generate the yearly report.", variant: "destructive" });
    }
  };

  const [loading, setLoading] = useState(true);
  const [financeData, setFinanceData] = useState({
    summary: { gross_revenue: 0, platform_commission: 0, net_profit: 0 },
    monthlyPL: [],
    payouts: [],
    expenses: [],
    transactions: []
  });
  const [selectedPayout, setSelectedPayout] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [payoutForm, setPayoutForm] = useState({ transaction_ref: '', notes: '' });
  const { toast } = useToast();

  useEffect(() => {
    fetchFinanceData();
  }, [range]);

  const fetchFinanceData = async () => {
    setLoading(true);
    try {
      const resp = await api.get(`/user/admin/finance-data?range=${range}`);
      if (resp.data.success) {
        setFinanceData(resp.data.data);
      }
    } catch (err) {
      console.error("Fetch finance data error:", err);
      toast({ title: "Fetch Error", description: "Failed to load financial metrics.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handlePayoutAction = async (status) => {
    if (status === 'Paid' && !payoutForm.transaction_ref) {
      toast({ title: "Reference Required", description: "Please enter a transaction reference for payout.", variant: "destructive" });
      return;
    }

    setActionLoading(true);
    try {
      const res = await updatePayoutStatus(selectedPayout.id, {
        status,
        admin_id: currentUser?.id,
        transaction_ref: payoutForm.transaction_ref,
        notes: payoutForm.notes
      });

      if (res.success) {
        toast({ title: "Success", description: `Payout ${status.toLowerCase()} successfully.` });
        setSelectedPayout(null);
        setPayoutForm({ transaction_ref: '', notes: '' });
        fetchFinanceData();
      } else {
        toast({ title: "Failed", description: res.message, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Action failed. Check server logs.", variant: "destructive" });
    }
    setActionLoading(false);
  };

  const { summary, monthlyPL, payouts, expenses, transactions } = financeData;

  const handleExport = () => {
    toast({ title: "Audit Report", description: "Your financial ledger is being generated for download." });
  };

  return (
    <div className="space-y-10 pb-20 max-w-[1600px] mx-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-2 w-10 bg-violet-600 rounded-full" />
            <span className="text-[11px] font-black text-violet-600 uppercase tracking-[0.3em]">Fiscal Outlook</span>
          </div>
          <h1 className="text-4xl font-black text-slate-950 tracking-tight">Finance Dashboard</h1>
          <p className="text-slate-500 font-bold mt-2 text-sm">Track platform revenue and partner payouts</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 p-1.5 rounded-2xl mr-4">
            <button 
              onClick={() => setRange('monthly')}
              className={cn(
                "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                range === 'monthly' ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-900"
              )}
            >
              Monthly
            </button>
            <button 
              onClick={() => setRange('annual')}
              className={cn(
                "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                range === 'annual' ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-900"
              )}
            >
              Yearly
            </button>
          </div>
          <Button 
            onClick={handleDownloadReport}
            className="h-14 rounded-2xl px-8 bg-slate-950 text-white font-black uppercase text-[10px] tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
          >
            <Download className="h-4 w-4 mr-2" /> Download Yearly Report
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <FinanceStatCard 
          title={range === 'monthly' ? "Monthly Revenue" : "Annual Revenue"} 
          value={fmt(summary.gross_revenue)} 
          label="Total Gross Sales" 
          icon={IndianRupee} 
          color="bg-violet-600" 
        />
        <FinanceStatCard 
          title="Platform Earnings" 
          value={fmt(summary.platform_commission)} 
          label="Commission (10%)" 
          icon={Receipt} 
          color="bg-emerald-600" 
        />
        <FinanceStatCard 
          title="Net Profit" 
          value={fmt(summary.net_profit)} 
          label="Platform Revenue" 
          icon={TrendingUp} 
          color="bg-blue-600" 
        />
        <FinanceStatCard 
          title="Transaction Count" 
          value={transactions.length} 
          label="Total entries" 
          icon={History} 
          color="bg-amber-600" 
        />
      </div>

      {/* Financial Performance Ledger (Grouped View) */}
      <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-10 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Financial Performance Summary</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
              Summarized view of {range} earnings and expenditures
            </p>
          </div>
          <div className="h-14 w-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-600 shadow-sm">
            <Landmark size={28} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="pl-10 pr-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{range === 'monthly' ? 'Month' : 'Year'}</th>
                <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Revenue (Credits)</th>
                <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Costs (Debits)</th>
                <th className="pl-6 pr-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Net Profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {monthlyPL && monthlyPL.length > 0 ? (
                // We use monthlyPL data because it's already grouped by the backend
                [...monthlyPL].reverse().map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/30 transition-colors group">
                    <td className="pl-10 pr-6 py-8">
                      <span className="font-black text-[15px] text-slate-900 tracking-tight">{item.name}</span>
                    </td>
                    <td className="px-6 py-8 text-right">
                      <span className="font-black text-sm text-emerald-600">{fmt(item.revenue)}</span>
                    </td>
                    <td className="px-6 py-8 text-right">
                      <span className="font-black text-sm text-rose-600">-{fmt(item.costs)}</span>
                    </td>
                    <td className="pl-6 pr-10 py-8 text-right">
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 border border-slate-100">
                         <span className={cn("font-black text-sm", item.profit >= 0 ? "text-slate-900" : "text-rose-600")}>
                           {fmt(item.profit)}
                         </span>
                         {item.profit >= 0 ? <TrendingUp size={14} className="text-emerald-500" /> : <TrendingDown size={14} className="text-rose-500" />}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-24 text-center">
                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">No data available for this range</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Raw Audit Trail (Optional, hidden by default or at bottom) */}
      <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden opacity-50 hover:opacity-100 transition-opacity">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
          <div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight">Recent Ledger Entries</h3>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Detailed transaction log</p>
          </div>
          <History size={20} className="text-slate-400" />
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <tbody className="divide-y divide-slate-50">
              {transactions && transactions.slice(0, 10).map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="pl-10 py-6 text-xs font-bold text-slate-500">{t.date}</td>
                  <td className="px-6 py-6 font-black text-sm text-slate-900">{t.seller}</td>
                  <td className={cn("px-6 py-6 text-right font-black", t.type === 'payout' ? "text-rose-500" : "text-emerald-500")}>
                    {t.type === 'payout' ? '-' : '+'}{fmt(t.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payout Review Modal */}
      {selectedPayout && (
        <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center z-[100] p-4 backdrop-blur-xl">
          <div className="bg-white w-full max-w-xl rounded-[3rem] p-10 shadow-2xl relative border border-slate-200">
             <button onClick={() => setSelectedPayout(null)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-900 transition-colors">
               <ArrowRight className="h-6 w-6 rotate-180" />
             </button>
             
             <div className="flex items-center gap-3 mb-6">
                <div className="h-2 w-10 bg-amber-500 rounded-full" />
                <span className="text-[11px] font-black text-amber-500 uppercase tracking-[0.3em]">Payout Review</span>
             </div>

             <div className="mb-8">
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">{selectedPayout.name}</h2>
                <p className="text-slate-500 font-bold mt-1">Request ID: <span className="font-mono text-xs">{selectedPayout.id}</span></p>
             </div>

             <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Requested Amount</p>
                   <p className="text-2xl font-black text-slate-900 tracking-tight">{fmt(selectedPayout.amount)}</p>
                </div>
                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Partner Revenue</p>
                   <p className="text-2xl font-black text-slate-900 tracking-tight">{fmt(selectedPayout.revenue)}</p>
                </div>
             </div>

             {selectedPayout.status === 'Requested' ? (
               <div className="space-y-6">
                 <div>
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Transaction Reference (Required for Approval)</label>
                    <input 
                      type="text" 
                      placeholder="e.g. UTR-992122112"
                      value={payoutForm.transaction_ref}
                      onChange={(e) => setPayoutForm({...payoutForm, transaction_ref: e.target.value})}
                      className="w-full h-14 px-6 rounded-2xl bg-slate-50 border-none text-sm font-bold focus:ring-4 focus:ring-violet-500/10 transition-all placeholder:text-slate-300"
                    />
                 </div>
                 <div>
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Admin Notes</label>
                    <textarea 
                      placeholder="Optional notes for the seller..."
                      value={payoutForm.notes}
                      onChange={(e) => setPayoutForm({...payoutForm, notes: e.target.value})}
                      className="w-full h-24 p-6 rounded-2xl bg-slate-50 border-none text-sm font-bold focus:ring-4 focus:ring-violet-500/10 transition-all placeholder:text-slate-300 resize-none"
                    />
                 </div>

                 <div className="flex gap-4">
                    <Button 
                      onClick={() => handlePayoutAction('Paid')}
                      disabled={actionLoading}
                      className="flex-1 h-16 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-[11px] tracking-widest shadow-lg shadow-emerald-200"
                    >
                      {actionLoading ? "Processing..." : "Approve & Mark as Paid"}
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => handlePayoutAction('Rejected')}
                      disabled={actionLoading}
                      className="flex-1 h-16 rounded-2xl border-slate-200 text-rose-600 font-black uppercase text-[11px] tracking-widest hover:bg-rose-50"
                    >
                      Reject Request
                    </Button>
                 </div>
               </div>
             ) : (
               <div className="p-8 bg-slate-50 rounded-3xl border border-slate-100">
                  <div className="flex items-center justify-between mb-4">
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Payout Status</span>
                     <span className={cn("px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest", selectedPayout.status === 'Paid' ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700")}>
                        {selectedPayout.status}
                     </span>
                  </div>
                  {selectedPayout.status === 'Paid' && (
                    <div className="flex items-center justify-between">
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Transaction Ref</span>
                       <span className="text-sm font-black text-slate-900 font-mono">#{selectedPayout.transaction_ref || 'N/A'}</span>
                    </div>
                  )}
               </div>
             )}
          </div>
        </div>
      )}
    </div>
  );
}