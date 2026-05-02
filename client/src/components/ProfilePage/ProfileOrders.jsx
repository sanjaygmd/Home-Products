import { useState, useEffect } from "react";
import { Package, CheckCircle, Clock } from "lucide-react";
import Card from "./Card";
import { getCustomerOrders } from "../../services/authService";
import OrderDetailsModal from "./OrderDetailsModal";
import { useAuth } from "../../context/AuthContext.jsx";

const ProfileOrders = () => {
  const { currentUser } = useAuth();
  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState("loading");
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  useEffect(() => {
    if (currentUser?.id) {
      getCustomerOrders(currentUser.id).then((res) => {
        if (res.success) {
          setOrders(res.data.map(order => ({
            id: order.order_id,
            product: `Order #${order.order_id.slice(0, 8)}`,
            status: order.order_status,
            price: Number(order.total_amount),
            discount: Number(order.discount_amount || 0),
            paymentMethod: order.payment_method,
            paymentStatus: order.payment_status,
            date: new Date(order.placed_at).toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric'
            })
          })));
          setStatus("success");
        } else {
          setStatus("error");
        }
      });
    } else {
      setStatus("error");
    }
  }, [currentUser]);

  const getStatus = (status) => {
    switch (status) {
      case "Delivered":
        return {
          style: "text-green-600 bg-green-100",
          icon: CheckCircle,
        };
      case "Pending":
        return {
          style: "text-yellow-600 bg-yellow-100",
          icon: Clock,
        };
      case "Processing":
        return {
          style: "text-blue-600 bg-blue-100",
          icon: Clock,
        };
      case "Shipped":
        return {
          style: "text-indigo-600 bg-indigo-100",
          icon: Package,
        };
      case "Cancelled":
        return {
          style: "text-red-600 bg-red-100",
          icon: Package,
        };
      default:
        return {
          style: "text-gray-600 bg-gray-100",
          icon: Package,
        };
    }
  };

  /* ---------------- LOADING ---------------- */
  if (status === "loading") {
    return (
      <Card title="My Orders">
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>
          ))}
        </div>
      </Card>
    );
  }

  /* ---------------- EMPTY STATE ---------------- */
  if (orders.length === 0) {
    return (
      <Card title="My Orders">
        <div className="text-center py-10">
          <Package size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No orders yet</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-800">
          My Orders
        </h2>
        <span className="text-sm text-gray-500">
          {orders.length} Orders
        </span>
      </div>

      {/* ORDER LIST */}
      <div className="space-y-4">
        {orders.map((order) => {
          const statusInfo = getStatus(order.status);
          const StatusIcon = statusInfo.icon;

          return (
            <div
              key={order.id}
              className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all"
            >
              {/* TOP */}
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="font-semibold text-gray-800">
                    {order.product}
                  </p>
                  <p className="text-xs text-gray-400">
                    {order.date}
                  </p>
                </div>

                <div
                  className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${statusInfo.style}`}
                >
                  <StatusIcon size={14} />
                  {order.status}
                </div>
              </div>

              {/* MIDDLE */}
              <div className="flex justify-between text-sm text-gray-500">
                <p>Order ID: {order.id}</p>
                <div className="flex flex-col items-end gap-1">
                  <p className="font-semibold text-gray-800">
                    ₹{order.price}
                  </p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    {order.paymentMethod === 'cod' ? 'COD' : 'Online'} • 
                    <span className={order.paymentStatus === 'Paid' ? 'text-green-600' : 'text-orange-500'}>
                      {order.paymentStatus}
                    </span>
                  </p>
                  {order.discount > 0 && (
                    <span className="text-[10px] font-black text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-100 uppercase tracking-tighter">
                      % Offer Applied
                    </span>
                  )}
                </div>
              </div>

              {/* ACTION */}
              <div className="mt-4 flex justify-end">
                <button 
                  onClick={() => setSelectedOrderId(order.id)}
                  className="text-blue-600 text-sm font-medium hover:underline"
                >
                  View Details →
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {selectedOrderId && (
        <OrderDetailsModal 
          orderId={selectedOrderId} 
          onClose={() => setSelectedOrderId(null)} 
        />
      )}
    </div>
  );
};

export default ProfileOrders;