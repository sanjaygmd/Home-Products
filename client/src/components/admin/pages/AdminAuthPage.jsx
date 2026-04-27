import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Shield, Mail, Lock, User, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../../../context/AuthContext.jsx";
import { useToast } from "../../../hooks/use-toast";

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
    position: relative;
    transition: all 0.5s ease-in-out;
  }

  .admin-right-form {
    width: 600px;
    padding: 4rem;
    display: flex;
    flex-direction: column;
    justify-content: center;
    background: white;
    overflow-y: auto;
    transition: all 0.5s ease-in-out;
  }

  @media (max-width: 1024px) {
    .admin-left-hero { display: none; }
    .admin-right-form { width: 100%; padding: 2rem; }
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
    border-radius: 12px;
    font-size: 1rem;
    transition: all 0.2s;
    background: #f8fafc;
  }

  .admin-input-box input:focus {
    border-color: ${G.primary};
    box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1);
    outline: none;
    background: white;
  }

  .admin-submit-btn {
    width: 100%;
    padding: 1rem;
    background: ${G.primary};
    color: white;
    border: none;
    border-radius: 12px;
    font-size: 1rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2), 0 2px 4px -1px rgba(37, 99, 235, 0.1);
  }

  .admin-submit-btn:hover {
    background: #1e40af;
    transform: translateY(-2px);
    box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.3);
  }

  .admin-submit-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    transform: none;
  }

  .toggle-auth-btn {
    color: ${G.primary};
    font-weight: 700;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    margin-left: 0.5rem;
    text-decoration: underline;
    text-underline-offset: 4px;
  }

  .eye-toggle {
    position: absolute;
    right: 1rem;
    left: auto !important;
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    color: #94a3b8;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .eye-toggle:hover {
    color: ${G.primary};
  }

  .animate-fade {
    animation: fadeIn 0.5s ease-out;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

export default function AdminAuthPage() {
  const navigate = useNavigate();
  const { loginUser } = useAuth();
  const { toast } = useToast();
  
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    masterKey: ""
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const endpoint = isLogin ? "/user/admin/login" : "/user/admin/register";
    const successMsg = isLogin ? "Welcome back, Admin!" : "Admin setup successful!";

    try {
      const resp = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      const resData = await resp.json();
      
      if (resp.ok && resData.success) {
        localStorage.setItem("token", resData.data.token);
        loginUser(resData.data);
        toast({ title: successMsg, description: isLogin ? "Accessing your dashboard..." : "Your administrative account is ready." });
        navigate("/admin");
      } else {
        toast({ variant: "destructive", title: "Authentication Failed", description: resData.message || "Invalid credentials." });
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Network Error", description: "Could not connect to authentication server." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-auth-container">
      <style>{css}</style>
      
      <div className="admin-left-hero">
        <Link to="/" style={{ color: "white", textDecoration: "none", display: "flex", alignItems: "center", gap: "8px", position: "absolute", top: "2rem", left: "2rem", zIndex: 10, fontSize: "0.9rem", fontWeight: 600 }}>
          <ArrowLeft size={18} /> Back to Shop
        </Link>
        <div className="animate-fade">
          <Shield size={60} style={{ marginBottom: "2rem", color: "white" }} />
          <h1 style={{ fontSize: "3.5rem", fontStyle: "italic", fontWeight: 900, marginBottom: "1rem", lineHeight: 1.1, letterSpacing: "-2px" }}>
            Home Products <br/>Admin Portal
          </h1>
          <p style={{ fontSize: "1.1rem", opacity: 0.9, maxWidth: "500px", lineHeight: 1.6, fontWeight: 400 }}>
            Dedicated administrative suite for overseeing global logistics, seller performance, and premium inventory management.
          </p>
        </div>
      </div>

      <div className="admin-right-form">
        <div style={{ maxWidth: "420px", margin: "0 auto", width: "100%" }} className="animate-fade">
          <div style={{ marginBottom: "2.5rem" }}>
            <h2 style={{ fontSize: "2.5rem", fontWeight: 900, color: G.text, letterSpacing: "-1.5px", marginBottom: "0.5rem" }}>
              {isLogin ? "Sign In" : "Initialize Admin"}
            </h2>
            <p style={{ color: G.muted, fontSize: "1rem" }}>
              {isLogin ? "Enter your administrative credentials." : "Setup a new administrative authority."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="admin-field-group">
                <label style={{ fontSize: "0.75rem", fontWeight: 800, color: G.muted, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "0.5rem", display: "block" }}>Full Name</label>
                <div className="admin-input-box">
                  <User size={18} />
                  <input type="text" placeholder="Admin Name" required 
                    value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
              </div>
            )}

            <div className="admin-field-group">
              <label style={{ fontSize: "0.75rem", fontWeight: 800, color: G.muted, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "0.5rem", display: "block" }}>Official Email</label>
              <div className="admin-input-box">
                <Mail size={18} />
                <input type="email" placeholder="admin@homeproducts.com" required 
                  value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
            </div>

            <div className="admin-field-group">
              <label style={{ fontSize: "0.75rem", fontWeight: 800, color: G.muted, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "0.5rem", display: "block" }}>Password</label>
              <div className="admin-input-box">
                <Lock size={18} />
                <input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="••••••••" 
                  required 
                  value={formData.password} 
                  onChange={e => setFormData({...formData, password: e.target.value})} 
                />
                <button 
                  type="button" 
                  className="eye-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {!isLogin && (
              <div className="admin-field-group">
                <label style={{ fontSize: "0.75rem", fontWeight: 800, color: G.muted, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "0.5rem", display: "block" }}>Master Security Key</label>
                <div className="admin-input-box">
                  <Shield size={18} />
                  <input type="password" placeholder="Required for authority setup" required 
                    value={formData.masterKey} onChange={e => setFormData({...formData, masterKey: e.target.value})} />
                </div>
              </div>
            )}

            <button type="submit" className="admin-submit-btn" disabled={loading} style={{ marginTop: "1rem" }}>
              {loading ? "Authenticating..." : (isLogin ? "Secure Login" : "Initialize Account")}
            </button>
          </form>

          <div style={{ marginTop: "2rem", textAlign: "center", fontSize: "0.95rem" }}>
            <span style={{ color: G.muted }}>
              {isLogin ? "New authority?" : "Already have an account?"}
            </span>
            <button 
              className="toggle-auth-btn"
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin ? "Create Setup" : "Sign In"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
