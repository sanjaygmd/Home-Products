import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Package, ShoppingCart, Users,
  Ticket, Shield, CreditCard, BarChart3, Store,
  MessageSquare, Landmark, ShieldCheck, RotateCcw
} from "lucide-react";
import { cn } from "../../../lib/utils";
import { useAuth } from "../../../context/AuthContext";

const navItems = [
  { title: "Dashboard", path: "/admin", icon: LayoutDashboard },
  { title: "Products", path: "/admin/products", icon: Package },
  { title: "Orders", path: "/admin/orders", icon: ShoppingCart },
  { title: "Returns", path: "/admin/returns", icon: RotateCcw },
  { title: "Customers", path: "/admin/customers", icon: Users },
  { title: "Sellers", path: "/admin/sellers", icon: Store },
  { title: "Coupons", path: "/admin/coupons", icon: Ticket },
  { title: "Finance", path: "/admin/finance", icon: Landmark },
  { title: "Analytics", path: "/admin/analytics", icon: BarChart3 },
  { title: "Logs", path: "/admin/logs", icon: Shield },
];

const superAdminItems = [
  { title: "Admins", path: "/admin/administrators", icon: ShieldCheck },
];

export function AdminSidebar() {
  const location = useLocation();
  const { currentUser } = useAuth();

  const menuItems = currentUser?.role === 'super_admin' 
    ? [...navItems, ...superAdminItems] 
    : navItems;

  return (
    <aside className="hidden lg:flex flex-col bg-white border-r border-slate-100 sticky top-0 h-screen w-72 flex-shrink-0">
      {/* Sidebar Header / Logo */}
      <div className="h-20 flex items-center px-8 border-b border-slate-50">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-slate-950 flex items-center justify-center text-white shadow-lg flex-shrink-0">
            <Store size={20} />
          </div>
          <div>
            <span className="block text-sm font-black text-slate-950 tracking-tight leading-none">Home Products</span>
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
              {currentUser?.role === 'super_admin' ? 'Super Admin' : 'Admin Panel'}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 py-8 px-4 space-y-2">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/admin"}
            className={({ isActive }) => cn(
              "flex items-center gap-4 px-6 py-4 rounded-2xl text-[12px] font-black uppercase tracking-widest transition-all",
              isActive
                ? "bg-slate-950 text-white shadow-xl shadow-slate-200"
                : "text-slate-500 hover:text-slate-950 hover:bg-slate-50"
            )}
          >
            <item.icon size={20} className="flex-shrink-0" />
            <span>{item.title}</span>
          </NavLink>
        ))}
      </div>

      {/* Footer info or decoration if needed */}
      {/* <div className="p-8 border-t border-slate-50">
        <div className="bg-slate-50 rounded-2xl p-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Version 1.2.0 Stable</p>
        </div>
      </div> */}
    </aside>
  );
}
