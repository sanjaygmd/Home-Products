import { useState, useEffect, useMemo } from "react";
import { Button } from "../../ui/button";
import { 
  Search, RotateCcw, AlertTriangle, CheckCircle, 
  XCircle, Banknote, ListCollapse, Clock, ShieldAlert,
  Eye, X, ArrowUpRight, Package, Loader2, Download
} from "lucide-react";
import { cn } from "../../../lib/utils";
import { useToast } from "../../../hooks/use-toast";
import { api } from "../../../services/api";
import { useAuth } from "../../../context/AuthContext.jsx";
import { jsPDF } from "jspdf";


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

  const [actionModal, setActionModal] = useState(null); // { type: 'Approved' | 'Rejected', returnId: string }
  const [resolutionNote, setResolutionNote] = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);

  useEffect(() => {
    fetchReturns();
  }, []);

  const handleExportReturns = () => {
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      // Header block
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text("RETURNS & DISPUTES REPORT", 14, 20);

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
      doc.text(`Total Return Requests: ${returns.length}`, 14, 31);

      // Divider line
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.setLineWidth(0.5);
      doc.line(14, 35, 196, 35);

      // Table Headers
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105); // slate-600
      doc.text("Return ID", 14, 43);
      doc.text("Customer Profile", 45, 43);
      doc.text("Reason for Return", 100, 43);
      doc.text("Refund Amount", 155, 43, { align: "right" });
      doc.text("Status", 196, 43, { align: "right" });

      doc.line(14, 47, 196, 47);

      // Render table rows
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);

      let yOffset = 54;

      filteredReturns.forEach((ret, idx) => {
        // Handle multipage overflow dynamically
        if (yOffset > 275) {
          doc.addPage();
          yOffset = 20;

          doc.setFont("helvetica", "bold");
          doc.setFontSize(10);
          doc.setTextColor(71, 85, 105);
          doc.text("Return ID", 14, yOffset);
          doc.text("Customer Profile", 45, yOffset);
          doc.text("Reason for Return", 100, yOffset);
          doc.text("Refund Amount", 155, yOffset, { align: "right" });
          doc.text("Status", 196, yOffset, { align: "right" });
          
          doc.setDrawColor(226, 232, 240);
          doc.setLineWidth(0.5);
          doc.line(14, yOffset + 4, 196, yOffset + 4);
          
          yOffset += 11;
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9);
          doc.setTextColor(15, 23, 42);
        }

        // Alternating background fill
        if (idx % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(14, yOffset - 5, 182, 8, "F");
        }

        // Return ID
        doc.setFont("helvetica", "bold");
        const returnShortId = String(ret.id).substring(0, 8).toUpperCase();
        doc.text(`#${returnShortId}`, 14, yOffset);
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184); // slate-400
        const orderShortId = String(ret.orderId).split('-')[0].substring(0, 8).toUpperCase();
        doc.text(`Order: #${orderShortId}`, 14, yOffset + 3);

        // Reset
        doc.setFontSize(9);
        doc.setTextColor(15, 23, 42);

        // Customer Details
        const truncatedCust = ret.customer?.length > 20 ? `${ret.customer.substring(0, 17)}...` : ret.customer;
        doc.text(truncatedCust || "N/A", 45, yOffset);

        // Reason
        const truncatedReason = ret.reason?.length > 24 ? `${ret.reason.substring(0, 21)}...` : ret.reason;
        doc.text(truncatedReason || "N/A", 100, yOffset);

        // Amount
        doc.text(ret.amount, 155, yOffset, { align: "right" });

        // Status
        doc.text(ret.status, 196, yOffset, { align: "right" });

        yOffset += 11;
      });

      // Trigger standard local file download
      doc.save(`Returns_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error("Export returns failed:", err);
    }
  };

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

  const submitResolution = async (id, status) => {
    if (!resolutionNote.trim()) {
      toast({ title: "Note Required", description: "Please enter a resolution note for the customer.", variant: "destructive" });
      return;
    }

    setSubmittingAction(true);
    try {
      const adminId = currentUser?.id;

      const resp = await api.post(`/user/admin/returns/${id}/resolve`, { 
        status, 
        resolution_note: resolutionNote.trim(),
        admin_id: adminId
      });
      
      if (resp.data.success) {
        toast({ title: `Return ${status}`, description: resp.data.message });
        fetchReturns();
        setSelectedReturn(null);
        setActionModal(null);
        setResolutionNote("");
      } else {
        toast({ title: "Action Failed", description: resp.data.message, variant: "destructive" });
      }
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "An error occurred while resolving the request.", variant: "destructive" });
    } finally {
      setSubmittingAction(false);
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
        <div className="flex flex-wrap gap-4 w-full md:w-auto justify-end">
          <button 
            onClick={handleExportReturns}
            className="h-14 px-8 rounded-2xl bg-white text-slate-950 text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-md hover:shadow-xl active:scale-95 border border-slate-100 flex items-center gap-3"
          >
            <Download size={18} /> Export Data
          </button>
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
                        <span className="font-mono text-[10px] font-black text-rose-600 bg-rose-50 px-2.5 py-1.5 rounded-xl border border-rose-100 w-fit" title={r.id}>
                          #{r.id.length > 8 ? r.id.substring(0, 8).toUpperCase() : r.id.toUpperCase()}
                        </span>
                        <span className="text-[10px] font-black text-slate-400 mt-2 uppercase tracking-widest" title={r.orderId}>
                          Order: #{r.orderId.length > 8 ? r.orderId.substring(0, 8).toUpperCase() : r.orderId.toUpperCase()}
                        </span>
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
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]" title={selectedReturn.id}>
                    Return ID: <span className="text-slate-900 font-mono select-all">#{selectedReturn.id.length > 8 ? selectedReturn.id.substring(0, 8).toUpperCase() : selectedReturn.id.toUpperCase()}</span>
                  </p>
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
                  { icon: Package, label: "Order Reference", value: `#${selectedReturn.orderId.length > 8 ? selectedReturn.orderId.substring(0, 8).toUpperCase() : selectedReturn.orderId.toUpperCase()}`, color: "text-violet-600", bg: "bg-violet-50" },
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

              {actionModal ? (
                <div className="mt-8 p-6 bg-slate-50 border border-slate-100 rounded-[2rem] space-y-4 animate-in slide-in-from-bottom-5 duration-300">
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${actionModal.type === 'Approved' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    {actionModal.type === 'Approved' ? 'Approve Return Request' : 'Reject Return Request'}
                  </h4>
                  <textarea
                    placeholder="Enter custom resolution notes for the customer..."
                    className="w-full p-4 rounded-xl border border-slate-200 bg-white text-xs font-bold outline-none focus:ring-2 focus:ring-slate-900/10 min-h-[100px] resize-none text-slate-800"
                    value={resolutionNote}
                    onChange={(e) => setResolutionNote(e.target.value)}
                  />
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="flex-1 h-12 rounded-xl border-slate-200 text-slate-500 text-[10px] font-black uppercase tracking-wider hover:bg-white transition"
                      onClick={() => { setActionModal(null); setResolutionNote(""); }}
                    >
                      Cancel
                    </Button>
                    <Button
                      className={cn(
                        "flex-1 h-12 rounded-xl text-white text-[10px] font-black uppercase tracking-wider transition",
                        actionModal.type === 'Approved' ? "bg-slate-950 hover:bg-slate-800" : "bg-rose-600 hover:bg-rose-500"
                      )}
                      disabled={submittingAction}
                      onClick={() => submitResolution(actionModal.returnId, actionModal.type)}
                    >
                      {submittingAction ? <Loader2 className="animate-spin h-4 w-4" /> : `Confirm ${actionModal.type}`}
                    </Button>
                  </div>
                </div>
              ) : selectedReturn.status === 'Pending' ? (
                <div className="flex gap-4">
                  <Button 
                    className="flex-1 h-16 rounded-[1.5rem] bg-slate-950 text-white font-black uppercase text-[11px] tracking-[0.2em] hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
                    onClick={() => setActionModal({ type: 'Approved', returnId: selectedReturn.id })}
                  >
                    Approve Return
                  </Button>
                  <Button 
                    variant="outline"
                    className="flex-1 h-16 rounded-[1.5rem] border-slate-200 text-slate-600 font-black uppercase text-[11px] tracking-[0.2em] hover:bg-slate-50 transition-all"
                    onClick={() => setActionModal({ type: 'Rejected', returnId: selectedReturn.id })}
                  >
                    Reject Request
                  </Button>
                </div>
              ) : (
                <div className="p-6 bg-slate-50 border border-slate-100 rounded-[2rem] text-center">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Resolution Note</p>
                  <p className="text-sm font-bold text-slate-700 mt-2">"{selectedReturn.resolutionNote || 'No resolution notes entered'}"</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
