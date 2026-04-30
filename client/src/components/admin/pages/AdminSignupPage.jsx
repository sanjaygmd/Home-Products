import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Shield, Mail, Lock, User } from "lucide-react";
import { useAuth } from "../../../context/AuthContext.jsx";
import { useToast } from "../../../hooks/use-toast";
// Removed useCart import as it's not needed for toasts here

const G = {
  primary: "#2563EB", // Blue-600 for Admin
  bg: "#f8fafc",
  text: "#0f172a",
  muted: "#64748b",
};

const css = `
  .admin-auth-container {
    min-height: 100vh;
    display: flex;
    background: ${G.bg};
    font-family: 'Inter', sans-serif;
  }

  .admin-left-hero {
    flex: 1;
    background: linear-gradient(rgba(37, 99, 235, 0.9), rgba(30, 58, 138, 0.95)), url('https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=1200');
    background-size: cover;
    background-position: center;
    padding: 4rem;
    display: flex;
    flex-direction: column;
    justify-content: center;
    color: white;
  }

  .admin-right-form {
    width: 600px;
    padding: 4rem;
    display: flex;
    flex-direction: column;
    justify-content: center;
    background: white;
    overflow-y: auto;
  }

  .admin-field-group {
    margin-bottom: 1.5rem;
  }

  .admin-input-box {
    position: relative;
    display: flex;
    align-items: center;
  }

  .admin-input-box svg {
    position: absolute;
    left: 1rem;
    color: #94a3b8;
  }

  .admin-input-box input {
    width: 100%;
    padding: 0.8rem 1rem 0.8rem 3rem;
    border: 1.5px solid #e2e8f0;
    border-radius: 10px;
    font-size: 1rem;
    transition: all 0.2s;
  }

  .admin-input-box input:focus {
    border-color: ${G.primary};
    box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1);
    outline: none;
  }

  .admin-submit-btn {
    width: 100%;
    padding: 1rem;
    background: ${G.primary};
    color: white;
    border: none;
    border-radius: 10px;
    font-size: 1.1rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;
  }

  .admin-submit-btn:hover {
    background: #4338ca;
    transform: translateY(-2px);
  }
`;

export default function AdminSignupPage() {
  const navigate = useNavigate();
  const { loginUser } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
   const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    masterKey: ""
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const payload = { ...formData, role: 'admin' };

    try {
      const resp = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/user/admin/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await resp.json();
      
      if (resp.ok) {
        loginUser(data.data);
        toast({ title: "Admin Registration Successful!", description: "Welcome to the Home Products Admin Portal." });
        navigate("/admin");
      } else {
        toast({ variant: "destructive", title: "Registration failed", description: data.message || "Please check your details." });
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Server error", description: "Failed to connect to the backend server." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-auth-container">
      <style>{css}</style>
      
      <div className="admin-left-hero">
        <Link to="/" style={{ color: "white", textDecoration: "none", display: "flex", alignItems: "center", gap: "8px", position: "absolute", top: "2rem", left: "2rem" }}>
          <ArrowLeft /> Back to Shop
        </Link>
        <Shield size={60} style={{ marginBottom: "2rem" }} />
        <h1 style={{ fontSize: "3rem", fontWeight: 800, marginBottom: "1rem" }}>Home Products <br/>Admin Portal</h1>
        <p style={{ fontSize: "1.1rem", opacity: 0.9, maxWidth: "500px", lineHeight: 1.6 }}>
          Manage your premium home collections, track orders, and oversee global logistics from our dedicated administrative suite.
        </p>
      </div>

      <div className="admin-right-form">
        <div style={{ maxWidth: "450px", margin: "0 auto", width: "100%" }}>
          <div style={{ marginBottom: "2rem" }}>
            <h2 style={{ fontSize: "2.2rem", fontWeight: 800, color: G.text, letterSpacing: "-1px" }}>
              Administrator Setup
            </h2>
            <p style={{ color: G.muted, marginTop: "0.5rem" }}>
              Register a new administrative authority for Home Products.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="admin-field-group">
              <label style={{ fontSize: "0.85rem", fontWeight: 600, color: G.muted }}>FULL NAME</label>
              <div className="admin-input-box">
                <User />
                <input type="text" placeholder="Admin Name" required 
                  value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
            </div>

            <div className="admin-field-group">
              <label style={{ fontSize: "0.85rem", fontWeight: 600, color: G.muted }}>OFFICIAL EMAIL</label>
              <div className="admin-input-box">
                <Mail />
                <input type="email" placeholder="admin@homeproducts.com" required 
                  value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
            </div>



            <div className="admin-field-group">
              <label style={{ fontSize: "0.85rem", fontWeight: 600, color: G.muted }}>SECURE PASSWORD</label>
              <div className="admin-input-box">
                <Lock />
                <input type="password" placeholder="••••••••" required 
                  value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
              </div>
            </div>

            <div className="admin-field-group">
              <label style={{ fontSize: "0.85rem", fontWeight: 600, color: G.muted }}>MASTER SECURITY KEY</label>
              <div className="admin-input-box">
                <Shield size={18} />
                <input type="password" placeholder="Authorized Personnel Only" required 
                  value={formData.masterKey} onChange={e => setFormData({...formData, masterKey: e.target.value})} />
              </div>
            </div>

            <button type="submit" className="admin-submit-btn" disabled={loading}>
              {loading ? "Authenticating..." : "Initialize Admin Account"}
            </button>
          </form>

          <div style={{ marginTop: "2rem", textAlign: "center", fontSize: "0.95rem" }}>
            <span style={{ color: G.muted }}>
              Already registered?
            </span>{" "}
            <Link to="/login" style={{ textDecoration: "none", color: G.primary, fontWeight: 700 }}>
              Sign In to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
