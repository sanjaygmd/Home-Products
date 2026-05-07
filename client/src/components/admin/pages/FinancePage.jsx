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
import { jsPDF } from "jspdf";

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
  const handleDownloadReport = () => {
    try {
      const year = new Date().getFullYear();
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      // Header block
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text("ANNUAL FINANCIAL LEDGER REPORT", 14, 20);

      // Subtitle / Date metadata
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139); // slate-500
      const currentDate = new Date().toLocaleDateString("en-IN", {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      doc.text(`Generated on: ${currentDate}`, 14, 26);
      doc.text(`Fiscal Reporting Year: ${year}`, 14, 31);

      // Divider line
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.setLineWidth(0.5);
      doc.line(14, 35, 196, 35);

      // Gross Summary metrics card highlights
      doc.setFillColor(248, 250, 252); // slate-50
      doc.rect(14, 40, 182, 32, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text("GROSS REVENUE", 20, 48);
      doc.text("PLATFORM COMMISSION (10%)", 80, 48);
      doc.text("NET PROFIT", 150, 48);

      doc.setFontSize(16);
      doc.setTextColor(15, 23, 42);
      const grossVal = `INR ${Number(financeData.summary?.gross_revenue || 0).toLocaleString('en-IN')}`;
      const commVal = `INR ${Number(financeData.summary?.platform_commission || 0).toLocaleString('en-IN')}`;
      const netVal = `INR ${Number(financeData.summary?.net_profit || 0).toLocaleString('en-IN')}`;

      doc.text(grossVal, 20, 58);
      doc.text(commVal, 80, 58);
      doc.setTextColor(139, 92, 246); // violet-500 for profit
      doc.text(netVal, 150, 58);

      doc.setDrawColor(226, 232, 240);
      doc.line(14, 78, 196, 78);

      // Monthly Breakdown Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text("MONTHLY PERFORMANCE BREAKDOWN", 14, 86);

      // Monthly table headers
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105); // slate-600
      doc.text("Month Period", 14, 95);
      doc.text("Gross Sales", 65, 95, { align: "right" });
      doc.text("Operational Costs", 115, 95, { align: "right" });
      doc.text("Net Platform Profit", 165, 95, { align: "right" });
      doc.text("Profitability", 196, 95, { align: "right" });

      doc.line(14, 99, 196, 99);

      // Render monthly rows
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);

      let yOffset = 106;

      const items = Array.isArray(financeData.monthlyPL) ? financeData.monthlyPL : [];
      items.forEach((item, idx) => {
        // Alternating background fill
        if (idx % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(14, yOffset - 5, 182, 8, "F");
        }

        // Period Month
        doc.setFont("helvetica", "bold");
        doc.text(item.name || "N/A", 14, yOffset);
        doc.setFont("helvetica", "normal");

        // Gross sales
        const revStr = `INR ${Number(item.revenue || 0).toLocaleString('en-IN')}`;
        doc.text(revStr, 65, yOffset, { align: "right" });

        // Operational Costs
        const costStr = `INR ${Number(item.costs || 0).toLocaleString('en-IN')}`;
        doc.text(costStr, 115, yOffset, { align: "right" });

        // Net Platform Profit
        const profitStr = `INR ${Number(item.profit || 0).toLocaleString('en-IN')}`;
        doc.text(profitStr, 165, yOffset, { align: "right" });

        // Profitability Indicator
        const statusStr = Number(item.profit || 0) >= 0 ? "PROFIT" : "LOSS";
        doc.setFont("helvetica", "bold");
        if (statusStr === "PROFIT") {
          doc.setTextColor(16, 185, 129); // emerald-500
        } else {
          doc.setTextColor(239, 68, 68); // rose-500
        }
        doc.text(statusStr, 196, yOffset, { align: "right" });

        // Reset
        doc.setFont("helvetica", "normal");
        doc.setTextColor(15, 23, 42);

        yOffset += 10;
      });

      // Extra page for Recent Transaction Logs (if available)
      const logs = Array.isArray(financeData.transactions) ? financeData.transactions : [];
      if (logs.length > 0) {
        doc.addPage();
        let yOffsetLog = 20;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(15, 23, 42);
        doc.text("RECENT LEDGER LOGS SUMMARY", 14, yOffsetLog);

        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        doc.text("Detailed transactional breakdown & partner payouts", 14, yOffsetLog + 6);

        doc.setDrawColor(226, 232, 240);
        doc.line(14, yOffsetLog + 11, 196, yOffsetLog + 11);

        yOffsetLog += 20;

        // Table headers for logs
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(71, 85, 105);
        doc.text("Entry Date", 14, yOffsetLog);
        doc.text("Seller Partner", 45, yOffsetLog);
        doc.text("Ledger Type", 115, yOffsetLog);
        doc.text("Transacted Amount", 196, yOffsetLog, { align: "right" });

        doc.line(14, yOffsetLog + 4, 196, yOffsetLog + 4);
        yOffsetLog += 11;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(15, 23, 42);

        logs.forEach((log, logIdx) => {
          if (yOffsetLog > 275) {
            doc.addPage();
            yOffsetLog = 20;

            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            doc.setTextColor(71, 85, 105);
            doc.text("Entry Date", 14, yOffsetLog);
            doc.text("Seller Partner", 45, yOffsetLog);
            doc.text("Ledger Type", 115, yOffsetLog);
            doc.text("Transacted Amount", 196, yOffsetLog, { align: "right" });

            doc.setDrawColor(226, 232, 240);
            doc.line(14, yOffsetLog + 4, 196, yOffsetLog + 4);
            yOffsetLog += 11;
            doc.setFont("helvetica", "normal");
            doc.setFontSize(9);
            doc.setTextColor(15, 23, 42);
          }

          // Alternating background fill
          if (logIdx % 2 === 1) {
            doc.setFillColor(248, 250, 252);
            doc.rect(14, yOffsetLog - 5, 182, 8, "F");
          }

          doc.text(log.date || "N/A", 14, yOffsetLog);
          doc.text(log.seller || "System / Platform", 45, yOffsetLog);
          
          doc.setFont("helvetica", "bold");
          doc.text(log.type === 'payout' ? "PARTNER PAYOUT" : "CREDIT CHARGE", 115, yOffsetLog);
          doc.setFont("helvetica", "normal");

          const amtStr = `${log.type === 'payout' ? '-' : '+'}INR ${Number(log.amount || 0).toLocaleString('en-IN')}`;
          if (log.type === 'payout') {
            doc.setTextColor(239, 68, 68); // rose-500
          } else {
            doc.setTextColor(16, 185, 129); // emerald-500
          }
          doc.text(amtStr, 196, yOffsetLog, { align: "right" });
          doc.setTextColor(15, 23, 42); // Reset

          yOffsetLog += 10;
        });
      }

      // Trigger standard local file download
      doc.save(`Finance_Yearly_Report_${year}.pdf`);
      toast({ title: "Report Downloaded", description: `Financial PDF statement for ${year} is ready.` });
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