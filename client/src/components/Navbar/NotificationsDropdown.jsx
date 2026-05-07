import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getCustomerNotifications, markNotificationAsRead, markAllNotificationsAsRead } from "../../services/notificationService";
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';

const NotificationsDropdown = ({ customerId }) => {
    const [notifications, setNotifications] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const fetchNotifications = async () => {
        if (!customerId) return;
        const res = await getCustomerNotifications(customerId);
        if (res.success) {
            setNotifications(res.data);
        }
    };

    useEffect(() => {
        fetchNotifications();
        // Poll for new notifications every minute
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    }, [customerId]);

    const handleMarkAsRead = async (id) => {
        await markNotificationAsRead(id);
        setNotifications(prev => prev.map(n => n.notification_id === id ? { ...n, is_read: true } : n));
    };

    const handleMarkAllRead = async () => {
        await markAllNotificationsAsRead(customerId);
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    };

    const unreadCount = notifications.filter(n => !n.is_read).length;

    return (
        <div className="relative" onMouseLeave={() => setShowDropdown(false)}>
            <button
                onMouseEnter={() => setShowDropdown(true)}
                className={`relative p-2.5 rounded-2xl hover:bg-amber-50 text-gray-700 hover:text-amber-600 transition-all duration-300 active:scale-95`}
            >
                <NotificationsNoneIcon />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500 text-[10px] font-black text-white items-center justify-center">
                            {unreadCount}
                        </span>
                    </span>
                )}
            </button>

            {showDropdown && (
                <div className="absolute top-full right-0 mt-2 w-80 bg-white shadow-2xl rounded-3xl overflow-hidden z-[100] border border-gray-100 animate-in slide-in-from-top-2 duration-300">
                    <div className="p-5 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                        <div>
                            <h4 className="text-xs font-black text-gray-800 uppercase tracking-widest">Notifications</h4>
                            <p className="text-[10px] text-gray-400 font-bold mt-0.5">You have {unreadCount} unread messages</p>
                        </div>
                        {unreadCount > 0 && (
                            <button 
                                onClick={handleMarkAllRead}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors title='Mark all as read'"
                            >
                                <DoneAllIcon fontSize="small" />
                            </button>
                        )}
                    </div>

                    <div className="max-h-[400px] overflow-y-auto">
                        {notifications.length > 0 ? (
                            notifications.map((n) => (
                                <div 
                                    key={n.notification_id}
                                    onClick={() => handleMarkAsRead(n.notification_id)}
                                    className={`p-5 hover:bg-gray-50 transition-colors flex gap-4 cursor-pointer border-b border-gray-50 last:border-0 relative ${!n.is_read ? 'bg-blue-50/30' : ''}`}
                                >
                                    {!n.is_read && (
                                        <div className="absolute left-1.5 top-1/2 -translate-y-1/2">
                                            <FiberManualRecordIcon sx={{ fontSize: 8 }} className="text-blue-500" />
                                        </div>
                                    )}
                                    <div className="flex-1">
                                        <p className={`text-xs ${!n.is_read ? 'font-black text-gray-900' : 'font-bold text-gray-500'}`}>
                                            {n.message}
                                        </p>
                                        <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest mt-2 block">
                                            {new Date(n.created_at).toLocaleDateString()} • {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-10 text-center flex flex-col items-center">
                                <NotificationsNoneIcon sx={{ fontSize: 40 }} className="text-gray-100 mb-2" />
                                <p className="text-gray-400 text-xs font-bold italic">No notifications yet</p>
                            </div>
                        )}
                    </div>

                    {notifications.length > 0 && (
                        <div className="p-4 bg-gray-50 border-t border-gray-100 text-center">
                            <button className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline">
                                View All Notifications
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default NotificationsDropdown;
