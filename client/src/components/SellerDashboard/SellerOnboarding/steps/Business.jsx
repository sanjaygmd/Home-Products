import { useState } from "react";
import { inputStyle, primaryBtn, secondaryBtn, cardStyle } from "../../../../utils/UIStyles";

const Business = ({ next, back, data, setData }) => {
  const [error, setError] = useState("");

  const handleNext = () => {
    if (!data.businessName || !data.address_line1 || !data.city || !data.state || !data.pincode || !data.country) {
      return setError("Fill all required business and address fields");
    }
    if (data.pincode.length < 5 || isNaN(data.pincode)) {
        return setError("Please enter a valid numeric pincode");
    }
    setError("");
    next();
  };

  return (
    <div className={cardStyle}>
      <h2 className="text-xl font-semibold mb-4">Business</h2>

      <input
        placeholder="Business Name"
        value={data.businessName}
        onChange={(e) => setData({ ...data, businessName: e.target.value })}
        className={inputStyle}
      />

      <input
        placeholder="Address"
        value={data.address_line1}
        onChange={(e) => setData({ ...data, address_line1: e.target.value })}
        className={`${inputStyle} mt-3`}
      />

      <input
        placeholder="City"
        value={data.city}
        onChange={(e) => setData({ ...data, city: e.target.value })}
        className={`${inputStyle} mt-3`}
      />

      <input
        placeholder="State"
        value={data.state}
        onChange={(e) => setData({ ...data, state: e.target.value })}
        className={`${inputStyle} mt-3`}
      />

      <input
        placeholder="Pincode"
        value={data.pincode}
        onChange={(e) => setData({ ...data, pincode: e.target.value })}
        className={`${inputStyle} mt-3`}
      />

      <input
        placeholder="Country"
        value={data.country}
        onChange={(e) => setData({ ...data, country: e.target.value })}
        className={`${inputStyle} mt-3`}
      />

      {error && <p className="text-red-500 p-2 text-sm mt-2">{error}</p>}

      <div className="flex justify-between mt-4">
        <button onClick={back} className={secondaryBtn}>← Back</button>
        <button onClick={handleNext} className={primaryBtn}>Continue →</button>
      </div>
    </div>
  );
};

export default Business;