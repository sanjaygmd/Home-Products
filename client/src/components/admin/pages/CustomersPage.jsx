import React, { useState, useEffect, useMemo } from 'react';
import {
  Users, UserCheck, UserPlus, Search, Eye, Mail, Phone,
  Calendar, ShieldCheck, X, UserX, CheckCircle2, AlertCircle, Loader2, Ban, AlertTriangle
} from 'lucide-react';
import { Button } from '../../ui/button';
import { cn } from "../../../lib/utils";
import { useToast } from "../../../hooks/use-toast";
import { api } from "../../../services/api";

const CustomerStatCard = ({ title, value, label, icon: Icon, color }) => (
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

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockReason, setBlockReason] = useState("");
  const [customerToBlock, setCustomerToBlock] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const resp = await api.get('/user/admin/customers');
      if (resp.data.success) {
        setCustomers(Array.isArray(resp.data.data) ? resp.data.data : []);
      }
    } catch (err) {
      console.error('Customer fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (customer, isBlocking) => {
    if (isBlocking) {
      setCustomerToBlock(customer);
      setBlockReason("");
      setShowBlockModal(true);
    } else {
      await updateCustomerStatus(customer.customer_id, true, null);
    }
  };

  const updateCustomerStatus = async (id, is_active, reason) => {
    setUpdating(true);
    try {
      const resp = await api.patch(`/user/admin/customer/${id}/status`, { is_active, block_reason: reason });
      if (resp.data.success) {
        toast({ 
          title: is_active ? "Customer Restored" : "Customer Restricted", 
          description: `Account access has been updated successfully.` 
        });
        setCustomers(prev => prev.map(c => c.customer_id === id ? { 
          ...c, 
          is_active: resp.data.is_active,
          block_reason: resp.data.block_reason
        } : c));
        if (selectedCustomer?.customer_id === id) {
          setSelectedCustomer(prev => ({ 
            ...prev, 
            is_active: resp.data.is_active,
            block_reason: resp.data.block_reason
          }));
        }
        setShowBlockModal(false);
      }
    } catch (err) {
      console.error(err);
      toast({ title: "Update Failed", description: "Could not change account status.", variant: "destructive" });
    } finally {
      setUpdating(false);
    }
  };

  const filtered = useMemo(() => {
    return customers.filter(c =>
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.customer_id?.toLowerCase().includes(search.toLowerCase())
    );
  }, [customers, search]);

  const stats = useMemo(() => [
    { title: "Total Customers", value: customers.length, label: "Registered Users", icon: Users, color: "bg-violet-600" },
    { title: "Active Verified", value: customers.filter(c => c.is_active).length, label: "Verified Accounts", icon: UserCheck, color: "bg-emerald-600" },
    { title: "Growth", value: customers.filter(c => new Date(c.created_at) > new Date(Date.now() - 30 * 86400000)).length, label: "Last 30 Days", icon: UserPlus, color: "bg-blue-600" }
  ], [customers]);

  return (
    <div className="space-y-10 pb-20 max-w-[1600px] mx-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-2 w-10 bg-violet-600 rounded-full" />
            <span className="text-[11px] font-black text-violet-600 uppercase tracking-[0.3em]">Directory</span>
          </div>
          <h1 className="text-4xl font-black text-slate-950 tracking-tight">Customers</h1>
          <p className="text-slate-500 font-bold mt-2 text-sm">Manage registered customers and their account status</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
        {stats.map((s, i) => (
          <CustomerStatCard key={i} {...s} />
        ))}
      </div>

      {/* Control Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-4 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            placeholder="Search by name, email or ID..."
            className="w-full h-14 pl-14 pr-6 rounded-2xl bg-slate-50/50 border-none text-sm font-bold focus:ring-4 focus:ring-violet-500/10 transition-all placeholder:text-slate-400"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Main Content View (Table Only) */}
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
                  <th className="pl-10 pr-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">ID</th>
                  <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Customer Name</th>
                  <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Contact</th>
                  <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Joined Date</th>
                  <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
                  <th className="pl-6 pr-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((c) => (
                  <tr key={c.customer_id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="pl-10 pr-6 py-7">
                      <span className="font-mono text-[10px] font-black text-violet-600 bg-violet-50 px-2.5 py-1.5 rounded-xl border border-violet-100">
                        #{c.customer_id.split('-')[0].toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-7">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-950 flex items-center justify-center text-white font-black text-sm shadow-lg group-hover:scale-110 transition-transform duration-300">
                          {c.name?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-black text-[15px] text-slate-900 tracking-tight">{c.name}</p>
                          <p className="text-[11px] font-bold text-slate-400 truncate max-w-[200px]">{c.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-7">
                      <div className="flex items-center gap-2.5 text-[11px] font-black text-slate-600 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100/50 w-fit">
                        <Phone className="h-3.5 w-3.5 text-emerald-500" />
                        {c.phone || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-7">
                      <div className="flex items-center gap-2 text-[11px] font-black text-slate-400 uppercase tracking-widest">
                        <Calendar className="h-3.5 w-3.5 text-blue-400" />
                        {new Date(c.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                      </div>
                    </td>
                    <td className="px-6 py-7">
                      <div className={cn(
                        "flex flex-col items-start gap-1"
                      )}>
                        <div className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-full w-fit border",
                          c.is_active ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-600 border-rose-100"
                        )}>
                          {c.is_active ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                          <span className="text-[9px] font-black uppercase tracking-widest">{c.is_active ? 'Active' : 'Restricted'}</span>
                        </div>
                        {!c.is_active && c.block_reason && (
                          <span className="text-[8px] font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-md max-w-[120px] truncate" title={c.block_reason}>
                            {c.block_reason}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="pl-6 pr-10 py-7 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          disabled={updating}
                          onClick={() => handleToggleStatus(c, c.is_active)}
                          className={cn(
                            "h-12 w-12 rounded-2xl border flex items-center justify-center transition-all shadow-sm hover:shadow-lg",
                            c.is_active 
                              ? "bg-white border-rose-100 text-rose-400 hover:text-rose-600 hover:bg-rose-50" 
                              : "bg-white border-emerald-100 text-emerald-400 hover:text-emerald-600 hover:bg-emerald-50"
                          )}
                          title={c.is_active ? "Block Customer" : "Unblock Customer"}
                        >
                          {updating ? <Loader2 className="h-5 w-5 animate-spin" /> : (c.is_active ? <UserX size={20} /> : <UserCheck size={20} />)}
                        </button>
                        <button
                          onClick={() => setSelectedCustomer(c)}
                          className="h-12 w-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-violet-600 hover:border-violet-200 hover:bg-violet-50 hover:shadow-lg transition-all"
                        >
                          <Eye size={20} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="p-20 text-center">
                <Users size={48} className="mx-auto text-slate-200 mb-4" />
                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">No customers found matching your search</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Customer Detail Overlay */}
      {selectedCustomer && (
        <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center z-[100] p-4 backdrop-blur-xl animate-in fade-in duration-500">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 border border-slate-200/50 relative">
            <button
              onClick={() => setSelectedCustomer(null)}
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
                    {selectedCustomer.name?.charAt(0)}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Content */}
            <div className="pt-24 px-12 pb-12">
              <div className="flex justify-between items-start mb-10">
                <div>
                  <h2 className="text-4xl font-black text-slate-950 tracking-tight">{selectedCustomer.name}</h2>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[11px] font-black text-violet-600 uppercase tracking-widest">Customer ID:</span>
                    <span className="font-mono text-[11px] font-bold text-slate-400">{selectedCustomer.customer_id}</span>
                  </div>
                </div>
                <div className={cn(
                  "px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border shadow-sm",
                  selectedCustomer.is_active ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-600 border-rose-100"
                )}>
                  {selectedCustomer.is_active ? 'Active Account' : 'Restricted'}
                </div>
              </div>

              {selectedCustomer.block_reason && !selectedCustomer.is_active && (
                <div className="mb-10 p-6 bg-rose-50 border border-rose-100 rounded-[2rem] flex items-start gap-4">
                  <AlertTriangle className="h-6 w-6 text-rose-500 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">Restriction Reason</p>
                    <p className="text-sm font-bold text-rose-700 leading-relaxed">{selectedCustomer.block_reason}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-6 mb-12">
                {[
                  { icon: Mail, label: "Email Address", value: selectedCustomer.email, color: "text-violet-600", bg: "bg-violet-50" },
                  { icon: Phone, label: "Phone Number", value: selectedCustomer.phone || 'N/A', color: "text-emerald-600", bg: "bg-emerald-50" },
                  { icon: Calendar, label: "Joined Date", value: new Date(selectedCustomer.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }), color: "text-blue-600", bg: "bg-blue-50" },
                  { icon: ShieldCheck, label: "Account Status", value: selectedCustomer.is_active ? "Verified User" : "Flagged Account", color: "text-amber-600", bg: "bg-amber-50" }
                ].map((item, idx) => (
                  <div key={idx} className="p-5 rounded-[2rem] border border-slate-100 bg-slate-50/30 group hover:bg-white hover:shadow-xl hover:border-transparent transition-all duration-300">
                    <div className="flex items-center gap-4">
                      <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", item.bg)}>
                        <item.icon className={cn("h-5 w-5", item.color)} />
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{item.label}</p>
                        <p className="text-sm font-black text-slate-900 truncate">{item.value}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-4">
                <Button 
                  onClick={() => toast({ title: "Profile Updates", description: "This feature is coming soon." })}
                  className="flex-1 h-16 rounded-[1.5rem] bg-slate-950 text-white font-black uppercase text-[11px] tracking-[0.2em] hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
                >
                  Edit Profile
                </Button>
                <button 
                  disabled={updating}
                  onClick={() => handleToggleStatus(selectedCustomer, selectedCustomer.is_active)}
                  className={cn(
                    "px-8 h-16 rounded-[1.5rem] font-black uppercase text-[11px] tracking-[0.2em] border transition-all flex items-center justify-center",
                    selectedCustomer.is_active ? "text-rose-600 border-rose-200 hover:bg-rose-50" : "text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                  )}
                >
                  {updating ? <Loader2 className="animate-spin" /> : (selectedCustomer.is_active ? <UserX size={20} /> : <UserCheck size={20} />)}
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
            <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Restrict Customer</h2>
            <p className="text-slate-500 font-bold mb-8 text-sm">Please provide a reason for restricting <span className="text-slate-900">"{customerToBlock?.name}"</span>. This will be shown to the customer.</p>
            
            <textarea
              className="w-full h-40 p-6 rounded-[2rem] bg-slate-50 border-none text-sm font-bold focus:ring-4 focus:ring-rose-500/10 transition-all placeholder:text-slate-300 mb-8 resize-none"
              placeholder="e.g. Suspicious activity, payment failure, violation of terms..."
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
                onClick={() => updateCustomerStatus(customerToBlock.customer_id, false, blockReason)}
                disabled={!blockReason.trim() || updating}
                className="flex-1 h-14 rounded-2xl bg-rose-600 text-white font-black uppercase text-[10px] tracking-widest hover:bg-rose-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-rose-100"
              >
                {updating ? <Loader2 className="animate-spin" /> : "Confirm Restrict"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
