import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// Minimal spinner shown while session is being confirmed on page refresh
const AuthLoader = () => (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-400 font-medium tracking-widest uppercase">Verifying session…</p>
        </div>
    </div>
);

export const SellerProtectedRoute = ({ children, requireVerified = false }) => {
    const { currentUser, loading } = useAuth();
    const location = useLocation();

    if (loading) return <AuthLoader />;

    if (!currentUser || currentUser.role !== 'seller') {
        return <Navigate to="/seller/login" state={{ from: location }} replace />;
    }

    if (requireVerified && currentUser.is_verified === false) {
        return <Navigate to="/seller/onboarding" replace />;
    }

    return children;
};

export const AdminProtectedRoute = ({ children }) => {
    const { currentUser, loading } = useAuth();
    const location = useLocation();

    if (loading) return <AuthLoader />;

    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'super_admin')) {
        return <Navigate to="/admin/login" state={{ from: location }} replace />;
    }

    return children;
};

export const CustomerProtectedRoute = ({ children }) => {
    const { currentUser, loading } = useAuth();
    const location = useLocation();

    if (loading) return <AuthLoader />;

    if (!currentUser || (currentUser.role !== 'customer' && currentUser.role !== 'admin' && currentUser.role !== 'super_admin')) {
        return <Navigate to="/customer-login" state={{ from: location }} replace />;
    }

    return children;
};

export const PublicRoute = ({ children, restrictedTo = null }) => {
    const { currentUser, loading } = useAuth();

    if (loading) return <AuthLoader />;

    if (currentUser) {
        if (currentUser.role === 'admin' || currentUser.role === 'super_admin') {
            return <Navigate to="/admin" replace />;
        }
        if (currentUser.role === 'seller') {
            if (currentUser.is_verified === false) {
                return <Navigate to="/seller/onboarding" replace />;
            }
            return <Navigate to="/seller" replace />;
        }
        if (currentUser.role === 'customer') {
            if (restrictedTo === 'customer') {
                return <Navigate to="/" replace />;
            }
            return children;
        }
    }

    return children;
};
