import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../state/authStore';

interface AuthGuardProps {
  children: React.ReactNode;
}

const AuthGuard = ({ children }: AuthGuardProps) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // 로그인 상태가 아니면 로그인 페이지로 이동시킵니다.
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default AuthGuard;
