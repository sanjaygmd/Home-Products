import { useState, useEffect } from "react";
import {
  Bell, Shield, Store, Lock, Eye, EyeOff,
  ShoppingBag, Check, ChevronRight, RotateCcw
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext.jsx";
import { useToast } from "../../../hooks/use-toast";
import { cn } from "../../../lib/utils";
import { api } from "../../../services/api";

function Toggle({ value, onChange }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={cn(
        "relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200",
        value ? "bg-indigo-600" : "bg-slate-200"
      )}
    >
      <span className={cn(
        "inline-block h-6 w-6 rounded-full bg-white shadow-md transition-transform duration-200",
        value ? "translate-x-5" : "translate-x-0"
      )} />
    </button>
  );
}

const SECTIONS = [
  {
    id: "notifications",
    icon: Bell,
    label: "Notifications",
    desc: "Control which alerts you receive",
    color: "text-blue-600", bg: "bg-blue-50",
    items: [
      { key: "new_orders", label: "New Order Alerts", desc: "Get notified for every new order placed", default: true },
      { key: "low_stock", label: "Low Stock Warnings", desc: "Alert when product stock drops below threshold", default: true },
      { key: "new_sellers", label: "Seller Registration", desc: "Notifications for new seller sign-ups", default: true },
      { key: "returns", label: "Return & Refund Requests", desc: "Get notified of customer return requests", default: false },
      { key: "daily_summary", label: "Daily Summary Email", desc: "Receive a daily digest of platform activity", default: false },
    ],
  },
  {
    id: "security",
    icon: Shield,
    label: "Security",
    desc: "Protect your admin account",
    color: "text-emerald-600", bg: "bg-emerald-50",
    items: [
      { key: "two_factor", label: "Two-Factor Authentication", desc: "Extra login verification step", default: true },
      { key: "login_alerts", label: "Login Activity Alerts", desc: "Get notified of new login attempts", default: true },
      { key: "session_timeout", label: "Auto Session Timeout", desc: "Auto-logout after 30 minutes of inactivity", default: false },
    ],
  },
  {
    id: "marketplace",
    icon: Store,
    label: "Marketplace",
    desc: "Platform-level preferences",
    color: "text-amber-600", bg: "bg-amber-50",
    items: [
      { key: "auto_approve", label: "Auto-Approve Verified Sellers", desc: "Skip manual approval for GST-verified sellers", default: false },
      { key: "cod_enabled", label: "Enable Cash on Delivery", desc: "Allow cash on delivery as a payment option", default: true },
      { key: "auto_commission", label: "Auto Commission Deduction", desc: "Deduct commission from payouts automatically", default: true },
      { key: "review_display", label: "Show Product Reviews", desc: "Display customer reviews on product pages", default: true },
    ],
  },
  {
    id: "orders",
    icon: ShoppingBag,
    label: "Order Settings",
    desc: "Configure order processing behaviour",
    color: "text-violet-600", bg: "bg-violet-50",
    items: [
      { key: "auto_confirm", label: "Auto-Confirm Orders", desc: "Automatically confirm orders after payment success", default: false },
      { key: "cancel_window", label: "Allow Cancellation Window", desc: "Let customers cancel within 1 hour of placing", default: true },
    ],
  },
];

const buildDefaults = () => {
  const state = {};
  SECTIONS.forEach(s => s.items.forEach(item => { state[item.key] = item.default; }));
  return state;
};

