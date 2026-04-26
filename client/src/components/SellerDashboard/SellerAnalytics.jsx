import React, { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  YAxis,
  CartesianGrid,
  AreaChart,
  Area
} from "recharts";
import { getSellerFinanceAnalytics, getSellerStats } from "../../services/sellerService";
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';

const SellerAnalytics = () => {
  const seller = JSON.parse(localStorage.getItem("seller"));
  const [financeData, setFinanceData] = useState({
    daily: [],
    weekly: [],
    monthly: [],
    quarterly: [],
    halfYearly: [],
    annual: []
  });
  const [selectedPeriod, setSelectedPeriod] = useState("daily");
  const [orderData, setOrderData] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!seller?.seller_id) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const financeRes = await getSellerFinanceAnalytics(seller.seller_id);
        const statsRes = await getSellerStats(seller.seller_id);

        if (financeRes.success) {
          setFinanceData(financeRes.data);
        }
        if (statsRes.success) {
          setStats(statsRes.data.stats);
          setOrderData(statsRes.data.orderData || []);
        }
      } catch (error) {
        console.error("Failed to fetch analytics data", error);
      }
      setLoading(false);
    };

    fetchData();
  }, [seller?.seller_id]);

  if (loading) {
    return (
      <div className="flex flex-col gap-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <div key={i} className="h-32 bg-white rounded-3xl border border-gray-100 shadow-sm"></div>)}
        </div>
        <div className="h-96 bg-white rounded-3xl border border-gray-100 shadow-sm"></div>
      </div>
    );
  }

  const periods = [
    { id: "daily", label: "Daily" },
    { id: "weekly", label: "Weekly" },
    { id: "monthly", label: "Monthly" },
    { id: "quarterly", label: "Quarterly" },
    { id: "halfYearly", label: "Half Yearly" },
    { id: "annual", label: "Annual" }
  ];

  const currentChartData = financeData[selectedPeriod] || [];

  const avgOrderValue = stats?.total_orders > 0
    ? (parseFloat(stats.total_revenue) / parseInt(stats.total_orders)).toFixed(0)
    : 0;

  return (
    <div className="flex flex-col gap-8 pb-10">

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all group">
          <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em]">Avg Order Value</p>
          <div className="flex items-end justify-between mt-3">
            <h4 className="text-3xl font-black text-gray-900 tracking-tight">₹{Number(avgOrderValue).toLocaleString()}</h4>
            <div className={`flex items-center gap-1 text-xs font-black px-2 py-1 rounded-lg ${Number(stats?.aov_growth) >= 0 ? 'text-green-500 bg-green-50' : 'text-red-500 bg-red-50'}`}>
              {Number(stats?.aov_growth) >= 0 ? <TrendingUpIcon fontSize="inherit" /> : <TrendingDownIcon fontSize="inherit" />}
              {Math.abs(stats?.aov_growth)}%
            </div>
          </div>
          <div className="mt-6 w-full bg-gray-50 h-2 rounded-full overflow-hidden">
            <div className="bg-blue-600 h-full transition-all duration-500" style={{ width: `${Math.min(Math.abs(stats?.aov_growth || 70), 100)}%` }}></div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all group">
          <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em]">Revenue Growth</p>
          <div className="flex items-end justify-between mt-3">
            <h4 className="text-3xl font-black text-gray-900 tracking-tight">{stats?.revenue_growth}%</h4>
            <div className={`flex items-center gap-1 text-xs font-black px-2 py-1 rounded-lg ${Number(stats?.revenue_growth) >= 0 ? 'text-green-500 bg-green-50' : 'text-red-500 bg-red-50'}`}>
              {Number(stats?.revenue_growth) >= 0 ? <TrendingUpIcon fontSize="inherit" /> : <TrendingDownIcon fontSize="inherit" />}
              {Math.abs(stats?.revenue_growth)}%
            </div>
          </div>
          <div className="mt-6 w-full bg-gray-50 h-2 rounded-full overflow-hidden">
            <div className={`h-full ${Number(stats?.revenue_growth) >= 0 ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${Math.min(Math.abs(stats?.revenue_growth), 100)}%` }}></div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all group">
          <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em]">Active Retention</p>
          <div className="flex items-end justify-between mt-3">
            <h4 className="text-3xl font-black text-gray-900 tracking-tight">{financeData.retentionRate || 0}%</h4>
            <p className="text-xs text-gray-400 font-black mb-1">{Number(financeData.retentionRate) > 50 ? 'Excellent' : 'Normal'}</p>
          </div>
          <div className="mt-6 w-full bg-gray-50 h-2 rounded-full overflow-hidden">
            <div className="bg-indigo-600 h-full transition-all duration-700" style={{ width: `${financeData.retentionRate || 0}%` }}></div>
          </div>
        </div>
      </div>

      {/* Main Analytics Section */}
      <div className="bg-white p-8 md:p-10 rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
          <div>
            <h3 className="text-2xl font-black text-gray-800 tracking-tight flex items-center gap-2">
              Revenue Performance <CalendarTodayIcon className="text-blue-600" />
            </h3>
            <p className="text-sm text-gray-500 font-semibold mt-1">Detailed breakdown of your store's earnings</p>
          </div>

          <div className="flex flex-wrap gap-2 p-1.5 bg-gray-50 rounded-2xl border border-gray-100">
            {periods.map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedPeriod(p.id)}
                className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all ${selectedPeriod === p.id
                  ? "bg-white text-blue-600 shadow-md shadow-blue-50 border border-blue-50"
                  : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                  }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="h-[450px] w-full relative" style={{ minWidth: 0, minHeight: '450px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={currentChartData}>
              <defs>
                <linearGradient id="colorRevenuePremium" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 900 }}
                dy={15}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 900 }}
                tickFormatter={(val) => `₹${val >= 1000 ? (val / 1000).toFixed(1) + 'k' : val}`}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: '24px',
                  border: 'none',
                  boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.2)',
                  padding: '24px',
                  background: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(10px)'
                }}
                itemStyle={{ fontWeight: 900, color: '#4f46e5', fontSize: '18px' }}
                labelStyle={{ fontWeight: 800, color: '#94a3b8', marginBottom: '10px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                formatter={(val) => [`₹${Number(val).toLocaleString()}`, 'Total Revenue']}
                cursor={{ stroke: '#4f46e5', strokeWidth: 2, strokeDasharray: '5 5' }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#4f46e5"
                strokeWidth={5}
                fillOpacity={1}
                fill="url(#colorRevenuePremium)"
                animationDuration={2000}
                activeDot={{ r: 8, strokeWidth: 0, fill: '#4f46e5' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Charts Section */}
      <div className="grid grid-cols-1 gap-8">
        <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border border-gray-100 shadow-sm min-h-[450px] flex flex-col">
          <h4 className="text-xl font-black text-gray-800 mb-8 tracking-tight">Volume by Payment Method</h4>
          <div className="flex-1 min-h-[300px] relative">
            {financeData.paymentMethods?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={financeData.paymentMethods}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" opacity={0.5} />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontWeight: 900, fontSize: 12, fill: '#94a3b8' }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontWeight: 900, fontSize: 12, fill: '#94a3b8' }}
                  />
                  <Tooltip
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar
                    dataKey="value"
                    fill="#4f46e5"
                    radius={[15, 15, 0, 0]}
                    barSize={80}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 bg-gray-50/50 rounded-[2rem] border-4 border-dashed border-gray-100">
                <div className="mb-4 opacity-20">
                  <CalendarTodayIcon sx={{ fontSize: 80 }} />
                </div>
                <p className="font-black text-lg uppercase tracking-widest">No Payment Data Found</p>
                <p className="text-sm font-bold mt-2 opacity-60">Complete orders to see payment breakdowns here</p>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
};

export default SellerAnalytics;
