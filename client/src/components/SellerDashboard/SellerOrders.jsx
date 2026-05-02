import React, { useState, useEffect } from "react";
import { getSellerOrders } from "../../services/sellerService";
import OrderDetailsModal from "./OrderDetailsModal";
import { motion, AnimatePresence } from "framer-motion";
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import HistoryIcon from '@mui/icons-material/History';

import { useAuth } from "../../context/AuthContext.jsx";

const SellerOrders = () => {
  const { currentUser } = useAuth();
  const sellerId = currentUser?.id;
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    if (!sellerId) return;

    const fetchOrders = async () => {
      setLoading(true);
      const res = await getSellerOrders(sellerId);
      if (res.success) {
        setOrders(res.data);
      }
      setLoading(false);
    };

    fetchOrders();
  }, [sellerId]);

  const statusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case "pending":
        return "bg-amber-50 text-amber-600 ring-1 ring-amber-100";
      case "shipped":
        return "bg-blue-50 text-blue-600 ring-1 ring-blue-100";
      case "delivered":
        return "bg-green-50 text-green-600 ring-1 ring-green-100";
      case "cancelled":
        return "bg-red-50 text-red-600 ring-1 ring-red-100";
      default:
        return "bg-gray-50 text-gray-600";
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
      order.customer.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTab = activeTab === "all" || order.status.toLowerCase() === activeTab.toLowerCase();
    
    return matchesSearch && matchesTab;
  });

  const tabs = [
    { id: "all", label: "All Orders" },
    { id: "pending", label: "Pending" },
    { id: "shipped", label: "Shipped" },
    { id: "delivered", label: "Delivered" },
    { id: "cancelled", label: "Cancelled" }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-10">
      
      {/* Header & Stats Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Order Management</h2>
          <p className="text-sm text-gray-500 font-bold mt-1 uppercase tracking-widest flex items-center gap-2">
            <HistoryIcon fontSize="inherit" /> Track and fulfill your sales
          </p>
        </div>
        
        <div className="flex items-center gap-4 bg-white px-6 py-4 rounded-3xl border border-gray-100 shadow-sm">
          <div className="text-right">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Volume</p>
            <p className="text-lg font-black text-blue-600 tracking-tight">{orders.length} Orders</p>
          </div>
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
             <FilterListIcon />
          </div>
        </div>
      </div>

      {/* Filters & Search Row */}
      <div className="flex flex-col lg:flex-row justify-between items-center gap-6">
        <div className="flex p-1.5 bg-gray-100/50 backdrop-blur-sm rounded-2xl border border-gray-100 w-full lg:w-auto overflow-x-auto no-scrollbar">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                activeTab === tab.id 
                  ? "bg-white text-blue-600 shadow-md shadow-blue-50 border border-blue-50" 
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full lg:w-96 group">
          <SearchIcon className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
          <input 
            type="text" 
            placeholder="Search by ID or Customer..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-14 pr-6 py-4 bg-white rounded-3xl border border-gray-100 shadow-sm outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-200 transition-all font-bold text-sm"
          />
        </div>
      </div>

      {/* Orders Table Container */}
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
        {filteredOrders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 text-[10px] text-gray-400 uppercase tracking-[0.2em] font-black border-b border-gray-50">
                  <th className="px-10 py-6">Order Reference</th>
                  <th className="px-10 py-6">Customer</th>
                  <th className="px-10 py-6">Date</th>
                  <th className="px-10 py-6 text-right">Amount</th>
                  <th className="px-10 py-6 text-center">Status</th>
                  <th className="px-10 py-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                <AnimatePresence mode="popLayout">
                  {filteredOrders.map((order, idx) => (
                    <motion.tr
                      key={order.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: idx * 0.05, duration: 0.3 }}
                      className="group hover:bg-gray-50/70 transition-all cursor-pointer"
                    >
                      <td className="px-10 py-8 font-black text-gray-300 group-hover:text-blue-600 transition-colors">
                        #{order.id.slice(0, 8).toUpperCase()}
                      </td>
                      <td className="px-10 py-8">
                        <div className="font-black text-gray-800 text-base">{order.customer}</div>
                        <div className="text-[10px] text-blue-500 font-black mt-1 uppercase tracking-widest">Verified Customer</div>
                      </td>
                      <td className="px-10 py-8 text-gray-500 font-bold text-sm">
                        {new Date(order.placed_at).toLocaleDateString(undefined, { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}
                      </td>
                      <td className="px-10 py-8 font-black text-gray-900 text-lg text-right tracking-tight">
                        ₹{Number(order.total).toLocaleString()}
                      </td>
                      <td className="px-10 py-8 text-center">
                        <span className={`px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest ${statusStyle(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-10 py-8 text-right">
                        <button 
                          onClick={() => {
                            setSelectedOrderId(order.id);
                            setShowModal(true);
                          }}
                          className="px-6 py-2.5 bg-white border border-gray-100 text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white hover:shadow-xl hover:shadow-blue-200 transition-all active:scale-95"
                        >
                          Details
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-24 text-center">
             <div className="w-20 h-20 bg-gray-50 text-gray-200 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6">
                <SearchIcon fontSize="large" />
             </div>
             <h3 className="text-xl font-black text-gray-400 uppercase tracking-widest">No matching orders</h3>
             <p className="text-sm text-gray-400 font-bold mt-2 opacity-60">Try adjusting your filters or search term</p>
          </div>
        )}
      </div>

      {showModal && selectedOrderId && (
        <OrderDetailsModal 
          orderId={selectedOrderId} 
          onClose={() => {
            setShowModal(false);
            setSelectedOrderId(null);
            // Refresh orders list
            const fetchOrders = async () => {
              const res = await getSellerOrders(sellerId);
              if (res.success) {
                setOrders(res.data);
              }
            };
            fetchOrders();
          }} 
        />
      )}
    </div>
  );
};

export default SellerOrders;