export default function SettingsPage() {
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const [toggles, setToggles] = useState(buildDefaults());
  const [activeTab, setActiveTab] = useState("notifications");
  const [savingToggles, setSavingToggles] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser?.id) {
        fetchSettings();
    }
  }, [currentUser]);

  const fetchSettings = async () => {
    try {
        const resp = await api.get(`/user/admin/settings/${currentUser.id}`);
        if (resp.data.success) {
            setToggles(prev => ({ ...prev, ...resp.data.data }));
        }
    } catch (err) {
        console.error("Failed to load settings:", err);
    } finally {
        setLoading(false);
    }
  };

  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false });
  const [pwLoading, setPwLoading] = useState(false);

  const handleToggle = (key, val) => setToggles(prev => ({ ...prev, [key]: val }));

  const handleSavePreferences = async () => {
    setSavingToggles(true);
    try {
        const resp = await api.put(`/user/admin/settings/${currentUser.id}`, { settings: toggles });
        if (resp.data.success) {
            toast({ title: "Preferences Saved", description: "Your settings have been updated and persisted." });
        }
    } catch (err) {
        toast({ variant: "destructive", title: "Save Failed", description: "Could not persist your settings." });
    } finally {
        setSavingToggles(false);
    }
  };

  const handleResetPreferences = () => {
    setToggles(buildDefaults());
    toast({ title: "Reset Complete", description: "Settings restored to defaults locally. Click save to persist." });
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!passwords.current || !passwords.next || !passwords.confirm) {
      return toast({ variant: "destructive", title: "Missing Fields", description: "Please fill all password fields." });
    }
    if (passwords.next !== passwords.confirm) {
      return toast({ variant: "destructive", title: "Password Mismatch", description: "New password and confirmation do not match." });
    }
    if (passwords.next.length < 6) {
      return toast({ variant: "destructive", title: "Too Short", description: "Password must be at least 6 characters." });
    }

    setPwLoading(true);
    try {
      const resp = await api.put("/user/admin/update-password-self", { currentPassword: passwords.current, newPassword: passwords.next });
      const data = resp.data;
      if (data.success) {
        toast({ title: "Password Updated", description: "Your password has been changed successfully." });
        setPasswords({ current: "", next: "", confirm: "" });
      } else {
        toast({ variant: "destructive", title: "Failed", description: data.message });
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: err.response?.data?.message || "Could not update password." });
    } finally {
      setPwLoading(false);
    }
  };

  const activeSection = SECTIONS.find(s => s.id === activeTab);

  return (
    <div className="space-y-8 pb-20 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-2 w-10 bg-indigo-600 rounded-full" />
        <div>
          <span className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.3em]">Configuration</span>
          <h1 className="text-4xl font-black text-slate-950 tracking-tight leading-none mt-1">Settings</h1>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Sidebar nav */}
        <div className="space-y-2">
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveTab(s.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left transition-all",
                activeTab === s.id
                  ? "bg-white shadow-xl shadow-slate-100 border border-slate-100"
                  : "hover:bg-white/60 hover:border-slate-100"
              )}
            >
              <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center shrink-0", s.bg, s.color)}>
                <s.icon size={16} />
              </div>
              <div className="flex-1 text-left">
                <p className={cn("text-[13px] font-black tracking-tight", activeTab === s.id ? "text-slate-900" : "text-slate-600")}>{s.label}</p>
                <p className="text-[10px] font-bold text-slate-400 mt-0.5">{s.desc}</p>
              </div>
              {activeTab === s.id && <ChevronRight size={14} className="text-indigo-400 shrink-0" />}
            </button>
          ))}

          {/* Password tab */}
          <button
            onClick={() => setActiveTab("password")}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left transition-all",
                activeTab === "password"
                  ? "bg-white shadow-xl shadow-slate-100 border border-slate-100"
                  : "hover:bg-white/60"
              )}
            >
              <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 bg-rose-50 text-rose-600">
                <Lock size={16} />
              </div>
              <div className="flex-1">
                <p className={cn("text-[13px] font-black tracking-tight", activeTab === "password" ? "text-slate-900" : "text-slate-600")}>Change Password</p>
                <p className="text-[10px] font-bold text-slate-400 mt-0.5">Update login credentials</p>
              </div>
              {activeTab === "password" && <ChevronRight size={14} className="text-indigo-400 shrink-0" />}
            </button>
        </div>

        {/* Right panel */}
        <div className="lg:col-span-3">
          {activeTab !== "password" && activeSection ? (
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8">
              {/* Section header */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center shadow-sm", activeSection.bg, activeSection.color)}>
                    <activeSection.icon size={22} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">{activeSection.label}</h2>
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{activeSection.desc}</p>
                  </div>
                </div>
              </div>

              {/* Toggle list */}
              <div className="space-y-3">
                {activeSection.items.map((item, i) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between p-5 rounded-[1.5rem] bg-slate-50/60 hover:bg-white hover:shadow-lg hover:border-slate-100 border border-transparent transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "h-8 w-8 rounded-xl flex items-center justify-center text-[12px] font-black shadow-sm",
                        toggles[item.key] ? "bg-indigo-100 text-indigo-600" : "bg-slate-200 text-slate-400"
                      )}>
                        {i + 1}
                      </div>
                      <div>
                        <p className="font-black text-[14px] text-slate-900 tracking-tight">{item.label}</p>
                        <p className="text-[11px] font-bold text-slate-400 mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                    <Toggle value={toggles[item.key]} onChange={val => handleToggle(item.key, val)} />
                  </div>
                ))}
              </div>

              {/* Save / Reset buttons */}
              <div className="flex items-center gap-3 mt-8 pt-6 border-t border-slate-100">
                <button
                  onClick={handleSavePreferences}
                  disabled={savingToggles}
                  className="h-12 px-8 rounded-2xl bg-slate-950 text-white font-black text-[11px] uppercase tracking-widest hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-lg shadow-slate-200 disabled:opacity-60"
                >
                  <Check size={14} /> {savingToggles ? "Saving..." : "Save Preferences"}
                </button>
                <button
                  onClick={handleResetPreferences}
                  className="h-12 px-6 rounded-2xl bg-slate-100 text-slate-600 font-black text-[11px] uppercase tracking-widest hover:bg-slate-200 transition-colors flex items-center gap-2"
                >
                  <RotateCcw size={13} /> Reset to Defaults
                </button>
              </div>
            </div>
          ) : null}

          {/* Password change panel */}
          {activeTab === "password" && (
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8">
              <div className="flex items-center gap-4 mb-8">
                <div className="h-12 w-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shadow-sm">
                  <Lock size={22} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Change Password</h2>
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Update your admin login credentials</p>
                </div>
              </div>

              {/* Security info card */}
              <div className="mb-8 p-5 rounded-[1.5rem] bg-amber-50 border border-amber-100 flex items-start gap-3">
                <Shield className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[13px] font-black text-amber-800">Password Security Tips</p>
                  <p className="text-[11px] font-bold text-amber-600 mt-0.5">
                    Use at least 8 characters, mix uppercase, lowercase, numbers and symbols. Never reuse old passwords.
                  </p>
                </div>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-5">
                {[
                  { field: "current", label: "Current Password", placeholder: "Enter your current password" },
                  { field: "next", label: "New Password", placeholder: "Enter a new password" },
                  { field: "confirm", label: "Confirm New Password", placeholder: "Re-enter new password" },
                ].map(({ field, label, placeholder }) => (
                  <div key={field}>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2">{label}</label>
                    <div className="relative">
                      <input
                        type={showPw[field] ? "text" : "password"}
                        placeholder={placeholder}
                        value={passwords[field]}
                        onChange={e => setPasswords(prev => ({ ...prev, [field]: e.target.value }))}
                        className="w-full h-13 px-5 pr-12 rounded-2xl border border-slate-200 bg-slate-50 font-bold text-sm text-slate-900 focus:outline-none focus:border-indigo-400 focus:bg-white transition-all h-12"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw(prev => ({ ...prev, [field]: !prev[field] }))}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
                      >
                        {showPw[field] ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {field === "next" && passwords.next && passwords.next.length < 6 && (
                      <p className="text-[11px] font-bold text-rose-500 mt-1.5">Minimum 6 characters required</p>
                    )}
                    {field === "confirm" && passwords.confirm && passwords.next !== passwords.confirm && (
                      <p className="text-[11px] font-bold text-rose-500 mt-1.5">Passwords do not match</p>
                    )}
                  </div>
                ))}

                <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="submit"
                    disabled={pwLoading}
                    className="h-12 px-8 rounded-2xl bg-slate-950 text-white font-black text-[11px] uppercase tracking-widest hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-lg shadow-slate-200 disabled:opacity-60"
                  >
                    <Lock size={14} /> {pwLoading ? "Updating..." : "Update Password"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPasswords({ current: "", next: "", confirm: "" })}
                    className="h-12 px-6 rounded-2xl bg-slate-100 text-slate-600 font-black text-[11px] uppercase tracking-widest hover:bg-slate-200 transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
