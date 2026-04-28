import { useState, useEffect } from "react";
import { Users, Shield, Trash2, CheckCircle, XCircle, AlertCircle, Loader2, Key, Lock } from "lucide-react";
import { api } from "../../../services/api";
import { useToast } from "../../../hooks/use-toast";
import { useAuth } from "../../../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function AdministratorsPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showMasterKeyModal, setShowMasterKeyModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [newMasterKey, setNewMasterKey] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (currentUser?.role !== 'super_admin') {
      navigate('/admin');
      return;
    }
    fetchAdmins();
  }, [currentUser]);

  const fetchAdmins = async () => {
    try {
      const res = await api.get("/user/super-admin/administrators");
      if (res.data.success) {
        setAdmins(res.data.data);
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to fetch administrators" });
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (admin) => {
    setProcessingId(admin.id);
    try {
      const res = await api.patch(`/user/super-admin/administrator/${admin.id}/status`, { is_active: !admin.is_active });
      if (res.data.success) {
        toast({ title: "Success", description: res.data.message });
        setAdmins(prev => prev.map(a => a.id === admin.id ? { ...a, is_active: !a.is_active } : a));
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Operation failed" });
    } finally {
      setProcessingId(null);
    }
  };

  const deleteAdmin = async (id) => {
    if (!window.confirm("Are you sure you want to delete this administrator permanently?")) return;
    
    setProcessingId(id);
    try {
      const res = await api.delete(`/user/super-admin/administrator/${id}`);
      if (res.data.success) {
        toast({ title: "Deleted", description: "Administrator account removed." });
        setAdmins(prev => prev.filter(a => a.id !== id));
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to delete administrator" });
    } finally {
      setProcessingId(null);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      toast({ variant: "destructive", title: "Error", description: "Password must be at least 6 characters" });
      return;
    }

    setProcessingId(selectedAdmin.id);
    try {
      const res = await api.put(`/user/admin/change-password/${selectedAdmin.id}`, { newPassword });
      if (res.data.success) {
        toast({ title: "Reset Complete", description: "Password updated and secure email sent to administrator." });
        setShowPasswordModal(false);
        setNewPassword("");
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: error.response?.data?.message || "Failed to update password" });
    } finally {
      setProcessingId(null);
    }
  };

  const handleUpdateMasterKey = async (e) => {
    e.preventDefault();
    if (!newMasterKey || newMasterKey.length < 8) {
      toast({ variant: "destructive", title: "Error", description: "Master Key must be at least 8 characters" });
      return;
    }

    setProcessingId('master');
    try {
      const res = await api.put("/user/super-admin/master-key", { newMasterKey });
      if (res.data.success) {
        toast({ title: "Security Updated", description: "Platform Master Key has been rotated." });
        setShowMasterKeyModal(false);
        setNewMasterKey("");
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to update Master Key" });
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-slate-400 mb-4" size={40} />
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Loading Authority List...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Administrators</h1>
          <p className="text-slate-500 mt-2 font-medium">Manage platform administrative authorities and access levels.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowMasterKeyModal(true)}
            className="h-14 px-8 rounded-2xl bg-amber-50 text-amber-600 font-black text-[11px] uppercase tracking-widest hover:bg-amber-100 transition-all border border-amber-100 flex items-center gap-3"
          >
            <Lock size={16} /> Master Key
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {admins.map((admin) => (
          <div key={admin.id} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 hover:shadow-xl transition-all duration-300 group">
            <div className="flex justify-between items-start mb-6">
              <div className="h-14 w-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-900 group-hover:bg-slate-950 group-hover:text-white transition-colors duration-300">
                <Shield size={24} />
              </div>
              <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${admin.is_active ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                {admin.is_active ? 'Active' : 'Blocked'}
              </div>
            </div>

            <h3 className="text-lg font-black text-slate-900 truncate">{admin.name}</h3>
            <p className="text-slate-400 text-sm font-medium mb-6 truncate">{admin.email}</p>

            <div className="space-y-3 mb-8">
              <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest text-slate-400">
                <span>Role</span>
                <span className="text-slate-950">{admin.role}</span>
              </div>
              <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest text-slate-400">
                <span>Joined</span>
                <span className="text-slate-950">{new Date(admin.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest text-slate-400">
                <span>Last Login</span>
                <span className="text-slate-950">{admin.last_login_at ? new Date(admin.last_login_at).toLocaleDateString() : 'Never'}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => toggleStatus(admin)}
                disabled={processingId === admin.id}
                className={`flex-1 h-12 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${admin.is_active ? 'bg-amber-50 text-amber-600 hover:bg-amber-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
              >
                {processingId === admin.id ? <Loader2 size={14} className="animate-spin" /> : (admin.is_active ? <XCircle size={14} /> : <CheckCircle size={14} />)}
                {admin.is_active ? 'Block' : 'Unblock'}
              </button>

              <button 
                onClick={() => {
                  setSelectedAdmin(admin);
                  setShowPasswordModal(true);
                }}
                className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all"
              >
                <Key size={18} />
              </button>
              
              <button 
                onClick={() => deleteAdmin(admin.id)}
                disabled={processingId === admin.id}
                className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-600 hover:text-white transition-all"
              >
                {processingId === admin.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={18} />}
              </button>
            </div>
          </div>
        ))}
      </div>

      {showPasswordModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Change Password</h3>
            <p className="text-slate-500 text-sm mb-6">Setting new credentials for <span className="text-slate-900 font-bold">{selectedAdmin?.name}</span></p>
            
            <form onSubmit={handlePasswordChange} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">New Password</label>
                <input 
                  type="password" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-6 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-slate-950/5 focus:bg-white transition-all"
                  required
                  autoFocus
                />
              </div>

              <div className="flex gap-3">
                <button 
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="flex-1 h-14 rounded-2xl bg-slate-100 text-slate-600 font-black text-[11px] uppercase tracking-widest hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={processingId === selectedAdmin?.id}
                  className="flex-1 h-14 rounded-2xl bg-slate-950 text-white font-black text-[11px] uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 disabled:opacity-50"
                >
                  {processingId === selectedAdmin?.id ? <Loader2 size={16} className="animate-spin mx-auto" /> : "Update Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showMasterKeyModal && (
        <div className="fixed inset-0 bg-amber-950/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-md p-10 shadow-2xl border border-amber-100 animate-in zoom-in-95 duration-200">
            <div className="h-16 w-16 rounded-3xl bg-amber-50 text-amber-600 flex items-center justify-center mb-6">
              <Lock size={32} />
            </div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Master Security Key</h3>
            <p className="text-slate-500 text-sm mb-8 font-medium">Update the secret key required for new administrative registrations.</p>
            
            <form onSubmit={handleUpdateMasterKey} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">New Registration Key</label>
                <input 
                  type="text" 
                  value={newMasterKey}
                  onChange={(e) => setNewMasterKey(e.target.value)}
                  placeholder="Min 8 characters recommended"
                  className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-6 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/10 focus:bg-white transition-all"
                  required
                />
              </div>

              <div className="flex gap-3">
                <button 
                  type="button"
                  onClick={() => setShowMasterKeyModal(false)}
                  className="flex-1 h-14 rounded-2xl bg-slate-100 text-slate-600 font-black text-[11px] uppercase tracking-widest hover:bg-slate-200 transition-all"
                >
                  Close
                </button>
                <button 
                  type="submit"
                  disabled={processingId === 'master'}
                  className="flex-[1.5] h-14 rounded-2xl bg-amber-600 text-white font-black text-[11px] uppercase tracking-widest hover:bg-amber-700 transition-all shadow-lg shadow-amber-200 disabled:opacity-50"
                >
                  {processingId === 'master' ? <Loader2 size={16} className="animate-spin mx-auto" /> : "Rotate Master Key"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {admins.length === 0 && (
        <div className="bg-slate-50 rounded-3xl p-20 flex flex-col items-center text-center">
          <div className="h-20 w-20 rounded-3xl bg-white flex items-center justify-center text-slate-200 mb-6 shadow-sm">
            <Users size={40} />
          </div>
          <h3 className="text-xl font-black text-slate-900">No Administrators Found</h3>
          <p className="text-slate-500 mt-2">There are currently no regular administrators setup in the system.</p>
        </div>
      )}
    </div>
  );
}
