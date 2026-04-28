import { useState } from "react";
import { primaryBtn, secondaryBtn, cardStyle } from "../../../../utils/UIStyles";

const Agreements = ({ next, back }) => {
  const [checked, setChecked] = useState(false);

  return (
    <div className={cardStyle}>
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Terms & Agreements</h2>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 h-72 overflow-y-auto mb-6 text-sm text-gray-600 space-y-4">
        <h3 className="font-semibold text-gray-800 text-lg border-b pb-2">Seller Terms and Conditions</h3>
        <p>
          Welcome to the Home Products Seller Platform. By registering as a seller, you agree to comply with and be bound by the following terms and conditions. Please read them carefully before proceeding.
        </p>

        <h4 className="font-semibold text-gray-800 mt-4">1. Account Security and Fraud Prevention</h4>
        <p>
          You are entirely responsible for maintaining the confidentiality of your account credentials. Any fraudulent activities, including but not limited to selling counterfeit products, misrepresenting items, manipulating reviews, or processing fake orders, will result in immediate suspension of your account and potential legal action.
        </p>

        <h4 className="font-semibold text-gray-800 mt-4">2. Privacy Policy</h4>
        <p>
          We are committed to protecting your privacy. Any personal or business information collected during the onboarding process will be used exclusively for identity verification, tax compliance, and account management purposes. We do not sell your data to third parties. You agree to our data handling practices as outlined in our comprehensive Privacy Policy.
        </p>

        <h4 className="font-semibold text-gray-800 mt-4">3. Product Listings and Compliance</h4>
        <p>
          All products listed on our platform must comply with local laws and platform guidelines. You agree not to list any prohibited, illegal, or unsafe items. We reserve the right to review, reject, or remove any product listing that violates our policies without prior notice.
        </p>

        <h4 className="font-semibold text-gray-800 mt-4">4. Fees, Commissions, and Payments</h4>
        <p>
          By selling on our platform, you agree to our standard fee structure, including platform commission rates and payment processing fees. Payouts will be processed and disbursed according to the schedule outlined in our Seller Payment Policy, subject to holdbacks for returns or disputes.
        </p>

        <h4 className="font-semibold text-gray-800 mt-4">5. Shipping and Fulfillment</h4>
        <p>
          You agree to fulfill orders promptly within the specified handling time. You must provide accurate tracking information and utilize approved logistics partners where required. Failure to meet fulfillment standards may result in penalties or suspension.
        </p>
      </div>

      <label className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors">
        <input 
          type="checkbox" 
          className="w-5 h-5 cursor-pointer accent-blue-600 rounded border-gray-300 focus:ring-blue-500"
          checked={checked}
          onChange={() => setChecked(!checked)} 
        />
        <span className="text-gray-800 font-medium">I have read, understood, and agree to the Seller Terms and Conditions</span>
      </label>

      <div className="flex justify-between mt-8 border-t pt-6">
        <button onClick={back} className={secondaryBtn}>← Back</button>
        <button
          disabled={!checked}
          onClick={next}
          className={`${primaryBtn} ${!checked ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          Accept & Continue →
        </button>
      </div>
    </div>
  );
};

export default Agreements;