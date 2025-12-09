import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import PaperCard from '../components/PaperCard';
import { parseJsonArraySafe } from '../utils/papers';
import { getCategoryName } from '../utils/categories';

interface CategoryPaper {
  id: number;
  paperId?: number;
  title: string;
  abstractText?: string;
  authors?: string;
  primaryCategory?: string;
  publishedDate?: string;
  arxivId?: string;
  pdfUrl?: string;
}

interface CategoryResponse {
  content?: CategoryPaper[];
  totalElements?: number;
  number?: number;
  size?: number;
  last?: boolean;
}

const CategoryPapersPage: React.FC = () => {
  const { code } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [papers, setPapers] = useState<CategoryPaper[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState<Record<number, boolean>>({});

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
        const infoResp = await axiosInstance.get(`/api/paper-infos`, {
          params: {
            category: code,
            rollup: false,
            page,
            size,
          },
        });
        if (infoResp.data?.success) {
          const data: CategoryResponse = infoResp.data.data ?? {};
          const mapped = (data.content ?? []).map((item: any) => ({
            id: item.id,
            paperId: item.paperId ?? undefined,
            title: item.title,
            abstractText: item.abstractText,
            authors: item.authors,
            primaryCategory: item.primaryCategory,
            publishedDate: item.publishedDate,
            arxivId: item.arxivId,
            pdfUrl: item.pdfUrl,
          }));
          setPapers(mapped);
          return;
        }
        throw new Error('paper_infos API 실패');
      } catch (err) {
        console.warn('paper_infos fetch failed, fallback to category papers', err);
        try {
          const resp = await axiosInstance.get(`/api/categories/${code}/papers`, {
            params: {
              rollup: false,
              page,
              size,
            },
          });
          if (resp.data?.success) {
            const data: CategoryResponse = resp.data.data ?? {};
            const mapped = (data.content ?? []).map((item: any) => ({
              id: item.id,
              paperId: item.id,
              title: item.title,
              abstractText: item.abstractText,
              authors: item.authors,
              primaryCategory: item.primaryCategory,
              publishedDate: item.publishedDate,
              arxivId: item.arxivId,
              pdfUrl: undefined,
            }));
            setPapers(mapped);
          } else {
            setError(resp.data?.error?.message || '카테고리 논문을 불러오지 못했습니다.');
            setPapers([]);
          }
        } catch (fallbackErr) {
          console.error('Failed to fetch category papers', fallbackErr);
          setError('카테고리 논문을 불러오지 못했습니다.');
          setPapers([]);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategoryPapers();
  }, [code, page, size]);

  const handleImport = useCallback(
    async (paper: CategoryPaper) => {
      if (!paper.pdfUrl) {
        alert('이 논문의 PDF 링크를 찾을 수 없어 바로 불러올 수 없습니다.');
        return;
      }
      setImporting((prev) => ({ ...prev, [paper.id]: true }));
      try {
        const response = await fetch(paper.pdfUrl);
        if (!response.ok) {
          throw new Error('PDF 다운로드에 실패했습니다.');
        }
        const pdfBlob = await response.blob();
        const arxivRegex = /(\d{4}\.\d{4,5}(?:v\d+)?)/i;
        const candidates = [paper.arxivId, paper.pdfUrl, paper.title];
        let matchedId = '';
        for (const candidate of candidates) {
          if (typeof candidate !== 'string') continue;
          const match = candidate.match(arxivRegex);
          if (match) {
            matchedId = match[1];
            break;
          }
        }
        const sanitizedTitle = (paper.title || 'paper').replace(/[\s/\\]+/g, '_').slice(0, 50) || 'paper';
        const filename = matchedId ? `${matchedId}.pdf` : `${sanitizedTitle}.pdf`;
        const uploadFile = new File([pdfBlob], filename, { type: 'application/pdf' });
        const formData = new FormData();
        formData.append('file', uploadFile);
        const uploadResp = await axiosInstance.post('/api/papers/register-from-url', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 120000, // 2 minutes timeout
        });
        const newPaperId = uploadResp?.data?.data?.paperId;
        if (!newPaperId) {
          throw new Error('paperId not returned from upload response');
        }
        const collectionResp = await axiosInstance.post('/api/collections/to-read', { paperId: newPaperId });
        const collectionId = collectionResp?.data?.data?.collectionPaperId;
        setPapers((prev) =>
          prev.map((item) => (item.id === paper.id ? { ...item, paperId: newPaperId } : item))
        );
        if (collectionId) {
          navigate(`/paper/${newPaperId}?collectionId=${collectionId}`);
        } else {
          navigate(`/paper/${newPaperId}`);
        }
      } catch (importErr) {
        console.error('Failed to import paper from metadata', importErr);
        const message =
          (importErr as any)?.response?.data?.error?.message ||
          (importErr instanceof Error ? importErr.message : '논문 가져오기에 실패했습니다.');
        alert(message);
      } finally {
        setImporting((prev) => {
          const next = { ...prev };
          delete next[paper.id];
          return next;
        });
      }
    },
    [navigate]
  );

  const handleOpenPaper = useCallback(
    async (paper: CategoryPaper) => {
      if (importing[paper.id]) {
        return;
      }
      if (paper.paperId) {
        navigate(`/paper/${paper.paperId}`);
        return;
      }
      if (!paper.pdfUrl) {
        alert('이 논문은 아직 PDF 링크가 없어 열 수 없습니다.');
        return;
      }
      await handleImport(paper);
    },
    [handleImport, importing, navigate]
  );

  const categoryLabel = useMemo(() => getCategoryName(code) || '카테고리', [code]);

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
          const isImporting = Boolean(importing[paper.id]);
          const cannotImport = !paper.paperId && !paper.pdfUrl;
          return (
            <div key={paper.id} className="space-y-1">
              <PaperCard
                id={paper.id}
                paperId={paper.paperId}
                title={paper.title}
                abstractText={paper.abstractText}
                arxivId={paper.arxivId}
                publishedDate={paper.publishedDate}
                authors={parseJsonArraySafe(paper.authors)}
                categories={paper.primaryCategory ? [paper.primaryCategory] : []}
                variant="list"
                onClick={() => handleOpenPaper(paper)}
                disableLink
                disabled={isImporting || cannotImport}
              />
              {isImporting && (
                <p className="px-1 text-xs text-indigo-600">PDF를 불러오는 중입니다...</p>
              )}
              {cannotImport && !isImporting && (
                <p className="px-1 text-xs text-gray-500">PDF 링크를 찾을 수 없어 바로 열 수 없습니다.</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CategoryPapersPage;
