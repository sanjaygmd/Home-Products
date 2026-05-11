import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Shield, Mail, Lock, User, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../../../context/AuthContext.jsx";
import { useToast } from "../../../hooks/use-toast";
import { 
  adminLogin, 
  adminRegister, 
  verifySuperAdminLogin, 
  requestAdminPasswordReset, 
  verifyAdminPasswordReset 
} from "../../../services/authService";

const G = {
  primary: "#2563EB", // Blue-600 for Admin
  bg: "#f8fafc",
  text: "#0f172a",
  muted: "#64748b",
};

// Dynamic CSS will be generated in the component body

export default function AdminAuthPage() {
  const navigate = useNavigate();
  const { loginAdmin } = useAuth();
  const { toast } = useToast();
  
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetStep, setResetStep] = useState(1);
  const [resetEmail, setResetEmail] = useState("");
  const [resetOtp, setResetOtp] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [show2FA, setShow2FA] = useState(false);
  const [loginOtp, setLoginOtp] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    masterKey: "",
    type: "admin" // admin or super_admin
  });

  const isSuper = formData.type === 'super_admin';
  const primaryColor = isSuper ? "#7c3aed" : "#2563EB";
  const primaryHover = isSuper ? "#6d28d9" : "#1e40af";
  const grad1 = isSuper ? "rgba(124, 58, 237, 0.9)" : "rgba(37, 99, 235, 0.9)";
  const grad2 = isSuper ? "rgba(76, 29, 149, 0.95)" : "rgba(30, 58, 138, 0.95)";
  const shadowHover = isSuper ? "rgba(124, 58, 237, 0.3)" : "rgba(37, 99, 235, 0.3)";
  const shadowFocus = isSuper ? "rgba(124, 58, 237, 0.1)" : "rgba(37, 99, 235, 0.1)";

  const dynamicCss = `
    .admin-auth-container {
      min-height: 100vh;
      display: flex;
      background: ${G.bg};
      font-family: 'Inter', sans-serif;
    }

    .admin-left-hero {
      flex: 1;
      background: linear-gradient(${grad1}, ${grad2}), url('https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=1200');
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
      border-color: ${primaryColor};
      box-shadow: 0 0 0 4px ${shadowFocus};
      outline: none;
      background: white;
    }

    .admin-submit-btn {
      width: 100%;
      padding: 1rem;
      background: ${primaryColor};
      color: white;
      border: none;
      border-radius: 12px;
      font-size: 1rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 4px 6px -1px ${shadowFocus}, 0 2px 4px -1px ${shadowFocus};
    }

    .admin-submit-btn:hover {
      background: ${primaryHover};
      transform: translateY(-2px);
      box-shadow: 0 10px 15px -3px ${shadowHover};
    }

    .admin-submit-btn:disabled {
      opacity: 0.7;
      cursor: not-allowed;
      transform: none;
    }

    .toggle-auth-btn {
      color: ${primaryColor};
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
      color: ${primaryColor};
    }

    .animate-fade {
      animation: fadeIn 0.5s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;

  const handleRequestReset = async (e) => {
    e.preventDefault();
    setResetLoading(true);
    
    if (resetStep === 1) {
      try {
        const resData = await requestAdminPasswordReset(resetEmail);
        if (resData.success) {
          toast({ title: "Code Sent", description: resData.message });
          setResetStep(2);
        } else {
          toast({ variant: "destructive", title: "Request Failed", description: resData.message });
        }
      } catch (err) {
        toast({ variant: "destructive", title: "Error", description: "Failed to send request." });
      } finally {
        setResetLoading(false);
      }
    } else {
      try {
        const resData = await verifyAdminPasswordReset({ email: resetEmail, otp: resetOtp, newPassword: resetNewPassword });
        if (resData.success) {
          toast({ title: "Password Reset", description: "You can now log in with your new password." });
          closeResetModal();
        } else {
          toast({ variant: "destructive", title: "Verification Failed", description: resData.message });
        }
      } catch (err) {
        toast({ variant: "destructive", title: "Error", description: "Failed to verify code." });
      } finally {
        setResetLoading(false);
      }
    }
  };

  const closeResetModal = () => {
    setShowResetModal(false);
    setResetStep(1);
    setResetEmail("");
    setResetOtp("");
    setResetNewPassword("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const successMsg = isLogin ? "Welcome back, Admin!" : "Admin setup successful!";

    try {
      const resData = isLogin ? await adminLogin(formData) : await adminRegister(formData);
      
      if (resData.success) {
        if (resData.requires2FA) {
          toast({ title: "2FA Required", description: resData.message });
          setLoginEmail(resData.email);
          setShow2FA(true);
        } else {
          loginAdmin(resData.data);
          toast({ title: successMsg, description: isLogin ? `Accessing your ${formData.type === 'super_admin' ? 'Super Admin' : 'Admin'} dashboard...` : "Your account is ready." });
          navigate("/admin");
        }
      } else {
        toast({ variant: "destructive", title: "Authentication Failed", description: resData.message || "Invalid credentials." });
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Network Error", description: "Could not connect to authentication server." });
    } finally {
      setLoading(false);
    }
  };

  const handle2FASubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const resData = await verifySuperAdminLogin({ email: loginEmail, otp: loginOtp });
      
      if (resData.success) {
        loginAdmin(resData.data);
        toast({ title: "Welcome Super Admin!", description: "Accessing elevated dashboard..." });
        setShow2FA(false);
        navigate("/admin");
      } else {
        toast({ variant: "destructive", title: "2FA Failed", description: resData.message });
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Network Error", description: "Could not connect to authentication server." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-auth-container">
      <style>{dynamicCss}</style>
      
      <div className="admin-left-hero">
        <Link to="/" style={{ color: "white", textDecoration: "none", display: "flex", alignItems: "center", gap: "8px", position: "absolute", top: "2rem", left: "2rem", zIndex: 10, fontSize: "0.9rem", fontWeight: 600 }}>
          <ArrowLeft size={18} /> Back to Shop
        </Link>
        <div className="animate-fade">
          <Shield size={60} style={{ marginBottom: "2rem", color: "white" }} />
          <h1 style={{ fontSize: "3.5rem", fontStyle: "italic", fontWeight: 900, marginBottom: "1rem", lineHeight: 1.1, letterSpacing: "-2px" }}>
            Home Products <br/>{isSuper ? "Super Admin Portal" : "Admin Portal"}
          </h1>
          <p style={{ fontSize: "1.1rem", opacity: 0.9, maxWidth: "500px", lineHeight: 1.6, fontWeight: 400 }}>
            {isSuper 
              ? "Master control system with elevated security clearance and platform-wide configuration authority." 
              : "Dedicated administrative suite for overseeing global logistics, seller performance, and premium inventory management."}
          </p>
        </div>
      </div>

      <div className="admin-right-form">
        <div style={{ maxWidth: "420px", margin: "0 auto", width: "100%" }} className="animate-fade">
          
          {show2FA ? (
            <>
              <div style={{ marginBottom: "2.5rem" }}>
                <h2 style={{ fontSize: "2.5rem", fontWeight: 900, color: G.text, letterSpacing: "-1.5px", marginBottom: "0.5rem" }}>
                  2-Step Verification
                </h2>
                <p style={{ color: G.muted, fontSize: "1rem", lineHeight: 1.6 }}>
                  A 6-digit verification code has been sent to your email. Please enter it below to complete your login.
                </p>
              </div>
              <form onSubmit={handle2FASubmit} className="space-y-4">
                <div className="admin-field-group">
                  <label style={{ fontSize: "0.75rem", fontWeight: 800, color: G.muted, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "0.5rem", display: "block" }}>Verification Code</label>
                  <div className="admin-input-box">
                    <Shield size={18} />
                    <input type="text" placeholder="123456" maxLength={6} required value={loginOtp} onChange={e => setLoginOtp(e.target.value.replace(/[^0-9]/g, ''))} style={{ letterSpacing: "4px", fontWeight: "bold", fontSize: "1.2rem" }} />
                  </div>
                </div>
                <div style={{ display: "flex", gap: "10px", marginTop: "2rem" }}>
                  <button type="button" onClick={() => setShow2FA(false)} style={{ flex: 1, padding: "1rem", borderRadius: "12px", border: "1px solid #e2e8f0", background: "white", fontWeight: 700, cursor: "pointer", color: G.muted }}>Back</button>
                  <button type="submit" disabled={loading} style={{ flex: 2, padding: "1rem", borderRadius: "12px", border: "none", background: primaryColor, color: "white", fontWeight: 700, cursor: "pointer", fontSize: "1rem" }}>
                    {loading ? "Verifying..." : "Verify & Login"}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <>
              <div style={{ marginBottom: "2.5rem" }}>
                <h2 style={{ fontSize: "2.5rem", fontWeight: 900, color: G.text, letterSpacing: "-1.5px", marginBottom: "0.5rem" }}>
                  {isLogin ? "Sign In" : "Initialize Admin"}
                </h2>
                <p style={{ color: G.muted, fontSize: "1rem" }}>
                  {isLogin ? "Enter your administrative credentials." : "Setup a new administrative authority."}
                </p>
              </div>

              <div style={{ display: "flex", gap: "10px", marginBottom: "2rem", background: "#f1f5f9", padding: "5px", borderRadius: "12px" }}>
                <button 
                  type="button"
                  onClick={() => setFormData({...formData, type: 'admin'})}
                  style={{ flex: 1, padding: "10px", borderRadius: "10px", border: "none", fontSize: "0.85rem", fontWeight: 700, cursor: "pointer", transition: "0.3s", background: formData.type === 'admin' ? "white" : "transparent", color: formData.type === 'admin' ? G.primary : G.muted, boxShadow: formData.type === 'admin' ? "0 4px 6px -1px rgba(0,0,0,0.05)" : "none" }}
                >
                  Admin
                </button>
                <button 
                  type="button"
                  onClick={() => setFormData({...formData, type: 'super_admin'})}
                  style={{ flex: 1, padding: "10px", borderRadius: "10px", border: "none", fontSize: "0.85rem", fontWeight: 700, cursor: "pointer", transition: "0.3s", background: formData.type === 'super_admin' ? "white" : "transparent", color: formData.type === 'super_admin' ? "#7c3aed" : G.muted, boxShadow: formData.type === 'super_admin' ? "0 4px 6px -1px rgba(0,0,0,0.05)" : "none" }}
                >
                  Super Admin
                </button>
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

                {isLogin && (
                  <div style={{ textAlign: "right", marginTop: "-0.5rem" }}>
                    <button 
                      type="button"
                      onClick={() => setShowResetModal(true)}
                      style={{ background: "none", border: "none", color: G.muted, fontSize: "0.85rem", cursor: "pointer", fontWeight: 600 }}
                    >
                      Forgot Password?
                    </button>
                  </div>
                )}

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

                <button type="submit" disabled={loading} style={{ width: "100%", padding: "1rem", borderRadius: "12px", border: "none", background: primaryColor, color: "white", fontSize: "1rem", fontWeight: 700, cursor: "pointer", marginTop: "1rem", transition: "all 0.2s" }}>
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
            </>
          )}
        </div>
      </div>

      {showResetModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.5)", backdropFilter: "blur(4px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }} onClick={closeResetModal}>
          <div style={{ background: "white", width: "100%", maxWidth: "400px", padding: "2.5rem", borderRadius: "24px", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)", margin: "auto" }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: "1.5rem", fontWeight: 900, marginBottom: "0.5rem", color: G.text }}>Reset Password</h3>
            <p style={{ color: G.muted, fontSize: "0.9rem", marginBottom: "2rem" }}>
              {resetStep === 1 ? "A verification code will be sent to your registered email address." : "Enter the 6-digit code sent to your email and set your new password."}
            </p>
            <form onSubmit={handleRequestReset} className="space-y-4">
              
              {resetStep === 1 && (
                <div className="admin-field-group">
                  <label style={{ fontSize: "0.75rem", fontWeight: 800, color: G.muted, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "0.5rem", display: "block" }}>Registered Email</label>
                  <div className="admin-input-box">
                    <Mail size={18} />
                    <input type="email" placeholder="Enter your email" required value={resetEmail} onChange={e => setResetEmail(e.target.value)} />
                  </div>
                </div>
              )}

              {resetStep === 2 && (
                <>
                  <div className="admin-field-group">
                    <label style={{ fontSize: "0.75rem", fontWeight: 800, color: G.muted, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "0.5rem", display: "block" }}>6-Digit Verification Code</label>
                    <div className="admin-input-box">
                      <Shield size={18} />
                      <input type="text" placeholder="123456" maxLength={6} required value={resetOtp} onChange={e => setResetOtp(e.target.value.replace(/[^0-9]/g, ''))} style={{ letterSpacing: "4px", fontWeight: "bold" }} />
                    </div>
                  </div>

                  <div className="admin-field-group">
                    <label style={{ fontSize: "0.75rem", fontWeight: 800, color: G.muted, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "0.5rem", display: "block" }}>New Password</label>
                    <div className="admin-input-box">
                      <Lock size={18} />
                      <input type="password" placeholder="••••••••" required minLength={6} value={resetNewPassword} onChange={e => setResetNewPassword(e.target.value)} />
                    </div>
                  </div>
                </>
              )}

              <div style={{ display: "flex", gap: "10px", marginTop: "1rem" }}>
                <button type="button" onClick={closeResetModal} style={{ flex: 1, padding: "0.8rem", borderRadius: "12px", border: "1px solid #e2e8f0", background: "white", fontWeight: 700, cursor: "pointer" }}>Cancel</button>
                <button type="submit" disabled={resetLoading} style={{ flex: 1.5, padding: "0.8rem", borderRadius: "12px", border: "none", background: primaryColor, color: "white", fontWeight: 700, cursor: "pointer" }}>
                  {resetLoading ? "Sending..." : (resetStep === 1 ? "Send Code" : "Update Password")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
