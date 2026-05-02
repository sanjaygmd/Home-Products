import React, { useState, useEffect } from "react";
import { getSellerCustomers } from "../../services/sellerService";

import { useAuth } from "../../context/AuthContext.jsx";

const SellerCustomers = () => {
  const { currentUser } = useAuth();
  const sellerId = currentUser?.id;
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sellerId) return;

    const fetchCustomers = async () => {
      setLoading(true);
      const res = await getSellerCustomers(sellerId);
      if (res.success) {
        setCustomers(res.data);
      }
      setLoading(false);
    };

    fetchCustomers();
  }, [sellerId]);

  const statusStyle = (status) =>
    status === "Active"
      ? "bg-green-50 text-green-600 ring-1 ring-green-100"
      : "bg-gray-50 text-gray-500 ring-1 ring-gray-100";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      <h2 className="text-xl font-semibold text-gray-800">
        Customers
      </h2>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

        {customers.length > 0 ? (
          <table className="w-full text-sm">

            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-6 py-4 text-left">Name</th>
                <th className="px-6 py-4 text-left">Email</th>
                <th className="px-6 py-4 text-left">Orders</th>
                <th className="px-6 py-4 text-left">Status</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">

              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 transition">

                  <td className="px-6 py-4 font-medium">{c.name}</td>
                  <td className="px-6 py-4 text-gray-600">{c.email}</td>
                  <td className="px-6 py-4 text-gray-600">{c.orders}</td>

                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 text-xs rounded-full ${statusStyle(c.status)}`}>
                      {c.status}
                    </span>
                  </td>

                </tr>
              ))}

            </tbody>

          </table>
        ) : (
          <div className="p-10 text-center text-gray-500">
            No customers found
          </div>
        )}

      </div>
    </div>
  );
};

export default SellerCustomers;