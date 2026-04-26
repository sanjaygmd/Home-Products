import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ResponsiveContainer,
  Tooltip,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis
} from "recharts";
import { getSellerStats, getSellerDashboardData } from "../../services/sellerService";
import StoreIcon from '@mui/icons-material/Store';
import VerifiedIcon from '@mui/icons-material/Verified';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import GroupIcon from '@mui/icons-material/Group';
import AddIcon from '@mui/icons-material/Add';
import ListAltIcon from '@mui/icons-material/ListAlt';
import AlertTriangleIcon from '@mui/icons-material/Warning';

const SellerOverview = () => {
  const navigate = useNavigate();
  const seller = JSON.parse(localStorage.getItem("seller"));
  const [stats, setStats] = useState({
    total_products: 0,
    total_orders: 0,
    total_revenue: 0,
    total_customers: 0,
    pending_orders: 0,
    revenue_growth: 0
  });

  const [revenueData, setRevenueData] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!seller?.seller_id) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const statsRes = await getSellerStats(seller.seller_id);
        const graphRes = await getSellerDashboardData(seller.seller_id);

        if (statsRes.success) {
          setStats(statsRes.data.stats);
          setRecentOrders(statsRes.data.recentOrders);
        }

        if (graphRes.success) {
          setRevenueData(graphRes.data.revenueData);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data", error);
        if (error.response?.status === 403) {
          setError(error.response.data.message || "Your account has been restricted.");
        }
      }
      setLoading(false);
    };

    fetchData();
  }, [seller?.seller_id]);

  if (loading) {
    return (
      <div className="flex flex-col gap-6 animate-pulse">
        <div className="h-40 bg-white rounded-3xl border border-gray-100 shadow-sm"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-white rounded-3xl border border-gray-100 shadow-sm"></div>)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 h-96 bg-white rounded-3xl border border-gray-100 shadow-sm"></div>
          <div className="h-96 bg-white rounded-3xl border border-gray-100 shadow-sm"></div>
        </div>
      </div>
    );
  }

  const statCards = [
    { title: "Total Products", value: stats.total_products, icon: <Inventory2Icon />, color: "text-blue-600", bg: "bg-blue-50" },
    { title: "Total Orders", value: stats.total_orders, icon: <ShoppingCartIcon />, color: "text-purple-600", bg: "bg-purple-50" },
    { title: "Net Revenue", value: `₹${Number(stats.total_revenue).toLocaleString()}`, icon: <AccountBalanceWalletIcon />, color: "text-green-600", bg: "bg-green-50" },
    { title: "Total Customers", value: stats.total_customers, icon: <GroupIcon />, color: "text-orange-600", bg: "bg-orange-50" },
  ];

  return (
    <div className="flex flex-col gap-8 pb-10">
      
      {error && (
        <div className="bg-rose-50 border-2 border-rose-100 p-8 rounded-[2rem] flex items-center gap-6 animate-in slide-in-from-top duration-500 shadow-xl shadow-rose-100/50">
          <div className="h-16 w-16 bg-rose-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
            <AlertTriangleIcon fontSize="large" />
          </div>
          <div>
            <h3 className="text-xl font-black text-rose-600 tracking-tight uppercase">Account Restricted</h3>
            <p className="text-rose-700 font-bold mt-1 text-lg">{error}</p>
          </div>
        </div>
      )}

      {/* Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-8 md:p-10 rounded-[2.5rem] shadow-2xl shadow-blue-100 border border-white/10">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-6 text-center md:text-left">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-xl text-white rounded-[1.5rem] flex items-center justify-center shadow-2xl border border-white/30">
              <StoreIcon fontSize="large" />
            </div>
            <div>
              <h2 className="text-2xl md:text-4xl font-black text-white flex items-center gap-3 justify-center md:justify-start tracking-tight">
                Welcome, {seller?.name.split(' ')[0]}! <VerifiedIcon className="text-blue-200" fontSize="medium" />
              </h2>
              <p className="text-blue-100 mt-2 font-semibold text-lg opacity-90">
                {stats.pending_orders > 0 
                  ? `You have ${stats.pending_orders} pending orders to fulfill.` 
                  : "Your store is running perfectly! No pending tasks."}
              </p>
            </div>
          </div>
          <div className="flex gap-4 w-full md:w-auto">
            <button 
              onClick={() => navigate('/seller/products')}
              className="flex-1 md:flex-none bg-white text-blue-700 px-8 py-4 rounded-2xl text-sm font-black hover:bg-blue-50 transition shadow-xl active:scale-95"
            >
              My Products
            </button>
            <button 
              onClick={() => navigate('/seller/analytics')}
              className="flex-1 md:flex-none bg-blue-500/20 backdrop-blur-md text-white border border-white/30 px-8 py-4 rounded-2xl text-sm font-black hover:bg-blue-500/40 transition active:scale-95"
            >
              Analytics
            </button>
          </div>
        </div>
        {/* Abstract Background Shapes */}
        <div className="absolute top-[-30%] right-[-15%] w-80 h-80 bg-white/10 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[-40%] left-[-10%] w-72 h-72 bg-blue-400/30 rounded-full blur-[120px]"></div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((item) => (
          <div
            key={item.title}
            className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 hover:shadow-xl transition-all duration-300 group hover:-translate-y-2"
          >
            <div className="flex justify-between items-start">
              <div className={`p-4 rounded-2xl ${item.bg} ${item.color} shadow-sm group-hover:scale-110 transition-transform`}>
                {item.icon}
              </div>
              {item.title === "Net Revenue" && (
                <div className={`flex items-center gap-1 text-xs font-black px-2 py-1 rounded-lg ${Number(stats.revenue_growth) >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                  {Number(stats.revenue_growth) >= 0 ? <TrendingUpIcon fontSize="inherit" /> : <TrendingDownIcon fontSize="inherit" />}
                  {Math.abs(stats.revenue_growth)}%
                </div>
              )}
            </div>
            <div className="mt-6">
              <p className="text-sm text-gray-500 font-bold uppercase tracking-widest">{item.title}</p>
              <h3 className="text-3xl font-black text-gray-900 mt-2 tracking-tight">
                {item.value}
              </h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Content Area */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          
          {/* Revenue Area Chart */}
          <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-10">
              <div>
                <h3 className="text-xl font-black text-gray-800 tracking-tight">Sales Performance</h3>
                <p className="text-sm text-gray-500 font-semibold mt-1">Revenue trends over the past 30 days</p>
              </div>
              <button 
                onClick={() => navigate('/seller/analytics')}
                className="text-xs font-black text-blue-600 bg-blue-50 px-4 py-2 rounded-xl hover:bg-blue-100 transition"
              >
                Detailed Report
              </button>
            </div>
            
            <div className="h-[350px] w-full relative" style={{ minWidth: 0, minHeight: '350px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="colorRevenueOverview" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 800}} 
                    dy={10}
                  />
                  <YAxis hide />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '16px', 
                      border: 'none', 
                      boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)', 
                      padding: '12px 16px' 
                    }}
                    itemStyle={{ fontWeight: 900, color: '#2563eb' }}
                    labelStyle={{ fontWeight: 800, color: '#64748b', marginBottom: '4px' }}
                    formatter={(val) => [`₹${Number(val).toLocaleString()}`, 'Revenue']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#2563eb" 
                    strokeWidth={4} 
                    fillOpacity={1} 
                    fill="url(#colorRevenueOverview)"
                    activeDot={{ r: 6, strokeWidth: 0, fill: '#2563eb' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Orders */}
          <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-10">
              <h3 className="text-xl font-black text-gray-800 tracking-tight">Latest Orders</h3>
              <button 
                onClick={() => navigate('/seller/orders')}
                className="text-sm text-blue-600 font-black hover:underline px-5 py-2.5 bg-blue-50 rounded-2xl transition active:scale-95"
              >
                Manage All
              </button>
            </div>

            {recentOrders.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50">
                      <th className="pb-6 font-black">Ref ID</th>
                      <th className="pb-6 font-black">Customer</th>
                      <th className="pb-6 font-black text-right">Amount</th>
                      <th className="pb-6 font-black text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm text-gray-600">
                    {recentOrders.map((order) => (
                      <tr key={order.order_id} className="group hover:bg-gray-50/70 transition-all cursor-pointer" onClick={() => navigate('/seller/orders')}>
                        <td className="py-6 font-black text-gray-300 group-hover:text-blue-600 transition-colors">
                          #{order.order_id.slice(0, 8).toUpperCase()}
                        </td>
                        <td className="py-6">
                          <div className="font-bold text-gray-800">{order.customer_name}</div>
                          <div className="text-[10px] text-gray-400 font-bold mt-0.5 uppercase tracking-wider">{new Date(order.placed_at).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'})}</div>
                        </td>
                        <td className="py-6 font-black text-gray-900 text-right">
                          ₹{Number(order.amount).toLocaleString()}
                        </td>
                        <td className="py-6 text-center">
                          <span className={`px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest
                            ${order.status === 'delivered' ? 'bg-green-100 text-green-700' : 
                              order.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                            {order.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-sm text-gray-500 py-16 text-center bg-gray-50/50 rounded-[2rem] border-4 border-dashed border-gray-100">
                <div className="text-gray-200 mb-4">
                  <ShoppingCartIcon sx={{ fontSize: 60 }} />
                </div>
                <p className="font-bold text-lg text-gray-400">No orders recorded yet</p>
                <p className="text-xs text-gray-400 mt-1">Check back once your store is live!</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Section */}
        <div className="flex flex-col gap-8">
          
          {/* Quick Actions Card */}
          <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm">
            <h3 className="text-xl font-black text-gray-800 mb-8 tracking-tight">Quick Tools</h3>
            <div className="flex flex-col gap-4">
              <button 
                onClick={() => navigate('/seller/products')}
                className="flex items-center gap-4 p-5 rounded-[1.5rem] bg-gray-50 hover:bg-blue-600 hover:text-white transition-all group border border-transparent shadow-sm hover:shadow-xl hover:shadow-blue-200 active:scale-95"
              >
                <div className="p-3 bg-white rounded-2xl group-hover:bg-blue-500 transition-colors">
                  <AddIcon className="text-blue-600 group-hover:text-white" />
                </div>
                <div className="text-left">
                   <p className="text-xs font-black uppercase tracking-widest">New Product</p>
                   <p className="text-[10px] opacity-60 font-semibold mt-0.5">List a new item for sale</p>
                </div>
              </button>

              <button 
                onClick={() => navigate('/seller/orders')}
                className="flex items-center gap-4 p-5 rounded-[1.5rem] bg-gray-50 hover:bg-indigo-600 hover:text-white transition-all group border border-transparent shadow-sm hover:shadow-xl hover:shadow-indigo-200 active:scale-95"
              >
                <div className="p-3 bg-white rounded-2xl group-hover:bg-indigo-500 transition-colors">
                  <ListAltIcon className="text-indigo-600 group-hover:text-white" />
                </div>
                <div className="text-left">
                   <p className="text-xs font-black uppercase tracking-widest">Active Orders</p>
                   <p className="text-[10px] opacity-60 font-semibold mt-0.5">Fulfill pending orders</p>
                </div>
              </button>

              <button 
                onClick={() => navigate('/seller/payments')}
                className="flex items-center gap-4 p-5 rounded-[1.5rem] bg-gray-50 hover:bg-emerald-600 hover:text-white transition-all group border border-transparent shadow-sm hover:shadow-xl hover:shadow-emerald-200 active:scale-95"
              >
                <div className="p-3 bg-white rounded-2xl group-hover:bg-emerald-500 transition-colors">
                  <AccountBalanceWalletIcon className="text-emerald-600 group-hover:text-white" />
                </div>
                <div className="text-left">
                   <p className="text-xs font-black uppercase tracking-widest">Payouts</p>
                   <p className="text-[10px] opacity-60 font-semibold mt-0.5">Check your earnings</p>
                </div>
              </button>
            </div>
          </div>

          {/* Growth Card */}
          <div className="bg-gradient-to-br from-gray-900 to-black p-10 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
             <div className="relative z-10">
                <h4 className="text-xl font-black mb-4 tracking-tight">Scale Your Store</h4>
                <p className="text-gray-400 text-sm leading-relaxed font-semibold opacity-80">
                   Check out the latest strategies to increase your conversion rate and reach more customers.
                </p>
                <button 
                  onClick={() => navigate('/seller/analytics')}
                  className="mt-8 w-full bg-white text-gray-900 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-100 transition active:scale-95"
                >
                   View Growth Guide
                </button>
             </div>
             {/* Background glow */}
             <div className="absolute top-[-20%] left-[-20%] w-40 h-40 bg-blue-600/30 rounded-full blur-[80px]"></div>
          </div>

        </div>

      </div>

    </div>
  );
};

export default SellerOverview;