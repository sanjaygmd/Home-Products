import React, { useState, useEffect } from "react";
import { getSellerProfile, updateSellerProfile } from "../../services/sellerService";
import PersonIcon from '@mui/icons-material/Person';
import StorefrontIcon from '@mui/icons-material/Storefront';
import SecurityIcon from '@mui/icons-material/Security';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';

import { useAuth } from "../../context/AuthContext.jsx";

const SellerSettings = () => {
  const { currentUser } = useAuth();
  const sellerId = currentUser?.id;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState("profile");

  const [form, setForm] = useState({
    name: "",
    email: "",
    storeName: "",
    phone: "",
    address: "",
    notification: true,
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    shippingMethod: "Standard",
    payoutMethod: "UPI",
  });

  useEffect(() => {
    if (!sellerId) return;

    const fetchProfile = async () => {
      setLoading(true);
      const res = await getSellerProfile(sellerId);
      if (res.success) {
        setForm(prev => ({
          ...prev,
          name: res.data.name || "",
          email: res.data.email || "",
          storeName: res.data.store_name || "",
          phone: res.data.phone || "",
          address: res.data.address || "",
        }));
      }
      setLoading(false);
    };

    fetchProfile();
  }, [sellerId]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({
      ...form,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSubmit = async () => {
    setSaving(true);
    setMessage("");
    const res = await updateSellerProfile(sellerId, form);
    if (res.success) {
      setMessage("Settings updated successfully!");
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } else {
      setMessage("Failed to update settings.");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const tabs = [
    { id: "profile", label: "Profile", icon: <PersonIcon fontSize="small" /> },
    { id: "store", label: "Store", icon: <StorefrontIcon fontSize="small" /> },
    { id: "security", label: "Security", icon: <SecurityIcon fontSize="small" /> },
    { id: "shipping", label: "Shipping", icon: <LocalShippingIcon fontSize="small" /> },
    { id: "notifications", label: "Notifications", icon: <NotificationsActiveIcon fontSize="small" /> },
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      
      {/* Tabs Sidebar */}
      <div className="lg:w-64 flex flex-col gap-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === tab.id 
                ? "bg-blue-600 text-white shadow-md shadow-blue-200" 
                : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-100"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className="flex-1 space-y-6">
        
        {activeTab === "profile" && (
          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6 animate-fadeIn">
            <h3 className="text-lg font-bold text-gray-800">Profile Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Full Name</label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Email Address</label>
                <input
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Phone Number</label>
                <input
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === "store" && (
          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6 animate-fadeIn">
            <h3 className="text-lg font-bold text-gray-800">Store Customization</h3>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Store Name</label>
                <input
                  name="storeName"
                  value={form.storeName}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Business Address</label>
                <textarea
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  rows="3"
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition resize-none"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                <div className="p-4 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer hover:border-blue-400 transition">
                  <p className="text-xs font-bold text-gray-500 uppercase">Store Logo</p>
                  <p className="text-[10px] text-gray-400 mt-1">PNG, JPG up to 2MB</p>
                </div>
                <div className="p-4 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer hover:border-blue-400 transition">
                  <p className="text-xs font-bold text-gray-500 uppercase">Store Banner</p>
                  <p className="text-[10px] text-gray-400 mt-1">Recommended size 1200x400</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "security" && (
          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6 animate-fadeIn">
            <h3 className="text-lg font-bold text-gray-800">Account Security</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Current Password</label>
                <input
                  type="password"
                  name="currentPassword"
                  value={form.currentPassword}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">New Password</label>
                  <input
                    type="password"
                    name="newPassword"
                    value={form.newPassword}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Confirm New Password</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "shipping" && (
          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6 animate-fadeIn">
            <h3 className="text-lg font-bold text-gray-800">Shipping & Delivery</h3>
            <div className="space-y-6">
               <div className="space-y-2">
                 <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Primary Shipping Method</label>
                 <select 
                   name="shippingMethod"
                   value={form.shippingMethod}
                   onChange={handleChange}
                   className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition"
                 >
                   <option value="Standard">Standard Delivery (3-5 days)</option>
                   <option value="Express">Express Delivery (1-2 days)</option>
                   <option value="Self">Self Pickup</option>
                 </select>
               </div>
               <div className="p-4 bg-blue-50 rounded-xl">
                 <p className="text-sm text-blue-700 font-medium">Pro Tip:</p>
                 <p className="text-xs text-blue-600 mt-1">Providing express delivery can increase your sales by up to 25%.</p>
               </div>
            </div>
          </div>
        )}

        {activeTab === "notifications" && (
          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6 animate-fadeIn">
            <h3 className="text-lg font-bold text-gray-800">Notification Settings</h3>
            <div className="space-y-6">
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                <div>
                  <p className="text-sm font-bold text-gray-800">Email Notifications</p>
                  <p className="text-xs text-gray-500">Get updates on new orders and payments</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="notification"
                    checked={form.notification}
                    onChange={handleChange}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 transition"></div>
                  <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition peer-checked:translate-x-5"></div>
                </label>
              </div>
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                <div>
                  <p className="text-sm font-bold text-gray-800">SMS Alerts</p>
                  <p className="text-xs text-gray-500">Critical updates about your store status</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 transition"></div>
                  <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition peer-checked:translate-x-5"></div>
                </label>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-6">
           {message && (
             <p className={`text-sm font-bold ${message.includes("success") ? "text-green-600" : "text-red-600"}`}>
               {message}
             </p>
           )}
           <button 
             onClick={handleSubmit}
             disabled={saving}
             className="ml-auto bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-8 py-3 rounded-xl transition font-bold shadow-lg shadow-blue-100"
           >
             {saving ? "Saving Changes..." : "Save All Changes"}
           </button>
        </div>

      </div>

    </div>
  );
};

export default SellerSettings;