// src/pages/MyPapersPage.tsx

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance.ts';

// 백엔드로부터 받아올 논문 데이터의 타입을 정의합니다.
interface Paper {
  id: number;
  title: string;
  author: string;
  year?: string; // year는 선택적 필드일 수 있습니다.
  summary: string;
  tags?: string[]; // tags는 선택적 필드일 수 있습니다.
}

const MyPapersPage = () => {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // useEffect를 사용해 컴포넌트가 처음 렌더링될 때 API를 호출합니다.
  useEffect(() => {
    const fetchPapers = async () => {
      try {
        setIsLoading(true);
        // 백엔드에 저장된 모든 논문 목록을 가져오는 API를 호출합니다.
        const response = await axiosInstance.get('/api/papers');
        setPapers(response.data); // 받아온 데이터로 상태를 업데이트합니다.
        setError(null);
      } catch (err) {
        console.error("Failed to fetch papers:", err);
        setError("논문 목록을 불러오는 데 실패했습니다.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPapers();
  }, []); // 빈 배열을 전달하여 이 효과가 한 번만 실행되도록 합니다.

  // 로딩 중일 때 보여줄 화면
  if (isLoading) {
    return <div className="p-6">Loading papers...</div>;
  }

  // 에러가 발생했을 때 보여줄 화면
  if (error) {
    return <div className="p-6 text-red-500">{error}</div>;
  }

  return (
    <div className="flex-1 p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">My Papers</h2>
        <div>
          <select className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option>Sort by Date</option>
            <option>Sort by Title</option>
          </select>
        </div>
      </div>

      {/* Paper List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {papers.length > 0 ? (
          papers.map((paper) => (
            <div key={paper.id} className="p-6 bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow">
              <Link to={`/paper/${paper.id}`} className="hover:underline">
                <h3 className="text-lg font-bold text-gray-800 line-clamp-2">{paper.title}</h3>
              </Link>
              <p className="text-sm text-gray-600 mt-1">{paper.author} {paper.year && `- ${paper.year}`}</p>
              <p className="text-sm text-gray-500 mt-3 h-20 overflow-hidden line-clamp-3">{paper.summary}</p>
              <div className="mt-4">
                {(paper.tags || []).map(tag => (
                  <span key={tag} className="inline-block bg-indigo-100 text-indigo-700 text-xs font-semibold mr-2 px-2.5 py-0.5 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))
        ) : (
          <p className="text-gray-500">아직 추가된 논문이 없습니다. 'Search' 페이지에서 논문을 추가해보세요!</p>
        )}
      </div>
    </div>
  );
};

export default MyPapersPage;