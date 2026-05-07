import { useState, useEffect } from "react";
import { api } from "../../../services/api";
import { Shield, Search, Clock, User, Globe, Laptop, ChevronDown, ChevronUp, History, Info } from "lucide-react";
import { cn } from "../../../lib/utils";

export default function SystemLogsPage() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [expandedLog, setExpandedLog] = useState(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalLogs, setTotalLogs] = useState(0);

    useEffect(() => {
        fetchLogs(page);
    }, [page]);

    const fetchLogs = async (currentPage = 1) => {
        setLoading(true);
        try {
            const res = await api.get(`/user/admin/audit-logs?page=${currentPage}&limit=20`);
            if (res.data.success) {
                setLogs(res.data.data);
                if (res.data.pagination) {
                    setTotalPages(res.data.pagination.totalPages || 1);
                    setTotalLogs(res.data.pagination.total || 0);
                }
            }
        } catch (error) {
            console.error("Failed to fetch logs:", error);
        } finally {
            setLoading(false);
        }
    };

    const getActionColor = (action) => {
        if (action.includes('LOGIN')) return "bg-emerald-50 text-emerald-600 border-emerald-100";
        if (action.includes('CREATE')) return "bg-blue-50 text-blue-600 border-blue-100";
        if (action.includes('UPDATE')) return "bg-amber-50 text-amber-600 border-amber-100";
        if (action.includes('DELETE')) return "bg-rose-50 text-rose-600 border-rose-100";
        return "bg-slate-50 text-slate-600 border-slate-100";
    };

    const filteredLogs = logs.filter(log => 
        log.actor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.table_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const formatData = (data) => {
        if (!data) return "None";
        if (typeof data === 'object') return JSON.stringify(data, null, 2);
        try {
            return JSON.stringify(JSON.parse(data), null, 2);
        } catch (e) {
            return String(data);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="h-10 w-10 rounded-2xl bg-slate-950 flex items-center justify-center text-white shadow-xl">
                            <Shield size={20} />
                        </div>
                        <h1 className="text-3xl font-black text-slate-950 tracking-tight">System Audit Logs</h1>
                    </div>
                    <p className="text-slate-500 font-medium text-sm ml-1">Comprehensive history of all administrative actions and security events</p>
                </div>

                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-950 transition-colors" size={18} />
                    <input 
                        type="text"
                        placeholder="Search by name, action, or table..."
                        className="w-full md:w-80 pl-12 pr-6 py-4 bg-white border border-slate-200 rounded-2xl font-bold text-sm focus:ring-4 focus:ring-slate-100 focus:border-slate-950 outline-none transition-all shadow-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Logs List */}
            <div className="space-y-4">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[40px] border border-slate-100 shadow-sm">
                        <div className="h-12 w-12 border-4 border-slate-100 border-t-slate-950 rounded-full animate-spin mb-4" />
                        <p className="text-slate-500 font-black uppercase tracking-widest text-[10px]">Synchronizing Audit Trail...</p>
                    </div>
                ) : filteredLogs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[40px] border border-slate-100 shadow-sm text-center">
                        <div className="h-20 w-20 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-300 mb-6">
                            <History size={40} />
                        </div>
                        <p className="text-slate-950 font-black text-xl mb-2">No logs found</p>
                        <p className="text-slate-500 font-medium max-w-xs">Try adjusting your search terms or perform an administrative action to see it logged here.</p>
                    </div>
                ) : (
                    filteredLogs.map((log) => (
                        <div 
                            key={log.audit_id}
                            className={cn(
                                "bg-white rounded-3xl border border-slate-100 shadow-sm transition-all overflow-hidden",
                                expandedLog === log.audit_id ? "ring-2 ring-slate-950 shadow-xl" : "hover:border-slate-300"
                            )}
                        >
                            <div 
                                className="p-6 cursor-pointer flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                                onClick={() => setExpandedLog(expandedLog === log.audit_id ? null : log.audit_id)}
                            >
                                <div className="flex items-center gap-6">
                                    <div className={cn(
                                        "px-4 py-2 rounded-xl border text-[11px] font-black uppercase tracking-widest",
                                        getActionColor(log.action)
                                    )}>
                                        {log.action}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-sm font-black text-slate-950">{log.actor_name || "Unknown User"}</span>
                                            <span className="text-slate-400 font-bold">•</span>
                                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded-lg">{log.table_name}</span>
                                        </div>
                                        <div className="flex items-center gap-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            <div className="flex items-center gap-1.5"><Clock size={12} /> {new Date(log.created_at).toLocaleString()}</div>
                                            <div className="flex items-center gap-1.5"><Globe size={12} /> {log.ip_address}</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    {expandedLog === log.audit_id ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
                                </div>
                            </div>

                            {expandedLog === log.audit_id && (
                                <div className="px-6 pb-6 pt-2 border-t border-slate-50 animate-in slide-in-from-top-4 duration-300">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                        <div className="bg-slate-50/50 rounded-2xl p-4">
                                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                <User size={12} /> Actor Context
                                            </h4>
                                            <p className="text-[12px] font-bold text-slate-600 mb-1">Type: <span className="text-slate-950 uppercase">{log.admin_id ? 'Admin' : 'Seller'}</span></p>
                                            <p className="text-[12px] font-bold text-slate-600">Email: <span className="text-slate-950">{log.actor_email}</span></p>
                                        </div>
                                        <div className="bg-slate-50/50 rounded-2xl p-4">
                                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                <Laptop size={12} /> Device Info
                                            </h4>
                                            <p className="text-[11px] font-bold text-slate-600 leading-relaxed truncate" title={log.user_agent}>
                                                {log.user_agent}
                                            </p>
                                        </div>
                                    </div>

                                    {(log.old_values || log.new_values) && (
                                        <div className="space-y-4">
                                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                <Info size={12} /> Data Changes
                                            </h4>
                                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2">Old State</span>
                                                    <pre className="bg-slate-900 text-slate-300 p-4 rounded-2xl text-[11px] overflow-x-auto border-4 border-slate-800 shadow-inner">
                                                        {formatData(log.old_values)}
                                                    </pre>
                                                </div>
                                                <div className="space-y-2">
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-blue-400 ml-2">New State</span>
                                                    <pre className="bg-slate-950 text-white p-4 rounded-2xl text-[11px] overflow-x-auto border-4 border-slate-800 shadow-inner ring-1 ring-blue-500/20">
                                                        {formatData(log.new_values)}
                                                    </pre>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Pagination Controls */}
            {!loading && totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/85 backdrop-blur-md px-8 py-5 rounded-[30px] border border-slate-100 shadow-md mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="text-xs font-black text-slate-500 uppercase tracking-widest">
                        Showing page <span className="text-slate-950">{page}</span> of <span className="text-slate-950">{totalPages}</span> ({totalLogs} Total Event Logs)
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage(prev => Math.max(1, prev - 1))}
                            disabled={page === 1}
                            className="px-5 py-2.5 bg-slate-50 hover:bg-slate-950 text-slate-950 hover:text-white disabled:opacity-30 disabled:hover:bg-slate-50 disabled:hover:text-slate-950 rounded-xl font-black text-[11px] uppercase tracking-widest border border-slate-100 transition-all duration-300 shadow-sm disabled:cursor-not-allowed"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={page === totalPages}
                            className="px-5 py-2.5 bg-slate-50 hover:bg-slate-950 text-slate-950 hover:text-white disabled:opacity-30 disabled:hover:bg-slate-50 disabled:hover:text-slate-950 rounded-xl font-black text-[11px] uppercase tracking-widest border border-slate-100 transition-all duration-300 shadow-sm disabled:cursor-not-allowed"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
