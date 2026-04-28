import { useState } from "react";
import {
  inputStyle,
  labelStyle,
  primaryBtn,
  secondaryBtn,
  cardStyle,
} from "../../../../utils/UIStyles";

const Bank = ({ next, back, data, setData }) => {
  const [error, setError] = useState("");

  const handleNext = () => {
    if (
      !data.accountHolder ||
      !data.accountNumber ||
      !data.confirmAccount ||
      !data.ifsc ||
      !data.bankName ||
      !data.accountType
    ) {
      return setError("All fields are required");
    }

    if (data.accountNumber !== data.confirmAccount) {
      return setError("Account numbers do not match");
    }
    
    if (data.ifsc.length !== 11) {
      return setError("Valid 11-character IFSC code is required");
    }

    setError("");
    next();
  };

  return (
    <div className={cardStyle}>
      <h2 className="text-2xl font-semibold mb-1">Bank Details</h2>
      <p className="text-sm text-gray-500 mb-6">
        Required for receiving payments
      </p>

      <div className="space-y-5">
        <div>
          <label className={labelStyle}>Account Holder Name</label>
          <input
            value={data.accountHolder}
            onChange={(e) =>
              setData({ ...data, accountHolder: e.target.value })
            }
            className={inputStyle}
          />
        </div>

        <div>
          <label className={labelStyle}>Account Number</label>
          <input
            value={data.accountNumber}
            onChange={(e) =>
              setData({ ...data, accountNumber: e.target.value })
            }
            className={inputStyle}
          />
        </div>

        <div>
          <label className={labelStyle}>Confirm Account Number</label>
          <input
            value={data.confirmAccount}
            onChange={(e) =>
              setData({ ...data, confirmAccount: e.target.value })
            }
            className={inputStyle}
          />
        </div>

        <div>
          <label className={labelStyle}>IFSC Code</label>
          <input
            value={data.ifsc}
            onChange={(e) => setData({ ...data, ifsc: e.target.value })}
            className={inputStyle}
          />
        </div>

        <div>
          <label className={labelStyle}>Account type</label>
          <input
            value={data.accountType}
            onChange={(e) => setData({ ...data, accountType: e.target.value })}
            className={inputStyle}
          />
        </div>

        <div>
          <label className={labelStyle}>UPI Id</label>
          <input
            value={data.upiId}
            onChange={(e) => setData({ ...data, upiId: e.target.value })}
            className={inputStyle}
          />
        </div>

        <div>
          <label className={labelStyle}>Bank Name</label>
          <input
            value={data.bankName}
            onChange={(e) =>
              setData({ ...data, bankName: e.target.value })
            }
            className={inputStyle}
          />
        </div>
      </div>

      {error && <p className="text-red-500 px-2 text-sm mt-2">{error}</p>}

      <div className="flex justify-between mt-8">
        <button onClick={back} className={secondaryBtn}>
          ← Back
        </button>
        <button onClick={handleNext} className={primaryBtn}>
          Continue →
        </button>
      </div>
    </div>
  );
};

export default Bank;