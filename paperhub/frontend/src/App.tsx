import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

// Paper 인터페이스 정의
interface Paper {
  entry_id: string;
  title: string;
  summary: string;
  authors: string[];
  pdf_url: string;
  published: string;
}

function App() {
  const [query, setQuery] = useState('');
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    // 검색 버튼 실행 시 실행될 함수
    if (!query) {
      alert('검색어를 입력해주세요.');
      return;
    }
    setLoading(true);
    try {
      const response = await axios.get(`http://localhost:8000/api/search?query=${query}`);
      setPapers(response.data.results);
    } catch (error) {
      console.error("API 요청 중 오류 발생:", error);
      alert('데이터를 불러오는 데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>PaperHub</h1>
      <div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search on arXiv..."
          style={{ marginRight: '10px' }}
        />
        <button onClick={handleSearch} disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>
      <hr />
      <h2>Search Results</h2>
      <div>
        {papers.map((paper) => (
          // key를 고유한 entry_id로 변경
          <div key={paper.entry_id} style={{ border: '1px solid #ccc', padding: '10px', marginBottom: '10px' }}>
            <h3><a href={paper.pdf_url} target="_blank" rel="noopener noreferrer">{paper.title}</a></h3>
            <p><strong>Authors:</strong> {paper.authors.join(', ')}</p>
            <p><strong>Published:</strong> {new Date(paper.published).toLocaleDateString()}</p>
            <p>{paper.summary.slice(0, 300)}...</p> {/* 요약은 300자까지만 표시 */}
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
