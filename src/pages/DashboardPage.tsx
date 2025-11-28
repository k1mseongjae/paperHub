import { useState } from 'react';
import MyPapersPage from './MyPapersPage.tsx';
import ClusteringPage from './ClusteringPage.tsx';

const DashboardPage = () => {
  const [viewMode, setViewMode] = useState<'list' | 'graph'>('list');

  // ui 전환
  const renderViewSwitcher = () => (
    <div className="inline-flex items-center overflow-hidden rounded-lg border border-indigo-100 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setViewMode('list')}
        className={`px-4 py-2 text-sm font-medium transition-colors ${
          viewMode === 'list'
            ? 'bg-indigo-600 text-white'
            : 'text-gray-600 hover:bg-indigo-50 hover:text-indigo-600'
        }`}
      >
        목록
      </button>
      <button
        type="button"
        onClick={() => setViewMode('graph')}
        className={`px-4 py-2 text-sm font-medium transition-colors border-l border-indigo-100 ${
          viewMode === 'graph'
            ? 'bg-indigo-600 text-white'
            : 'text-gray-600 hover:bg-indigo-50 hover:text-indigo-600'
        }`}
      >
        그래프
      </button>
    </div>
  );

  const renderViewContent = () => {
    if (viewMode === 'graph') {
      return (
        <div className="mt-8 h-[640px]">
          <div className="h-full rounded-lg bg-white shadow">
            <ClusteringPage />
          </div>
        </div>
      );
    }

    return (
      <div className="mt-8">
        <MyPapersPage variant="list" />
      </div>
    );
  };

  return (
    <>
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">Dashboard</h2>
          <p className="mt-2 text-gray-600">Welcome back! Manage your papers efficiently.</p>
        </div>
        {renderViewSwitcher()}
      </div>

      {renderViewContent()}
    </>
  );
};

export default DashboardPage;
