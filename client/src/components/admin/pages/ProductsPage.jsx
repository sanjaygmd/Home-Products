import { useNavigate } from "react-router-dom";
import { Button } from "../../ui/button";
import { 
  Search, Plus, Package, Eye, Edit, Trash2, Home, Sofa, Bed, Lamp, Grid, 
  ListFilter, Zap, ShieldAlert, CheckCircle2, IndianRupee, Layers,
  TrendingUp, BarChart3, PackageCheck, LayoutGrid, Download
} from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { useProducts } from "../../../context/ProductContext/ProductProvider";
import { useAdminSearch } from "../../admin/contexts/AdminSearchContext";
import { useState, useMemo, useEffect } from "react";
import ProductViewModal from "../../common/ProductViewModal";
import { cn } from "../../../lib/utils";
import { api } from "../../../services/api";

const CHART_COLORS = ['#8b5cf6', '#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#ec4899', '#06b6d4'];

const RoomIcon = ({ room, className }) => {
  const r = room?.toLowerCase() || '';
  if (r.includes('living')) return <Sofa className={className} />;
  if (r.includes('bed')) return <Bed className={className} />;
  if (r.includes('light')) return <Lamp className={className} />;
  if (r.includes('kitchen')) return <Home className={className} />;
  return <Grid className={className} />;
};

function ProductImage({ src, name, size = 64 }) {
  const [imgError, setImgError] = useState(false);
  const isRealImage = src && !imgError && (src.startsWith("data:image") || src.startsWith("http") || src.startsWith("/"));

  return (
    <div className="shrink-0 rounded-[22px] border border-slate-100 bg-slate-50 flex items-center justify-center overflow-hidden shadow-sm transition-transform group-hover:scale-110 duration-500" style={{ width: size, height: size }}>
      {isRealImage ? (
        <img src={src} alt={name} className="w-full h-full object-cover" onError={() => setImgError(true)} />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-violet-50 text-violet-600 font-black text-xl">
           {name ? name[0] : <Package className="w-6 h-6" />}
        </div>
      )}
    </div>
  );
}

const ProductStatCard = ({ title, value, icon: Icon, color, bg }) => (
  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 group hover:-translate-y-2 flex items-center justify-between overflow-hidden relative">
    <div className="absolute top-0 right-0 w-32 h-32 bg-slate-500/5 blur-3xl -mr-16 -mt-16 group-hover:opacity-20 transition-opacity" />
    <div className="relative z-10">
      <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{title}</p>
      <h3 className="text-4xl font-black text-slate-950 tracking-tighter">
        {value}
      </h3>
    </div>
    <div className={cn("h-16 w-16 rounded-[1.5rem] flex items-center justify-center relative z-10 shadow-lg transition-transform group-hover:rotate-12", bg, color)}>
      <Icon size={28} />
    </div>
  </div>
);

