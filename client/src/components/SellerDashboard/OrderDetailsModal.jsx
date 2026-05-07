import React, { useState, useEffect } from "react";
import { getOrderDetails, updateOrderStatus } from "../../services/sellerService";
import CloseIcon from '@mui/icons-material/Close';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import PersonIcon from '@mui/icons-material/Person';
import PaymentIcon from '@mui/icons-material/Payment';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../hooks/use-toast";

const OrderDetailsModal = ({ orderId, onClose }) => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newStatus, setNewStatus] = useState("");
  const [cancellationReason, setCancellationReason] = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      setLoading(true);
      const res = await getOrderDetails(orderId);
      if (res.success) {
        setOrder(res.data);
        setNewStatus(res.data.order_status);
      }
      setLoading(false);
    };
    fetchOrder();
  }, [orderId]);

  const handleUpdateStatus = async () => {
    if (newStatus === order.order_status) return;
    if (newStatus === 'Cancelled' && !cancellationReason.trim()) {
      toast({ variant: "destructive", title: "Required", description: "Please provide a reason for cancellation." });
      return;
    }

    setUpdating(true);
    const res = await updateOrderStatus(orderId, {
      status: newStatus,
      changed_by: currentUser?.id,
      notes: newStatus === 'Cancelled' ? cancellationReason : `Status updated to ${newStatus} by seller.`
    });
    if (res.success) {
      // Refresh order details
      const refresh = await getOrderDetails(orderId);
      if (refresh.success) {
        setOrder(refresh.data);
        setCancellationReason("");
      }
      toast({ title: "Success", description: "Status updated successfully!" });
    } else {
      toast({ variant: "destructive", title: "Error", description: "Failed to update status: " + res.message });
    }
    setUpdating(false);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div className="bg-white p-10 rounded-[2.5rem] flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-500 font-black uppercase tracking-widest text-xs">Loading Details...</p>
        </div>
      </div>
    );
  }

  if (!order) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-black/60 backdrop-blur-md">
      <div className="bg-white w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-[3rem] shadow-2xl relative">

        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md px-8 py-6 border-b border-gray-100 flex justify-between items-center">
          <div>
            <h3 className="text-2xl font-black text-gray-800 tracking-tight">Order Details</h3>
            <p className="text-sm text-gray-500 font-bold mt-1 uppercase tracking-widest">#{order.order_id.slice(0, 8).toUpperCase()}</p>
          </div>
          <button
            onClick={onClose}
            className="p-3 bg-gray-50 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all active:scale-90"
          >
            <CloseIcon fontSize="small" />
          </button>
        </div>

        <div className="p-8 md:p-10 space-y-10">

          {/* Status Row */}
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px] p-6 bg-blue-50 rounded-3xl border border-blue-100">
              <div className="flex items-center gap-3 text-blue-600 mb-2">
                <LocalShippingIcon fontSize="small" />
                <span className="text-[10px] font-black uppercase tracking-widest">Order Status</span>
              </div>
              <p className="text-lg font-black text-blue-700 uppercase tracking-tight">{order.order_status}</p>
            </div>
            <div className="flex-1 min-w-[200px] p-6 bg-green-50 rounded-3xl border border-green-100">
              <div className="flex items-center gap-3 text-green-600 mb-2">
                <PaymentIcon fontSize="small" />
                <span className="text-[10px] font-black uppercase tracking-widest">Payment Status</span>
              </div>
              <p className="text-lg font-black text-green-700 uppercase tracking-tight">{order.payment_status}</p>
            </div>
          </div>

          {order.order_status === 'Cancelled' && order.cancellation_reason && (
            <div className="p-8 bg-red-50 border-2 border-red-100 rounded-[2rem] animate-in zoom-in-95 duration-500">
              <div className="flex items-center gap-3 text-red-600 mb-3">
                <div className="w-8 h-8 bg-red-100 rounded-xl flex items-center justify-center">
                  <CloseIcon fontSize="small" />
                </div>
                <span className="text-xs font-black uppercase tracking-widest">Cancellation Reason</span>
              </div>
              <p className="text-red-900 font-bold text-lg leading-relaxed">"{order.cancellation_reason}"</p>
              <p className="text-[10px] text-red-400 font-black uppercase tracking-[0.2em] mt-4">This order was cancelled by the customer</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {/* Customer Info */}
            <div className="space-y-6">
              <h4 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                <PersonIcon fontSize="inherit" /> Customer Information
              </h4>
              <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                <p className="font-black text-gray-800 text-lg">{order.shipping_name}</p>
                <p className="text-gray-500 font-semibold mt-1">{order.shipping_phone}</p>
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Shipping Address</p>
                  <p className="text-sm text-gray-600 leading-relaxed font-bold">
                    {order.address_line_1}<br />
                    {order.city}, {order.state} - {order.pincode}
                  </p>
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="space-y-6">
              <h4 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                <ShoppingCartIcon fontSize="inherit" /> Order Summary
              </h4>
              <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 font-bold">Subtotal</span>
                  <span className="font-black text-gray-800">₹{Number(order.subtotal).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 font-bold">Shipping</span>
                  <span className="font-black text-green-600">Free</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 font-bold">Tax</span>
                  <span className="font-black text-gray-800">₹{Number(order.tax_amount).toLocaleString()}</span>
                </div>
                <div className="pt-3 mt-3 border-t border-gray-200 flex justify-between">
                  <span className="text-gray-800 font-black uppercase tracking-widest text-xs">Total Amount</span>
                  <span className="text-xl font-black text-blue-600 tracking-tight">₹{Number(order.total_amount).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="space-y-6">
            <h4 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Ordered Items</h4>
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-[10px] text-gray-400 uppercase tracking-widest font-black">
                  <tr>
                    <th className="px-6 py-4">Product</th>
                    <th className="px-6 py-4 text-center">Qty</th>
                    <th className="px-6 py-4 text-right">Unit Price</th>
                    <th className="px-6 py-4 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {order.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <img
                            src={item.images?.[0]}
                            alt={item.product_name}
                            className="w-12 h-12 object-cover rounded-xl border border-gray-100"
                          />
                          <div>
                            <p className="font-black text-gray-800">{item.product_name}</p>
                            {item.variant_name && (
                              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                {item.variant_name}: {item.variant_value}
                              </p>
                            )}
                            {item.item_status && item.item_status !== 'Delivered' && (
                              <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 bg-rose-50 text-rose-600 rounded-md border border-rose-100 inline-block mt-1">
                                {item.item_status}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center font-black text-gray-600">x{item.quantity}</td>
                      <td className="px-6 py-4 text-right font-bold text-gray-500">₹{Number(item.unit_price).toLocaleString()}</td>
                      <td className="px-6 py-4 text-right font-black text-gray-800">₹{Number(item.total_price).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-8 py-8 bg-gray-50 border-t border-gray-100 flex flex-col gap-6">
          {order.order_status === 'Cancelled' ? (
            <div className="bg-red-50 p-6 rounded-3xl border border-red-100 w-full">
              <p className="text-red-700 font-black uppercase tracking-widest text-[10px] mb-2">Order Finalized</p>
              <p className="text-red-600 font-bold text-sm">This order has been cancelled and cannot be updated further.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4 w-full">
              <div className="flex flex-wrap justify-between items-center gap-6">
                <div className="flex items-center gap-4">
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="bg-white border border-gray-200 px-6 py-4 rounded-2xl text-sm font-black uppercase tracking-widest focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-sm"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Shipped">Shipped</option>
                    <option value="Delivered">Delivered</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                  <button
                    onClick={handleUpdateStatus}
                    disabled={updating || newStatus === order.order_status}
                    className={`px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition active:scale-95 shadow-lg shadow-blue-100 ${updating || newStatus === order.order_status
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                      }`}
                  >
                    {updating ? 'Updating...' : 'Update Status'}
                  </button>
                </div>

                <button
                  onClick={onClose}
                  className="px-8 py-4 bg-white border border-gray-200 text-gray-500 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-gray-100 transition active:scale-95 shadow-sm"
                >
                  Close
                </button>
              </div>

              {newStatus === 'Cancelled' && (
                <div className="animate-in slide-in-from-top-2 duration-300">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Reason for Cancellation <span className="text-red-500">*</span></p>
                  <textarea
                    value={cancellationReason}
                    onChange={(e) => setCancellationReason(e.target.value)}
                    placeholder="Please explain why the order is being cancelled..."
                    className="w-full bg-white border border-gray-200 p-6 rounded-3xl text-sm font-bold focus:ring-2 focus:ring-red-100 focus:border-red-200 outline-none transition-all shadow-sm min-h-[100px]"
                  />
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default OrderDetailsModal;
