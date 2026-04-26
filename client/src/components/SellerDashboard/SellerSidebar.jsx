import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";

import HomeLogo from "../../assets/HomeLogo.png";

import DashboardIcon from "@mui/icons-material/Dashboard";
import InventoryIcon from "@mui/icons-material/Inventory";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import PeopleIcon from "@mui/icons-material/People";
import SettingsIcon from "@mui/icons-material/Settings";
import BarChartIcon from "@mui/icons-material/BarChart";
import PaymentsIcon from "@mui/icons-material/Payments";
import MessageIcon from "@mui/icons-material/Message";
import AddLocationIcon from '@mui/icons-material/AddLocation';
import LogoutIcon from '@mui/icons-material/Logout';

const menu = [
  { name: "Overview", path: "/seller", icon: <DashboardIcon /> },
  { name: "Products", path: "/seller/products", icon: <InventoryIcon /> },
  { name: "Orders", path: "/seller/orders", icon: <ShoppingCartIcon /> },
  { name: "Customers", path: "/seller/customers", icon: <PeopleIcon /> },
  { name: "Analytics", path: "/seller/analytics", icon: <BarChartIcon /> },
  { name: "Payments", path: "/seller/payments", icon: <PaymentsIcon /> },
  // { name: "Messages", path: "/seller/messages", icon: <MessageIcon /> },
  // { name: "Pickups", path: "/seller/pickups", icon: <AddLocationIcon /> },
  { name: "Settings", path: "/seller/settings", icon: <SettingsIcon /> },
  { name: "Logout", path: "/seller/logout", icon: <LogoutIcon /> },
];
const SellerSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logoutUser } = useAuth();

  return (
    <div className="w-64 min-h-screen bg-white border-r border-gray-200 p-4 hidden md:flex flex-col justify-between">

      <div>
        <div
          onClick={() => navigate("/seller")}
          className="flex justify-center mb-8 cursor-pointer"
        >
          <img className="w-44 h-16 object-contain" src={HomeLogo} alt="logo" />
        </div>

        <div className="flex flex-col gap-2">
          {menu.map((item) => {
            const isActive =
              item.path === "/seller"
                ? location.pathname === "/seller"
                : location.pathname.startsWith(item.path);

            return (
              <div
                key={item.name}
                onClick={() => {
                  if (item.name === "Logout") {
                    logoutUser();
                    window.location.href = "/";
                  } else {
                    navigate(item.path);
                  }
                }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all duration-200
        ${isActive
                    ? "bg-blue-600 text-white shadow-md"
                    : "text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                  }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="text-sm font-medium">{item.name}</span>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};

export default SellerSidebar;