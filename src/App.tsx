import { Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import AuthGuard from './components/AuthGuard';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      {/* '/' 경로는 AuthGuard를 통해 보호됩니다. */}
      <Route 
        path="/" 
        element={
          <AuthGuard>
            <DashboardPage />
          </AuthGuard>
        } 
      />
    </Routes>
  );
}

export default App;
