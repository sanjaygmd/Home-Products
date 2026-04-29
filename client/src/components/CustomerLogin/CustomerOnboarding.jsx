import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { customerOnboarding } from "../../services/authService";

const CustomerOnboarding = () => {

  const navigate = useNavigate();

  const auth = JSON.parse(localStorage.getItem("auth"));

  const userId = auth?.id || auth?.customer_id;

  const [form, setForm] = useState({
    full_name: auth?.name || auth?.full_name || "",
    phone: auth?.phone || "",
    address_line_1: "",
    address_line_2: "",
    city: "",
    state: "",
    pincode: "",
    country: "India",
    is_default: true,
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({
      ...form,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !form.address_line_1 ||
      !form.city ||
      !form.state ||
      !form.pincode
    ) {
      setError("Please fill all required fields");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await customerOnboarding(userId, form);

      if (!res.success) {
        setError(res.message);
        return;
      }

      navigate("/");

    } catch (err) {

      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };
  const inputClass =
    "w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition";

  return (
    <div className="min-h-screen flex bg-gray-50">
      <div className="hidden md:flex w-1/2 bg-gradient-to-br from-blue-600 to-blue-800 text-white flex-col justify-center px-12">
        <h2 className="text-4xl font-bold mb-4">Almost There</h2>
        <p className="text-lg opacity-90">
          Add your delivery address to get faster checkout, accurate delivery
          updates, and a better shopping experience.
        </p>

        <div className="mt-10 space-y-4 text-sm opacity-90">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">✓</div>
            <p>Faster checkout</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">✓</div>
            <p>Save multiple addresses</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">✓</div>
            <p>Seamless order tracking</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-lg bg-white shadow-xl rounded-3xl p-8 border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Delivery Address
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            Fill in your details below
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 px-4 py-3 rounded-xl border border-gray-100">
                <p className="text-xs text-gray-500">Full Name</p>
                <p className="text-gray-800 font-medium">{form.full_name}</p>
              </div>

              <div className="bg-gray-50 px-4 py-3 rounded-xl border border-gray-100">
                <p className="text-xs text-gray-500">Phone</p>
                <p className="text-gray-800 font-medium">{form.phone}</p>
              </div>
            </div>

            <input
              name="address_line_1"
              value={form.address_line_1}
              onChange={handleChange}
              placeholder="Address Line 1"
              className={inputClass}
            />

            <input
              name="address_line_2"
              value={form.address_line_2}
              onChange={handleChange}
              placeholder="Address Line 2 (Optional)"
              className={inputClass}
            />

            <div className="grid grid-cols-2 gap-4">
              <input
                name="city"
                onChange={handleChange}
                placeholder="City"
                className={inputClass}
              />

              <input
                name="state"
                onChange={handleChange}
                placeholder="State"
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <input
                name="pincode"
                value={form.pincode}
                onChange={handleChange}
                placeholder="Pincode"
                className={inputClass}
              />

              <input
                name="country"
                value={form.country}
                onChange={handleChange}
                placeholder="Country"
                className={inputClass}
              />
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                name="is_default"
                checked={form.is_default}
                onChange={handleChange}
                className="accent-blue-600 w-4 h-4"
              />
              <span>Set as default address</span>
            </div>

            {error && <p className="text-red-600 text-sm font-medium">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-4 mt-2 rounded-xl text-white font-extrabold text-lg transition-all duration-300
                ${loading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-100 hover:shadow-blue-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
                }
              `}
            >
              {loading ? "Saving..." : "Save & Continue"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CustomerOnboarding;
