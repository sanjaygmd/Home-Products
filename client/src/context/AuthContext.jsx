import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Sync with localStorage on load
    const auth = JSON.parse(localStorage.getItem("auth"));
    const seller = JSON.parse(localStorage.getItem("seller"));
    if (auth) {
      // If auth exists, it's either customer or admin
      const role = auth.role || 'customer';
      setCurrentUser({ ...auth, role });
    } else if (seller) {
      setCurrentUser({ ...seller, role: 'seller' });
    }
    setLoading(false);
  }, []);

  const loginUser = (user) => {
    localStorage.removeItem("seller"); // Ensure no conflict
    const role = user.role || 'customer';
    const { token, ...userWithoutToken } = user;
    const formattedUser = { ...userWithoutToken, role };
    localStorage.setItem("auth", JSON.stringify(formattedUser));
    setCurrentUser(formattedUser);
  };

  const loginSeller = (sellerData) => {
    localStorage.removeItem("auth"); // Ensure no conflict
    const { token, ...sellerWithoutToken } = sellerData;
    const formattedSeller = { ...sellerWithoutToken, role: 'seller' };
    localStorage.setItem("seller", JSON.stringify(formattedSeller));
    setCurrentUser(formattedSeller);
  };

  const logoutUser = () => {
    localStorage.removeItem("auth");
    localStorage.removeItem("seller");
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
