import { useState, useEffect } from "react";
import {
  Mail, Phone, MapPin, Edit2, Save, X, Shield,
  Users, Package, ShoppingCart, TrendingUp, Camera,
  CheckCircle, Clock, Star, BarChart2
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext.jsx";
import { useToast } from "../../../hooks/use-toast";
import { cn } from "../../../lib/utils";
import { api } from "../../../services/api";

export default function ProfilePage() {
  const { currentUser, loginUser } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);

  const [formData, setFormData] = useState({
    name: currentUser?.name || "",
    email: currentUser?.email || "",
    phone: currentUser?.phone || "",
    role: currentUser?.role || "Admin",
    address: currentUser?.address || "",
  });
  const [originalData, setOriginalData] = useState(formData);

  useEffect(() => {
    if (currentUser) {
      const data = {
        name: currentUser.name || "",
        email: currentUser.email || "",
        phone: currentUser.phone || "",
        role: currentUser.role || "Admin",
        address: currentUser.address || "",
      };
      setFormData(data);
      setOriginalData(data);
    }
  }, [currentUser]);

  useEffect(() => {
    api.get("/user/admin/dashboard-data")
      .then(resp => { if (resp.data.success) setStats(resp.data.data.stats); })
      .catch(() => {});
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEdit = () => { setOriginalData(formData); setIsEditing(true); };
  const handleCancel = () => { setFormData(originalData); setIsEditing(false); };

  const handleSave = async () => {
    setLoading(true);
    try {
      const resp = await api.put(`/user/admin/profile/${currentUser?.id}`, formData);
      const data = resp.data;
      if (resp.status === 200) {
        loginUser(data.user);
        toast({ title: "Profile Updated", description: "Your details have been saved." });
        setIsEditing(false);
      } else {
        toast({ variant: "destructive", title: "Update Failed", description: data.message });
      }
    } catch {
      toast({ variant: "destructive", title: "Server Error", description: "Could not reach the server." });
    } finally {
      setLoading(false);
    }
  };

  const initials = (formData.name || "A")
    .split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  const quickStats = [
    { label: "Total Orders",    value: stats?.total_orders    ?? "—", icon: ShoppingCart, color: "text-indigo-600",  bg: "bg-indigo-50" },
    { label: "Total Products",  value: stats?.total_products  ?? "—", icon: Package,      color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Total Customers", value: stats?.total_customers ?? "—", icon: Users,        color: "text-amber-600",   bg: "bg-amber-50" },
    { label: "Total Revenue",   value: stats ? `₹${Number(stats.total_revenue).toLocaleString("en-IN")}` : "—", icon: TrendingUp, color: "text-violet-600", bg: "bg-violet-50" },
  ];

  const fields = [
    { key: "name",    label: "Full Name",       icon: Shield,  editable: true },
    { key: "email",   label: "Email Address",   icon: Mail,    editable: true },
    { key: "phone",   label: "Phone Number",    icon: Phone,   editable: true },
    { key: "role",    label: "Role",            icon: Shield,  editable: false },
    { key: "address", label: "Office Address",  icon: MapPin,  editable: true, full: true },
  ];

  return (
    <div className="space-y-8 pb-20 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-2 w-10 bg-indigo-600 rounded-full" />
        <div>
          <span className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.3em]">Account</span>
          <h1 className="text-4xl font-black text-slate-950 tracking-tight leading-none mt-1">Admin Profile</h1>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left — Avatar Card */}
        <div className="space-y-6">
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden relative">
            {/* Top gradient banner */}
            <div className="h-28 bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 relative">
              <div className="absolute inset-0 opacity-20"
                style={{ backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
            </div>

            <div className="px-8 pb-8 -mt-12 flex flex-col items-center text-center">
              {/* Avatar */}
              <div className="relative mb-4">
                <div className="h-24 w-24 rounded-[1.5rem] bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-2xl font-black shadow-xl shadow-indigo-200 border-4 border-white">
                  {initials}
                </div>
                <button className="absolute -bottom-1 -right-1 h-8 w-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-md hover:bg-slate-50 transition-colors">
                  <Camera className="h-3.5 w-3.5 text-slate-500" />
                </button>
              </div>

              <h2 className="text-xl font-black text-slate-900 tracking-tight">{formData.name || "Admin"}</h2>
              <div className="mt-1.5 flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                  {formData.role} · Active
                </span>
              </div>

              <div className="mt-6 w-full space-y-2.5">
                {[
                  { icon: Mail,   val: formData.email   || "Not set" },
                  { icon: Phone,  val: formData.phone   || "Not set" },
                  { icon: MapPin, val: formData.address || "Not set" },
                ].map(({ icon: Icon, val }, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-slate-50 text-left">
                    <div className="h-7 w-7 rounded-xl bg-white flex items-center justify-center shadow-sm shrink-0">
                      <Icon className="h-3.5 w-3.5 text-indigo-500" />
                    </div>
                    <span className="text-[12px] font-bold text-slate-600 truncate">{val}</span>
                  </div>
                ))}
              </div>

              <div className="mt-6 w-full pt-5 border-t border-slate-100">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                  <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Platform Overview</span>
                </div>
                <p className="text-xs text-slate-400 font-semibold">You manage the entire Home Products marketplace</p>
              </div>
            </div>
          </div>

          {/* Security Badge */}
          <div className="bg-gradient-to-br from-slate-950 to-slate-800 rounded-[2rem] p-6 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10" />
            <div className="h-10 w-10 rounded-2xl bg-white/10 flex items-center justify-center mb-4">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <p className="font-black text-sm tracking-tight mb-1">Security Status</p>
            <p className="text-[11px] font-bold text-slate-400">Admin access level — All permissions granted</p>
            <div className="mt-4 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-400" />
              <span className="text-[11px] font-black text-emerald-400 uppercase tracking-widest">Verified Administrator</span>
            </div>
          </div>
        </div>

        {/* Right — Info + Stats */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4">
            {quickStats.map((s, i) => (
              <div key={i} className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-100 hover:-translate-y-1 transition-all duration-300">
                <div className={cn("h-11 w-11 rounded-2xl flex items-center justify-center mb-4 shadow-sm", s.bg, s.color)}>
                  <s.icon size={20} />
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{s.label}</p>
                <p className="text-2xl font-black text-slate-950 tracking-tight">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Personal Info Form */}
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Personal Information</h3>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-1">
                  {isEditing ? "Editing your profile — make your changes below" : "Your account details"}
                </p>
              </div>
              {!isEditing ? (
                <button
                  onClick={handleEdit}
                  className="h-11 px-6 rounded-2xl bg-indigo-50 text-indigo-700 font-black text-[11px] uppercase tracking-widest hover:bg-indigo-100 transition-colors flex items-center gap-2"
                >
                  <Edit2 size={14} /> Edit Profile
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCancel}
                    disabled={loading}
                    className="h-11 px-5 rounded-2xl bg-slate-100 text-slate-600 font-black text-[11px] uppercase tracking-widest hover:bg-slate-200 transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    <X size={14} /> Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={loading}
                    className="h-11 px-6 rounded-2xl bg-slate-950 text-white font-black text-[11px] uppercase tracking-widest hover:bg-slate-800 transition-colors flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-slate-200"
                  >
                    <Save size={14} /> {loading ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {fields.map(f => (
                <div key={f.key} className={cn("flex flex-col gap-2", f.full && "sm:col-span-2")}>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <f.icon className="h-3 w-3" /> {f.label}
                  </label>
                  {isEditing && f.editable ? (
                    <input
                      name={f.key}
                      value={formData[f.key]}
                      onChange={handleChange}
                      className="h-12 px-4 rounded-2xl border border-slate-200 bg-slate-50 font-bold text-sm text-slate-900 focus:outline-none focus:border-indigo-400 focus:bg-white transition-all"
                    />
                  ) : (
                    <div className={cn(
                      "h-12 px-4 rounded-2xl flex items-center font-bold text-sm",
                      f.editable ? "bg-slate-50 text-slate-700 border border-slate-100" : "bg-indigo-50 text-indigo-700 border border-indigo-100"
                    )}>
                      {formData[f.key] || <span className="text-slate-400 italic">Not set</span>}
                      {!f.editable && (
                        <div className="ml-auto">
                          <div className="h-5 px-2 rounded-lg bg-indigo-100 text-indigo-600 text-[9px] font-black uppercase tracking-widest flex items-center">
                            Locked
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Activity Summary */}
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Today's Activity</h3>
              <div className="h-10 w-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400">
                <BarChart2 size={18} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "New Orders Today",    value: stats?.today_orders        ?? "—", icon: ShoppingCart, color: "text-blue-600",    bg: "bg-blue-50" },
                { label: "Revenue Today",        value: stats ? `₹${Number(stats.today_revenue || 0).toLocaleString("en-IN")}` : "—", icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
                { label: "New Products Today",  value: stats?.today_new_products  ?? "—", icon: Package,      color: "text-amber-600",   bg: "bg-amber-50" },
                { label: "New Customers Today", value: stats?.today_new_customers ?? "—", icon: Users,        color: "text-violet-600",  bg: "bg-violet-50" },
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-[1.5rem] bg-slate-50/60 hover:bg-white hover:shadow-lg border border-transparent hover:border-slate-100 transition-all">
                  <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm", s.bg, s.color)}>
                    <s.icon size={17} />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{s.label}</p>
                    <p className="text-lg font-black text-slate-950 tracking-tight">{s.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
