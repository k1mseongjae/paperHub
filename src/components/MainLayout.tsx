import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../state/authStore';

const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const linkStyle = "block px-6 py-3 text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-md transition-colors";
  const activeLinkStyle = "block px-6 py-3 text-indigo-700 bg-indigo-100 font-semibold rounded-md";

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-72 bg-white shadow-lg p-4 flex flex-col">
        <div className="p-4 mb-6">
          <h1 className="text-3xl font-bold text-indigo-600">PaperHub</h1>
        </div>
        <nav className="flex flex-col space-y-2">
          <NavLink to="/dashboard" end className={({ isActive }) => isActive ? activeLinkStyle : linkStyle}>Home</NavLink>
          <NavLink to="/search" className={({ isActive }) => isActive ? activeLinkStyle : linkStyle}>Search</NavLink>
        </nav>
        <div className="mt-auto p-4">
           <button onClick={handleLogout} className="w-full text-left px-6 py-3 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-md transition-colors">
              Logout
            </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-end p-4 bg-white border-b">
          <div>
            <span className="text-gray-700">Welcome back!</span>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
