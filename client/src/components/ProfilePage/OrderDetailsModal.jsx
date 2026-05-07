import React, { useState, useEffect } from "react";
import { X, Package, MapPin, CreditCard, Clock, CheckCircle, Truck, AlertCircle, RotateCcw, Image as ImageIcon, Loader2 } from "lucide-react";
import { getOrderDetails, cancelOrder, createReturnRequest } from "../../services/orderService";
import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../hooks/use-toast";

const OrderDetailsModal = ({ orderId, onClose, onOrderUpdate }) => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  // Return logic state
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [selectedItemForReturn, setSelectedItemForReturn] = useState(null);
  const [returnReason, setReturnReason] = useState("");
  const [returnType, setReturnType] = useState("Refund");
  const [returning, setReturning] = useState(false);

  const getItemStatusBadge = (status) => {
    switch (status) {
      case "Return Pending":
        return {
          label: "Return Requested (Pending)",
          style: "bg-amber-50 text-amber-700 border-amber-200/50"
        };
      case "Return Initiated":
        return {
          label: "Return Approved (En Route)",
          style: "bg-indigo-50 text-indigo-700 border-indigo-200/50"
        };
      case "Return Rejected":
        return {
          label: "Return Request Rejected",
          style: "bg-rose-50 text-rose-700 border-rose-200/50"
        };
      case "Returned":
        return {
          label: "Returned & Refunded",
          style: "bg-emerald-50 text-emerald-700 border-emerald-200/50"
        };
      default:
        return {
          label: status,
          style: "bg-slate-50 text-slate-700 border-slate-200/50"
        };
    }
  };

  useEffect(() => {
    if (orderId) {
      setLoading(true);
      getOrderDetails(orderId)
        .then((res) => {
          if (res.success) setOrder(res.data);
          setLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setLoading(false);
        });
    }
  }, [orderId]);

  const handleCancelOrder = async () => {
    if (!cancelReason.trim()) {
      toast({ variant: "destructive", title: "Required", description: "Please provide a reason for cancellation" });
      return;
    }
    
    setCancelling(true);
    
    try {
      const res = await cancelOrder(orderId, currentUser?.id, cancelReason);
      if (res.success) {
        setOrder(prev => ({ ...prev, order_status: 'Cancelled', cancellation_reason: cancelReason }));
        setShowCancelConfirm(false);
        if (onOrderUpdate) onOrderUpdate();
      } else {
        toast({ variant: "destructive", title: "Error", description: res.message || "Failed to cancel order" });
      }
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Error", description: "Failed to cancel order" });
    } finally {
      setCancelling(false);
    }
  };

  const handleInitiateReturn = (item) => {
    setSelectedItemForReturn(item);
    setShowReturnForm(true);
  };

  const handleSubmitReturn = async () => {
    if (!returnReason.trim()) {
      toast({ variant: "destructive", title: "Required", description: "Please provide a reason for return" });
      return;
    }

    setReturning(true);

    try {
      const res = await createReturnRequest({
        order_id: orderId,
        order_item_id: selectedItemForReturn.order_item_id,
        customer_id: currentUser?.id,
        reason: returnReason,
        return_type: returnType,
        photos: [] // Placeholder for photos
      });

      if (res.success) {
        toast({ title: "Success", description: "Return request submitted successfully!" });
        setShowReturnForm(false);
        setSelectedItemForReturn(null);
        setReturnReason("");
        // Refresh order details to show new item status
        const refresh = await getOrderDetails(orderId);
        if (refresh.success) setOrder(refresh.data);
      } else {
        toast({ variant: "destructive", title: "Error", description: res.message || "Failed to submit return request" });
      }
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Error", description: "An error occurred while submitting the return request." });
    } finally {
      setReturning(false);
    }
  };

  if (!orderId) return null;

  const getStatusConfig = (status) => {
    switch (status) {
      case "Pending": return { icon: Clock, color: "text-yellow-600", bg: "bg-yellow-100" };
      case "Processing": return { icon: Package, color: "text-blue-600", bg: "bg-blue-100" };
      case "Shipped": return { icon: Truck, color: "text-indigo-600", bg: "bg-indigo-100" };
      case "Delivered": return { icon: CheckCircle, color: "text-green-600", bg: "bg-green-100" };
      case "Cancelled": return { icon: AlertCircle, color: "text-red-600", bg: "bg-red-100" };
      default: return { icon: Package, color: "text-gray-600", bg: "bg-gray-100" };
    }
  };

  const canCancel = order && (order.order_status === "Pending" || order.order_status === "Processing");
  const isDelivered = order && order.order_status === "Delivered";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col relative">
        
        {/* RETURN FORM OVERLAY */}
        {showReturnForm && selectedItemForReturn && (
          <div className="absolute inset-0 z-[60] bg-white animate-in slide-in-from-bottom duration-300 flex flex-col">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <RotateCcw className="text-rose-600" />
                Return Request
              </h3>
              <button onClick={() => setShowReturnForm(false)} className="p-2 hover:bg-gray-100 rounded-full transition">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 max-w-2xl mx-auto w-full space-y-8">
              <div className="flex items-center gap-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <img src={selectedItemForReturn.images?.[0]} className="w-20 h-20 object-cover rounded-xl border shadow-sm" alt="" />
                <div>
                  <p className="font-bold text-lg text-slate-900">{selectedItemForReturn.product_name}</p>
                  <p className="text-sm text-slate-500">{selectedItemForReturn.variant_name}: {selectedItemForReturn.variant_value}</p>
                </div>
              </div>

              <div className="space-y-4">
                <label className="block text-sm font-black uppercase tracking-widest text-slate-400">Reason for Return</label>
                <select 
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="w-full p-4 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-rose-100 transition"
                >
                  <option value="">Select a reason...</option>
                  <option value="Damaged Product">Damaged Product</option>
                  <option value="Wrong Item Received">Wrong Item Received</option>
                  <option value="Quality not as expected">Quality not as expected</option>
                  <option value="Size/Fit Issue">Size/Fit Issue</option>
                  <option value="No longer needed">No longer needed</option>
                </select>
                <textarea 
                  placeholder="Additional details about the issue..."
                  className="w-full p-4 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-rose-100 min-h-[120px] resize-none"
                  value={returnReason === "Other" ? "" : returnReason} // Simplified for demo
                  onChange={(e) => setReturnReason(e.target.value)}
                />
              </div>

              <div className="space-y-4">
                <label className="block text-sm font-black uppercase tracking-widest text-slate-400">Return Type</label>
                <div className="flex gap-4">
                  {["Refund", "Replacement"].map((type) => (
                    <button
                      key={type}
                      onClick={() => setReturnType(type)}
                      className={`flex-1 p-4 rounded-xl border font-bold text-sm transition ${
                        returnType === type ? "bg-rose-600 text-white border-rose-600 shadow-lg shadow-rose-100" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-6">
                <button 
                  onClick={handleSubmitReturn}
                  disabled={returning || !returnReason}
                  className="w-full h-16 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-slate-800 transition active:scale-95 disabled:opacity-50 shadow-xl shadow-slate-200"
                >
                  {returning ? <Loader2 className="animate-spin" /> : "Submit Return Request"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* HEADER */}
        <div className="p-6 border-b flex justify-between items-center bg-gray-50/50">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Order Details</h2>
            <p className="text-sm text-gray-500">ID: {orderId}</p>
          </div>
          <div className="flex items-center gap-4">
            {canCancel && !showCancelConfirm && (
              <button 
                onClick={() => setShowCancelConfirm(true)}
                className="px-4 py-2 bg-red-50 text-red-600 text-sm font-bold rounded-xl hover:bg-red-100 transition"
              >
                Cancel Order
              </button>
            )}
            <button onClick={onClose} className="p-2 bg-white border shadow-sm hover:bg-gray-50 rounded-full transition">
              <X size={20} />
            </button>
          </div>
        </div>

        {showCancelConfirm && (
          <div className="p-6 bg-red-50 border-b border-red-100">
            <h4 className="text-sm font-bold text-red-900 mb-2">Cancel Order</h4>
            <textarea 
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Reason for cancellation..."
              className="w-full p-4 rounded-2xl border border-red-200 text-sm focus:ring-2 focus:ring-red-100 outline-none min-h-[100px] mb-4"
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowCancelConfirm(false)} className="px-4 py-2 text-sm font-bold text-gray-500">Go Back</button>
              <button onClick={handleCancelOrder} disabled={cancelling} className="px-6 py-2 bg-red-600 text-white text-sm font-bold rounded-xl">{cancelling ? "Processing..." : "Confirm Cancellation"}</button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-gray-500">Loading details...</p>
            </div>
          ) : order ? (
            <>
              {/* TOP SUMMARY & STATUS */}
              <div className="grid md:grid-cols-3 gap-6">
                <div className="md:col-span-2 bg-blue-50/50 p-6 rounded-2xl border border-blue-100">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1">Order Date</p>
                      <p className="font-bold text-gray-800">{new Date(order.placed_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1">Payment Method</p>
                      <p className="font-bold text-gray-800">{order.payment_method === 'cod' ? 'Cash on Delivery' : 'Online Payment'}</p>
                    </div>
                  </div>

                  {/* CLEAR PRICE BREAKDOWN SECTION */}
                  <div className="space-y-2 pt-4 border-t border-blue-100">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Items Subtotal</span>
                      <span className="font-semibold text-gray-800">₹{order.subtotal}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">GST (5%)</span>
                      <span className="font-semibold text-gray-800">₹{parseFloat(order.tax_amount) || Math.round(order.subtotal * 0.05)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Platform Fee</span>
                      <span className="font-semibold text-gray-800">₹{parseFloat(order.platform_fee) || 10}</span>
                    </div>
                    {order.payment_method === 'cod' && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">COD Collection Fee</span>
                        <span className="font-semibold text-gray-800">₹{order.cod_fee || 50}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Delivery Charges</span>
                      <span className="font-semibold text-gray-800">₹{order.shipping_charges}</span>
                    </div>
                    {parseFloat(order.discount_amount) > 0 && (
                      <div className="flex justify-between text-sm text-green-600 font-bold">
                        <span>Coupon Discount Applied</span>
                        <span>- ₹{order.discount_amount}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-3 border-t border-blue-200">
                      <span className="text-lg font-bold text-gray-900">Total Amount Paid</span>
                      <span className="text-2xl font-black text-blue-600 tracking-tighter">₹{order.total_amount}</span>
                    </div>
                  </div>
                </div>

                <div className={`${getStatusConfig(order.order_status).bg} p-6 rounded-2xl flex flex-col items-center justify-center text-center border border-white`}>
                   {React.createElement(getStatusConfig(order.order_status).icon, { size: 40, className: getStatusConfig(order.order_status).color })}
                   <p className={`mt-3 font-black uppercase tracking-widest ${getStatusConfig(order.order_status).color}`}>{order.order_status}</p>
                   <p className="text-[10px] text-gray-500 mt-1 uppercase font-bold tracking-tighter">Order Status</p>
                </div>
              </div>

              {/* ITEMS SECTION */}
              <div className="space-y-4">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <Package size={20} className="text-blue-600" />
                  Product Details
                </h3>
                <div className="border rounded-2xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 text-[10px] uppercase text-gray-400 font-black tracking-widest">
                      <tr>
                        <th className="px-6 py-4">Item</th>
                        <th className="px-6 py-4 text-center">Qty</th>
                        <th className="px-6 py-4 text-right">Price</th>
                        <th className="px-6 py-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-sm">
                      {order.items.map((item) => (
                        <tr key={item.order_item_id} className="hover:bg-gray-50 transition">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <img src={item.images?.[0]} alt="" className="w-10 h-10 object-cover rounded-lg border shadow-sm" />
                              <div>
                                <p className="font-bold text-gray-900">{item.product_name}</p>
                                {item.variant_name && <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">{item.variant_name}: {item.variant_value}</p>}
                                {item.item_status && item.item_status !== 'Delivered' && (
                                  <div className="mt-2 space-y-1 bg-slate-50 border border-slate-100 p-3 rounded-xl max-w-xs">
                                    <div className="flex items-center gap-1.5">
                                      <span className={`text-[8px] md:text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${getItemStatusBadge(item.item_status).style}`}>
                                        {getItemStatusBadge(item.item_status).label}
                                      </span>
                                    </div>
                                    {item.return_resolution_note && (
                                      <p className="text-[11px] font-semibold text-gray-600 mt-1 leading-snug">
                                        <span className="font-extrabold text-gray-800">Note: </span>
                                        "{item.return_resolution_note}"
                                      </p>
                                    )}
                                    {item.reverse_awb_code && (
                                      <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-200/50 mt-1 text-[9px] text-gray-500 font-bold">
                                        <span>AWB: <span className="text-gray-900 font-extrabold">{item.reverse_awb_code}</span></span>
                                        <span>•</span>
                                        <span>Courier: <span className="text-indigo-600 font-extrabold uppercase">{item.reverse_shipment_status || 'Initiated'}</span></span>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center font-bold text-gray-600">{item.quantity}</td>
                          <td className="px-6 py-4 text-right font-bold text-gray-900">₹{item.total_price}</td>
                          <td className="px-6 py-4 text-right">
                            {isDelivered && (!item.item_status || item.item_status === 'Delivered') ? (
                              <button 
                                onClick={() => handleInitiateReturn(item)}
                                className="px-3 py-1.5 bg-white border border-rose-100 text-rose-600 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-rose-600 hover:text-white transition shadow-sm"
                              >
                                Return
                              </button>
                            ) : item.item_status ? (
                              <span className={`px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-widest border ${getItemStatusBadge(item.item_status).style}`}>
                                {getItemStatusBadge(item.item_status).label}
                              </span>
                            ) : (
                              <span className="text-gray-300 text-[10px] font-bold uppercase tracking-widest">N/A</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* FOOTER: ADDRESS & HISTORY */}
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <MapPin size={20} className="text-blue-600" />
                    Delivery Address
                  </h3>
                  <div className="bg-gray-50 p-6 rounded-2xl text-sm text-gray-600 space-y-1 border border-gray-100">
                    <p className="font-bold text-gray-900 text-base mb-1">{order.shipping_name}</p>
                    <p>{order.address_line_1}</p>
                    <p>{order.city}, {order.state} - {order.pincode}</p>
                    <p className="pt-2 font-bold text-gray-800 tracking-wider flex items-center gap-2">
                       📞 {order.shipping_phone}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                   <h3 className="font-bold text-gray-900 flex items-center gap-2 uppercase text-xs tracking-widest opacity-50">
                     Journey History
                   </h3>
                   <div className="space-y-4 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-100">
                      {order.status_history?.map((history, idx) => (
                        <div key={idx} className="relative pl-8">
                          <div className={`absolute left-0 top-1.5 w-4 h-4 rounded-full border-2 border-white shadow-sm ${idx === 0 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                          <p className={`text-sm font-bold ${idx === 0 ? 'text-gray-900' : 'text-gray-400'}`}>{history.status}</p>
                          <p className="text-[10px] text-gray-400">{new Date(history.changed_at).toLocaleString()}</p>
                        </div>
                      ))}
                   </div>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default OrderDetailsModal;
