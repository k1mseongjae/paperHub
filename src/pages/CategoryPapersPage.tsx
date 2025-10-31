import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';

interface CategoryPaper {
  id: number;
  title: string;
  abstractText?: string;
  authors?: string;
  primaryCategory?: string;
  publishedDate?: string;
  arxivId?: string;
}

interface CategoryResponse {
  content: CategoryPaper[];
  totalElements: number;
  number: number;
  size: number;
  last: boolean;
}

const CategoryPapersPage: React.FC = () => {
  const { code } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [papers, setPapers] = useState<CategoryPaper[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rawPage = Number(searchParams.get('page'));
  const rawSize = Number(searchParams.get('size'));
  const page = Number.isNaN(rawPage) ? 0 : rawPage;
  const size = Number.isNaN(rawSize) || rawSize <= 0 ? 20 : rawSize;

  useEffect(() => {
    if (!code) return;
    const fetchCategoryPapers = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const resp = await axiosInstance.get(`/api/categories/${code}/papers`, {
          params: {
            rollup: false,
            page,
            size,
          },
        });
        if (resp.data?.success) {
          const data: CategoryResponse = resp.data.data;
          setPapers(data.content ?? []);
        } else {
          setError(resp.data?.error?.message || '카테고리 논문을 불러오지 못했습니다.');
          setPapers([]);
        }
      } catch (err) {
        console.error('Failed to fetch category papers', err);
        setError('카테고리 논문을 불러오지 못했습니다.');
        setPapers([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategoryPapers();
  }, [code, page, size]);

  const categoryLabel = useMemo(() => code?.replace('.', ' · ') ?? '카테고리', [code]);

  const parseAuthors = (authors?: string) => {
    if (!authors) return [];
    try {
      const parsed = JSON.parse(authors);
      if (Array.isArray(parsed)) {
        return parsed.map((name) => (typeof name === 'string' ? name : String(name)));
      }
    } catch {
      // fall through
    }
    return authors.split(',').map((name) => name.trim()).filter(Boolean);
  };

  const handlePageChange = (delta: number) => {
    const nextPage = Math.max(0, page + delta);
    setSearchParams({ page: String(nextPage), size: String(size) });
  };

  if (!code) {
    return <div className="p-6 text-sm text-gray-500">유효한 카테고리 코드가 필요합니다.</div>;
  }

  return (
    <div className="flex-1">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">카테고리: {categoryLabel}</h2>
          <p className="text-sm text-gray-500">
            {isLoading
              ? '논문을 불러오는 중입니다...'
              : `${papers.length.toLocaleString()}개의 논문이 목록에 표시됩니다.`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handlePageChange(-1)}
            disabled={page === 0}
            className="rounded-md border border-gray-200 px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-300"
          >
            이전
          </button>
          <span className="text-sm text-gray-500">Page {page + 1}</span>
          <button
            type="button"
            onClick={() => handlePageChange(1)}
            className="rounded-md border border-gray-200 px-3 py-1 text-sm text-gray-600 hover:bg-gray-100"
          >
            다음
          </button>
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-red-500">{error}</p>}

      {!isLoading && papers.length === 0 && !error && (
        <p className="text-sm text-gray-500">표시할 논문이 없습니다.</p>
      )}

      <div className="space-y-4">
        {papers.map((paper) => {
          const authors = parseAuthors(paper.authors);
          const publishedYear = paper.publishedDate ? new Date(paper.publishedDate).getFullYear() : null;
          return (
            <div key={paper.id} className="rounded-lg bg-white p-6 shadow">
              <div className="flex flex-col gap-2">
                <Link to={`/paper/${paper.id}`} className="text-lg font-semibold text-gray-800 hover:underline">
                  {paper.title}
                </Link>
                <div className="text-sm text-gray-600">
                  {authors.length > 0 ? `${authors[0]} 외 ${Math.max(authors.length - 1, 0)}명` : '저자 정보 없음'}
                  {publishedYear && <span className="ml-2 text-gray-400">• {publishedYear}</span>}
                </div>
                {paper.abstractText && (
                  <p className="line-clamp-3 text-sm text-gray-500">{paper.abstractText}</p>
                )}
                <div className="flex flex-wrap gap-2 pt-2">
                  {paper.primaryCategory && (
                    <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-600">
                      {paper.primaryCategory}
                    </span>
                  )}
                  {paper.arxivId && (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                      arXiv: {paper.arxivId}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CategoryPapersPage;
