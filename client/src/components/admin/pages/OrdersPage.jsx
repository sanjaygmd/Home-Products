import { useState, useEffect, useMemo } from "react";
import { Button } from "../../ui/button";
import {
  Search, ShoppingCart, Truck, CheckCircle2, XCircle, RotateCcw,
  Eye, X, MapPin, Download, Package, ExternalLink, Calendar, Check,
  TrendingUp, History, Filter, MoreHorizontal, ArrowRight, List,
  ShieldCheck, Clock, CreditCard
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { cn } from "../../../lib/utils";
import { api } from "../../../services/api";
import { jsPDF } from "jspdf";

const CHART_COLORS = ['#8b5cf6', '#10b981', '#f59e0b', '#3b82f6', '#ef4444'];

/* ─── Invoice download helper ──────────────────────────────────── */
function downloadInvoice(order) {
  const orderShortId = String(order.id).substring(0, 8).toUpperCase();
  const items = Array.isArray(order.items) ? order.items : [];
  const rows = items.map((it, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${it.name}</td>
      <td>${it.quantity}</td>
      <td>₹${it.price}</td>
      <td>₹0 (0%)</td>
      <td>₹${it.price}</td>
      <td>₹${(it.price * 0.18).toFixed(2)} (18%)</td>
      <td><strong>₹${(it.price * 1.18 * it.quantity).toFixed(2)}</strong></td>
    </tr>`).join("");

  const totalNet = items.reduce((s, r) => s + (r.price * r.quantity), 0).toFixed(2);
  const totalGST = (totalNet * 0.18).toFixed(2);
  const grandTotal = (parseFloat(totalNet) + parseFloat(totalGST)).toFixed(2);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Invoice - ${orderShortId}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color:#1a1a2e; background:#fff; padding:40px; }
    .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:32px; padding-bottom:20px; border-bottom:2px solid #f0f0f0; }
    .brand { font-size:24px; font-weight:800; color:#8b5cf6; letter-spacing:-0.5px; }
    .brand span { color:#1a1a2e; }
    .invoice-meta { text-align:right; }
    .invoice-meta h2 { font-size:20px; font-weight:700; color:#1a1a2e; }
    .invoice-meta p { font-size:12px; color:#666; margin-top:2px; }
    .badge { display:inline-block; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:600; background:#dcfce7; color:#15803d; }
    .section { margin-bottom:24px; }
    .section-title { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#999; margin-bottom:10px; }
    .info-grid { display:grid; grid-template-columns:1fr 1fr 1fr; gap:16px; }
    .info-box { background:#f8f9fa; border-radius:8px; padding:14px 16px; }
    .info-box h4 { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; color:#999; margin-bottom:8px; }
    .info-box p { font-size:13px; color:#1a1a2e; line-height:1.6; }
    .info-box .highlight { font-weight:700; color:#8b5cf6; }
    table { width:100%; border-collapse:collapse; font-size:12px; }
    thead tr { background:#1a1a2e; color:#fff; }
    thead th { padding:10px 12px; text-align:left; font-weight:600; font-size:11px; text-transform:uppercase; letter-spacing:0.5px; }
    tbody tr:nth-child(even) { background:#f8f9fa; }
    tbody td { padding:10px 12px; color:#333; border-bottom:1px solid #f0f0f0; }
    .totals { margin-top:16px; display:flex; justify-content:flex-end; }
    .totals-box { background:#1a1a2e; color:#fff; border-radius:10px; padding:16px 24px; min-width:240px; }
    .totals-box .row { display:flex; justify-content:space-between; margin-bottom:6px; font-size:13px; }
    .totals-box .grand { font-size:16px; font-weight:800; color:#8b5cf6; border-top:1px solid rgba(255,255,255,0.2); padding-top:8px; margin-top:8px; }
    .footer { margin-top:32px; padding-top:16px; border-top:1px solid #f0f0f0; display:flex; justify-content:space-between; font-size:11px; color:#999; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">Home<span>Products™</span></div>
      <p style="font-size:12px;color:#666;margin-top:4px;">Official Store Admin Portal</p>
    </div>
    <div class="invoice-meta">
      <h2>TAX INVOICE</h2>
      <p>Invoice #: INV-${orderShortId}</p>
      <p>Date: ${new Date(order.created_at).toLocaleDateString()}</p>
      <p style="margin-top:6px"><span class="badge">PAID</span></p>
    </div>
  </div>

  <div class="section">
    <div class="info-grid">
      <div class="info-box">
        <h4>Bill To</h4>
        <p><strong>${order.customer_name}</strong><br/>${order.customer_email}<br/>${order.customer_phone || 'N/A'}</p>
      </div>
      <div class="info-box">
        <h4>Order Info</h4>
        <p>Order ID: <strong>#${orderShortId}</strong><br/>Payment: <strong>${order.payment_method}</strong></p>
      </div>
      <div class="info-box">
        <h4>Amount Summary</h4>
        <p>Items: ${items.length}<br/>Total: <span class="highlight">₹${order.total_amount}</span><br/>Status: <strong>Paid</strong></p>
      </div>
    </div>
  </div>

  <div class="section" style="margin-top:20px">
    <div class="section-title">Order Items</div>
    <table>
      <thead>
        <tr>
          <th>#</th><th>Product</th><th>Qty</th><th>Unit Price</th>
          <th>Discount</th><th>Net Price</th><th>GST (18%)</th><th>Total</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="totals">
      <div class="totals-box">
        <div class="row"><span>Subtotal</span><span>₹${totalNet}</span></div>
        <div class="row"><span>GST (18%)</span><span>₹${totalGST}</span></div>
        <div class="row grand"><span>Grand Total</span><span>₹${grandTotal}</span></div>
      </div>
    </div>
  </div>

  <div class="footer">
    <span>Thank you for your business. For support, contact admin@homeproducts.com</span>
    <span>Generated on ${new Date().toLocaleDateString("en-IN")}</span>
  </div>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Invoice-${orderShortId}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

const statusStyle = {
  Delivered: "bg-emerald-50 text-emerald-600 border-emerald-100",
  Shipped: "bg-blue-50 text-blue-600 border-blue-100",
  Processing: "bg-amber-50 text-amber-600 border-amber-100",
  Cancelled: "bg-rose-50 text-rose-600 border-rose-100",
  Returned: "bg-slate-50 text-slate-600 border-slate-100",
};

const COURIERS = ["BlueDart Express", "Ekart Logistics", "Delhivery", "India Post", "DTDC", "XpressBees"];

const OrderStatCard = ({ title, value, icon: Icon, color, bg }) => (
  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 group hover:-translate-y-2 flex items-center justify-between overflow-hidden relative">
    <div className="absolute top-0 right-0 w-32 h-32 bg-slate-500/5 blur-3xl -mr-16 -mt-16 group-hover:opacity-20 transition-opacity" />
    <div className="relative z-10">
      <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{title}</p>
      <h3 className="text-4xl font-black text-slate-950 tracking-tighter">{value}</h3>
    </div>
    <div className={cn("h-16 w-16 rounded-[1.5rem] flex items-center justify-center relative z-10 shadow-lg transition-transform group-hover:rotate-12", bg, color)}>
      <Icon size={28} />
    </div>
  </div>
);

export default function OrdersPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkStatus, setBulkStatus] = useState("Shipped");
  const [bulkCourier, setBulkCourier] = useState(COURIERS[0]);

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleExportOrders = () => {
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
      doc.text("ORDERS SUMMARY REPORT", 14, 20);

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
      doc.text(`Total Orders: ${orders.length}`, 14, 31);

      // Divider line
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.setLineWidth(0.5);
      doc.line(14, 35, 196, 35);

      // Table Headers
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105); // slate-600
      doc.text("Order ID", 14, 43);
      doc.text("Customer Details", 45, 43);
      doc.text("Amount", 115, 43, { align: "right" });
      doc.text("Status", 145, 43, { align: "right" });
      doc.text("Courier Logistics", 196, 43, { align: "right" });

      doc.line(14, 47, 196, 47);

      // Render table rows
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);

      let yOffset = 54;

      filtered.forEach((order, idx) => {
        // Handle multipage overflow dynamically
        if (yOffset > 275) {
          doc.addPage();
          yOffset = 20;

          doc.setFont("helvetica", "bold");
          doc.setFontSize(10);
          doc.setTextColor(71, 85, 105);
          doc.text("Order ID", 14, yOffset);
          doc.text("Customer Details", 45, yOffset);
          doc.text("Amount", 115, yOffset, { align: "right" });
          doc.text("Status", 145, yOffset, { align: "right" });
          doc.text("Courier Logistics", 196, yOffset, { align: "right" });
          
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

        // Order ID and Date
        doc.setFont("helvetica", "bold");
        const orderShortId = String(order.id).substring(0, 8).toUpperCase();
        doc.text(`#${orderShortId}`, 14, yOffset);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184); // slate-400
        const dateVal = new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        doc.text(dateVal, 14, yOffset + 3);

        // Reset
        doc.setFontSize(9);
        doc.setTextColor(15, 23, 42);

        // Customer Details
        const truncatedCust = order.customer_name?.length > 32 ? `${order.customer_name.substring(0, 29)}...` : order.customer_name;
        doc.text(truncatedCust || "N/A", 45, yOffset);

        // Amount
        const amountVal = `INR ${Number(order.total_amount || 0).toLocaleString('en-IN')}`;
        doc.text(amountVal, 115, yOffset, { align: "right" });

        // Status
        doc.text(order.status, 145, yOffset, { align: "right" });

        // Courier
        const courierVal = order.courier || "Pending";
        doc.text(courierVal, 196, yOffset, { align: "right" });

        yOffset += 11;
      });

      // Trigger standard local file download
      doc.save(`Order_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error("Export orders failed:", err);
    }
  };

  const fetchOrders = async () => {
    setLoadingOrders(true);
    try {
      const resp = await api.get('/user/admin/orders');
      if (resp.data.success) {
        setOrders(Array.isArray(resp.data.data) ? resp.data.data : []);
      }
      setSelectedIds(new Set()); // Reset on fetch
    } catch (err) {
      console.error('Fetch error:', err);
      setOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  };

  const toggleSelect = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = (visibleOrders) => {
    if (selectedIds.size === visibleOrders.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(visibleOrders.map(o => o.id)));
    }
  };

  const handleBulkUpdate = async () => {
    if (selectedIds.size === 0) return;
    try {
      const resp = await api.post('/user/admin/orders/bulk-update', {
        orderIds: Array.from(selectedIds),
        status: bulkStatus,
        courier: bulkStatus === 'Shipped' ? bulkCourier : null
      });
      if (resp.data.success) {
        toast({ title: "Bulk Update Success", description: resp.data.message });
        setSelectedIds(new Set());
        fetchOrders();
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to perform bulk update", variant: "destructive" });
    }
  };

  const handleAutoPilot = async () => {
    if (!window.confirm("This will automatically assign couriers and mark ALL pending orders as Shipped. Continue?")) return;
    try {
      const resp = await api.post('/user/admin/orders/auto-dispatch');
      if (resp.data.success) {
        toast({ title: "Auto-Pilot Success", description: resp.data.message });
        fetchOrders();
      }
    } catch (err) {
      toast({ title: "Auto-Pilot Failed", description: "System error during automated dispatch", variant: "destructive" });
    }
  };

  const statusBreakdown = useMemo(() => {
    if (!orders.length) return [];
    const counts = orders.reduce((acc, o) => {
      acc[o.status] = (acc[o.status] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts).map(([name, count]) => ({
      name,
      value: Math.round((count / orders.length) * 100),
      count
    })).sort((a, b) => b.count - a.count);
  }, [orders]);

  const [timeRange, setTimeRange] = useState("Weekly");

  const orderTrend = useMemo(() => {
    if (!orders.length) return [];

    const trend = {};
    const now = new Date();

    if (timeRange === "Daily") {
      // Last 24 hours (grouped by 3-hour intervals)
      for (let i = 0; i < 24; i += 3) {
        const h = new Date(now);
        h.setHours(h.getHours() - i);
        const label = h.getHours() + ":00";
        trend[label] = 0;
      }
      orders.forEach(o => {
        const d = new Date(o.created_at);
        if (now - d < 86400000) {
          const h = d.getHours();
          const bucket = Math.floor(h / 3) * 3 + ":00";
          if (trend.hasOwnProperty(bucket)) trend[bucket]++;
        }
      });
    } else if (timeRange === "Weekly") {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        trend[days[d.getDay()]] = 0;
      }
      orders.forEach(o => {
        const d = new Date(o.created_at);
        if (now - d < 7 * 86400000) {
          const dayName = days[d.getDay()];
          if (trend.hasOwnProperty(dayName)) trend[dayName]++;
        }
      });
    } else if (timeRange === "Monthly") {
      // Last 30 days grouped by week
      for (let i = 4; i >= 1; i--) {
        trend[`Week ${i}`] = 0;
      }
      orders.forEach(o => {
        const d = new Date(o.created_at);
        const diff = Math.floor((now - d) / (7 * 86400000));
        if (diff < 4) trend[`Week ${4 - diff}`]++;
      });
    } else if (timeRange === "Yearly") {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now);
        d.setMonth(d.getMonth() - i);
        trend[months[d.getMonth()]] = 0;
      }
      orders.forEach(o => {
        const d = new Date(o.created_at);
        if (now - d < 365 * 86400000) {
          const monthName = months[d.getMonth()];
          if (trend.hasOwnProperty(monthName)) trend[monthName]++;
        }
      });
    }

    return Object.entries(trend).map(([date, orders]) => ({ date, orders }));
  }, [orders, timeRange]);

  const [editStatus, setEditStatus] = useState("");
  const [editCourier, setEditCourier] = useState("");
  const [editTrackingId, setEditTrackingId] = useState("");
  const [editEstDate, setEditEstDate] = useState("");
  const [statusSaved, setStatusSaved] = useState(false);
  const [srLoading, setSrLoading] = useState(false);
  const [serviceability, setServiceability] = useState(null);
  const [dispatchSuccess, setDispatchSuccess] = useState(null);

  const openOrder = (o) => {
    setSelectedOrder(o);
    setEditStatus(o.status);
    setEditCourier(o.courier || "BlueDart Express");
    setEditTrackingId(o.tracking_id || "");
    setEditEstDate(o.estimated_delivery || "");
    setStatusSaved(false);
    setServiceability(null);
    setDispatchSuccess(null);
  };

  const closeModal = () => setSelectedOrder(null);

  const handleUpdateStatus = async () => {
    try {
      const resp = await api.patch(`/orders/status/${selectedOrder.id}`, {
        status: editStatus,
        courier: editCourier,
        tracking_id: editTrackingId,
        est_delivery: editEstDate
      });
      if (resp.status === 200) {
        fetchOrders();
        setStatusSaved(true);
        setTimeout(() => setStatusSaved(false), 2000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const matchesSearch =
        String(o.id).toLowerCase().includes(search.toLowerCase()) ||
        o.customer_name?.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "All" || o.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [orders, search, statusFilter]);

  if (loadingOrders) return (
    <div className="flex h-[70vh] flex-col items-center justify-center gap-6">
      <div className="w-20 h-20 relative">
        <div className="absolute inset-0 border-4 border-slate-100 rounded-full" />
        <div className="absolute inset-0 border-4 border-violet-600 rounded-full border-t-transparent animate-spin" />
      </div>
      <p className="text-sm font-black text-slate-400 uppercase tracking-[0.3em] animate-pulse">Fetching Real-time Orders...</p>
    </div>
  );

  return (
    <div className="space-y-10 pb-16 px-2 animate-in fade-in duration-1000">

      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-10 md:p-14 rounded-[3.5rem] shadow-2xl shadow-indigo-200 border border-white/5">
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-10">
          <div className="flex items-center gap-8 text-center lg:text-left">
            <div className="w-24 h-24 bg-white/10 backdrop-blur-2xl text-white rounded-[2rem] flex items-center justify-center shadow-2xl border border-white/20 transition-transform hover:scale-110 duration-500">
              <ShoppingCart size={48} className="text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center gap-3 justify-center lg:justify-start mb-3">
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.8)]" />
                <span className="text-[11px] font-black text-indigo-300 uppercase tracking-[0.3em]">Live Order Stream</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-none">
                Order Management
              </h2>
              <p className="text-indigo-200/70 mt-4 font-bold text-lg max-w-xl">
                Track orders, update shipping status, and manage customer fulfillment.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 w-full lg:w-auto justify-center">
            <button 
              onClick={handleExportOrders}
              className="h-16 px-10 rounded-[1.5rem] bg-white text-slate-950 text-xs font-black uppercase tracking-widest hover:bg-indigo-50 transition-all shadow-xl active:scale-95 flex items-center gap-3"
            >
              <Download size={18} /> Export Data
            </button>
          </div>
        </div>
        <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-30%] left-[-5%] w-[400px] h-[400px] bg-violet-500/10 rounded-full blur-[100px]"></div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <OrderStatCard
          title="Live Orders"
          value={orders.length.toLocaleString()}
          icon={ShoppingCart}
          color="text-violet-600"
          bg="bg-violet-50"
        />
        <OrderStatCard
          title="Delivered"
          value={orders.filter(o => o.status === 'Delivered').length}
          icon={CheckCircle2}
          color="text-emerald-600"
          bg="bg-emerald-50"
        />
        <OrderStatCard
          title="Active Shipments"
          value={orders.filter(o => o.status === 'Shipped').length}
          icon={Truck}
          color="text-blue-600"
          bg="bg-blue-50"
        />
        <OrderStatCard
          title="Pending Queue"
          value={orders.filter(o => o.status === 'Processing' || o.status === 'Pending').length}
          icon={Clock}
          color="text-amber-600"
          bg="bg-amber-50"
        />
      </div>

      {/* Main Order Table */}
      <div className="bg-white rounded-[3.5rem] border border-slate-100 shadow-sm overflow-hidden hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-700">
        <div className="p-12 border-b border-slate-50 flex flex-col xl:flex-row xl:items-center justify-between gap-10">
          <div>
            <h3 className="text-4xl font-black text-slate-950 tracking-tight leading-none">Order List</h3>
            <p className="text-sm text-slate-400 font-bold mt-3 uppercase tracking-widest opacity-70 italic">Full transaction history from database</p>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                placeholder="Search by ID or Customer..."
                className="w-full h-16 pl-14 pr-6 rounded-[1.5rem] border-2 border-slate-50 bg-slate-50/50 text-sm font-black focus:outline-none focus:border-violet-500/30 focus:ring-8 focus:ring-violet-500/5 transition-all shadow-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar bg-slate-50 p-2 rounded-[1.75rem] border border-slate-100">
                {["All", "Processing", "Shipped", "Delivered", "Cancelled"].map((f) => (
                  <button
                    key={f}
                    onClick={() => setStatusFilter(f)}
                    className={cn("h-12 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
                      f === statusFilter ? "bg-slate-950 text-white shadow-xl" : "text-slate-400 hover:text-slate-900"
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>
              
              <button 
                onClick={handleAutoPilot}
                className="h-16 px-8 rounded-[1.75rem] bg-indigo-600 text-white font-black text-[10px] uppercase tracking-[0.2em] hover:bg-violet-600 transition-all shadow-xl shadow-indigo-200/50 flex items-center gap-3 group active:scale-95"
              >
                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Logistics Auto-Pilot
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-12 py-8 w-10">
                   <input 
                     type="checkbox" 
                     className="h-5 w-5 rounded-lg border-2 border-slate-200 text-indigo-600 focus:ring-indigo-500 transition-all cursor-pointer"
                     checked={selectedIds.size > 0 && selectedIds.size === filtered.length}
                     onChange={() => toggleSelectAll(filtered)}
                   />
                </th>
                <th className="px-6 py-8 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Order ID</th>
                <th className="px-8 py-8 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Customer</th>
                <th className="px-8 py-8 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Amount</th>
                <th className="px-8 py-8 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Status</th>
                <th className="px-8 py-8 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Shipping</th>
                <th className="px-12 py-8 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((o) => (
                <tr key={o.id} className={cn("hover:bg-slate-50/40 transition-all duration-300 group/row", selectedIds.has(o.id) && "bg-indigo-50/30")}>
                  <td className="px-12 py-10">
                    <input 
                       type="checkbox" 
                       className="h-5 w-5 rounded-lg border-2 border-slate-200 text-indigo-600 focus:ring-indigo-500 transition-all cursor-pointer"
                       checked={selectedIds.has(o.id)}
                       onChange={() => toggleSelect(o.id)}
                    />
                  </td>
                  <td className="px-6 py-10">
                    <div className="flex flex-col">
                      <span className="text-xl font-black text-slate-950 tracking-tight group-hover/row:text-indigo-600 transition-colors" title={o.id}>
                        #{o.id.length > 8 ? o.id.substring(0, 8).toUpperCase() : o.id.toUpperCase()}
                      </span>
                      <span className="text-[11px] font-black text-slate-400 uppercase mt-2 tracking-widest flex items-center gap-2">
                        <Calendar size={12} /> {new Date(o.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-10">
                    <div className="flex flex-col">
                      <span className="text-lg font-black text-slate-900">{o.customer_name}</span>
                      <span className="text-[11px] font-bold text-slate-400 mt-1 truncate max-w-[200px]">{o.customer_email}</span>
                    </div>
                  </td>
                  <td className="px-8 py-10 text-right">
                    <div className="flex flex-col">
                      <span className="text-2xl font-black text-slate-950 italic tracking-tighter">₹{Number(o.total_amount).toLocaleString('en-IN')}</span>
                      <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mt-1 flex items-center justify-end gap-1">
                        <CreditCard size={10} /> {o.payment_method}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-10 text-center">
                    <span className={cn("inline-flex items-center px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 transition-all duration-300",
                      statusStyle[o.status] || 'bg-slate-50 text-slate-600 border-slate-100'
                    )}>
                      {o.status}
                    </span>
                  </td>
                  <td className="px-8 py-10">
                    <div className="flex flex-col">
                      <span className="text-[11px] font-black text-slate-700 flex items-center gap-2">
                        <Truck size={14} className="text-slate-400" /> {o.courier || "Pending"}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 mt-1.5 opacity-60 tracking-wider">
                        {o.tracking_id || "No Tracking ID"}
                      </span>
                    </div>
                  </td>
                  <td className="px-12 py-10 text-right">
                    <button
                      onClick={() => openOrder(o)}
                      className="h-14 w-14 flex items-center justify-center rounded-2xl bg-white border border-slate-100 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-100 transition-all active:scale-90"
                      title="Manage Order"
                    >
                      <Eye size={22} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="p-32 text-center">
              <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-200">
                <ShoppingCart size={48} />
              </div>
              <h4 className="text-xl font-black text-slate-950">No Orders Found</h4>
              <p className="text-slate-400 font-bold mt-2">Try adjusting your filters or search query.</p>
            </div>
          )}
        </div>
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[3.5rem] max-w-5xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in slide-in-from-bottom-12 duration-700 border border-white/20 no-scrollbar">

            {/* Modal Header */}
            <div className="sticky top-0 flex items-center justify-between p-10 border-b border-slate-50 bg-white/90 backdrop-blur-xl z-[110]">
              <div className="flex items-center gap-6">
                <div className="h-16 w-16 rounded-[1.5rem] bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-inner">
                  <Package size={32} />
                </div>
                <div>
                  <h2 className="text-3xl font-black text-slate-950 tracking-tight">Order Details</h2>
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1" title={selectedOrder.id}>
                    Order ID: <span className="font-mono text-slate-900 select-all">#{selectedOrder.id.length > 8 ? selectedOrder.id.substring(0, 8).toUpperCase() : selectedOrder.id.toUpperCase()}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button
                  className="h-14 px-8 rounded-2xl bg-slate-950 text-white font-black text-[10px] uppercase tracking-widest hover:bg-violet-600 transition-all shadow-xl active:scale-95 flex items-center gap-3"
                  onClick={() => downloadInvoice(selectedOrder)}
                >
                  <Download size={18} /> Invoice
                </button>
                <button onClick={closeModal} className="h-14 w-14 flex items-center justify-center rounded-2xl bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-all">
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="p-12 space-y-12">

              {/* Order Info Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                <div className="lg:col-span-2 space-y-12">

                  {/* Customer & Address */}
                  <div className="p-10 rounded-[3rem] bg-slate-50/50 border border-slate-100 relative overflow-hidden group hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-700">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-violet-500/5 blur-[80px] -mr-24 -mt-24 group-hover:bg-violet-500/10 transition-colors" />
                    <div className="flex items-center gap-4 mb-8">
                      <div className="p-2.5 bg-white rounded-xl text-violet-600 shadow-sm border border-slate-100">
                        <List size={18} />
                      </div>
                      <h3 className="text-sm font-black text-slate-950 uppercase tracking-widest">Customer & Shipping Information</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10 relative z-10">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Customer Profile</p>
                        <p className="text-2xl font-black text-slate-950 tracking-tight">{selectedOrder.customer_name}</p>
                        <div className="mt-4 space-y-2">
                          <p className="text-sm font-bold text-slate-600 flex items-center gap-2"><Check size={14} className="text-emerald-500" /> {selectedOrder.customer_email}</p>
                          <p className="text-sm font-bold text-slate-600 flex items-center gap-2"><Check size={14} className="text-emerald-500" /> {selectedOrder.customer_phone || '+91 00000 00000'}</p>
                        </div>
                      </div>
                      <div className="bg-white/60 p-6 rounded-[2rem] border border-white">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Shipping Address</p>
                        <div className="flex gap-3">
                          <MapPin className="h-5 w-5 text-rose-500 shrink-0 mt-1" />
                          <p className="text-sm font-bold text-slate-700 leading-relaxed italic">{selectedOrder.shipping_address}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Product List */}
                  <div className="space-y-8">
                    <div className="flex items-center justify-between px-2">
                      <h3 className="text-sm font-black text-slate-950 uppercase tracking-[0.2em]">Ordered Products</h3>
                      <span className="px-4 py-1.5 rounded-full bg-slate-900 text-white text-[10px] font-black">{(selectedOrder.items || []).length} Items</span>
                    </div>
                    <div className="space-y-4">
                      {(selectedOrder.items || []).map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-6 rounded-[2.5rem] bg-white border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 group/item">
                          <div className="flex items-center gap-6">
                            <div className="h-20 w-20 rounded-3xl border-2 border-slate-50 overflow-hidden shrink-0 shadow-lg group-hover/item:scale-110 transition-transform duration-500">
                              <img src={item.image} alt={item.name} className="h-full w-full object-cover" onError={e => e.target.src = 'https://via.placeholder.com/100'} />
                            </div>
                            <div>
                              <p className="text-lg font-black text-slate-950 tracking-tight">{item.name}</p>
                              <div className="flex items-center gap-3 mt-2">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3 py-1 rounded-lg bg-slate-50 border border-slate-100">SKU: {item.sku || 'N/A'}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-black text-slate-950 tracking-tighter">₹{Number(item.price).toLocaleString('en-IN')}</p>
                            <p className="text-[10px] font-black text-slate-400 uppercase mt-1 tracking-widest">Qty: {item.quantity}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-10">
                  {/* Payment Details */}
                  <div className="p-10 rounded-[3rem] bg-slate-950 text-white shadow-2xl relative overflow-hidden group hover:-translate-y-2 transition-all duration-700">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 blur-[80px] -mr-24 -mt-24" />
                    <div className="relative z-10">
                      <div className="flex items-center gap-4 mb-8 pb-6 border-b border-white/10">
                        <div className="p-2.5 bg-white/10 rounded-xl text-emerald-400 backdrop-blur-xl border border-white/10">
                          <CreditCard size={18} />
                        </div>
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Payment Summary</h3>
                      </div>

                      <div className="space-y-6">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Method</span>
                          <span className="text-[11px] font-black uppercase text-emerald-400 tracking-[0.2em] bg-emerald-400/10 px-3 py-1 rounded-lg border border-emerald-400/20">{selectedOrder.payment_method}</span>
                        </div>
                        <div className="flex justify-between items-end pt-4 border-t border-white/5">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Grand Total</span>
                            <span className="text-4xl font-black text-white italic tracking-tighter">₹{Number(selectedOrder.total_amount).toLocaleString('en-IN')}</span>
                          </div>
                          <div className="text-right mb-1">
                            <div className="flex items-center gap-2 text-emerald-400 font-black text-[10px] uppercase tracking-widest">
                              <CheckCircle2 size={14} /> Paid
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Order Status Control */}
                  <div className="p-10 rounded-[3rem] border border-slate-100 bg-white shadow-sm space-y-8 group hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-700">
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 bg-amber-50 rounded-xl text-amber-600 border border-amber-100">
                        <Clock size={18} />
                      </div>
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Order Status</h3>
                    </div>

                    <div className="space-y-6">
                      <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-500 uppercase">Current</span>
                        <span className={cn("px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border-2 transition-all",
                          statusStyle[selectedOrder.status] || 'bg-slate-50 text-slate-600 border-slate-100'
                        )}>{selectedOrder.status}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        {["Processing", "Shipped", "Delivered", "Cancelled"].map((s) => (
                          <button
                            key={s}
                            onClick={() => setEditStatus(s)}
                            className={cn("h-14 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] border-2 transition-all",
                              editStatus === s
                                ? "bg-slate-950 text-white border-slate-950 shadow-xl scale-[1.02]"
                                : "bg-white text-slate-400 border-slate-50 hover:border-slate-200 hover:text-slate-600"
                            )}
                          >
                            {s}
                          </button>
                        ))}
                      </div>

                      <button
                        onClick={handleUpdateStatus}
                        disabled={editStatus === selectedOrder.status}
                        className={cn("w-full h-16 rounded-[1.25rem] font-black uppercase text-[10px] tracking-[0.3em] transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3",
                          statusSaved
                            ? "bg-emerald-500 text-white shadow-emerald-500/20"
                            : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-600/20 disabled:opacity-30 disabled:pointer-events-none"
                        )}
                      >
                        {statusSaved ? <><Check size={18} /> Updated</> : "Update Status"}
                      </button>
                    </div>
                  </div>

                  {/* Shipping & Logistics */}
                  <div className="p-10 rounded-[3rem] border border-slate-100 bg-white shadow-sm space-y-8 hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-700 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl -mr-16 -mt-16" />
                    
                    <div className="flex items-center justify-between relative z-10">
                      <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600 border border-blue-100">
                          <Truck size={18} />
                        </div>
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Shiprocket Intelligence</h3>
                      </div>
                      <button 
                        onClick={async () => {
                          setSrLoading(true);
                          try {
                            const res = await api.get(`/shipping/get-serviceability/${selectedOrder.id}`);
                            if (res.data.success) setServiceability(res.data.data);
                          } catch (err) {
                            toast({ title: "Serviceability Failed", description: "Could not reach Shiprocket", variant: "destructive" });
                          } finally { setSrLoading(false); }
                        }}
                        className="text-[9px] font-black text-blue-600 uppercase tracking-widest hover:underline"
                      >
                        {srLoading ? "Checking..." : "Refresh Serviceability"}
                      </button>
                    </div>

                    {dispatchSuccess ? (
                      <div className="bg-emerald-50 rounded-[2rem] p-8 border border-emerald-100 flex flex-col items-center text-center animate-in zoom-in duration-500 relative z-10">
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg mb-4 text-emerald-500">
                          <CheckCircle2 size={32} />
                        </div>
                        <h4 className="text-xl font-black text-slate-900 tracking-tight">Order Dispatched!</h4>
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-2 mb-6">Assigned to {dispatchSuccess.courier}</p>
                        
                        <div className="w-full bg-white rounded-2xl p-4 border border-emerald-100 shadow-sm text-left mb-6">
                           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">AWB Tracking Code</p>
                           <p className="text-sm font-black text-slate-900 font-mono">{dispatchSuccess.awb_code}</p>
                        </div>
                        
                        <Button 
                          onClick={closeModal}
                          className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] uppercase tracking-widest transition-all"
                        >
                          Close Details
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-6 relative z-10">
                        {/* Intelligent Auto-Pilot Button */}
                      <Button 
                        onClick={async () => {
                          if (!window.confirm("Run Shiprocket Auto-Pilot for this order?")) return;
                          setSrLoading(true);
                          try {
                            const res = await api.post(`/shipping/initiate/${selectedOrder.id}`);
                            if (res.data.success) {
                              toast({ title: "Smart Dispatch Success", description: `Assigned to ${res.data.data.courier}` });
                              setDispatchSuccess(res.data.data);
                              fetchOrders();
                            }
                          } catch (err) {
                            toast({ title: "Dispatch Failed", description: err.response?.data?.message || "System error", variant: "destructive" });
                          } finally { setSrLoading(false); }
                        }}
                        disabled={srLoading || selectedOrder.status === 'Shipped'}
                        className="w-full h-16 rounded-2xl bg-slate-950 text-white hover:bg-blue-600 font-black uppercase text-[10px] tracking-[0.3em] flex items-center justify-center gap-3 group transition-all"
                      >
                        <ShieldCheck className="group-hover:animate-bounce" size={18} />
                        {srLoading ? "Processing..." : "Smart Auto-Pilot Dispatch"}
                      </Button>

                      {/* Serviceability List */}
                      {serviceability && (
                        <div className="space-y-3 animate-in fade-in slide-in-from-top-4">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Available Couriers</p>
                          <div className="max-h-[200px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                            {serviceability.available_courier_companies.map((c) => (
                              <div key={c.courier_company_id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between hover:border-blue-200 transition-all">
                                <div className="flex flex-col">
                                  <span className="text-[11px] font-black text-slate-900">{c.courier_name}</span>
                                  <span className="text-[9px] font-bold text-slate-400">Rating: {c.rating}/5</span>
                                </div>
                                <div className="flex flex-col items-end">
                                  <span className="text-xs font-black text-blue-600">₹{c.rate}</span>
                                  <span className="text-[9px] font-bold text-slate-400">Est. {c.etd}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="relative">
                        <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-100"></span></div>
                        <div className="relative flex justify-center text-[8px] uppercase font-black text-slate-300 bg-white px-4 tracking-[0.4em]">Or Manual Update</div>
                      </div>

                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-2">Courier</label>
                            <select 
                              className="w-full h-12 px-4 rounded-xl border border-slate-100 bg-slate-50 text-[10px] font-black focus:outline-none focus:border-blue-500 transition-all" 
                              value={editCourier} 
                              onChange={e => setEditCourier(e.target.value)}
                            >
                              {COURIERS.map(c => <option key={c}>{c}</option>)}
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-2">Tracking ID</label>
                            <input 
                              className="w-full h-12 px-4 rounded-xl border border-slate-100 bg-slate-50 text-[10px] font-black focus:outline-none focus:border-blue-500 transition-all" 
                              value={editTrackingId} 
                              onChange={e => setEditTrackingId(e.target.value)} 
                              placeholder="e.g. TRK123"
                            />
                          </div>
                        </div>
                        <button 
                          onClick={handleUpdateStatus} 
                          className="w-full h-12 rounded-xl bg-white border border-slate-200 text-slate-900 font-black uppercase text-[9px] tracking-[0.2em] hover:bg-slate-50 transition-all active:scale-95"
                        >
                          {statusSaved ? "Saved!" : "Update Status"}
                        </button>
                      </div>
                    </div>
                    )}
                  </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
      )}
      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 bg-slate-950 text-white px-10 py-6 rounded-[2.5rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.5)] z-[90] flex items-center gap-8 animate-in slide-in-from-bottom-12 duration-500 border border-white/10 backdrop-blur-xl">
           <div className="flex items-center gap-4 pr-8 border-r border-white/10">
              <div className="h-12 w-12 rounded-2xl bg-indigo-600 flex items-center justify-center font-black italic">
                 {selectedIds.size}
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Selected</p>
           </div>
           
           <div className="flex items-center gap-6">
              <div className="flex flex-col gap-1.5">
                 <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Set Status</label>
                 <select 
                   className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:border-indigo-500"
                   value={bulkStatus}
                   onChange={e => setBulkStatus(e.target.value)}
                 >
                   {["Pending", "Processing", "Shipped", "Delivered", "Cancelled"].map(s => <option key={s} className="bg-slate-900">{s}</option>)}
                 </select>
              </div>

              {bulkStatus === 'Shipped' && (
                <div className="flex flex-col gap-1.5">
                   <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Courier</label>
                   <select 
                     className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:border-indigo-500"
                     value={bulkCourier}
                     onChange={e => setBulkCourier(e.target.value)}
                   >
                     {COURIERS.map(c => <option key={c} className="bg-slate-900">{c}</option>)}
                   </select>
                </div>
              )}

              <button 
                onClick={handleBulkUpdate}
                className="h-14 px-8 rounded-2xl bg-white text-slate-950 font-black uppercase text-[10px] tracking-[0.3em] hover:bg-indigo-500 hover:text-white transition-all shadow-xl active:scale-95 flex items-center gap-3"
              >
                Apply to {selectedIds.size} Orders
              </button>
           </div>

           <button 
             onClick={() => setSelectedIds(new Set())}
             className="h-12 w-12 rounded-2xl bg-white/5 border border-white/5 text-slate-400 hover:bg-rose-500/20 hover:text-rose-500 transition-all flex items-center justify-center"
           >
              <X size={20} />
           </button>
        </div>
      )}
    </div>
  );
}
