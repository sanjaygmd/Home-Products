import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getSellerNotifications, markNotificationRead } from "../../services/sellerService";
import { useAuth } from "../../context/AuthContext";

import NotificationsIcon from "@mui/icons-material/Notifications";
import PermIdentityIcon from "@mui/icons-material/PermIdentity";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import Badge from '@mui/material/Badge';
import CheckIcon from '@mui/icons-material/Check';

const SellerPortalNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logoutUser, currentUser } = useAuth();

  const seller = currentUser;
  const sellerId = seller?.seller_id || seller?.id;

  const [showNotif, setShowNotif] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!sellerId) return;
    const fetchNotifications = async () => {
      const res = await getSellerNotifications(sellerId);
      if (res.success) {
        setNotifications(res.data);
      }
    };
    fetchNotifications();
    
    // Optional: Poll every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [sellerId]);

  const handleMarkAsRead = async (id) => {
    const res = await markNotificationRead(id);
    if (res.success) {
      setNotifications(prev => prev.filter(n => n.notification_id !== id));
    }
  };

  const getTitle = () => {
    if (location.pathname === "/seller") return "Dashboard";
    if (location.pathname.includes("products")) return "Products";
    if (location.pathname.includes("orders")) return "Orders";
    if (location.pathname.includes("customers")) return "Customers";
    if (location.pathname.includes("analytics")) return "Analytics";
    if (location.pathname.includes("payments")) return "Payments";
    if (location.pathname.includes("messages")) return "Messages";
    if (location.pathname.includes("returns")) return "Returns";
    if (location.pathname.includes("settings")) return "Settings";
    return "Dashboard";
  };

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-3 flex justify-between items-center">

      <h1 className="text-lg font-semibold text-gray-800">
        {getTitle()}
      </h1>

      <div className="flex items-center gap-6">

        <div
          className="relative"
          onMouseEnter={() => setShowNotif(true)}
          onMouseLeave={() => setShowNotif(false)}
        >
          <div className="cursor-pointer p-2 rounded-full hover:bg-gray-100 transition">
            <Badge badgeContent={notifications.length} color="error">
              <NotificationsIcon />
            </Badge>
          </div>

          <div
            className={`absolute right-0 mt-2 w-80 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-2xl p-4 z-50 transition-all border border-gray-100
            ${showNotif ? "opacity-100 visible translate-y-0" : "opacity-0 invisible -translate-y-2"}`}
          >
            <div className="flex justify-between items-center mb-3">
              <p className="text-sm font-black text-gray-800">Notifications</p>
              <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{notifications.length} New</span>
            </div>
            
            <div className="max-h-[300px] overflow-y-auto space-y-2">
              {notifications.length > 0 ? (
                notifications.map((notif) => (
                  <div key={notif.notification_id} className="p-3 bg-gray-50/50 hover:bg-gray-50 rounded-xl transition flex justify-between items-start group">
                    <div>
                      <p className="text-xs font-semibold text-gray-800">{notif.message}</p>
                      <p className="text-[9px] text-gray-400 font-medium mt-1">{new Date(notif.created_at).toLocaleString()}</p>
                    </div>
                    <button 
                      onClick={() => handleMarkAsRead(notif.notification_id)}
                      className="text-gray-300 hover:text-green-500 transition opacity-0 group-hover:opacity-100"
                      title="Mark as read"
                    >
                      <CheckIcon fontSize="small" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-gray-400">
                  <NotificationsIcon sx={{ fontSize: 40, opacity: 0.2 }} className="mb-2" />
                  <p className="text-xs font-medium">All caught up!</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div
          className="relative"
          onMouseEnter={() => setShowProfile(true)}
          onMouseLeave={() => setShowProfile(false)}
        >
          <div className="flex items-center gap-2 cursor-pointer p-2 rounded-full hover:bg-gray-100 transition">
            <PermIdentityIcon />
            <span className="text-sm font-medium">Seller</span>
            <KeyboardArrowDownIcon />
          </div>

          <div
            className={`absolute right-0 mt-2 w-40 bg-white shadow-lg rounded-xl py-2 z-50 transition-all
            ${showProfile ? "opacity-100 visible" : "opacity-0 invisible"}`}
          >
            <button
              onClick={() => navigate("/seller/settings")}
              className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
            >
              Settings
            </button>

            <button
              onClick={() => {
                logoutUser();
                window.location.href = "/";
              }}
              className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm text-red-500 font-bold"
            >
              Logout
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default SellerPortalNav;