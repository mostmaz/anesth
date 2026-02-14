import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { type ReactNode } from 'react';

interface RoleGuardProps {
    children: ReactNode;
    allowedRoles: ('SENIOR' | 'RESIDENT' | 'NURSE')[];
}

export default function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
    const user = useAuthStore((state) => state.user);
    const location = useLocation();

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (!allowedRoles.includes(user.role)) {
        return <div className="p-8 text-center text-red-600">Access Denied: You do not have permission to view this page.</div>;
    }

    return <>{children}</>;
}
