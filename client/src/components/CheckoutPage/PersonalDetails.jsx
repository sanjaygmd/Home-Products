import { useState, useEffect } from "react";
import { card, input, buttonPrimary } from "../../utils/UIStyles";
import { getCustomerAddresses } from "../../services/authService";
import { useAuth } from "../../context/AuthContext.jsx";

const PersonalDetails = ({ onNext }) => {
  const { currentUser } = useAuth();
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    pincode: "",
    state: "",
  });

  const [addresses, setAddresses] = useState([]);

  useEffect(() => {
    if (currentUser?.id) {
      // Pre-fill from auth session
      setForm(prev => ({
        ...prev,
        name: currentUser.name || "",
        email: currentUser.email || "",
        phone: currentUser.phone || "",
      }));

      // Fetch saved addresses
      getCustomerAddresses(currentUser.id).then((res) => {
        if (res.success && res.data.length > 0) {
          const defaultAddr = res.data.find(a => a.is_default) || res.data[0];
          setForm(prev => ({
            ...prev,
            name: defaultAddr.full_name || prev.name,
            phone: defaultAddr.phone || prev.phone,
            address: defaultAddr.address_line_1 + (defaultAddr.address_line_2 ? `, ${defaultAddr.address_line_2}` : ""),
            city: defaultAddr.city,
            pincode: defaultAddr.pincode,
            state: defaultAddr.state,
          }));
          setAddresses(res.data);
        }
      });
    }
  }, [currentUser]);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  return (
    <div className={`${card} p-6 space-y-6`}>

      <div>
        <h2 className="text-xl font-semibold text-gray-800">
          Delivery Details
        </h2>
        <p className="text-sm text-gray-500">
          Enter your shipping information
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">

        <input name="name" value={form.name} onChange={handleChange} placeholder="Full Name" className={input} />
        <input name="phone" value={form.phone} onChange={handleChange} placeholder="Phone Number" className={input} />
        <input name="email" value={form.email} onChange={handleChange} placeholder="Email" className={`md:col-span-2 ${input}`} />

        <input name="address" value={form.address} onChange={handleChange} placeholder="Address" className={`md:col-span-2 ${input}`} />
        <input name="city" value={form.city} onChange={handleChange} placeholder="City" className={input} />
        <input name="pincode" value={form.pincode} onChange={handleChange} placeholder="Pincode" className={input} />
        <input name="state" value={form.state} onChange={handleChange} placeholder="State" className={`md:col-span-2 ${input}`} />

      </div>

      <button
        onClick={() => onNext(form)}
        className={`${buttonPrimary} w-full`}
      >
        Continue to Payment →
      </button>

    </div>
  );
};

export default PersonalDetails;