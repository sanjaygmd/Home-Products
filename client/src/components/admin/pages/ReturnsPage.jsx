import { useState, useEffect, useMemo } from "react";
import { Button } from "../../ui/button";
import { 
  Search, RotateCcw, AlertTriangle, CheckCircle, 
  XCircle, Banknote, ListCollapse, Clock, ShieldAlert,
  Eye, X, ArrowUpRight, Package, Loader2
} from "lucide-react";
import { cn } from "../../../lib/utils";
import { useToast } from "../../../hooks/use-toast";
import { api } from "../../../services/api";

const ReturnStatCard = ({ title, value, label, icon: Icon, color }) => (
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

export default function ReturnsPage() {
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [returns, setReturns] = useState([]);
  const [selectedReturn, setSelectedReturn] = useState(null);
  const { toast } = useToast();
  const { currentUser } = useAuth();

  useEffect(() => {
    fetchReturns();
  }, []);

  const fetchReturns = async () => {
    setLoading(true);
    try {
      const resp = await api.get('/user/admin/returns');
      if (resp.data.success) {
        setReturns(resp.data.data);
      }
    } catch (err) {
      console.error(err);
      toast({ title: "Fetch Error", description: "Could not load return data.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleResolveReturn = async (id, status) => {
    try {
      const adminId = currentUser?.id;

      const resp = await api.post(`/user/admin/returns/${id}/resolve`, { 
        status, 
        resolution_note: status === 'Approved' ? 'Return request approved by admin' : 'Return request rejected by admin',
        admin_id: adminId
      });
      
      if (resp.data.success) {
        toast({ title: `Return ${status}`, description: resp.data.message });
        fetchReturns();
        setSelectedReturn(null);
      } else {
        toast({ title: "Action Failed", description: resp.data.message, variant: "destructive" });
      }
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "An error occurred while resolving the request.", variant: "destructive" });
    }
  };

  const filteredReturns = useMemo(() => {
    return returns.filter((r) =>
      r.id.toLowerCase().includes(search.toLowerCase()) ||
      r.displayId?.toLowerCase().includes(search.toLowerCase()) ||
      r.orderId.toLowerCase().includes(search.toLowerCase()) ||
      r.customer.toLowerCase().includes(search.toLowerCase())
    );
  }, [returns, search]);

  const stats = useMemo(() => [
    { title: "Active Requests", value: returns.length, label: "Awaiting Review", icon: AlertTriangle, color: "bg-rose-600" },
    { title: "In Transit", value: Math.floor(returns.length * 0.4), label: "Reverse Logistics", icon: RotateCcw, color: "bg-violet-600" },
    { title: "Refund Value", value: `₹${returns.reduce((acc, r) => acc + Number(r.amount.replace(/[^0-9]/g, '')), 0).toLocaleString('en-IN')}`, label: "Total Pending", icon: Banknote, color: "bg-emerald-600" },
    { title: "Resolved", value: "184", label: "Completion Rate", icon: CheckCircle, color: "bg-slate-900" }
  ], [returns]);

  return (
    <div className="space-y-10 pb-20 max-w-[1600px] mx-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-2 w-10 bg-rose-600 rounded-full" />
            <span className="text-[11px] font-black text-rose-600 uppercase tracking-[0.3em]">Disputes</span>
          </div>
          <h1 className="text-4xl font-black text-slate-950 tracking-tight">Returns</h1>
          <p className="text-slate-500 font-bold mt-2 text-sm">Manage customer return requests and refunds</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((s, i) => (
          <ReturnStatCard key={i} {...s} />
        ))}
      </div>

      {/* Control Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-4 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input 
            placeholder="Search by Return ID, Order ID, or Customer..." 
            className="w-full h-14 pl-14 pr-6 rounded-2xl bg-slate-50/50 border-none text-sm font-bold focus:ring-4 focus:ring-rose-500/10 transition-all placeholder:text-slate-400"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
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
                  <th className="pl-10 pr-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Return ID</th>
                  <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Customer</th>
                  <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Reason</th>
                  <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Amount</th>
                  <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Status</th>
                  <th className="pl-6 pr-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredReturns.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="pl-10 pr-6 py-7">
                      <div className="flex flex-col">
                        <span className="font-mono text-[10px] font-black text-rose-600 bg-rose-50 px-2.5 py-1.5 rounded-xl border border-rose-100 w-fit">
                          #{r.id}
                        </span>
                        <span className="text-[10px] font-black text-slate-400 mt-2 uppercase tracking-widest">Order: {r.orderId.split('-')[0]}</span>
                      </div>
                    </td>
                    <td className="px-6 py-7">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 font-black text-sm">
                          {r.customer?.charAt(0)}
                        </div>
                        <span className="font-black text-[15px] text-slate-900 tracking-tight">{r.customer}</span>
                      </div>
                    </td>
                    <td className="px-6 py-7">
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-100 w-fit">
                        <ShieldAlert className="h-3.5 w-3.5 text-rose-500" />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{r.reason}</span>
                      </div>
                    </td>
                    <td className="px-6 py-7 text-right">
                      <span className="text-xl font-black text-slate-950 italic tracking-tighter">{r.amount}</span>
                    </td>
                    <td className="px-6 py-7 text-center">
                      <div className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-full w-fit border mx-auto",
                        r.status === 'Cancelled' ? "bg-rose-50 text-rose-600 border-rose-100" : "bg-slate-50 text-slate-600 border-slate-100"
                      )}>
                        {r.status === 'Cancelled' ? <XCircle size={12} /> : <Clock size={12} />}
                        <span className="text-[9px] font-black uppercase tracking-widest">{r.status}</span>
                      </div>
                    </td>
                    <td className="pl-6 pr-10 py-7 text-right">
                      <button 
                        onClick={() => setSelectedReturn(r)}
                        className="h-12 w-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 hover:shadow-lg transition-all ml-auto"
                      >
                        <Eye size={20} />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredReturns.length === 0 && (
                  <tr>
                    <td colSpan="6" className="py-20 text-center">
                      <RotateCcw size={48} className="mx-auto text-slate-200 mb-4" />
                      <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">No return requests found</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Return Details Modal */}
      {selectedReturn && (
        <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center z-[100] p-4 backdrop-blur-xl animate-in fade-in duration-500">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 border border-slate-200/50 relative">
            <button
              onClick={() => setSelectedReturn(null)}
              className="absolute top-8 right-8 h-12 w-12 flex items-center justify-center rounded-2xl bg-slate-50 hover:bg-slate-100 transition-all z-30 text-slate-400"
            >
              <X size={24} />
            </button>

            <div className="p-12">
              <div className="flex items-center gap-3 mb-8">
                <div className="h-2 w-10 bg-rose-600 rounded-full" />
                <span className="text-[11px] font-black text-rose-600 uppercase tracking-[0.3em]">Request Details</span>
              </div>

              <div className="flex justify-between items-start mb-12">
                <div>
                  <h2 className="text-4xl font-black text-slate-950 tracking-tight mb-2">{selectedReturn.amount}</h2>
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Return ID: <span className="text-slate-900 font-mono">#{selectedReturn.id}</span></p>
                </div>
                <div className={cn(
                  "px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border shadow-sm",
                  selectedReturn.status === 'Cancelled' ? "bg-rose-50 text-rose-600 border-rose-100" : "bg-slate-50 text-slate-600 border-slate-100"
                )}>
                  {selectedReturn.status}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-12">
                {[
                  { icon: Package, label: "Order Reference", value: `#${selectedReturn.orderId.split('-')[0]}`, color: "text-violet-600", bg: "bg-violet-50" },
                  { icon: ShieldAlert, label: "Return Reason", value: selectedReturn.reason, color: "text-rose-600", bg: "bg-rose-50" },
                  { icon: Clock, label: "Requested On", value: selectedReturn.date, color: "text-blue-600", bg: "bg-blue-50" },
                  { icon: RotateCcw, label: "Logistics Type", value: "Standard Pickup", color: "text-emerald-600", bg: "bg-emerald-50" }
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
                  onClick={() => handleResolveReturn(selectedReturn.id, 'Approved')}
                >
                  Approve Return
                </Button>
                <Button 
                  variant="outline"
                  className="flex-1 h-16 rounded-[1.5rem] border-slate-200 text-slate-600 font-black uppercase text-[11px] tracking-[0.2em] hover:bg-slate-50 transition-all"
                  onClick={() => handleResolveReturn(selectedReturn.id, 'Rejected')}
                >
                  Reject Request
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