export default function ProductsPage() {
  const navigate = useNavigate();
  const { searchQuery: search, setSearchQuery: setSearch } = useAdminSearch();
  const { deleteProduct } = useProducts();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ownerFilter, setOwnerFilter] = useState("All");

  const fetchAdminProducts = async () => {
    setLoading(true);
    try {
      const resp = await api.get('/user/admin/products');
      if (resp.data.success) {
        setProducts(Array.isArray(resp.data.data) ? resp.data.data : []);
      }
    } catch (err) {
      console.error('Fetch products failed:', err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminProducts();
  }, []);

  const getStatus = (product) => {
    if (!product.is_active) return "Inactive";
    if (product.stock === 0) return "Out of Stock";
    if (product.stock < 10) return "Low Stock";
    return "Active";
  };

  const filtered = useMemo(() => {
    let res = products.filter(p => !p.isVariant);
    
    if (ownerFilter === "Platform") {
      res = res.filter(p => !p.seller_id);
    } else if (ownerFilter === "Sellers") {
      res = res.filter(p => p.seller_id);
    }
    if (search) {
      const q = search.toLowerCase();
      res = res.filter(p => 
        p.name?.toLowerCase().includes(q) || 
        (p.room && p.room.toLowerCase().includes(q)) ||
        (p.sku && p.sku.toLowerCase().includes(q))
      );
    }
    return res.map(p => ({ ...p, status: getStatus(p) }));
  }, [products, search, ownerFilter]);

  const dynamicStockData = useMemo(() => {
    const baseProducts = products.filter(p => !p.isVariant);
    const rooms = Array.from(new Set(baseProducts.map(p => p.room || "Other")));
    return rooms.map(room => {
      const roomProducts = baseProducts.filter(p => (p.room || "Other") === room);
      return {
        name: room,
        value: roomProducts.length,
        active: roomProducts.filter(p => p.stock > 0).length
      };
    }).sort((a, b) => b.value - a.value);
  }, [products]);

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this product? This action cannot be undone.")) {
      const res = await deleteProduct(id);
      if (res.success) {
        fetchAdminProducts();
      }
    }
  };

  if (loading) return (
    <div className="flex h-[70vh] flex-col items-center justify-center gap-6">
      <div className="w-20 h-20 relative">
        <div className="absolute inset-0 border-4 border-slate-100 rounded-full" />
        <div className="absolute inset-0 border-4 border-violet-600 rounded-full border-t-transparent animate-spin" />
      </div>
      <p className="text-sm font-black text-slate-400 uppercase tracking-[0.3em] animate-pulse">Loading Catalog...</p>
    </div>
  );

  return (
    <>
      <div className="space-y-10 pb-16 px-2 animate-in fade-in duration-1000">
        
        {/* Executive Welcome Banner */}
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-10 md:p-14 rounded-[3.5rem] shadow-2xl shadow-indigo-200 border border-white/5">
          <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-10">
            <div className="flex items-center gap-8 text-center lg:text-left">
              <div className="w-24 h-24 bg-white/10 backdrop-blur-2xl text-white rounded-[2rem] flex items-center justify-center shadow-2xl border border-white/20 transition-transform hover:scale-110 duration-500">
                 <Package size={48} className="text-indigo-300" />
              </div>
              <div>
                 <div className="flex items-center gap-3 justify-center lg:justify-start mb-3">
                    <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.8)]" />
                    <span className="text-[11px] font-black text-indigo-300 uppercase tracking-[0.3em]">System Status: Operational</span>
                 </div>
                 <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-none">
                   Product Catalog
                 </h2>
                 <p className="text-indigo-200/70 mt-4 font-bold text-lg max-w-xl">
                   Manage your store's inventory, prices, and stock levels across all categories.
                 </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 w-full lg:w-auto justify-center">
               <button className="h-16 px-10 rounded-[1.5rem] bg-white text-slate-950 text-xs font-black uppercase tracking-widest hover:bg-indigo-50 transition-all shadow-xl active:scale-95 flex items-center gap-3">
                  <Download size={18} /> Export Catalog
               </button>
               <button 
                 onClick={() => navigate("/admin/products/add")} 
                 className="h-16 px-10 rounded-[1.5rem] bg-indigo-600 text-white text-xs font-black uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-500/20 active:scale-95 flex items-center gap-3"
               >
                  <Plus size={20} /> Add New Product
               </button>
            </div>
          </div>
          {/* Abstract Background Accents */}
          <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[-30%] left-[-5%] w-[400px] h-[400px] bg-violet-500/10 rounded-full blur-[100px]"></div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <ProductStatCard 
            title="Total Products" 
            value={products.filter(p => !p.isVariant).length} 
            icon={Package} 
            color="text-violet-600" 
            bg="bg-violet-50" 
          />
          <ProductStatCard 
            title="Active Categories" 
            value={dynamicStockData.length} 
            icon={Layers} 
            color="text-emerald-600" 
            bg="bg-emerald-50" 
          />
          <ProductStatCard 
            title="Inventory Value" 
            value={`₹${Math.round(filtered.reduce((s, p) => s + (Number(p.price) || 0), 0) / 1000)}k`} 
            icon={IndianRupee} 
            color="text-amber-600" 
            bg="bg-amber-50" 
          />
        </div>

        {/* Main Product Table */}
        <div className="bg-white rounded-[3.5rem] border border-slate-100 shadow-sm overflow-hidden hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-700 group">
          <div className="p-12 border-b border-slate-50 flex flex-col xl:flex-row xl:items-center justify-between gap-8">
            <div>
              <h3 className="text-4xl font-black text-slate-950 tracking-tight leading-none">Product List</h3>
              <p className="text-sm text-slate-400 font-bold mt-3 uppercase tracking-widest opacity-70 italic">Full inventory database access</p>
            </div>
            <div className="flex flex-wrap items-center gap-4">
               <div className="relative w-full sm:w-96">
                  <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input 
                    placeholder="Search products..." 
                    className="w-full h-16 pl-14 pr-6 rounded-[1.5rem] border-2 border-slate-50 bg-slate-50/50 text-sm font-black focus:outline-none focus:border-violet-500/30 focus:ring-8 focus:ring-violet-500/5 transition-all shadow-sm"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
               </div>
               <div className="flex bg-slate-50 p-1 rounded-[1.25rem] border border-slate-100 shadow-inner">
                  {['All', 'Platform', 'Sellers'].map(f => (
                    <button 
                      key={f}
                      onClick={() => setOwnerFilter(f)}
                      className={cn(
                        "px-6 h-14 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all",
                        ownerFilter === f 
                          ? "bg-white text-slate-950 shadow-sm border border-slate-200" 
                          : "text-slate-400 hover:text-slate-700"
                      )}
                    >
                      {f}
                    </button>
                  ))}
               </div>
            </div>
          </div>
          
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-12 py-8 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Product Details</th>
                  <th className="px-8 py-8 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Category</th>
                  <th className="px-8 py-8 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Price</th>
                  <th className="px-8 py-8 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Stock</th>
                  <th className="px-8 py-8 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Status</th>
                  <th className="px-12 py-8 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/40 transition-all duration-300 group/row">
                    <td className="px-12 py-10">
                      <div className="flex items-center gap-8">
                        <ProductImage src={p.thumbnail} name={p.name} size={72} />
                        <div className="min-w-0">
                          <p className="text-xl font-black text-slate-950 truncate tracking-tight group-hover/row:text-indigo-600 transition-colors">{p.name}</p>
                          <p className="text-[11px] font-black text-slate-400 uppercase mt-2 tracking-widest flex items-center gap-2">
                             SKU: <span className="text-slate-950">{p.sku || `ITEM-${p.id.split('-')[0].toUpperCase()}`}</span>
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-10">
                      <div className="flex flex-col gap-2.5">
                         <div className="flex items-center gap-2.5 px-5 py-2.5 rounded-2xl bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest border border-indigo-100 w-fit">
                            <RoomIcon room={p.room} className="h-4 w-4" />
                            {p.room || 'General'}
                         </div>
                      </div>
                    </td>
                    <td className="px-8 py-10 text-right">
                      <p className="text-2xl font-black text-slate-950 italic tracking-tighter">₹{Number(p.price || 0).toLocaleString('en-IN')}</p>
                      {p.mrp > p.price && <p className="text-[11px] text-slate-400 line-through font-bold mt-1 opacity-60">₹{p.mrp.toLocaleString('en-IN')}</p>}
                    </td>
                    <td className="px-8 py-10 text-right">
                      <div className="flex flex-col items-end">
                         <span className={cn("text-2xl font-black tracking-tighter", p.stock < 10 ? 'text-rose-500' : 'text-slate-950')}>
                            {p.stock}
                         </span>
                         <div className="w-24 h-2 bg-slate-100 rounded-full mt-3 overflow-hidden shadow-inner">
                            <div className={cn("h-full rounded-full transition-all duration-1500 ease-out", p.stock < 10 ? 'bg-rose-500' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]')} 
                                 style={{ width: `${Math.min(100, (p.stock / 50) * 100)}%` }} />
                         </div>
                      </div>
                    </td>
                    <td className="px-8 py-10 text-center">
                       <span className={cn("inline-flex items-center px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 transition-all duration-300",
                         p.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                         p.status === 'Low Stock' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                         'bg-rose-50 text-rose-600 border-rose-100'
                       )}>
                         {p.status}
                       </span>
                    </td>
                    <td className="px-12 py-10 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button onClick={() => navigate(`/admin/products/edit/${p.id}`)} className="h-14 w-14 flex items-center justify-center rounded-2xl bg-white border border-slate-100 text-slate-400 hover:text-blue-600 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-100 transition-all active:scale-90" title="Edit Product"><Edit size={22} /></button>
                        <button onClick={() => handleDelete(p.id)} className="h-14 w-14 flex items-center justify-center rounded-2xl bg-white border border-slate-100 text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:shadow-xl hover:shadow-rose-100 transition-all active:scale-90" title="Delete Product"><Trash2 size={22} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Category Distribution Visualization */}
        <div className="bg-white rounded-[3.5rem] p-16 border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-700">
          <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-500/5 blur-[120px] rounded-full -ml-48 -mt-48 group-hover:bg-indigo-500/10 transition-colors"></div>
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-16 relative z-10 gap-8">
            <div>
              <h3 className="text-4xl font-black text-slate-950 tracking-tight leading-none">Category Distribution</h3>
              <p className="text-sm font-black text-slate-400 uppercase tracking-[0.3em] mt-3">Product count per department</p>
            </div>
            <div className="flex items-center gap-6">
               <div className="flex items-center gap-3 px-8 py-4 rounded-[1.5rem] bg-slate-50 border border-slate-100 shadow-inner">
                  <div className="h-3 w-3 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(79,70,229,0.6)]" />
                  <span className="text-[11px] font-black text-slate-600 uppercase tracking-widest">Active Stock</span>
               </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center relative z-10">
            <div className="h-[450px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dynamicStockData}
                    innerRadius={130}
                    outerRadius={180}
                    paddingAngle={12}
                    dataKey="value"
                    strokeWidth={0}
                    animationDuration={2500}
                  >
                    {dynamicStockData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} className="hover:opacity-80 transition-opacity cursor-pointer" />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '32px', border: 'none', boxShadow: '0 40px 60px -15px rgb(0 0 0 / 0.15)', padding: '24px', background: 'rgba(255, 255, 255, 0.98)', backdropFilter: 'blur(10px)' }}
                    itemStyle={{ fontWeight: '950', color: '#0f172a', fontSize: '15px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                 <span className="text-5xl font-black text-slate-950 tracking-tighter leading-none">{products.filter(p => !p.isVariant).length}</span>
                 <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mt-4">Total SKU's</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
               {dynamicStockData.map((item, index) => (
                 <div key={item.name} className="p-8 rounded-[2.5rem] bg-slate-50/50 hover:bg-white border border-transparent hover:border-slate-100 transition-all duration-500 group/item hover:shadow-xl hover:shadow-slate-100 relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-24 h-24 blur-3xl -mr-12 -mt-12 opacity-10 group-hover/item:opacity-20 transition-opacity" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                   <div className="flex items-center gap-4 mb-6">
                     <div className="w-4 h-4 rounded-full shadow-lg" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}></div>
                     <span className="text-[14px] font-black text-slate-900 uppercase tracking-widest truncate">{item.name}</span>
                   </div>
                   <div className="flex items-end justify-between relative z-10">
                     <div>
                       <p className="text-4xl font-black text-slate-950 tracking-tighter leading-none">{item.value}</p>
                       <p className="text-[10px] font-black text-slate-400 mt-2 uppercase tracking-[0.2em]">Total Items</p>
                     </div>
                     <div className="text-right">
                       <p className="text-lg font-black text-emerald-500 leading-none">{item.active}</p>
                       <p className="text-[9px] font-black text-slate-400 mt-1 uppercase tracking-[0.1em]">In Stock</p>
                     </div>
                   </div>
                 </div>
               ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
