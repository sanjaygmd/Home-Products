import { createContext, useContext, useState, useEffect } from "react";
import { logoutUser as authServiceLogout } from "../services/authService.js";
import { api } from "../services/api.js";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await api.get('/user/me');
        if (response.data.success) {
          setCurrentUser(response.data.data);
        }
      } catch (err) {
        console.error("Failed to fetch user:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  const loginUser = (user) => {
    const role = user.role || 'customer';
    const { token, ...userWithoutToken } = user;
    const formattedUser = { ...userWithoutToken, role };
    setCurrentUser(formattedUser);
    localStorage.setItem('user', JSON.stringify(formattedUser));
    localStorage.setItem('auth', 'true');
    localStorage.removeItem('seller'); // Isolate contexts
  };

  const loginSeller = (sellerData) => {
    const { token, ...sellerWithoutToken } = sellerData;
    const formattedSeller = { ...sellerWithoutToken, role: 'seller' };
    setCurrentUser(formattedSeller);
    localStorage.setItem('seller', JSON.stringify(formattedSeller));
    localStorage.removeItem('user'); // Isolate contexts
    localStorage.removeItem('auth');
  };

  const loginAdmin = (adminData) => {
    const { token, ...adminWithoutToken } = adminData;
    const role = adminData.role || 'admin';
    const formattedAdmin = { ...adminWithoutToken, role };
    setCurrentUser(formattedAdmin);
    localStorage.setItem('admin', JSON.stringify(formattedAdmin));
    localStorage.removeItem('user'); // Isolate contexts
    localStorage.removeItem('seller');
    localStorage.removeItem('auth');
  };

  const logoutUser = async () => {
    try {
      const role = currentUser?.role;
      await authServiceLogout(role);
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      if (currentUser?.id) {
        localStorage.removeItem(`gmd_home_chat_history_${currentUser.id}`);
      }
      localStorage.removeItem('gmd_home_chat_history');
      setCurrentUser(null);
      // Aggressively clear all possible auth-related local storage items
      localStorage.removeItem('user');
      localStorage.removeItem('auth');
      localStorage.removeItem('seller');
      localStorage.removeItem('token');
      localStorage.removeItem('admin');
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, loginUser, loginSeller, loginAdmin, logoutUser, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
