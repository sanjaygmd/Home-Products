import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { inputStyle, primaryBtn, secondaryBtn, cardStyle } from "../../../../utils/UIStyles";
import { api } from "../../../../services/api";

const KYCPage = ({ back, data, setData }) => {

    const navigate = useNavigate();
    const [error, setError] = useState('');

    const handleFileChange = (e) => {
  setData({ ...data, file: e.target.files[0] });
};

  const handleSubmit = async () => {
  if (!data.aadhar) {
    return setError("Aadhar number is required");
  }

  try {
    const seller = JSON.parse(localStorage.getItem("seller"));

    await api.post(`/user/seller-onboarding/${seller.seller_id}`, data);

    navigate("/seller");

  } catch (err) {
    console.log(err.response?.data?.message);
  }
};

  return (
    <div className={cardStyle}>
      <h2 className="text-2xl font-semibold mb-4">KYC Verification</h2>

      <div className="space-y-5">
        <input
          placeholder="Aadhar Number"
          value={data.aadhar}
          onChange={(e) => setData({ ...data, aadhar: e.target.value })}
          className={inputStyle}
        />

        <input
        onChange={handleFileChange}
          type="file"
          className={inputStyle}
        />
      </div>

      {error && <p className="text-red-500 px-2 text-sm mt-2">{error}</p>}


      <div className="flex justify-between mt-6">
        <button onClick={back} className={secondaryBtn}>← Back</button>
        <button onClick={handleSubmit} className={primaryBtn}>
          Submit →
        </button>
      </div>
    </div>
  );
};

export default KYCPage;