// src/pages/SearchPage.tsx

import React, { useState } from 'react';
import axios from 'axios'; // arXiv API 호출을 위해 axios를 직접 사용합니다.
import axiosInstance from '../api/axiosInstance'; // 우리 백엔드 API 호출용 인스턴스

// arXiv API 결과의 타입을 정의합니다. (XML 파싱 후)
interface ArxivPaper {
  id: string;
  title: string;
  summary: string;
  authors: string[];
  pdfLink: string;
}

const SearchPage = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ArxivPaper[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // XML 문자열에서 특정 태그의 내용을 추출하는 간단한 헬퍼 함수
  const parseXmlTag = (xml: string, tagName: string): string => {
    const match = xml.match(new RegExp(`<${tagName}>([\\s\\S]*?)</${tagName}>`));
    return match ? match[1].trim() : '';
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    setError(null);
    setResults([]);

    try {
      // arXiv API URL (CORS 문제가 발생할 수 있습니다)
      const arxivApiUrl = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&start=0&max_results=10`;
      
      // CORS 문제를 우회하기 위한 프록시 URL (예: http://localhost:3001/api/search-arxiv?q=...)
      // 지금은 직접 호출을 시도합니다.
      const response = await axios.get(arxivApiUrl);
      
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(response.data, "text/xml");
      const entries = Array.from(xmlDoc.getElementsByTagName('entry'));

      const papers: ArxivPaper[] = entries.map(entry => {
        const authors = Array.from(entry.getElementsByTagName('author')).map(author => 
          author.getElementsByTagName('name')[0]?.textContent || 'N/A'
        );
        const pdfLink = entry.querySelector('link[title="pdf"]')?.getAttribute('href') || '';
        
        return {
          id: entry.getElementsByTagName('id')[0]?.textContent || '',
          title: entry.getElementsByTagName('title')[0]?.textContent || '',
          summary: entry.getElementsByTagName('summary')[0]?.textContent?.trim() || '',
          authors: authors,
          pdfLink: pdfLink
        };
      });

      setResults(papers);

    } catch (err) {
      console.error("arXiv API fetch error:", err);
      setError("논문을 불러오는 데 실패했습니다. CORS 정책 문제일 수 있습니다.");
    } finally {
      setIsLoading(false);
    }
  };

/* BE API를 통해 논문을 추가하는 함수 */
//   const handleAddPaper = async (paper: ArxivPaper) => {
//     try {
//         // Postman에 정의된 `/api/papers/register-from-url` API를 호출합니다.
//         // 백엔드는 이 URL로부터 PDF를 다운로드하고 메타데이터를 추출해야 합니다.
//         const response = await axiosInstance.post('/api/papers/register-from-url', {
//             url: paper.pdfLink, // PDF 링크를 전달
//             sourceId: paper.id, // arXiv ID를 sourceId로 사용
//             // title, authors, summary 등 추가 정보를 함께 보내 백엔드 부담을 줄일 수도 있습니다.
//             title: paper.title,
//             authors: paper.authors.join(', '),
//             summary: paper.summary,
//         });
//         alert(`'${paper.title}' 논문을 내 서재에 추가했습니다.`);
//         console.log('Paper added successfully:', response.data);
//     } catch (error) {
//         console.error('Failed to add paper:', error);
//         alert('논문 추가에 실패했습니다.');
//     }
//   };

/* FE 에서 PDF를 직접 다운로드 받아 FormData로 백엔드에 전송하는 함수 */
 const handleAddPaper = async (paper: ArxivPaper) => {
    // 버튼을 누르면 잠시 '추가 중...'으로 상태 변경
    const addButton = document.getElementById(`add-btn-${paper.id}`);
    if (addButton) addButton.textContent = 'Adding...';

    try {
      // 1. 프론트엔드에서 PDF URL을 fetch로 다운로드
      const response = await fetch(paper.pdfLink);
      if (!response.ok) {
        throw new Error('PDF download failed');
      }
      const pdfBlob = await response.blob(); // 2. 다운로드한 데이터를 Blob 형태로 변환

      // 3. Blob을 실제 File 객체로 생성
      const pdfFile = new File([pdfBlob], `${paper.title.replace(/ /g, '_')}.pdf`, { type: 'application/pdf' });

      // 4. FormData 객체 생성 및 데이터 추가
      const formData = new FormData();
      formData.append('file', pdfFile); // "file"이라는 키로 PDF 파일 추가

      // 5. FormData를 백엔드로 전송
      await axiosInstance.post('/api/papers/register-from-url', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

      alert(`'${paper.title}' 논문을 내 서재에 추가했습니다.`);

    } catch (error) {
      console.error('Failed to add paper:', error);
      // CORS 오류가 발생하면 여기서 잡힙니다.
      alert('논문 추가에 실패했습니다. (CORS 오류일 가능성이 높습니다)');
    } finally {
      // 버튼 텍스트 원상복구
      if (addButton) addButton.textContent = 'Add to My Papers';
    }
  };


  return (
    <div className="flex-1 p-6">
      <h2 className="text-2xl font-semibold text-gray-800 mb-6">Search from arXiv</h2>
      
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <form onSubmit={handleSearch} className="flex items-center space-x-4">
          <input 
            type="text" 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by keyword, title, author..." 
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button 
            type="submit"
            className="px-6 py-2 font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
            disabled={isLoading}
          >
            {isLoading ? 'Searching...' : 'Search'}
          </button>
        </form>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-700">Results</h3>
        {error && <p className="text-red-500 mt-2">{error}</p>}
        {results.length === 0 && !isLoading && !error && (
            <p className="text-gray-500 text-sm mt-2">Search for papers to see results here.</p>
        )}
        <div className="space-y-4 mt-4">
          {results.map(paper => (
            <div key={paper.id} className="p-4 bg-white rounded-lg shadow">
              <h4 className="font-bold text-gray-800">{paper.title}</h4>
              <p className="text-sm text-gray-600 mt-1">{paper.authors.join(', ')}</p>
              <p className="text-xs text-gray-500 mt-2 line-clamp-2">{paper.summary}</p>
              <div className="mt-3">
                <a href={paper.pdfLink} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 hover:underline">View PDF</a>
                <button 
                  onClick={() => handleAddPaper(paper)}
                  className="ml-4 px-3 py-1 text-sm font-semibold text-white bg-green-500 rounded-md hover:bg-green-600"
                >
                  Add to My Papers
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SearchPage;