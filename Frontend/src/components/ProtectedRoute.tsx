import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppStore, UserRole } from '@/store/appStore';
import { getAccessToken } from '@/services/api';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { isAuthenticated, user, logout } = useAppStore();
  const location = useLocation();
  const hasToken = !!getAccessToken();

  // Zustand says authenticated but no real JWT exists — stale state, force logout
  if (isAuthenticated && !hasToken) {
    logout();
  }

  if (!isAuthenticated || !user || !hasToken) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const redirectMap: Record<UserRole, string> = {
      attendee: '/dashboard',
      organizer: '/organizer/dashboard',
      admin: '/admin/dashboard',
    };
    return <Navigate to={redirectMap[user.role]} replace />;
  }

  return <>{children}</>;
};
