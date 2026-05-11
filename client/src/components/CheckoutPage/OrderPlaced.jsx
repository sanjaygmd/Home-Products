import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const OrderPlaced = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const orderId = location.state?.orderId || "ORD" + Math.floor(Math.random() * 100000);
  const paymentMethod = location.state?.paymentMethod || "online";

  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    setTimeout(() => setAnimate(true), 200);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">

      <div
        className={`bg-white rounded-3xl shadow-xl p-8 md:p-10 max-w-md w-full text-center transition-all duration-700
        ${animate ? "opacity-100 scale-100" : "opacity-0 scale-90"}`}
      >

        <div className="flex justify-center mb-6">
          <div className="relative w-20 h-20">

            <div className="absolute inset-0 rounded-full border-4 border-green-200 animate-ping"></div>

            <div className="w-20 h-20 flex items-center justify-center rounded-full bg-green-100">
              <svg
                className="w-10 h-10 text-green-600 animate-[pop_0.4s_ease]"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>
        </div>

        <h1 className="text-2xl font-semibold text-gray-900">
          Order Placed Successfully 🎉
        </h1>

        <p className="text-sm text-gray-500 mt-2">
          Your order has been confirmed and will be shipped soon.
        </p>

        <div className="mt-6 bg-gray-50 rounded-xl p-4 text-left space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Order ID</span>
            <span className="font-medium text-gray-800">#{orderId.toString().toUpperCase().slice(0, 12)}</span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Estimated Delivery</span>
            <span className="font-medium text-gray-800">
              3 - 5 Days
            </span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Payment</span>
            <span className="font-medium text-gray-800">
              {paymentMethod === "cod" ? "Cash on Delivery" : "Paid Online"}
            </span>
          </div>
        </div>

        
        <div className="mt-8 flex flex-col gap-3">

          <button
            onClick={() => navigate("/cart")}
            className="w-full py-3 rounded-xl bg-black text-white font-medium hover:opacity-90 transition"
          >
            Back To Cart
          </button>

          <button
            onClick={() => navigate("/")}
            className="w-full py-3 rounded-xl border text-gray-700 hover:bg-gray-100 transition"
          >
            Continue Shopping
          </button>

        </div>

      </div>

      <style>
        {`
          @keyframes pop {
            0% { transform: scale(0.5); opacity: 0; }
            100% { transform: scale(1); opacity: 1; }
          }

          @keyframes load {
            0% { width: 0; }
            100% { width: 70%; }
          }
        `}
      </style>

    </div>
  );
};

export default OrderPlaced;