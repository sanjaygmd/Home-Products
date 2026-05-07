import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Shield, Lock, Eye, EyeOff, Loader2, ArrowLeft } from "lucide-react";
import { api } from "../../../services/api";
import { useToast } from "../../../hooks/use-toast";

const G = {
  primary: "#2563EB", 
  bg: "#f8fafc",
  text: "#0f172a",
  muted: "#64748b",
};

const css = `
  .reset-container {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: ${G.bg};
    font-family: 'Inter', sans-serif;
    padding: 1rem;
  }

  .reset-card {
    background: white;
    width: 100%;
    max-width: 450px;
    padding: 3rem;
    border-radius: 24px;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
    border: 1px solid #f1f5f9;
  }

  .field-group {
    margin-bottom: 1.5rem;
  }

  .input-box {
    position: relative;
    display: flex;
    align-items: center;
  }

  .input-box svg.left-icon {
    position: absolute;
    left: 1rem;
    color: #94a3b8;
  }

  .input-box input {
    width: 100%;
    padding: 0.8rem 3rem 0.8rem 3rem;
    border: 1.5px solid #e2e8f0;
    border-radius: 12px;
    font-size: 1rem;
    transition: all 0.2s;
  }

  .input-box input:focus {
    border-color: ${G.primary};
    box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1);
    outline: none;
  }

  .input-box button.eye-btn {
    position: absolute;
    right: 1rem;
    background: none;
    border: none;
    color: #94a3b8;
    cursor: pointer;
    display: flex;
    align-items: center;
  }

  .submit-btn {
    width: 100%;
    padding: 1rem;
    background: ${G.primary};
    color: white;
    border: none;
    border-radius: 12px;
    font-size: 1.1rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  .submit-btn:hover {
    background: #1d4ed8;
    transform: translateY(-2px);
  }

  .submit-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    transform: none;
  }
`;

export default function AdminResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const isPasswordStrong = (pwd) => {
    return pwd.length >= 8 && 
           /[A-Z]/.test(pwd) && 
           /[a-z]/.test(pwd) && 
           /[0-9]/.test(pwd) && 
           /[^A-Za-z0-9]/.test(pwd);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      toast({ variant: "destructive", title: "Error", description: "Missing or invalid password reset token." });
      return;
    }

    if (password !== confirmPassword) {
      toast({ variant: "destructive", title: "Mismatch", description: "Passwords do not match." });
      return;
    }

    if (!isPasswordStrong(password)) {
      toast({ 
        variant: "destructive", 
        title: "Weak Password", 
        description: "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character." 
      });
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/user/admin/reset-password-via-link", { token, newPassword: password });
      if (res.data.success) {
        toast({ title: "Success", description: "Your administrative password has been updated. You can now log in." });
        navigate("/admin/login");
      } else {
        toast({ variant: "destructive", title: "Reset Failed", description: res.data.message || "Could not reset password." });
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: err.response?.data?.message || "Internal server error." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reset-container">
      <style>{css}</style>
      <div className="reset-card">
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <div style={{ display: "inline-flex", padding: "12px", borderRadius: "16px", background: "rgba(37, 99, 235, 0.05)", color: G.primary, marginBottom: "1rem" }}>
            <Shield size={32} />
          </div>
          <h2 style={{ fontSize: "1.8rem", fontWeight: 900, color: G.text, letterSpacing: "-0.5px" }}>Choose New Password</h2>
          <p style={{ color: G.muted, fontSize: "0.95rem", marginTop: "0.5rem" }}>
            Secure your administrative profile with a brand new password.
          </p>
        </div>

        {!token ? (
          <div style={{ padding: "1.5rem", borderRadius: "16px", background: "rgba(239, 68, 68, 0.05)", border: "1px solid rgba(239, 68, 68, 0.1)", textAlign: "center" }}>
            <p style={{ color: "#ef4444", fontWeight: 600 }}>Invalid or Missing Security Token</p>
            <p style={{ fontSize: "0.85rem", color: G.muted, marginTop: "0.5rem" }}>
              Please check your reset link or contact the Super Administrator to issue a new one.
            </p>
            <button onClick={() => navigate("/admin/login")} style={{ marginTop: "1rem", background: "none", border: "none", color: G.primary, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <ArrowLeft size={16} /> Back to Sign In
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="field-group">
              <label style={{ fontSize: "0.85rem", fontWeight: 600, color: G.muted }}>NEW SECURE PASSWORD</label>
              <div className="input-box">
                <Lock className="left-icon" size={18} />
                <input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="At least 8 characters" 
                  required 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                />
                <button type="button" className="eye-btn" onClick={() => setShowPassword(false)}>
                  {showPassword ? <EyeOff size={18} onClick={() => setShowPassword(false)} /> : <Eye size={18} onClick={() => setShowPassword(true)} />}
                </button>
              </div>
            </div>

            <div className="field-group">
              <label style={{ fontSize: "0.85rem", fontWeight: 600, color: G.muted }}>CONFIRM NEW PASSWORD</label>
              <div className="input-box">
                <Lock className="left-icon" size={18} />
                <input 
                  type={showConfirmPassword ? "text" : "password"} 
                  placeholder="Repeat your password" 
                  required 
                  value={confirmPassword} 
                  onChange={e => setConfirmPassword(e.target.value)} 
                />
                <button type="button" className="eye-btn" onClick={() => setShowConfirmPassword(false)}>
                  {showConfirmPassword ? <EyeOff size={18} onClick={() => setShowConfirmPassword(false)} /> : <Eye size={18} onClick={() => setShowConfirmPassword(true)} />}
                </button>
              </div>
            </div>

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> Updating Credentials...
                </>
              ) : (
                "Update Password"
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
