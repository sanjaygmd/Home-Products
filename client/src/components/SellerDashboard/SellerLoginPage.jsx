import { useState } from "react";
import { useNavigate } from "react-router-dom";
import SellerAuthLayout from "./SellerAuthLayout";

import { loginSeller as apiLoginSeller } from "../../services/authService";
import { useAuth } from "../../context/AuthContext";

const SellerLoginPage = () => {
  const navigate = useNavigate();
  const { loginSeller, currentUser } = useAuth();

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
  });

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

    if (form.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await apiLoginSeller({
        email: form.email,
        password: form.password
      });

      if (!res.success) {
        setError(res.message);
        return;
      }

      loginSeller(res.data);

      navigate("/seller");

    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SellerAuthLayout>
      <div className="w-full max-w-md mx-auto">

        <h2 className="text-2xl font-bold text-center text-gray-900 mb-6">
          Welcome Back
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">

          <div>
            <label className="text-sm text-gray-600">Email</label>
            <input
              type="email"
              name="email"
              placeholder="Enter your email"
              onChange={handleChange}
              className="w-full mt-1 p-3 rounded-xl bg-gray-50 border border-gray-200
                       focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition"
            />
          </div>

          <div>
            <label className="text-sm text-gray-600">Password</label>
            <input
              type="password"
              name="password"
              placeholder="Enter your password"
              onChange={handleChange}
              className="w-full mt-1 p-3 rounded-xl bg-gray-50 border border-gray-200
                       focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition"
            />
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl">
              <p className="text-xs font-black text-rose-600 uppercase tracking-widest mb-1">Access Error</p>
              <p className="text-sm font-bold text-rose-700">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full bg-blue-600 text-white py-3 rounded-xl font-semibold
                     hover:bg-blue-700 active:scale-[0.98] transition
                     ${loading ? "opacity-50 cursor-not-allowed" : "hover:bg-blue-700"}`}
          >
            {loading ? 'Logging...' : 'Login'}
          </button>
        </form>

        <p className="mt-6 text-sm text-center text-gray-600">
          Don’t have an account?{" "}
          <span
            onClick={() => navigate("/seller/register")}
            className="text-blue-600 font-medium cursor-pointer hover:text-blue-800"
          >
            Register
          </span>
        </p>

      </div>
    </SellerAuthLayout>
  );
};

export default SellerLoginPage;