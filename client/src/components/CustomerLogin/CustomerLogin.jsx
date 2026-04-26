import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { customerLogin } from "../../services/authService";
import { useAuth } from "../../context/AuthContext.jsx";

const CustomerLogin = () => {
  const navigate = useNavigate();
  const { loginUser, currentUser } = useAuth();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
      e.preventDefault();
  
      if (currentUser) {
        setError(`A ${currentUser.role} is already logged in. Please logout first.`);
        return;
      }
  
      if (!form.email || !form.password) {
        setError("All fields are required");
        return;
      }
  
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(form.email)) {
        setError("Invalid email format");
        return;
      }
  
      setLoading(true);
      setError("");
  
      try {
        console.log("Attempting login for:", form.email);
        const res = await customerLogin({
          email: form.email,
          password: form.password,
        });
  
        console.log("Login Response:", res);

        if (!res.success) {
          setError(res.message || "Invalid credentials");
          return;
        }
  
        loginUser(res.data);
        navigate("/");
      } catch (error) {
        console.error("Login Error:", error);
        const serverMessage = error.response?.data?.message;
        setError(serverMessage || "Something went wrong. Please try again.");
      } finally {
        setLoading(false);
      }
    };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 relative overflow-hidden">
      <div className="w-full max-w-md relative bg-white shadow-2xl rounded-3xl p-8 border border-gray-100">

        <h2 className="text-3xl font-extrabold text-center text-gray-800">
          Welcome Back
        </h2>
        <p className="text-center text-gray-500 text-sm mb-6 mt-1 font-medium">
          Login to continue shopping
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1 ml-1">Email Address</label>
            <input
              type="email"
              name="email"
              placeholder="name@example.com"
              onChange={handleChange}
              className="w-full p-4 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-blue-500 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1 ml-1">Password</label>
            <input
              type="password"
              name="password"
              placeholder="••••••••"
              onChange={handleChange}
              className="w-full p-4 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-blue-500 outline-none transition-all"
            />
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl">
              <p className="text-xs font-black text-rose-600 uppercase tracking-widest mb-1">Access Restricted</p>
              <p className="text-sm font-bold text-rose-700">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-4 mt-2 rounded-xl text-white font-extrabold text-lg bg-blue-600 shadow-lg shadow-blue-200 transition-all duration-300
              ${loading
                ? "opacity-70 cursor-not-allowed"
                : "hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-300 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
              }`}
          >
            {loading ? "Authenticating..." : "Login Securely"}
          </button>
        </form>

        <p className="text-sm text-center mt-8 text-gray-600 font-medium">
          Don’t have an account?{" "}
          <span
            onClick={() => navigate("/customer-register")}
            className="text-blue-600 font-bold cursor-pointer hover:underline decoration-2 underline-offset-4"
          >
            Register here
          </span>
        </p>

      </div>
    </div>
  );
};

export default CustomerLogin;