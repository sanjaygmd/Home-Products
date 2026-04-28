import { useState } from "react";
import { inputStyle, labelStyle, primaryBtn, secondaryBtn, cardStyle } from "../../../../utils/UIStyles";

const Tax = ({ next, back, data, setData }) => {
  const [error, setError] = useState("");

  const handleNext = () => {
    if (!data.pan || data.pan.length !== 10) {
      return setError("Valid 10-character PAN is required");
    }
    setError("");
    next();
  };

  return (
    <div className={cardStyle}>
      <h2 className="text-2xl font-semibold mb-1">Tax Details</h2>

      <div className="bg-blue-50 text-blue-700 p-4 rounded-xl mb-6 text-sm">
        PAN is mandatory. GST is optional.
      </div>

      <div className="space-y-5">
        <div>
          <label className={labelStyle}>PAN</label>
          <input
            value={data.pan}
            onChange={(e) => setData({ ...data, pan: e.target.value })}
            className={inputStyle}
          />
        </div>

        <div>
          <label className={labelStyle}>GST (Optional)</label>
          <input
            value={data.gst}
            onChange={(e) => setData({ ...data, gst: e.target.value })}
            className={inputStyle}
          />
        </div>
      </div>

      {error && <p className="text-red-500 mt-2">{error}</p>}

      <div className="flex justify-between mt-8 px-2 text-sm">
        <button onClick={back} className={secondaryBtn}>← Back</button>
        <button onClick={handleNext} className={primaryBtn}>Continue →</button>
      </div>
    </div>
  );
};

export default Tax;