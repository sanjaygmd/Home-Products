import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { customerRegister, sendOtp, verifyOtp } from "../../services/authService";
import { useAuth } from "../../context/AuthContext.jsx";
import heic2any from "heic2any";
import { createPortal } from "react-dom";

const CustomerRegister = () => {
  const navigate = useNavigate();
  const { loginUser } = useAuth();

  const [step, setStep] = useState(1); // 1: Details, 2: OTP
  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    date_of_birth: "",
    gender: "",
    profile_picture_url: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (localStorage.getItem("seller")) {
      setError("A seller is already logged in. Please logout from the seller portal first.");
      return;
    }

    if (!form.full_name || !form.email || !form.phone || !form.password) {
      setError("All fields are required except profile picture");
      return;
    }

    if (!agreed) {
      setError("You must agree to the Terms & Conditions and Privacy Policy");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await sendOtp({ email: form.email, purpose: "registration" });
      if (res.success) {
        setStep(2);
      } else {
        setError(res.message || "Failed to send OTP");
      }
    } catch (err) {
      console.error("OTP Send Error:", err);
      const serverMessage = err.response?.data?.message;
      setError(serverMessage || "Error sending OTP. Please check your internet connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndRegister = async (e) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      setError("Please enter a valid 6-digit OTP");
      return;
    }

    setVerifying(true);
    setError("");

    try {
      const vRes = await verifyOtp({ email: form.email, otp, purpose: "registration" });
      if (!vRes.success) {
        setError(vRes.message || "Invalid OTP");
        setVerifying(false);
        return;
      }

      const res = await customerRegister({
        full_name: form.full_name,
        email: form.email,
        phone: form.phone,
        date_of_birth: form.date_of_birth,
        gender: form.gender,
        profile_picture_url: form.profile_picture_url,
        password: form.password,
      });

      if (!res.success) {
        setError(res.message);
        setVerifying(false);
        return;
      }

      loginUser(res.data);
      navigate("/customer-onboarding");
    } catch (err) {
      setError("Something went wrong during registration");
    } finally {
      setVerifying(false);
    }
  };

  const handleFileChange = async (e) => {
    let file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("File size too large. Please select a file under 5MB.");
        return;
      }

      // Handle HEIC conversion
      if (file.type === "image/heic" || file.name.toLowerCase().endsWith(".heic")) {
        try {
          setError("Converting HEIC image...");
          const convertedBlob = await heic2any({
            blob: file,
            toType: "image/jpeg",
            quality: 1.0
          });
          file = new File(
            [Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob], 
            file.name.replace(/\.[^/.]+$/, "") + ".jpg", 
            { type: "image/jpeg" }
          );
          setError("");
        } catch (err) {
          console.error("HEIC conversion error:", err);
          setError("Failed to convert HEIC image. Please use JPG or PNG.");
          return;
        }
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setForm({ ...form, profile_picture_url: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const inputClass = "w-full p-4 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-blue-500 outline-none transition-all";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-10 relative overflow-hidden">
      <div className="w-full max-w-lg relative bg-white shadow-2xl rounded-3xl p-8 sm:p-10 border border-gray-100">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-center text-gray-800">
          Create Account
        </h2>
        <p className="text-center text-gray-500 text-sm mb-8 mt-2 font-medium">
          Join us and start your shopping journey
        </p>

        <form onSubmit={step === 1 ? handleSendOtp : handleVerifyAndRegister} className="space-y-5">
          {step === 1 ? (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1 ml-1">Full Name</label>
                <input
                  name="full_name"
                  placeholder="John Doe"
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1 ml-1">Email Address</label>
                <input
                  type="email"
                  name="email"
                  placeholder="name@example.com"
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1 ml-1">Mobile Number</label>
                <input
                  name="phone"
                  placeholder="1234567890"
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1 ml-1">Date of Birth</label>
                  <input
                    type="date"
                    name="date_of_birth"
                    onChange={handleChange}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1 ml-1">Gender</label>
                  <select
                    name="gender"
                    onChange={handleChange}
                    className={inputClass}
                  >
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1 ml-1">Profile Picture (Optional)</label>
                <div className="flex items-center gap-4">
                  {form.profile_picture_url && (
                    <div className="relative group cursor-pointer" onClick={() => setShowFullImage(true)}>
                       <img 
                         src={form.profile_picture_url} 
                         alt="Preview" 
                         className="w-16 h-16 rounded-full object-cover border-2 border-blue-100 shadow-sm hover:opacity-80 transition-opacity"
                       />
                       <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="bg-black/40 text-white text-[8px] font-black uppercase tracking-tighter px-1 rounded">View</span>
                       </div>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*,.heic"
                    onChange={handleFileChange}
                    className="flex-1 text-sm text-gray-500 file:mr-4 file:py-3 file:px-6 file:rounded-xl file:border-0 file:text-sm file:font-black file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100 transition-all cursor-pointer"
                  />
                </div>
              </div>

              {/* Full Image Modal using Portal */}
              {showFullImage && form.profile_picture_url && createPortal(
                <div 
                  className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300"
                  style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh' }}
                  onClick={() => setShowFullImage(false)}
                >
                  <div 
                    className="relative w-[450px] max-w-[90vw] h-[450px] max-h-[90vh] bg-white rounded-[3rem] shadow-[0_0_80px_rgba(0,0,0,0.5)] border-[12px] border-white overflow-hidden animate-in zoom-in-95 duration-300"
                    onClick={(e) => e.stopPropagation()}
                  >
                     <button 
                       className="absolute top-4 right-4 z-10 w-10 h-10 bg-black/20 hover:bg-black/40 backdrop-blur-md text-white rounded-full flex items-center justify-center transition-all"
                       onClick={() => setShowFullImage(false)}
                     >
                        <span className="text-xl font-light">×</span>
                     </button>
                     <img 
                       src={form.profile_picture_url} 
                       alt="Full Size" 
                       className="w-full h-full object-cover"
                     />
                  </div>
                </div>,
                document.body
              )}


              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1 ml-1">Password</label>
                  <input
                    type="password"
                    name="password"
                    placeholder="••••••••"
                    onChange={handleChange}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1 ml-1">Confirm Password</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    placeholder="••••••••"
                    onChange={handleChange}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="flex items-start gap-3 mt-4">
                <input
                  type="checkbox"
                  id="agree"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-1 w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="agree" className="text-sm text-gray-600 cursor-pointer select-none">
                  I agree to the <span onClick={(e) => { e.preventDefault(); setShowTerms(true); }} className="text-blue-600 hover:underline cursor-pointer">Terms & Conditions</span> and <span onClick={(e) => { e.preventDefault(); setShowTerms(true); }} className="text-blue-600 hover:underline cursor-pointer">Privacy Policy</span>
                </label>
              </div>

              {/* Terms Modal using Portal */}
              {showTerms && createPortal(
                <div 
                  className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300"
                  style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh' }}
                  onClick={() => setShowTerms(false)}
                >
                  <div 
                    className="relative w-[600px] max-w-[90vw] max-h-[80vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                        <h2 className="text-xl font-bold text-gray-800">Terms & Privacy Policy</h2>
                        <button 
                            type="button"
                            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 transition-colors text-gray-500"
                            onClick={() => setShowTerms(false)}
                        >
                            <span className="text-xl leading-none">&times;</span>
                        </button>
                    </div>
                    <div className="p-6 overflow-y-auto text-sm text-gray-600 space-y-4">
                        <h3 className="font-semibold text-gray-800 text-lg border-b pb-2">Customer Terms and Conditions</h3>
                        <p>Welcome to Home Products. By registering as a customer, you agree to comply with and be bound by the following terms.</p>
                        
                        <h4 className="font-semibold text-gray-800 mt-4">1. Account Security</h4>
                        <p>You are responsible for maintaining the confidentiality of your account credentials. Any fraudulent activities will result in immediate suspension of your account.</p>

                        <h4 className="font-semibold text-gray-800 mt-4">2. Privacy Policy</h4>
                        <p>We are committed to protecting your privacy. Any personal information collected during registration will be used exclusively for order processing, personalization, and account management. We do not sell your data to third parties.</p>

                        <h4 className="font-semibold text-gray-800 mt-4">3. Purchases and Payments</h4>
                        <p>All purchases are subject to availability. By placing an order, you agree to pay the stated price, including any applicable taxes and shipping fees.</p>

                        <h4 className="font-semibold text-gray-800 mt-4">4. Returns and Refunds</h4>
                        <p>Returns and refunds are governed by our standard Return Policy. Items must be returned in their original condition within the specified timeframe to be eligible.</p>
                    </div>
                    <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
                        <button 
                            type="button"
                            onClick={() => { setShowTerms(false); setAgreed(true); }}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                        >
                            I Agree
                        </button>
                    </div>
                  </div>
                </div>,
                document.body
              )}
            </>
          ) : (
            <div className="space-y-6 animate-fadeIn">
              <div className="text-center">
                <p className="text-gray-600 mb-4">
                  We've sent a 6-digit verification code to <span className="font-bold text-gray-800">{form.email}</span>
                </p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 text-center">Enter OTP</label>
                <input
                  type="text"
                  maxLength="6"
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className={`${inputClass} text-center text-2xl tracking-[1em] font-mono`}
                />
              </div>
              <p className="text-xs text-center text-gray-400">
                Didn't receive the code? <span className="text-blue-600 cursor-pointer hover:underline" onClick={handleSendOtp}>Resend OTP</span>
              </p>
              <button 
                type="button" 
                onClick={() => setStep(1)} 
                className="w-full text-sm text-gray-500 font-medium hover:text-gray-700 transition"
              >
                ← Back to Edit Details
              </button>
            </div>
          )}

          {error && (
            <p className="text-red-600 bg-red-50 px-3 py-2 rounded-lg text-sm font-medium border border-red-100">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || verifying}
            className={`w-full py-4 mt-4 rounded-xl text-white font-extrabold text-lg bg-blue-600 shadow-lg shadow-blue-200 transition-all duration-300
              ${
                (loading || verifying)
                  ? "opacity-70 cursor-not-allowed"
                  : "hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-300 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
              }`}
          >
            {loading ? "Sending OTP..." : verifying ? "Verifying..." : step === 1 ? "Next: Verify Email" : "Create Account"}
          </button>
        </form>

        <p className="text-sm text-center mt-8 text-gray-600 font-medium">
          Already have an account?{" "}
          <span
            onClick={() => navigate("/customer-login")}
            className="text-blue-600 font-bold cursor-pointer hover:underline decoration-2 underline-offset-4"
          >
            Login here
          </span>
        </p>
      </div>
    </div>
  );
};

export default CustomerRegister;
