import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/user/me`);
        const data = await response.json();
        if (data.success) {
          setCurrentUser(data.data);
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
  };

  const loginSeller = (sellerData) => {
    const { token, ...sellerWithoutToken } = sellerData;
    const formattedSeller = { ...sellerWithoutToken, role: 'seller' };
    setCurrentUser(formattedSeller);
  };

  const logoutUser = () => {
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider value={{ currentUser, loginUser, loginSeller, logoutUser, loading }}>
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
