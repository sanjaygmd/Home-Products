import { useState, useEffect } from "react";
import { Button } from "../../ui/button";
import { 
  Search, CreditCard, AlertCircle, CheckCircle2, 
  Landmark, Clock, ArrowUpRight, Download, Eye, X, Mail, Phone,
  Loader2, IndianRupee, ShieldCheck
} from "lucide-react";
import { cn } from "../../../lib/utils";
import { useToast } from "../../../hooks/use-toast";
import { api } from "../../../services/api";

const PaymentStatCard = ({ title, value, label, icon: Icon, color }) => (
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
          <span className="text-[10px] font-bold text-slate-400">{label}</span>
        </div>
      </div>
    </div>
  </div>
);

export default function PaymentsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState({ total: "₹0", success: 0, failed: 0, pending: 0 });
  const [selectedPayment, setSelectedPayment] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const resp = await api.get('/user/admin/payments');
      if (resp.data.success) {
        setPayments(resp.data.data);
        setStats(resp.data.stats);
      }
    } catch (err) {
      console.error(err);
      toast({ title: "Fetch Error", description: "Could not load transaction data.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const filteredPayments = payments.filter((p) => {
    const matchesSearch =
      p.id.toLowerCase().includes(search.toLowerCase()) ||
      p.customer.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "All" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleExport = () => {
    toast({ title: "Exporting Data", description: "Your transaction report is being generated..." });
  };

  return (
    <div className="space-y-10 pb-20 max-w-[1600px] mx-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-2 w-10 bg-emerald-600 rounded-full" />
            <span className="text-[11px] font-black text-emerald-600 uppercase tracking-[0.3em]">Financials</span>
          </div>
          <h1 className="text-4xl font-black text-slate-950 tracking-tight">Payments</h1>
          <p className="text-slate-500 font-bold mt-2 text-sm">Monitor and manage all customer transactions</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            onClick={handleExport}
            className="h-14 rounded-2xl px-8 bg-slate-950 text-white font-black uppercase text-[10px] tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
          >
            <Download className="h-4 w-4 mr-2" /> Download Report
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <PaymentStatCard title="Total Revenue" value={stats.total} label="Total Volume" icon={IndianRupee} color="bg-violet-600" />
        <PaymentStatCard title="Completed" value={stats.success} label="Successful Txns" icon={CheckCircle2} color="bg-emerald-600" />
        <PaymentStatCard title="Cancelled" value={stats.cancelled} label="Payment Errors" icon={AlertCircle} color="bg-rose-600" />
        <PaymentStatCard title="Pending" value={stats.pending} label="Awaiting Approval" icon={Clock} color="bg-amber-600" />
      </div>

      {/* Control Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-4 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input 
            placeholder="Search by Transaction ID or Customer..." 
            className="w-full h-14 pl-14 pr-6 rounded-2xl bg-slate-50/50 border-none text-sm font-bold focus:ring-4 focus:ring-emerald-500/10 transition-all placeholder:text-slate-400"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 bg-slate-100/50 p-1 rounded-2xl border">
          {["All", "Success", "Cancelled", "Pending"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "px-6 py-3 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest",
                statusFilter === s ? "bg-white text-slate-950 shadow-sm border border-slate-100" : "text-slate-400 hover:text-slate-600"
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Main Table View */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="pl-10 pr-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Transaction ID</th>
                  <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
                  <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Customer</th>
                  <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Amount</th>
                  <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Date</th>
                  <th className="pl-6 pr-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="pl-10 pr-6 py-7">
                      <div className="flex flex-col">
                        <span className="font-mono text-[10px] font-black text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded-xl border border-emerald-100 w-fit">
                          #{p.id.split('-')[0].toUpperCase()}
                        </span>
                        <span className="text-[10px] font-black text-slate-400 mt-2 flex items-center gap-1">
                          <CreditCard size={10} className="text-slate-300" /> {p.method}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-7">
                      <div className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-full w-fit border",
                        p.status === 'Success' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : 
                        p.status === 'Cancelled' ? "bg-rose-50 text-rose-600 border-rose-100" : 
                        "bg-amber-50 text-amber-600 border-amber-100"
                      )}>
                        {p.status === 'Success' ? <CheckCircle2 size={12} /> : 
                         p.status === 'Cancelled' ? <AlertCircle size={12} /> : 
                         <Clock size={12} />}
                        <span className="text-[9px] font-black uppercase tracking-widest">{p.status}</span>
                      </div>
                    </td>
                    <td className="px-6 py-7">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 font-black text-sm">
                          {p.customer?.charAt(0)}
                        </div>
                        <span className="font-black text-[15px] text-slate-900 tracking-tight">{p.customer}</span>
                      </div>
                    </td>
                    <td className="px-6 py-7 text-right">
                      <span className="text-xl font-black text-slate-950 italic tracking-tighter">{p.amount}</span>
                    </td>
                    <td className="px-6 py-7 text-center">
                      <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                        {p.date}
                      </span>
                    </td>
                    <td className="pl-6 pr-10 py-7 text-right">
                      <button 
                        onClick={() => setSelectedPayment(p)}
                        className="h-12 w-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50 hover:shadow-lg transition-all ml-auto"
                      >
                        <Eye size={20} />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredPayments.length === 0 && (
                  <tr>
                    <td colSpan="6" className="py-20 text-center">
                      <Landmark size={48} className="mx-auto text-slate-200 mb-4" />
                      <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">No transactions found in this view</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Transaction Details Modal */}
      {selectedPayment && (
        <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center z-[100] p-4 backdrop-blur-xl animate-in fade-in duration-500">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 border border-slate-200/50 relative">
            <button
              onClick={() => setSelectedPayment(null)}
              className="absolute top-8 right-8 h-12 w-12 flex items-center justify-center rounded-2xl bg-slate-50 hover:bg-slate-100 transition-all z-30 text-slate-400"
            >
              <X size={24} />
            </button>

            <div className="p-12">
              <div className="flex items-center gap-3 mb-8">
                <div className="h-2 w-10 bg-emerald-600 rounded-full" />
                <span className="text-[11px] font-black text-emerald-600 uppercase tracking-[0.3em]">Transaction Details</span>
              </div>

              <div className="flex justify-between items-start mb-12">
                <div>
                  <h2 className="text-4xl font-black text-slate-950 tracking-tight mb-2">{selectedPayment.amount}</h2>
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Transaction ID: <span className="text-slate-900 font-mono">#{selectedPayment.id}</span></p>
                </div>
                <div className={cn(
                  "px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border",
                  selectedPayment.status === 'Success' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : 
                  selectedPayment.status === 'Cancelled' ? "bg-rose-50 text-rose-600 border-rose-100" : 
                  "bg-amber-50 text-amber-600 border-amber-100"
                )}>
                  {selectedPayment.status}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-12">
                {[
                  { icon: Landmark, label: "Payment Method", value: selectedPayment.method, color: "text-violet-600", bg: "bg-violet-50" },
                  { icon: Clock, label: "Date & Time", value: selectedPayment.date, color: "text-blue-600", bg: "bg-blue-50" },
                  { icon: ShieldCheck, label: "Security Status", value: "Verified Transaction", color: "text-emerald-600", bg: "bg-emerald-50" },
                  { icon: ArrowUpRight, label: "Order Reference", value: `#${selectedPayment.id.split('-')[0]}`, color: "text-amber-600", bg: "bg-amber-50" }
                ].map((item, idx) => (
                  <div key={idx} className="p-6 rounded-[2rem] border border-slate-100 bg-slate-50/30">
                    <div className="flex items-center gap-4">
                      <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", item.bg)}>
                        <item.icon className={cn("h-5 w-5", item.color)} />
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{item.label}</p>
                        <p className="text-sm font-black text-slate-900 truncate">{item.value}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-4">
                <Button 
                  className="flex-1 h-16 rounded-[1.5rem] bg-slate-950 text-white font-black uppercase text-[11px] tracking-[0.2em] hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
                  onClick={() => toast({ title: "Receipt Generated", description: "The transaction receipt has been sent to your email." })}
                >
                  Generate Receipt
                </Button>
                <Button 
                  variant="outline"
                  className="flex-1 h-16 rounded-[1.5rem] border-slate-200 text-slate-600 font-black uppercase text-[11px] tracking-[0.2em] hover:bg-slate-50 transition-all"
                  onClick={() => toast({ title: "Issue Reported", description: "A support ticket has been created for this transaction." })}
                >
                  Report Issue
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
