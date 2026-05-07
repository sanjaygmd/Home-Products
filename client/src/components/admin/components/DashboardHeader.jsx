import { useState, useEffect, useRef } from "react";
import { Bell, X, Mail, Phone, LogOut, Menu, Home, LayoutDashboard, Package, ShoppingCart, Users, CreditCard, RotateCcw, FileBarChart, Settings, Store, Ticket, Shield, MessageSquare } from "lucide-react";
import { useNavigate, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext.jsx";
import { cn } from "../../../lib/utils";
import { api } from "../../../services/api";

export function DashboardHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, logoutUser } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);

  const notifRef = useRef(null);
  const profileRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfile(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (currentUser?.id) {
      fetchNotifications();
    }
  }, [currentUser]);

  const fetchNotifications = async () => {
    setLoadingNotifs(true);
    try {
      const resp = await api.get(`/user/admin/notifications/${currentUser.id}`);
      if (resp.data.success) {
        setNotifications(resp.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      setLoadingNotifs(false);
    }
  };

  const handleMarkAsRead = async (notifId) => {
    try {
      const resp = await api.patch(`/notification/read/${notifId}`);
      if (resp.data.success) {
        setNotifications(prev => prev.map(n => n.notification_id === notifId ? { ...n, is_read: true } : n));
      }
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  };

  const initials = (currentUser?.name || "AD").split(" ").map(n => n[0]).join("").toUpperCase();

  const navItems = [
    { title: "Dashboard", path: "/admin", icon: LayoutDashboard },
    { title: "Products", path: "/admin/products", icon: Package },
    { title: "Orders", path: "/admin/orders", icon: ShoppingCart },
    { title: "Returns", path: "/admin/returns", icon: RotateCcw },
    { title: "Customers", path: "/admin/customers", icon: Users },
    { title: "Coupons", path: "/admin/coupons", icon: Ticket },
    { title: "Reviews", path: "/admin/reviews", icon: MessageSquare },
    { title: "Logs", path: "/admin/logs", icon: Shield },
    { title: "Payments", path: "/admin/payments", icon: CreditCard },
    { title: "Reports", path: "/admin/reports", icon: FileBarChart },
  ];

  const handleLogout = () => {
    logoutUser();
    navigate("/admin/login");
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20">
          <div className="flex items-center gap-2 sm:gap-8">
            {/* Logo - Mobile/Tablet only */}
            <div
              className="flex lg:hidden items-center gap-3 cursor-pointer group"
              onClick={() => navigate("/admin")}
            >
              <div className="h-10 w-10 rounded-xl bg-slate-950 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                <Store size={20} />
              </div>
              <div className="hidden sm:block">
                <span className="block text-sm font-black text-slate-950 tracking-tight leading-none">Home Products</span>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Admin Panel</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-4">
            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate("/")}
                className="p-3 hover:bg-slate-50 rounded-xl transition-all text-slate-500 hover:text-slate-950"
                title="Back to Store"
              >
                <Home size={18} />
              </button>

              {/* Notification Toggle */}
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => { setShowNotifications(!showNotifications); setShowProfile(false); }}
                  className="p-3 hover:bg-slate-50 rounded-xl transition-all text-slate-500 hover:text-slate-950 relative"
                >
                  <Bell size={18} />
                  {notifications.some(n => !n.is_read) && (
                    <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-rose-500 border-2 border-white" />
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-4 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-3xl border border-slate-100 shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                      <h3 className="font-black text-xs uppercase tracking-widest text-slate-900">Notifications</h3>
                      <button onClick={() => setShowNotifications(false)} className="p-1 hover:bg-white rounded-lg transition-colors"><X size={14} /></button>
                    </div>
                    <div className="max-h-[400px] overflow-y-auto p-2">
                      {loadingNotifs ? (
                        <div className="p-8 text-center">
                          <div className="h-6 w-6 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin mx-auto mb-2" />
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loading...</p>
                        </div>
                      ) : notifications.length === 0 ? (
                        <div className="p-12 text-center">
                          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest italic">No notifications</p>
                        </div>
                      ) : (
                        notifications.map((notif) => (
                          <div
                            key={notif.notification_id}
                            onClick={() => !notif.is_read && handleMarkAsRead(notif.notification_id)}
                            className={cn(
                              "p-4 rounded-2xl hover:bg-slate-50 transition-all cursor-pointer group",
                              !notif.is_read ? "bg-indigo-50/30" : "opacity-70"
                            )}
                          >
                            <div className="flex gap-4">
                              <div className={cn(
                                "h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm",
                                notif.type === "success" || notif.type === "new_order" ? "bg-emerald-50 text-emerald-600" : notif.type === "warning" ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"
                              )}>
                                {notif.type === "success" || notif.type === "new_order" ? "✓" : notif.type === "warning" ? "!" : "i"}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-black text-[13px] text-slate-900 leading-tight">
                                  {notif.type === 'new_order' ? 'New Order Received' : notif.type === 'order_placed' ? 'Order Confirmed' : notif.type === 'ADMIN_PASSWORD_RESET_REQUEST' ? 'Password Reset Request' : 'System Update'}
                                </p>
                                <p className="text-[11px] text-slate-500 font-medium mt-1 leading-relaxed">{notif.message}</p>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-2">{new Date(notif.created_at).toLocaleString()}</p>
                              </div>
                              {!notif.is_read && <div className="h-2 w-2 rounded-full bg-indigo-600 self-center" />}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Profile Toggle */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => { setShowProfile(!showProfile); setShowNotifications(false); }}
                className="h-10 w-10 rounded-xl bg-slate-950 flex items-center justify-center text-white text-[11px] font-black hover:scale-105 transition-all shadow-lg"
              >
                {initials}
              </button>

              {showProfile && (
                <div className="absolute right-0 mt-4 w-72 max-w-[calc(100vw-2rem)] bg-white rounded-3xl border border-slate-100 shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="p-8">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="h-14 w-14 rounded-2xl bg-slate-950 flex items-center justify-center text-white font-black text-lg shadow-xl">{initials}</div>
                      <div>
                        <p className="font-black text-[15px] text-slate-950 tracking-tight">{currentUser?.name || "Admin"}</p>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{currentUser?.role || "Administrator"}</p>
                      </div>
                    </div>
                    <div className="space-y-3 pt-6 border-t border-slate-50">
                      <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50/50">
                        <Mail size={14} className="text-slate-400" />
                        <span className="text-[11px] font-bold text-slate-600 truncate">{currentUser?.email}</span>
                      </div>
                      <button
                        onClick={() => navigate('/admin/settings')}
                        className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 transition-all group"
                      >
                        <Settings size={14} className="text-slate-400 group-hover:text-slate-950" />
                        <span className="text-[11px] font-black uppercase tracking-widest text-slate-600 group-hover:text-slate-950">Settings</span>
                      </button>
                    </div>
                    <div className="pt-6 mt-6 border-t border-slate-50">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-3 h-12 rounded-2xl bg-rose-50 text-rose-600 text-[11px] font-black uppercase tracking-[0.2em] hover:bg-rose-600 hover:text-white transition-all active:scale-95"
                      >
                        <LogOut size={16} /> Logout
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-3 hover:bg-slate-50 rounded-xl transition-all text-slate-950"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-t border-slate-50 p-4 space-y-2 animate-in slide-in-from-top-full duration-300">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/admin"}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) => cn(
                "flex items-center gap-4 p-4 rounded-2xl text-[12px] font-black uppercase tracking-widest transition-all",
                isActive
                  ? "bg-slate-950 text-white"
                  : "text-slate-500 hover:bg-slate-50"
              )}
            >
              <item.icon size={18} />
              {item.title}
            </NavLink>
          ))}
        </div>
      )}
    </nav>
  );
}
