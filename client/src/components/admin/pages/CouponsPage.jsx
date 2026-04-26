import React, { useState, useEffect } from 'react';
import { getAllCoupons, createCoupon, updateCoupon, deleteCoupon } from '../../../services/couponService';
import { card, buttonPrimary, buttonSecondary, input } from '../../../utils/UIStyles';

const CouponsPage = () => {
    const [coupons, setCoupons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState(null);
    const [formData, setFormData] = useState({
        code: '',
        type: 'percentage',
        discount_percent: '',
        max_discount: '',
        min_order_value: '',
        valid_until: '',
        max_usage: '',
        is_active: true
    });

    useEffect(() => {
        fetchCoupons();
    }, []);

    const fetchCoupons = async () => {
        setLoading(true);
        const res = await getAllCoupons();
        if (res.success) {
            setCoupons(res.data);
        }
        setLoading(false);
    };

    const handleOpenModal = (coupon = null) => {
        if (coupon) {
            setEditingCoupon(coupon);
            setFormData({
                code: coupon.code,
                type: coupon.type,
                discount_percent: coupon.discount_percent,
                max_discount: coupon.max_discount,
                min_order_value: coupon.min_order_value,
                valid_until: coupon.valid_until ? new Date(coupon.valid_until).toISOString().split('T')[0] : '',
                max_usage: coupon.max_usage || '',
                is_active: coupon.is_active
            });
        } else {
            setEditingCoupon(null);
            setFormData({
                code: '',
                type: 'percentage',
                discount_percent: '',
                max_discount: '',
                min_order_value: '',
                valid_until: '',
                max_usage: '',
                is_active: true
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const user = JSON.parse(localStorage.getItem('auth'));
        const adminId = user?.admin_id || user?.id || user?.adminId;
        console.log("Current admin user object:", user);
        const payload = { ...formData, admin_id: adminId };
        
        const res = editingCoupon 
            ? await updateCoupon(editingCoupon.coupon_id, payload)
            : await createCoupon(payload);
        
        if (res.success) {
            setIsModalOpen(false);
            fetchCoupons();
        } else {
            alert(res.message);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this coupon?')) {
            const auth = JSON.parse(localStorage.getItem('auth'));
            const res = await deleteCoupon(id, auth?.id);
            if (res.success) {
                fetchCoupons();
            } else {
                alert(res.message);
            }
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800">Manage Coupons</h1>
                <button 
                    onClick={() => handleOpenModal()} 
                    className={`${buttonPrimary} px-6`}
                >
                    + Create Coupon
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-10">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                </div>
            ) : (
                <div className={`${card} overflow-hidden`}>
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Code</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Discount</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Usage</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {coupons.map((coupon) => (
                                <tr key={coupon.coupon_id} className="hover:bg-gray-50 transition">
                                    <td className="px-6 py-4">
                                        <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                            {coupon.code}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        {coupon.discount_percent}% off 
                                        {coupon.max_discount && ` (Max ₹${coupon.max_discount})`}
                                        <div className="text-[10px] text-gray-400">Min Order: ₹{coupon.min_order_value}</div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        {coupon.used_count} / {coupon.max_usage || '∞'}
                                    </td>
                                    <td className="px-6 py-4">
                                        {(() => {
                                            const isExpired = coupon.valid_until && new Date(coupon.valid_until) < new Date();
                                            if (isExpired) {
                                                return (
                                                    <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase bg-orange-100 text-orange-600">
                                                        Expired
                                                    </span>
                                                );
                                            }
                                            return (
                                                <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                                                    coupon.is_active ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                                                }`}>
                                                    {coupon.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            );
                                        })()}
                                    </td>
                                    <td className="px-6 py-4 text-right space-x-2">
                                        <button 
                                            onClick={() => handleOpenModal(coupon)}
                                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                        >
                                            Edit
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(coupon.coupon_id)}
                                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className={`${card} w-full max-w-md p-8`}>
                        <h2 className="text-xl font-bold mb-6">
                            {editingCoupon ? 'Edit Coupon' : 'Create New Coupon'}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Coupon Code</label>
                                <input 
                                    type="text" 
                                    value={formData.code} 
                                    onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                                    className={input}
                                    placeholder="SUMMER2026"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Discount %</label>
                                    <input 
                                        type="number" 
                                        value={formData.discount_percent} 
                                        onChange={(e) => setFormData({...formData, discount_percent: e.target.value})}
                                        className={input}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Max Usage</label>
                                    <input 
                                        type="number" 
                                        value={formData.max_usage} 
                                        onChange={(e) => setFormData({...formData, max_usage: e.target.value})}
                                        className={input}
                                        placeholder="No limit"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Max Discount (₹)</label>
                                    <input 
                                        type="number" 
                                        value={formData.max_discount} 
                                        onChange={(e) => setFormData({...formData, max_discount: e.target.value})}
                                        className={input}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Min Order (₹)</label>
                                    <input 
                                        type="number" 
                                        value={formData.min_order_value} 
                                        onChange={(e) => setFormData({...formData, min_order_value: e.target.value})}
                                        className={input}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Valid Until</label>
                                <input 
                                    type="date" 
                                    value={formData.valid_until} 
                                    onChange={(e) => setFormData({...formData, valid_until: e.target.value})}
                                    className={input}
                                />
                            </div>
                            <div className="flex items-center gap-2 py-2">
                                <input 
                                    type="checkbox" 
                                    id="is_active"
                                    checked={formData.is_active} 
                                    onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                                    className="w-4 h-4 text-blue-600 rounded"
                                />
                                <label htmlFor="is_active" className="text-sm font-medium text-gray-700">Active</label>
                            </div>
                            <div className="flex gap-4 pt-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className={`${buttonSecondary} flex-1`}>
                                    Cancel
                                </button>
                                <button type="submit" className={`${buttonPrimary} flex-1`}>
                                    {editingCoupon ? 'Update' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CouponsPage;
