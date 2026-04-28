import React from "react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const PolicyPage = ({ type }) => {
  const navigate = useNavigate();

  const isTerms = type === "terms";
  const title = isTerms ? "Terms & Conditions" : "Privacy Policy";

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [type])

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-10 px-6">
      <div className="max-w-4xl mx-auto bg-white shadow-xl rounded-2xl p-8 md:p-12">
        <button
          onClick={() => navigate(-1)}
          className="text-blue-600 hover:text-blue-800 font-medium mb-8 flex items-center gap-2 transition"
        >
          ← Go Back
        </button>

        <h1 className="text-4xl font-bold text-gray-900 mb-6 border-b pb-4">{title}</h1>

        <div className="prose prose-blue max-w-none text-gray-700 leading-relaxed space-y-6">
          <p className="text-lg text-gray-500 font-medium">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>

          {isTerms ? (
            <>
              <p>Welcome to Home Products. These terms and conditions outline the rules and regulations for the use of our website and services.</p>

              <h3 className="text-xl font-bold text-gray-800 mt-8 mb-4">1. Introduction</h3>
              <p>By accessing this website, we assume you accept these terms and conditions. Do not continue to use Home Products if you do not agree to take all of the terms and conditions stated on this page.</p>

              <h3 className="text-xl font-bold text-gray-800 mt-8 mb-4">2. Cookies</h3>
              <p>We employ the use of cookies. By accessing Home Products, you agreed to use cookies in agreement with the Home Products Privacy Policy.</p>

              <h3 className="text-xl font-bold text-gray-800 mt-8 mb-4">3. License</h3>
              <p>Unless otherwise stated, Home Products and/or its licensors own the intellectual property rights for all material on Home Products. All intellectual property rights are reserved.</p>

              <h3 className="text-xl font-bold text-gray-800 mt-8 mb-4">4. User Comments</h3>
              <p>Parts of this website offer an opportunity for users to post and exchange opinions and information in certain areas of the website. Home Products does not filter, edit, publish or review Comments prior to their presence on the website.</p>
            </>
          ) : (
            <>
              <p>At Home Products, accessible from our website, one of our main priorities is the privacy of our visitors. This Privacy Policy document contains types of information that is collected and recorded by Home Products and how we use it.</p>

              <h3 className="text-xl font-bold text-gray-800 mt-8 mb-4">1. Information We Collect</h3>
              <p>The personal information that you are asked to provide, and the reasons why you are asked to provide it, will be made clear to you at the point we ask you to provide your personal information.</p>

              <h3 className="text-xl font-bold text-gray-800 mt-8 mb-4">2. How We Use Your Information</h3>
              <ul className="list-disc pl-5 space-y-2">
                <li>Provide, operate, and maintain our website</li>
                <li>Improve, personalize, and expand our website</li>
                <li>Understand and analyze how you use our website</li>
                <li>Develop new products, services, features, and functionality</li>
                <li>Communicate with you, either directly or through one of our partners</li>
                <li>Send you emails</li>
                <li>Find and prevent fraud</li>
              </ul>

              <h3 className="text-xl font-bold text-gray-800 mt-8 mb-4">3. Log Files</h3>
              <p>Home Products follows a standard procedure of using log files. These files log visitors when they visit websites. All hosting companies do this and a part of hosting services' analytics.</p>
            </>
          )}

          <div className="mt-12 pt-8 border-t border-gray-100 text-center text-gray-500">
            If you have any questions about this {title}, please contact us at <a href="mailto:support@homeproducts.com" className="text-blue-600 hover:underline">support@homeproducts.com</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PolicyPage;
