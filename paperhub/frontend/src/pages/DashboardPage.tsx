import React, { useState } from 'react';
import { useAuthStore } from '../state/authStore';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';

const DashboardPage = () => {
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  
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
    } catch (error) {
      console.error('Upload failed:', error);
      alert('업로드에 실패했습니다.');
    }
  };


  return (
    <div>
      <h2>Dashboard</h2>
      <p>Welcome! You are logged in.</p>
      <button onClick={handleLogout}>Logout</button>
      <hr />
      <h3>Upload Paper</h3>
      <input type="file" accept=".pdf" onChange={handleFileChange} />
      <button onClick={handleUpload}>Upload</button>
    </div>
  );
};

export default DashboardPage;
