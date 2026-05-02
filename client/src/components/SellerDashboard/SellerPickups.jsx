import React, { useState, useEffect } from "react";
import { getSellerPickups, addPickupLocation, deletePickupLocation, updatePickupLocation } from "../../services/pickupService";
import AddLocationIcon from '@mui/icons-material/AddLocation';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import MapIcon from '@mui/icons-material/Map';
import PhoneIcon from '@mui/icons-material/Phone';
import PersonIcon from '@mui/icons-material/Person';

import { useAuth } from "../../context/AuthContext.jsx";

const SellerPickups = () => {
    const { currentUser } = useAuth();
    const sellerId = currentUser?.id;

    const [pickups, setPickups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        location_name: "",
        contact_name: "",
        contact_phone: "",
        address_line_1: "",
        city: "",
        state: "",
        pincode: "",
        is_default: false
    });

    const fetchPickups = async () => {
        setLoading(true);
        const res = await getSellerPickups(sellerId);
        if (res.success) {
            setPickups(res.data);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchPickups();
    }, [sellerId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const res = await addPickupLocation({ ...formData, seller_id: sellerId });
        if (res.success) {
            alert("Pickup location added successfully!");
            setShowModal(false);
            fetchPickups();
            setFormData({
                location_name: "",
                contact_name: "",
                contact_phone: "",
                address_line_1: "",
                city: "",
                state: "",
                pincode: "",
                is_default: false
            });
        } else {
            alert("Error adding location: " + res.message);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this pickup location?")) {
            const res = await deletePickupLocation(id);
            if (res.success) {
                fetchPickups();
            }
        }
    };

    const handleSetDefault = async (pickupId) => {
        const res = await updatePickupLocation(pickupId, { is_default: true });
        if (res.success) {
            fetchPickups();
        }
    };

    return (
        <div className="flex flex-col gap-8 pb-10">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-2xl font-black text-gray-800 tracking-tight">Pickup Locations</h3>
                    <p className="text-sm text-gray-500 font-semibold mt-1">Manage where couriers pick up your orders</p>
                </div>
                <button 
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition active:scale-95 shadow-lg shadow-blue-100"
                >
                    <AddLocationIcon fontSize="small" /> Add New Location
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {pickups.length > 0 ? (
                    pickups.map((pickup) => (
                        <div 
                            key={pickup.pickup_id}
                            className={`bg-white p-8 rounded-[2.5rem] shadow-sm border-2 transition-all ${pickup.is_default ? 'border-blue-500 bg-blue-50/10' : 'border-gray-50 hover:border-gray-100'}`}
                        >
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className="text-xl font-black text-gray-800">{pickup.location_name}</h4>
                                        {pickup.is_default && (
                                            <span className="bg-blue-600 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full">Default</span>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-400 font-black uppercase tracking-widest">#{pickup.pickup_id.slice(0, 8)}</p>
                                </div>
                                <div className="flex gap-2">
                                    {!pickup.is_default && (
                                        <button 
                                            onClick={() => handleSetDefault(pickup.pickup_id)}
                                            className="p-3 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition"
                                            title="Set as Default"
                                        >
                                            <CheckCircleIcon fontSize="small" />
                                        </button>
                                    )}
                                    <button 
                                        onClick={() => handleDelete(pickup.pickup_id)}
                                        className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition"
                                        title="Delete Location"
                                    >
                                        <DeleteIcon fontSize="small" />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex gap-4 items-start">
                                    <div className="p-2.5 bg-gray-50 rounded-xl text-gray-400">
                                        <PersonIcon fontSize="small" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-0.5">Contact Person</p>
                                        <p className="text-sm font-bold text-gray-800">{pickup.contact_name}</p>
                                        <div className="flex items-center gap-1.5 mt-1 text-gray-500">
                                            <PhoneIcon sx={{ fontSize: 12 }} />
                                            <span className="text-xs font-bold">{pickup.contact_phone}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-4 items-start">
                                    <div className="p-2.5 bg-gray-50 rounded-xl text-gray-400">
                                        <MapIcon fontSize="small" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-0.5">Address Details</p>
                                        <p className="text-sm font-bold text-gray-700 leading-relaxed">
                                            {pickup.address_line_1}<br />
                                            {pickup.city}, {pickup.state} - {pickup.pincode}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full p-20 bg-white rounded-[3rem] border-4 border-dashed border-gray-50 flex flex-col items-center text-center">
                        <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center text-gray-200 mb-6">
                            <MapIcon sx={{ fontSize: 40 }} />
                        </div>
                        <h4 className="text-2xl font-black text-gray-800 tracking-tight">No Pickup Locations Found</h4>
                        <p className="text-gray-500 font-bold mt-2 max-w-sm">Please add at least one pickup location to start shipping your products with Shiprocket.</p>
                        <button 
                            onClick={() => setShowModal(true)}
                            className="mt-8 px-8 py-4 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition"
                        >
                            Create First Location
                        </button>
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
                    <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="px-10 py-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h3 className="text-2xl font-black text-gray-800 tracking-tight">Add Pickup Location</h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 font-bold">Close</button>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="p-10 space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="col-span-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block ml-1">Location Name (e.g. Warehouse A)</label>
                                    <input 
                                        type="text" required
                                        className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-100 outline-none font-bold"
                                        value={formData.location_name}
                                        onChange={(e) => setFormData({...formData, location_name: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block ml-1">Contact Name</label>
                                    <input 
                                        type="text" required
                                        className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-100 outline-none font-bold"
                                        value={formData.contact_name}
                                        onChange={(e) => setFormData({...formData, contact_name: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block ml-1">Contact Phone</label>
                                    <input 
                                        type="text" required
                                        className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-100 outline-none font-bold"
                                        value={formData.contact_phone}
                                        onChange={(e) => setFormData({...formData, contact_phone: e.target.value})}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block ml-1">Address Line 1</label>
                                    <input 
                                        type="text" required
                                        className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-100 outline-none font-bold"
                                        value={formData.address_line_1}
                                        onChange={(e) => setFormData({...formData, address_line_1: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block ml-1">City</label>
                                    <input 
                                        type="text" required
                                        className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-100 outline-none font-bold"
                                        value={formData.city}
                                        onChange={(e) => setFormData({...formData, city: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block ml-1">State</label>
                                    <input 
                                        type="text" required
                                        className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-100 outline-none font-bold"
                                        value={formData.state}
                                        onChange={(e) => setFormData({...formData, state: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block ml-1">Pincode</label>
                                    <input 
                                        type="text" required
                                        className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-100 outline-none font-bold"
                                        value={formData.pincode}
                                        onChange={(e) => setFormData({...formData, pincode: e.target.value})}
                                    />
                                </div>
                                <div className="flex items-center gap-3 ml-1">
                                    <input 
                                        type="checkbox"
                                        id="is_default"
                                        className="w-5 h-5 rounded-lg border-gray-300 text-blue-600 focus:ring-blue-500"
                                        checked={formData.is_default}
                                        onChange={(e) => setFormData({...formData, is_default: e.target.checked})}
                                    />
                                    <label htmlFor="is_default" className="text-sm font-bold text-gray-700">Set as Default Location</label>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-gray-100 flex justify-end gap-4">
                                <button 
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-8 py-4 bg-white border border-gray-200 text-gray-500 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-gray-100 transition"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    className="px-10 py-4 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition shadow-lg shadow-blue-100"
                                >
                                    Save Location
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SellerPickups;
