import { useState } from "react";
import { inputStyle, primaryBtn, cardStyle } from "../../../../utils/UIStyles";

const BasicInfo = ({ next, data, setData }) => {
  const [error, setError] = useState("");

  const handleNext = () => {
    if (!data.name || !data.email || !data.phone) {
      return setError("All fields required");
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
        return setError("Please enter a valid email address");
    }
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(data.phone)) {
        return setError("Please enter a valid 10-digit phone number");
    }
    setError("");
    next();
  };

  return (
    <div className={cardStyle}>
      <h2 className="text-xl font-semibold mb-4">Basic Info</h2>

      <div className="space-y-4">
        <input
          placeholder="Name"
          value={data.name}
          onChange={(e) => setData({ ...data, name: e.target.value })}
          className={inputStyle}
        />
        <input
          placeholder="Email"
          value={data.email}
          onChange={(e) => setData({ ...data, email: e.target.value })}
          className={inputStyle}
        />
        <input
          placeholder="Phone"
          value={data.phone}
          onChange={(e) => setData({ ...data, phone: e.target.value })}
          className={inputStyle}
        />
      </div>

      {error && <p className="text-red-500 mt-2 ps-2 text-sm">{error}</p>}

      <button onClick={handleNext} className={`${primaryBtn} w-full mt-4`}>
        Continue →
      </button>
    </div>
  );
};

export default BasicInfo;