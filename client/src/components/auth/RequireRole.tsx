import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import type { UserRole } from '../../lib/api';

interface RequireRoleProps {
  allowedRoles: UserRole[];
}

export default function RequireRole({ allowedRoles }: RequireRoleProps) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return null;

  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
