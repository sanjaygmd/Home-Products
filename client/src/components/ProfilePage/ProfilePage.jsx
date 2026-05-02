import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import ProfileSidebar from "./ProfileSidebar";
import ProfileOverview from "./ProfileOverview";
import ProfileOrders from "./ProfileOrders";
import ProfileCart from "./ProfileCart";
import ProfileWishlist from "./ProfileWishlist";
import ProfileSettings from "./ProfileSettings";

import { getCustomerById } from "../../services/authService";
import { useAuth } from "../../context/AuthContext.jsx";

const ProfilePage = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    if (!currentUser) {
      navigate("/customer-login");
      return;
    }

    if (currentUser.role !== 'customer') {
      navigate("/");
      return;
    }

    const fetchUser = async () => {
      try {
        const res = await getCustomerById(currentUser.id);

        if (res.success) {
          setUser(res.data);
          setStatus("success");
        } else {
          setStatus("error");
        }
      } catch {
        setStatus("error");
      }
    };

    fetchUser();
  }, [currentUser]);

  const renderTab = () => {
    switch (activeTab) {
      case "overview":
        return <ProfileOverview user={user} setActiveTab={setActiveTab} />;
      case "orders":
        return <ProfileOrders />;
      case "cart":
        return <ProfileCart />;
      case "wishlist":
        return <ProfileWishlist />;
      case "settings":
        return <ProfileSettings user={user} />;
      default:
        return null;
    }
  };

  /* ---------------- LOADING UI (MODERN SKELETON) ---------------- */
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 to-white">
        <div className="animate-pulse space-y-4 w-full max-w-md">
          <div className="h-6 bg-gray-300 rounded w-1/2 mx-auto"></div>
          <div className="h-32 bg-gray-300 rounded-2xl"></div>
          <div className="grid grid-cols-3 gap-4">
            <div className="h-20 bg-gray-300 rounded-xl"></div>
            <div className="h-20 bg-gray-300 rounded-xl"></div>
            <div className="h-20 bg-gray-300 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  /* ---------------- ERROR UI (MODERN EMPTY STATE) ---------------- */
  if (status === "error") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-center px-4">
        <div className="bg-white p-8 rounded-2xl shadow-md border max-w-md">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Profile not found
          </h2>
          <p className="text-gray-500 mb-6">
            Please login again to continue.
          </p>
          <button
            onClick={() => (window.location.href = "/customer-login")}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  /* ---------------- MAIN UI ---------------- */
  return (
    <div className="min-h-screen bg-gray-50 flex">

      {/* SIDEBAR */}
      <div className="hidden md:block">
        <ProfileSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
      </div>

      {/* CONTENT */}
      <div className="flex-1 p-4 sm:p-6 md:p-10 lg:p-12">

        {/* MOBILE HEADER */}
        <div className="md:hidden mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            My Account
          </h2>
        </div>

        {/* CARD CONTAINER */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-6 sm:p-8 min-h-[calc(100vh-100px)]">
          {renderTab()}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;