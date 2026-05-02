import React, { useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import HomeLogo from "../../assets/HomeLogo.png";

import KeyboardArrowDownOutlinedIcon from "@mui/icons-material/KeyboardArrowDownOutlined";
import PermIdentityIcon from "@mui/icons-material/PermIdentity";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import FavoriteBorderSharpIcon from "@mui/icons-material/FavoriteBorderSharp";
import SearchIcon from "@mui/icons-material/Search";

import { CartContext } from "../../context/CartContext/CartContext";
import { WishListContext } from "../../context/WishListContext/WishListContext";

import { animation, navMainIcon } from "../../utils/UIStyles";
import { api } from "../../services/api";
import NotificationsDropdown from "./NotificationsDropdown";
import { useAuth } from "../../context/AuthContext";

const menuCategories = [
  {
    name: "Rooms",
    items: ["Kitchen", "Living Room", "Bedroom", "Bathroom", "Office", "Dining Room"],
  },
  {
    name: "Collections",
    items: ["Lighting", "Decor", "Furniture", "Appliances"],
  }
];

const NavMain = ({ sidebarOpen, setSidebarOpen }) => {
  const { cart } = useContext(CartContext);
  const { wishList } = useContext(WishListContext);
  const { currentUser, logoutUser } = useAuth();
  const isSeller = currentUser?.role === 'seller';
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [liveResults, setLiveResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchTerm.trim().length > 1) {
        setIsSearching(true);
        try {
          const res = await api.get(`/product/search?q=${encodeURIComponent(searchTerm.trim())}`);
          if (res.data.success) {
            setLiveResults(res.data.data.slice(0, 6)); // Show top 6 results
          }
        } catch (error) {
          console.error("Live search error:", error);
        } finally {
          setIsSearching(false);
        }
      } else {
        setLiveResults([]);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const handleSearch = (e) => {
    if (e.key === "Enter" || e.type === "click") {
      if (searchTerm.trim()) {
        navigate(`/search?q=${encodeURIComponent(searchTerm.trim())}`);
      }
    }
  };

  return (
    <div
      className={`w-full bg-white flex items-center justify-between px-10 z-50 md:px-0 md:justify-around py-2 ${animation}`}
    >
      <div className="flex">
        <div
          onClick={() => navigate("/")}
          className="text-2xl text-gray-800 text-center font-semibold cursor-pointer"
        >
          <img className="w-56 h-20" src={HomeLogo} alt="Home products logo" />
        </div>

        <div
          className={`hidden relative md:flex items-center cursor-pointer px-4`}
          onMouseEnter={() => setShowDropdown(true)}
          onMouseLeave={() => setShowDropdown(false)}
        >
          <div className={`text-gray-800 hover:text-blue-500 flex items-center gap-1 ${animation}`}>
            <span className="text-sm font-black uppercase tracking-widest">Categories</span>
            <KeyboardArrowDownOutlinedIcon fontSize="small" />
          </div>

          <div
            className={`absolute top-full left-0 pt-3 w-[450px] bg-white shadow-2xl rounded-2xl p-6 z-50 grid grid-cols-2 gap-8
            ${showDropdown ? "translate-y-0 opacity-100 visible" : "translate-y-5 opacity-0 invisible"} 
            ${animation}`}
          >
            {menuCategories.map((section) => (
              <div key={section.name} className="space-y-4">
                <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] border-b border-gray-100 pb-2">
                  {section.name}
                </h4>
                <div className="flex flex-col gap-2">
                  {section.items.map((item) => (
                    <button
                      key={item}
                      onClick={() => navigate(`/category/${item.toLowerCase().replace(/\s+/g, '')}`)}
                      className="text-left text-sm font-bold text-gray-600 hover:text-blue-500 hover:translate-x-2 transition-all duration-300"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="hidden md:flex gap-0 items-center relative group">
        <input
          className={`w-full lg:min-w-sm outline-0 text-gray-800 border bg-white border-gray-200 focus:border-blue-600 py-3 pr-12 px-6 rounded-full shadow-sm hover:shadow-md transition-all duration-300`}
          type="text"
          placeholder="Search for premium home products..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleSearch}
        />
        <div
          onClick={handleSearch}
          className="absolute right-4 text-gray-400 hover:text-blue-600 cursor-pointer transition-colors"
        >
          {isSearching ? <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div> : <SearchIcon />}
        </div>

        {/* Live Search Results Dropdown */}
        {searchTerm.trim().length > 1 && (liveResults.length > 0 || isSearching) && (
          <div className="absolute top-full left-0 right-0 mt-3 bg-white shadow-2xl rounded-3xl overflow-hidden z-[100] border border-gray-100 animate-in slide-in-from-top-2 duration-300">
            <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Quick Results</span>
              {liveResults.length > 0 && (
                <button
                  onClick={() => navigate(`/search?q=${encodeURIComponent(searchTerm)}`)}
                  className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline"
                >
                  View All
                </button>
              )}
            </div>
            <div className="max-h-[400px] overflow-y-auto">
              {liveResults.map((product) => (
                <div
                  key={product.product_id}
                  onClick={() => {
                    navigate(`/product/${product.slug}`);
                    setSearchTerm("");
                    setLiveResults([]);
                  }}
                  className="p-4 hover:bg-blue-50 transition-colors flex gap-4 cursor-pointer group"
                >
                  <div className="w-14 h-14 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
                    <img
                      src={product.pi_images?.[0]?.image_url || 'https://via.placeholder.com/100'}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition duration-500"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h5 className="text-sm font-bold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                      {product.name}
                    </h5>
                    <p className="text-xs text-gray-500 font-bold mt-1">₹{Number(product.price).toLocaleString()}</p>
                  </div>
                </div>
              ))}
              {!isSearching && liveResults.length === 0 && (
                <div className="p-10 text-center">
                  <p className="text-gray-400 text-sm font-bold italic">No matches found for "{searchTerm}"</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="hidden md:flex sm:gap-2 md:gap-5 lg:gap-7 justify-center items-center  text-gray-800">
        <div
          className={`hidden relative md:flex items-center cursor-pointer`}
          onMouseEnter={() => setShowProfileDropdown(true)}
          onMouseLeave={() => setShowProfileDropdown(false)}
        >
          <div>
            {currentUser?.profile_picture_url ? (
              <img
                src={currentUser.profile_picture_url}
                alt="Profile"
                className="w-10 h-10 rounded-full object-cover border-2 border-transparent hover:border-blue-500 transition-all shadow-sm"
              />
            ) : (
              <span
                className={`relative hover:bg-blue-900 ${navMainIcon} ${animation}`}
              >
                <PermIdentityIcon />
              </span>
            )}
          </div>

          <div
            className={`absolute top-full right-0 mt-2 w-48 bg-white shadow-lg rounded-md py-2 z-50
  ${showProfileDropdown ? "translate-y-0 opacity-100 visible" : "translate-y-10 opacity-0 invisible"} 
  ${animation}`}
          >
            {currentUser ? (
              <>
                <div className="px-4 py-2 border-b border-gray-100 mb-1">
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest leading-tight">
                    {currentUser?.role === 'super_admin' ? "Super Admin Authority" : isAdmin ? "Admin Authority" : isSeller ? "Seller Account" : "Customer Account"}
                  </p>
                  <p className="text-sm font-bold text-gray-900 truncate">
                    {currentUser.name || currentUser.full_name || currentUser.business_name}
                  </p>
                </div>

                {isAdmin && (
                  <button
                    onClick={() => navigate("/admin")}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 font-bold text-blue-600"
                  >
                    Admin Dashboard
                  </button>
                )}

                {!isSeller && !isAdmin && (
                  <button
                    onClick={() => navigate("/profile")}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100"
                  >
                    My Profile
                  </button>
                )}


                <button
                  onClick={async () => {
                    await logoutUser();
                    window.location.href = "/";
                  }}
                  className="w-full text-left px-4 py-2 text-red-500 hover:bg-gray-100 font-bold"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => navigate("/customer-login")}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 transition font-bold text-gray-800"
                >
                  Customer Login
                </button>

                <div className="border-t border-gray-50 my-1"></div>

                <button
                  onClick={() => navigate("/seller/login")}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 transition text-blue-600 font-bold"
                >
                  Seller Login
                </button>

                <div className="border-t border-gray-50 my-1"></div>

                <button
                  onClick={() => navigate("/admin/login")}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 transition text-gray-400 text-[11px] font-black uppercase tracking-widest"
                >
                  Admin Portal
                </button>
              </>
            )}
          </div>
        </div>

        {currentUser && !isSeller && (
          <NotificationsDropdown customerId={currentUser.id || currentUser.customer_id} />
        )}

        <div className="relative">
          <button
            onClick={() => navigate("/cart")}
            className={`hover:bg-blue-600 ${navMainIcon} ${animation}`}
          >
            <ShoppingCartOutlinedIcon />
          </button>
          {cart?.length > 0 && (
            <p className="px-1 text-sm absolute -top-1 -right-2 bg-blue-500 text-white rounded-full">
              {cart?.length || 0}
            </p>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => navigate("/wishlist")}
            className={`hover:bg-pink-500 ${navMainIcon} ${animation}`}
          >
            <FavoriteBorderSharpIcon />
          </button>
          {wishList?.length > 0 && (
            <p className="px-1 text-sm absolute -top-1 -right-2 bg-pink-500 text-white rounded-full">
              {wishList?.length || 0}
            </p>
          )}
        </div>
      </div>

      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className={`flex flex-col gap-1.5 md:hidden cursor-pointer`}
      >
        <span
          className={`block w-7 h-0.5 bg-gray-800 ${animation} ${sidebarOpen ? "rotate-45 translate-y-2 bg-red-500" : ""}`}
        ></span>
        <span
          className={`w-7 h-0.5 bg-gray-800 ${animation} ${sidebarOpen ? "opacity-0" : "opacity-100"}`}
        ></span>
        <span
          className={`w-7 h-0.5 bg-gray-800 ${animation} ${sidebarOpen ? "-rotate-45 -translate-y-2 bg-red-500" : ""}`}
        ></span>
      </button>
    </div>
  );
};

export default NavMain;
