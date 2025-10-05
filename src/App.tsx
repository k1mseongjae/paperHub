// src/App.tsx

import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage.tsx';
import SignupPage from './pages/SignupPage.tsx';
import DashboardPage from './pages/DashboardPage.tsx';
import MyPapersPage from './pages/MyPapersPage.tsx';
import SearchPage from './pages/SearchPage.tsx';
import ClusteringPage from './pages/ClusteringPage.tsx';
import NoteViewerPage from './pages/NoteViewerPage.tsx';
import WelcomePage from './pages/WelcomePage.tsx';
import AuthGuard from './components/AuthGuard.tsx';
import MainLayout from './components/MainLayout.tsx';
import { useAuthStore } from './state/authStore.ts';

function App() {
  const isAuthenticated = useAuthStore((state) => !!state.token);

  return (
    <Routes>
      {/* 1. Public Routes: 누구나 접근 가능한 페이지 */}
      <Route path="/welcome" element={<WelcomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      {/* 2. Root Redirector: 로그인 상태에 따라 /welcome 또는 /dashboard로 보냄 */}
      <Route
        path="/"
        element={isAuthenticated ? <Navigate to="/dashboard" /> : <Navigate to="/welcome" />}
      />

      {/* 3. Protected Routes: 로그인해야만 접근 가능한 페이지들 */}
      <Route 
        path="/dashboard" 
        element={ <AuthGuard><MainLayout><DashboardPage /></MainLayout></AuthGuard> } 
      />
      <Route 
        path="/my-papers" 
        element={ <AuthGuard><MainLayout><MyPapersPage /></MainLayout></AuthGuard> } 
      />
      <Route 
        path="/search" 
        element={ <AuthGuard><MainLayout><SearchPage /></MainLayout></AuthGuard> } 
      />
      <Route 
        path="/clustering" 
        element={ <AuthGuard><MainLayout><ClusteringPage /></MainLayout></AuthGuard> } 
      />
      <Route 
        path="/paper/:paperId" 
        element={ <AuthGuard><MainLayout><NoteViewerPage /></MainLayout></AuthGuard> } 
      />

      {/* 4. Fallback: 정의되지 않은 주소로 접근 시 루트 경로로 보냄 */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;