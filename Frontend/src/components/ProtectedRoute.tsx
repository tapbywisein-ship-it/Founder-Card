import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppStore, UserRole } from '@/store/appStore';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { isAuthenticated, user } = useAppStore();
  const location = useLocation();

  if (!isAuthenticated || !user) {
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
