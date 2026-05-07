import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { api } from "../../services/api";
import { useToast } from "../../hooks/use-toast";
import { 
  RotateCcw, Search, Eye, Filter, CheckCircle2, 
  AlertCircle, DollarSign, Package, Clock, ShieldCheck, Truck, X
} from "lucide-react";

const SellerReturns = () => {
  const { currentUser } = useAuth();
  const sellerId = currentUser?.id;
  const { toast } = useToast();

  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  // Custom Action Modal State to eliminate native prompt/confirm boxes
  const [actionModal, setActionModal] = useState({
    isOpen: false,
    type: "", // "Resolve" or "ConfirmReceipt"
    returnId: null,
    actionStatus: "", // "Approved" or "Rejected" (for Resolve type)
    note: ""
  });

  const fetchReturns = async () => {
    if (!sellerId) return;
    setLoading(true);
    try {
      const res = await api.get(`/user/seller/returns/${sellerId}`);
      if (res.data?.success) {
        setReturns(res.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch returns:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReturns();
  }, [sellerId]);

  const triggerResolveReturn = (returnId, actionStatus) => {
    setActionModal({
      isOpen: true,
      type: "Resolve",
      returnId,
      actionStatus,
      note: ""
    });
  };

  const triggerMarkAsReceived = (returnId) => {
    setActionModal({
      isOpen: true,
      type: "ConfirmReceipt",
      returnId,
      actionStatus: "",
      note: ""
    });
  };

  // Computations
  const filteredReturns = returns.filter((item) => {
    const matchesSearch = 
      item.displayId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.customer.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "All" || item.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: returns.length,
    pending: returns.filter(r => r.status === 'Pending').length,
    approved: returns.filter(r => r.status === 'Approved').length,
    completed: returns.filter(r => r.status === 'Completed').length,
    refundValue: returns.reduce((sum, r) => sum + Number(r.amount || 0), 0)
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case "Pending":
        return "bg-amber-50 text-amber-700 border-amber-200/50";
      case "Approved":
        return "bg-indigo-50 text-indigo-700 border-indigo-200/50";
      case "Completed":
        return "bg-emerald-50 text-emerald-700 border-emerald-200/50";
      case "Rejected":
        return "bg-rose-50 text-rose-700 border-rose-200/50";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200/50";
    }
  };

  return (
    <div className="flex flex-col gap-8 pb-10 px-4 md:px-0">
      
      {/* Title */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl md:text-2xl font-black text-gray-800 tracking-tight">Returns Management</h3>
          <p className="text-xs md:text-sm text-gray-500 font-semibold mt-1">Track customer return requests, approve/reject, and process stock receipt</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-gray-50 shadow-sm flex items-center gap-6">
          <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
            <RotateCcw size={20} />
          </div>
          <div>
            <p className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Requests</p>
            <h4 className="text-xl md:text-2xl font-black text-gray-800 mt-1">{stats.total}</h4>
          </div>
        </div>

        <div className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-gray-50 shadow-sm flex items-center gap-6">
          <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
            <Clock size={20} />
          </div>
          <div>
            <p className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest">Pending Response</p>
            <h4 className="text-xl md:text-2xl font-black text-gray-800 mt-1">{stats.pending}</h4>
          </div>
        </div>

        <div className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-gray-50 shadow-sm flex items-center gap-6">
          <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
            <Truck size={20} />
          </div>
          <div>
            <p className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest">Approved / En Route</p>
            <h4 className="text-xl md:text-2xl font-black text-gray-800 mt-1">{stats.approved}</h4>
          </div>
        </div>

        <div className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-gray-50 shadow-sm flex items-center gap-6">
          <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <DollarSign size={20} />
          </div>
          <div>
            <p className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest">Refund Liability</p>
            <h4 className="text-xl md:text-2xl font-black text-gray-800 mt-1">₹{stats.refundValue.toLocaleString('en-IN')}</h4>
          </div>
        </div>
      </div>

      {/* Control Panel */}
      <div className="bg-white p-4 md:p-6 rounded-[2rem] md:rounded-[2.5rem] border border-gray-50 shadow-sm flex flex-col lg:flex-row gap-4 items-center justify-between">
        
        {/* Search */}
        <div className="w-full lg:w-96 relative">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text"
            placeholder="Search return code, product, customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-100 outline-none font-bold text-sm"
          />
        </div>

        {/* Filter Status */}
        <div className="flex gap-2 w-full lg:w-auto overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
          {["All", "Pending", "Approved", "Completed", "Rejected"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-5 py-3 md:px-6 md:py-3.5 rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all flex-shrink-0 ${
                statusFilter === status 
                  ? "bg-slate-900 text-white shadow-xl shadow-slate-200" 
                  : "bg-gray-50 text-gray-500 hover:bg-gray-100"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Main Table / Responsive Cards container */}
      <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] border border-gray-50 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-20 text-center flex flex-col items-center justify-center">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-500 font-bold mt-4">Loading return requests...</p>
          </div>
        ) : filteredReturns.length === 0 ? (
          <div className="p-20 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-2xl flex items-center justify-center mb-6">
              <RotateCcw size={32} />
            </div>
            <h4 className="text-lg md:text-xl font-black text-gray-800">No Return Requests Found</h4>
            <p className="text-xs md:text-sm text-gray-500 font-semibold mt-2">No returns matching your search criteria were found.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View (Hidden on mobile/tablet) */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100">
                    <th className="px-8 py-5">Return Code</th>
                    <th className="px-8 py-5">Customer</th>
                    <th className="px-8 py-5">Product Details</th>
                    <th className="px-8 py-5">Refund Amount</th>
                    <th className="px-8 py-5">Status</th>
                    <th className="px-8 py-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm font-semibold text-gray-700">
                  {filteredReturns.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50/50 transition">
                      <td className="px-8 py-5">
                        <span className="text-indigo-600 font-extrabold">{item.displayId}</span>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">Order ID: #{item.orderId?.slice(0, 8).toUpperCase()}</p>
                      </td>
                      <td className="px-8 py-5 font-bold text-gray-900">{item.customer}</td>
                      <td className="px-8 py-5">
                        <span className="block font-bold text-gray-800 max-w-[250px] truncate">{item.product_name}</span>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Type: {item.return_type}</p>
                      </td>
                      <td className="px-8 py-5 font-black text-gray-950">₹{Number(item.amount).toLocaleString('en-IN')}</td>
                      <td className="px-8 py-5">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest border ${getStatusStyle(item.status)}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex gap-2 justify-end items-center">
                          <button
                            onClick={() => setSelectedReturn(item)}
                            className="p-3 bg-gray-50 hover:bg-gray-100 rounded-xl text-gray-500 hover:text-gray-900 transition"
                            title="View Details"
                          >
                            <Eye size={16} />
                          </button>
                          
                          {item.status === 'Pending' && (
                            <>
                              <button
                                onClick={() => triggerResolveReturn(item.id, 'Approved')}
                                disabled={updatingId === item.id}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition active:scale-95 disabled:opacity-50"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => triggerResolveReturn(item.id, 'Rejected')}
                                disabled={updatingId === item.id}
                                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition active:scale-95 disabled:opacity-50"
                              >
                                Reject
                              </button>
                            </>
                          )}

                          {item.status === 'Approved' && (
                            <button
                              onClick={() => triggerMarkAsReceived(item.id)}
                              disabled={updatingId === item.id}
                              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition active:scale-95 disabled:opacity-50"
                            >
                              Mark Received
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Responsive Card Grid View (Visible on Mobile/Tablet screens, hidden on LG desktop screens) */}
            <div className="block lg:hidden divide-y divide-gray-100">
              {filteredReturns.map((item) => (
                <div key={item.id} className="p-6 space-y-4 hover:bg-gray-50/50 transition">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-indigo-600 font-extrabold text-sm">{item.displayId}</span>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">Order ID: #{item.orderId?.slice(0, 8).toUpperCase()}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-widest border ${getStatusStyle(item.status)}`}>
                      {item.status}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Product</p>
                    <p className="text-sm font-bold text-gray-800 leading-snug">{item.product_name}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Type: {item.return_type}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Customer</p>
                      <p className="text-sm font-bold text-gray-900 mt-0.5">{item.customer}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Refund Amount</p>
                      <p className="text-sm font-black text-gray-950 mt-0.5">₹{Number(item.amount).toLocaleString('en-IN')}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 justify-end pt-4 border-t border-gray-50">
                    <button
                      onClick={() => setSelectedReturn(item)}
                      className="px-4 py-2.5 bg-gray-50 hover:bg-gray-100 rounded-xl text-gray-500 hover:text-gray-900 transition text-xs font-bold"
                    >
                      View Details
                    </button>

                    {item.status === 'Pending' && (
                      <>
                        <button
                          onClick={() => triggerResolveReturn(item.id, 'Approved')}
                          disabled={updatingId === item.id}
                          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition active:scale-95 disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => triggerResolveReturn(item.id, 'Rejected')}
                          disabled={updatingId === item.id}
                          className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition active:scale-95 disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </>
                    )}

                    {item.status === 'Approved' && (
                      <button
                        onClick={() => triggerMarkAsReceived(item.id)}
                        disabled={updatingId === item.id}
                        className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition active:scale-95 disabled:opacity-50"
                      >
                        Mark Received
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Details Side Drawer Modal (Optimized for Mobile screens with responsive widths and padding) */}
      {selectedReturn && (
        <div className="fixed inset-0 z-[100] flex justify-end bg-black/60 backdrop-blur-md">
          <div className="bg-white w-full sm:max-w-lg h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            
            {/* Header */}
            <div className="p-6 md:p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <span className="text-[10px] md:text-xs font-black text-indigo-600 uppercase tracking-widest">Return Details</span>
                <h4 className="text-xl md:text-2xl font-black text-gray-800 mt-1">{selectedReturn.displayId}</h4>
              </div>
              <button 
                onClick={() => setSelectedReturn(null)}
                className="p-2.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-900 transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 md:space-y-8">
              
              {/* Product */}
              <div className="p-5 md:p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Product Returning</span>
                <p className="text-sm md:text-base font-black text-slate-900 mt-1 leading-tight">{selectedReturn.product_name}</p>
                <p className="text-xs font-semibold text-slate-500 mt-2">Order ID: #{selectedReturn.orderId}</p>
              </div>

              {/* Reason */}
              <div className="space-y-2">
                <span className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest">Reason for Return</span>
                <div className="bg-amber-50/40 border border-amber-100 p-5 md:p-6 rounded-[2rem] text-xs md:text-sm font-semibold text-amber-900 leading-relaxed">
                  {selectedReturn.reason}
                </div>
              </div>

              {/* Customer */}
              <div className="space-y-2">
                <span className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest">Customer Details</span>
                <div className="bg-gray-50/50 border border-gray-100 p-5 md:p-6 rounded-[2rem] space-y-2">
                  <p className="font-extrabold text-sm md:text-base text-gray-900">{selectedReturn.customer}</p>
                  <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Requested on {new Date(selectedReturn.date).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Status & Refund */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-5 md:p-6 bg-gray-50 rounded-[2rem]">
                  <span className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest">Refund Amount</span>
                  <p className="text-lg md:text-xl font-black text-gray-900 mt-1">₹{Number(selectedReturn.amount).toLocaleString('en-IN')}</p>
                </div>
                <div className="p-5 md:p-6 bg-gray-50 rounded-[2rem]">
                  <span className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest">Return Type</span>
                  <p className="text-lg md:text-xl font-black text-gray-900 mt-1">{selectedReturn.return_type}</p>
                </div>
              </div>

              {/* Logistics Reverse Tracking */}
              <div className="space-y-2">
                <span className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest">Reverse Shipment Tracking</span>
                <div className="bg-indigo-50/30 border border-indigo-100 p-5 md:p-6 rounded-[2rem] space-y-4">
                  <div className="flex justify-between items-center text-xs md:text-sm">
                    <span className="text-indigo-900 font-bold">Reverse AWB</span>
                    <span className="font-extrabold text-gray-900">{selectedReturn.reverse_awb_code || "Not Assigned / Manual"}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs md:text-sm">
                    <span className="text-indigo-900 font-bold">Courier Status</span>
                    <span className="px-3 py-1 bg-white border border-indigo-100 text-indigo-700 text-[10px] font-extrabold uppercase tracking-widest rounded-full">
                      {selectedReturn.shipment_status || "Initiated"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions Footer */}
            {selectedReturn.status === 'Pending' && (
              <div className="p-6 md:p-8 border-t border-gray-100 flex gap-4">
                <button
                  onClick={() => {
                    triggerResolveReturn(selectedReturn.id, 'Approved');
                  }}
                  disabled={updatingId === selectedReturn.id}
                  className="flex-1 h-14 md:h-16 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] md:text-xs flex items-center justify-center gap-2 hover:bg-emerald-700 transition active:scale-95 shadow-xl shadow-emerald-100"
                >
                  Approve Request
                </button>
                <button
                  onClick={() => {
                    triggerResolveReturn(selectedReturn.id, 'Rejected');
                  }}
                  disabled={updatingId === selectedReturn.id}
                  className="flex-1 h-14 md:h-16 bg-rose-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] md:text-xs flex items-center justify-center gap-2 hover:bg-rose-700 transition active:scale-95 shadow-xl shadow-rose-100"
                >
                  Reject Request
                </button>
              </div>
            )}

            {selectedReturn.status === 'Approved' && (
              <div className="p-6 md:p-8 border-t border-gray-100">
                <button
                  onClick={() => triggerMarkAsReceived(selectedReturn.id)}
                  disabled={updatingId === selectedReturn.id}
                  className="w-full h-14 md:h-16 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] md:text-xs flex items-center justify-center gap-2 hover:bg-slate-800 transition active:scale-95 shadow-xl shadow-slate-200"
                >
                  Confirm Physical Item Received
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Custom UI Action Modal (Completely eliminates native browser prompts and confirms!) */}
      {actionModal.isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] border border-gray-50 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
            
            {/* Header */}
            <div className="p-6 md:p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center gap-3">
                {actionModal.type === 'Resolve' ? (
                  actionModal.actionStatus === 'Approved' ? (
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <CheckCircle2 size={18} />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                      <X size={18} />
                    </div>
                  )
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Package size={18} />
                  </div>
                )}
                <div>
                  <h4 className="text-base font-black text-gray-800 tracking-tight">
                    {actionModal.type === 'Resolve' 
                      ? `${actionModal.actionStatus === 'Approved' ? 'Approve' : 'Reject'} Return Request`
                      : "Confirm Physical Receipt"}
                  </h4>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">Action Required</p>
                </div>
              </div>
              <button 
                onClick={() => setActionModal(prev => ({ ...prev, isOpen: false }))}
                className="p-2.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-900 transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 md:p-8 space-y-4">
              {actionModal.type === 'Resolve' ? (
                <>
                  <p className="text-sm font-semibold text-gray-500 leading-relaxed">
                    Are you sure you want to <span className={actionModal.actionStatus === 'Approved' ? 'text-emerald-600 font-extrabold' : 'text-rose-600 font-extrabold'}>{actionModal.actionStatus?.toLowerCase()}</span> this return request? Please provide an optional resolution note below for the customer:
                  </p>
                  <textarea
                    placeholder="E.g., Approved and reverse pickup initiated. / Item does not meet return criteria."
                    value={actionModal.note}
                    onChange={(e) => setActionModal(prev => ({ ...prev, note: e.target.value }))}
                    className="w-full h-24 p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-100 font-semibold text-sm resize-none"
                  />
                </>
              ) : (
                <p className="text-sm font-semibold text-gray-500 leading-relaxed">
                  Have you received the physical returned item and confirmed its contents? This will mark the return lifecycle as <span className="text-indigo-600 font-extrabold">Completed</span> and update reverse tracking.
                </p>
              )}
            </div>

            {/* Actions Footer */}
            <div className="p-6 md:p-8 bg-gray-50/50 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setActionModal(prev => ({ ...prev, isOpen: false }))}
                className="flex-1 h-12 bg-white border border-gray-100 text-gray-500 hover:text-gray-800 hover:border-gray-200 rounded-2xl text-xs font-black uppercase tracking-widest transition"
              >
                Cancel
              </button>
              
              {actionModal.type === 'Resolve' ? (
                <button
                  onClick={async () => {
                    const { returnId, actionStatus, note } = actionModal;
                    setActionModal(prev => ({ ...prev, isOpen: false }));
                    setUpdatingId(returnId);
                    try {
                      const res = await api.patch(`/user/seller/returns/${returnId}/resolve`, {
                        status: actionStatus,
                        resolution_note: note
                      });

                      if (res.data?.success) {
                        toast({ title: "Success", description: `Return request ${actionStatus.toLowerCase()} successfully!` });
                        fetchReturns();
                        if (selectedReturn && selectedReturn.id === returnId) {
                          setSelectedReturn(prev => ({ 
                            ...prev, 
                            status: actionStatus,
                            shipment_status: actionStatus === 'Approved' ? 'Initiated' : null
                          }));
                        }
                      } else {
                        toast({ variant: "destructive", title: "Error", description: res.data?.message || `Failed to update return request.` });
                      }
                    } catch (err) {
                      console.error(err);
                      toast({ variant: "destructive", title: "Error", description: `An error occurred while updating return request.` });
                    } finally {
                      setUpdatingId(null);
                    }
                  }}
                  disabled={updatingId === actionModal.returnId}
                  className={`flex-1 h-12 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition active:scale-95 disabled:opacity-50 ${
                    actionModal.actionStatus === 'Approved' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-100' : 'bg-rose-600 hover:bg-rose-700 shadow-lg shadow-rose-100'
                  }`}
                >
                  {actionModal.actionStatus === 'Approved' ? 'Confirm Approve' : 'Confirm Reject'}
                </button>
              ) : (
                <button
                  onClick={async () => {
                    const { returnId } = actionModal;
                    setActionModal(prev => ({ ...prev, isOpen: false }));
                    setUpdatingId(returnId);
                    try {
                      const res = await api.patch(`/user/seller/returns/${returnId}/receive`);
                      if (res.data?.success) {
                        toast({ title: "Success", description: "Return marked as received successfully!" });
                        fetchReturns();
                        if (selectedReturn && selectedReturn.id === returnId) {
                          setSelectedReturn(prev => ({ ...prev, status: 'Completed', shipment_status: 'Delivered' }));
                        }
                      } else {
                        toast({ variant: "destructive", title: "Error", description: res.data?.message || "Failed to mark return as received." });
                      }
                    } catch (err) {
                      console.error(err);
                      toast({ variant: "destructive", title: "Error", description: "An error occurred while updating return status." });
                    } finally {
                      setUpdatingId(null);
                    }
                  }}
                  disabled={updatingId === actionModal.returnId}
                  className="flex-1 h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition active:scale-95 shadow-lg shadow-indigo-100 disabled:opacity-50"
                >
                  Confirm Receipt
                </button>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default SellerReturns;
