// src/pages/DashboardPage.tsx

import React, { useState } from 'react';
import axiosInstance from '../api/axiosInstance.ts';

const DashboardPage = () => {
  const [file, setFile] = useState<File | null>(null);

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
      setFile(null); // Reset file input after upload
    } catch (error) {
      console.error('Upload failed:', error);
      alert('업로드에 실패했습니다.');
    }
  };

  // MainLayout이 뼈대를 제공하므로, 여기서는 실제 콘텐츠만 return합니다.
  return (
    <>
      <h2 className="text-2xl font-semibold text-gray-800">Dashboard</h2>
      <p className="mt-2 text-gray-600">Welcome back! Manage your papers efficiently.</p>
      
      {/* Upload Section */}
      <div className="mt-8 p-6 bg-white rounded-lg shadow">
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

      {/* Recently Added Papers (Placeholder) */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold text-gray-700">Recently Added</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
          {/* Example Paper Card */}
          <div className="p-4 bg-white rounded-lg shadow">
            <h4 className="font-bold text-gray-800">Attention Is All You Need</h4>
            <p className="text-sm text-gray-600 mt-1">Vaswani, et al. - 2017</p>
            <p className="text-sm text-gray-500 mt-2">The dominant sequence transduction models are based on complex recurrent or convolutional neural networks...</p>
          </div>
           <div className="p-4 bg-white rounded-lg shadow">
            <h4 className="font-bold text-gray-800">BERT: Pre-training of Deep Bidirectional...</h4>
            <p className="text-sm text-gray-600 mt-1">Devlin, et al. - 2018</p>
            <p className="text-sm text-gray-500 mt-2">We introduce a new language representation model called BERT, which stands for Bidirectional Encoder...</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default DashboardPage;