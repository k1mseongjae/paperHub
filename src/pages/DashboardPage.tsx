import React, { useState } from 'react';
import axiosInstance from '../api/axiosInstance.ts';
import MyPapersPage from './MyPapersPage.tsx';
import GraphViewPage from './GraphViewPage.tsx';

const DashboardPage = () => {
  const [file, setFile] = useState<File | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'graph'>('list');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      alert('파일을 선택해주세요.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('sourceId', 'temp-source-id');
    formData.append('uploaderId', 'temp-uploader-id');

    try {
      const response = await axiosInstance.post('/api/papers/register-from-url', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      console.log('Upload success:', response.data);
      alert('논문이 성공적으로 업로드되었습니다.');
      setFile(null);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('업로드에 실패했습니다.');
    }
  };

  // ui 전환
  const renderViewSwitcher = () => (
    <div className="inline-flex items-center overflow-hidden rounded-lg border border-indigo-100 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setViewMode('list')}
        className={`px-4 py-2 text-sm font-medium transition-colors ${viewMode === 'list'
            ? 'bg-indigo-600 text-white'
            : 'text-gray-600 hover:bg-indigo-50 hover:text-indigo-600'
          }`}
      >
        목록
      </button>
      <button
        type="button"
        onClick={() => setViewMode('graph')}
        className={`px-4 py-2 text-sm font-medium transition-colors border-l border-indigo-100 ${viewMode === 'graph'
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
          <div className="h-full rounded-lg bg-white shadow overflow-hidden">
            <GraphViewPage />
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

      {/* Upload Section (Footer) */}
      <div className="mt-10 p-6 bg-white rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-700">Upload New Paper</h3>
        <div className="mt-4">
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
          />
          {file && <span className="ml-4 text-gray-600">{file.name}</span>}
        </div>
        <div className="mt-4">
          <button
            onClick={handleUpload}
            className="px-4 py-2 font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-gray-400"
            disabled={!file}
          >
            Upload
          </button>
        </div>
      </div>
    </>
  );
};

export default DashboardPage;
