import { useState, useEffect } from "react";
import Card from "./Card";
import { updateCustomer } from "../../services/authService";
import heic2any from "heic2any";
import { createPortal } from "react-dom";

const ProfileSettings = ({ user }) => {
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    date_of_birth: "",
    gender: "",
    profile_picture_url: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showFullImage, setShowFullImage] = useState(false);

  useEffect(() => {
    if (user) setForm({
      full_name: user.full_name || "",
      email: user.email || "",
      phone: user.phone || "",
      date_of_birth: user.date_of_birth ? user.date_of_birth.split('T')[0] : "",
      gender: user.gender || "",
      profile_picture_url: user.profile_picture_url || "",
    });
  }, [user]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await updateCustomer(user.customer_id, form);
      if (res.success) {
        setSuccess("Profile updated successfully!");

      } else {
        setError(res.message);
      }
    } catch (err) {
      setError("Something went wrong");
    } finally {
      setLoading(false);
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

  const inputClass = "w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all";

  return (
    <Card title="Account Settings">
      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 ml-1">Full Name</label>
            <input
              name="full_name"
              value={form.full_name}
              onChange={handleChange}
              placeholder="John Doe"
              className={inputClass}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 ml-1">Email Address</label>
            <input
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="john@example.com"
              className={inputClass}
              disabled
            />
            <p className="text-[10px] text-gray-400 ml-1 italic">*Email cannot be changed</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 ml-1">Phone Number</label>
            <input
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="1234567890"
              className={inputClass}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 ml-1">Date of Birth</label>
            <input
              type="date"
              name="date_of_birth"
              value={form.date_of_birth}
              onChange={handleChange}
              className={inputClass}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 ml-1">Gender</label>
            <select
              name="gender"
              value={form.gender}
              onChange={handleChange}
              className={inputClass}
            >
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-semibold text-gray-700 ml-1">Profile Picture (Optional)</label>
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
                 className="flex-1 text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-6 file:rounded-xl file:border-0 file:text-sm file:font-black file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100 transition-all cursor-pointer"
               />
            </div>
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

        {error && (
          <p className="text-red-600 bg-red-50 px-4 py-2 rounded-lg text-sm font-medium border border-red-100">
            {error}
          </p>
        )}

        {success && (
          <p className="text-emerald-600 bg-emerald-50 px-4 py-2 rounded-lg text-sm font-medium border border-emerald-100">
            {success}
          </p>
        )}

        <div className="pt-4">
          <button
            type="submit"
            disabled={loading}
            className={`w-full md:w-auto px-8 py-3 rounded-xl bg-blue-600 text-white font-bold shadow-lg shadow-blue-100 transition-all duration-200 
              ${loading ? "opacity-70 cursor-not-allowed" : "hover:bg-blue-700 hover:-translate-y-0.5 active:translate-y-0"}`}
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </Card>
  );
};

export default ProfileSettings;