import { useEffect, useState } from 'react';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';

interface ArxivPaper {
  id: string;
  title: string;
  summary: string;
  authors: string[];
  pdfLink: string;
}

const SearchPage = () => {
  const [searchParams] = useSearchParams();
  const [results, setResults] = useState<ArxivPaper[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchTerm = (searchParams.get('q') ?? '').trim();

  useEffect(() => {
    if (!searchTerm) {
      setResults([]);
      setError(null);
      return;
    }

    let cancelled = false;
    const fetchResults = async () => {
      setIsLoading(true);
      setError(null);
      setResults([]);
      try {
        const arxivApiUrl = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(
          searchTerm
        )}&start=0&max_results=10`;
        const response = await axios.get(arxivApiUrl);

        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(response.data, 'text/xml');
        const entries = Array.from(xmlDoc.getElementsByTagName('entry'));

        const papers: ArxivPaper[] = entries.map((entry) => {
          const authors = Array.from(entry.getElementsByTagName('author')).map(
            (author) => author.getElementsByTagName('name')[0]?.textContent || 'N/A'
          );
          const pdfLink = entry.querySelector('link[title="pdf"]')?.getAttribute('href') || '';
          return {
            id: entry.getElementsByTagName('id')[0]?.textContent || '',
            title: entry.getElementsByTagName('title')[0]?.textContent || '',
            summary: entry.getElementsByTagName('summary')[0]?.textContent?.trim() || '',
            authors,
            pdfLink,
          };
        });

        if (!cancelled) {
          setResults(papers);
        }
      } catch (err) {
        console.error('arXiv API fetch error:', err);
        if (!cancelled) {
          setError('논문을 불러오는 데 실패했습니다. CORS 정책 문제일 수 있습니다.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };
    fetchResults();
    return () => {
      cancelled = true;
    };
  }, [searchTerm]);

  const handleAddPaper = async (paper: ArxivPaper) => {
    const buttonId = `add-btn-${paper.id}`;
    const addButton = document.getElementById(buttonId) as HTMLButtonElement | null;
    if (addButton) {
      addButton.textContent = 'Adding...';
      addButton.disabled = true;
    }

    try {
      const response = await fetch(paper.pdfLink);
      if (!response.ok) {
        throw new Error('PDF download failed');
      }
      const pdfBlob = await response.blob();
      const sanitizedTitle = paper.title.replace(/[\s/\\]+/g, '_').slice(0, 50) || 'paper';
      const pdfFile = new File([pdfBlob], `${sanitizedTitle}.pdf`, { type: 'application/pdf' });

      const formData = new FormData();
      formData.append('file', pdfFile);

      const uploadResp = await axiosInstance.post('/api/papers/register-from-url', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const paperId = uploadResp?.data?.data?.paperId;
      if (!paperId) {
        throw new Error('paperId not returned from upload response');
      }

      await axiosInstance.post('/api/collections/to-read', { paperId });

      alert(`'${paper.title}' 논문을 내 서재에 추가했습니다.`);
    } catch (error) {
      console.error('Failed to add paper:', error);
      const errObj =
        (error as { response?: { data?: { error?: { message?: string } } } } | undefined) ?? {};
      const message =
        errObj.response?.data?.error?.message || (error as Error).message || '논문 추가에 실패했습니다.';
      alert(message);
    } finally {
      if (addButton) {
        addButton.textContent = 'Add to My Papers';
        addButton.disabled = false;
      }
    }
  };

  return (
    <div className="flex-1 p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">Search from arXiv</h2>
          {searchTerm && <p className="text-sm text-gray-500">현재 검색어: {searchTerm}</p>}
        </div>
        <span className="text-xs text-gray-400">상단 검색창을 이용해 다른 키워드를 입력하세요.</span>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-700">Results</h3>
        {isLoading && <p className="mt-2 text-sm text-gray-500">검색 중입니다...</p>}
        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
        {!isLoading && !error && results.length === 0 && searchTerm && (
          <p className="mt-2 text-sm text-gray-500">검색 결과가 없습니다.</p>
        )}
        {!searchTerm && <p className="mt-2 text-sm text-gray-500">상단 검색창에 검색어를 입력해 주세요.</p>}

        <div className="mt-4 space-y-4">
          {results.map((paper) => (
            <div key={paper.id} className="rounded-lg bg-white p-4 shadow">
              <h4 className="font-bold text-gray-800">{paper.title}</h4>
              <p className="mt-1 text-sm text-gray-600">{paper.authors.join(', ')}</p>
              <p className="mt-2 line-clamp-2 text-xs text-gray-500">{paper.summary}</p>
              <div className="mt-3">
                <a
                  href={paper.pdfLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-indigo-600 hover:underline"
                >
                  View PDF
                </a>
                <button
                  id={`add-btn-${paper.id}`}
                  onClick={() => handleAddPaper(paper)}
                  className="ml-4 rounded-md bg-green-500 px-3 py-1 text-sm font-semibold text-white hover:bg-green-600"
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
