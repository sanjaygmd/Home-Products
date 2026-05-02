import React, { useState, useEffect } from "react";
import { getSellerEarningsSummary, getSellerPayoutHistory, requestPayout } from "../../services/payoutService";
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DownloadIcon from '@mui/icons-material/Download';
import SendIcon from '@mui/icons-material/Send';
import { useToast } from "../../hooks/use-toast";

import { useAuth } from "../../context/AuthContext.jsx";

const SellerPayments = () => {
  const { currentUser } = useAuth();
  const sellerId = currentUser?.id;
  const { toast } = useToast();
  
  const [data, setData] = useState({
    summary: {
      total_earnings: 0,
      withdrawable_balance: 0,
      pending_delivery: 0,
      processing_payouts: 0,
      completed_payouts: 0
    },
    transactions: []
  });
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);

  const fetchData = async () => {
    if (!sellerId) return;
    setLoading(true);
    try {
      const [summaryRes, historyRes] = await Promise.all([
        getSellerEarningsSummary(sellerId),
        getSellerPayoutHistory(sellerId)
      ]);

      if (summaryRes.success && historyRes.success) {
        setData({
          summary: {
            total_earnings: summaryRes.data.total_earnings,
            withdrawable_balance: summaryRes.data.withdrawable_balance,
            pending_delivery: summaryRes.data.pending_delivery,
            processing_payouts: summaryRes.data.processing_payouts,
            completed_payouts: summaryRes.data.paid_earnings
          },
          transactions: historyRes.data
        });
      }
    } catch (error) {
      console.error("Failed to fetch payment data", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [sellerId]);

  const handleRequestPayout = async () => {
    if (data.summary.withdrawable_balance <= 0) {
      toast({ 
        title: "No balance", 
        description: "You don't have any earnings from delivered products to withdraw yet.", 
        variant: "destructive" 
      });
      return;
    }

    setRequesting(true);
    try {
      const res = await requestPayout({ seller_id: sellerId, notes: "Requested from dashboard" });
      if (res.success) {
        toast({ title: "Request Sent", description: "Your payout request has been submitted to admin." });
        fetchData();
      } else {
        toast({ title: "Failed", description: res.message, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Something went wrong. Please try again.", variant: "destructive" });
    }
    setRequesting(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const cards = [
    { 
      title: "Withdrawable Balance", 
      value: `₹${Number(data.summary.withdrawable_balance).toLocaleString()}`, 
      icon: <CheckCircleIcon />, 
      color: "bg-emerald-600",
      desc: "Ready for withdrawal request"
    },
    { 
      title: "Pending Delivery", 
      value: `₹${Number(data.summary.pending_delivery).toLocaleString()}`, 
      icon: <PendingActionsIcon />, 
      color: "bg-orange-500",
      desc: "Sold but not delivered"
    },
    { 
      title: "Remaining Portfolio", 
      value: `₹${(Number(data.summary.withdrawable_balance) + Number(data.summary.pending_delivery) + Number(data.summary.processing_payouts)).toLocaleString()}`, 
      icon: <AccountBalanceWalletIcon />, 
      color: "bg-indigo-600",
      desc: "Total unpaid earnings"
    },
    { 
      title: "Completed Payout", 
      value: `₹${Number(data.summary.completed_payouts).toLocaleString()}`, 
      icon: <DownloadIcon />, 
      color: "bg-blue-600",
      desc: "Transferred to bank"
    },
  ];

  return (
    <div className="flex flex-col gap-8 pb-10">
      
      {/* Total Earnings Summary */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Lifetime Earnings</p>
              <h2 className="text-4xl font-black text-gray-900 tracking-tight">₹{Number(data.summary.total_earnings).toLocaleString()}</h2>
          </div>
          <div className="flex gap-4">
              <div className="text-right">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">In Processing</p>
                  <p className="text-xl font-black text-amber-600 tracking-tight">₹{Number(data.summary.processing_payouts).toLocaleString()}</p>
              </div>
          </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card) => (
          <div key={card.title} className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col items-center text-center relative group">
            <div className={`p-4 ${card.color} text-white rounded-2xl mb-6 shadow-lg`}>
              {card.icon}
            </div>
            <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">{card.title}</p>
            <h3 className="text-3xl font-black text-gray-900 mt-2 mb-2 tracking-tight">{card.value}</h3>
            <p className="text-xs text-gray-400 font-medium">{card.desc}</p>
            
            {card.title === "Withdrawable Balance" && Number(data.summary.withdrawable_balance) > 0 && (
              <button 
                onClick={handleRequestPayout}
                disabled={requesting}
                className="absolute -bottom-4 bg-white border border-gray-100 text-emerald-600 font-black text-[10px] uppercase tracking-widest px-6 py-3 rounded-xl shadow-xl hover:bg-emerald-600 hover:text-white transition-all active:scale-95 flex items-center gap-2"
              >
                {requesting ? "Processing..." : <>Request Payout <SendIcon sx={{ fontSize: 14 }} /></>}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Transaction History */}
      <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h3 className="text-xl font-black text-gray-800 tracking-tight">Payout Report</h3>
            <p className="text-sm text-gray-500 font-semibold mt-1">Track your payout requests and historical transfers</p>
          </div>
          <button className="flex items-center gap-2 text-xs font-black text-blue-600 bg-blue-50 px-5 py-3 rounded-2xl hover:bg-blue-100 transition">
            <DownloadIcon fontSize="small" /> Export Report
          </button>
        </div>

        {data.transactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50">
                  <th className="pb-6 font-black">Request ID</th>
                  <th className="pb-6 font-black">Initiated Date</th>
                  <th className="pb-6 font-black">Method</th>
                  <th className="pb-6 font-black text-right">Amount</th>
                  <th className="pb-6 font-black text-center">Status</th>
                  <th className="pb-6 font-black">Notes</th>
                </tr>
              </thead>
              <tbody className="text-sm text-gray-600">
                {data.transactions.map((tx) => (
                  <tr key={tx.payout_id} className="group hover:bg-gray-50/70 transition-all">
                    <td className="py-6 font-black text-gray-400 group-hover:text-blue-600 transition-colors uppercase">
                      #{tx.payout_id.slice(0, 8)}
                    </td>
                    <td className="py-6">
                      <div className="font-bold text-gray-800">{new Date(tx.created_at).toLocaleDateString()}</div>
                      <div className="text-[10px] text-gray-400 font-bold mt-0.5 uppercase tracking-wider">{new Date(tx.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                    </td>
                    <td className="py-6 font-semibold text-gray-600 capitalize">
                      {tx.payment_method || 'Automatic'}
                    </td>
                    <td className="py-6 font-black text-gray-900 text-right">
                      ₹{Number(tx.amount).toLocaleString()}
                    </td>
                    <td className="py-6 text-center">
                      <span className={`px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest
                        ${tx.status === 'Paid' ? 'bg-green-100 text-green-700' : 
                          tx.status === 'Requested' ? 'bg-amber-100 text-amber-700' : 
                          tx.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="py-6 text-xs font-bold text-gray-400 italic">
                      {tx.notes || "No notes"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        ) : (
          <div className="text-sm text-gray-500 py-20 text-center bg-gray-50/50 rounded-[2.5rem] border-4 border-dashed border-gray-100">
             <AccountBalanceWalletIcon sx={{ fontSize: 60, color: '#e2e8f0' }} className="mb-4" />
             <p className="font-bold text-xl text-gray-400 tracking-tight">No payouts requested yet</p>
             <p className="text-xs text-gray-400 mt-2">Request your first payout by clicking the button above.</p>
          </div>
        )}
      </div>

    </div>
  );
};

export default SellerPayments;
