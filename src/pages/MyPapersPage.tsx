import { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance.ts';
import PaperCard from '../components/PaperCard';
import { parseJsonArraySafe } from '../utils/papers';

// CollectionPaperListResp 타입
interface PaperListItem {
  id: number;           // 컬렉션 아이템 ID
  paperId: number;
  status?: string;
  lastOpenedAt?: string;
  addedAt?: string;
  updatedAt?: string;
  // paperInfo 필드
  title?: string;
  authors?: string;      // 저자 JSON
  primaryCategory?: string;
  categories?: string;   // 카테고리 JSON
  arxivId?: string;
  pdfUrl?: string;
  abstractText?: string;
  publishedDate?: string;
}

// PaperInfoDetailResp 타입
interface PaperInfoDetail {
  id: number;
  paperId: number;
  title?: string;
  arxivId?: string;
  abstractText?: string;
  primaryCategory?: string;
  pdfUrl?: string;
  authorsJson?: string;
  categoriesJson?: string;
  publishedDate?: string;
}

type MyPapersPageVariant = 'grid' | 'list';

interface MyPapersPageProps {
  variant?: MyPapersPageVariant;
}

const dedupePapers = (items: PaperListItem[]): PaperListItem[] => {
  const map = new Map<number | string, PaperListItem>();
  items.forEach((item) => {
    const key = item.paperId && item.paperId > 0 ? item.paperId : `collection-${item.id}`;
    if (!map.has(key)) {
      map.set(key, item);
      return;
    }
    const existing = map.get(key)!;
    const existingTime = existing.addedAt ? Date.parse(existing.addedAt) : Number.POSITIVE_INFINITY;
    const candidateTime = item.addedAt ? Date.parse(item.addedAt) : Number.POSITIVE_INFINITY;
    if (candidateTime < existingTime) {
      map.set(key, item);
    }
  });
  return Array.from(map.values());
};

const MyPapersPage = ({ variant = 'grid' }: MyPapersPageProps) => {
  const [papers, setPapers] = useState<PaperListItem[]>([]);
  const [sortBy, setSortBy] = useState<'date' | 'title'>('date');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailErrors, setDetailErrors] = useState<Record<number, string>>({});

  const loadedDetailIdsRef = useRef<Set<number>>(new Set());
  const [searchParams] = useSearchParams();

  const statusParam = (searchParams.get('status') || 'to-read').toLowerCase();
  const statusSegment = useMemo(() => {
    if (['to-read', 'in-progress', 'done'].includes(statusParam)) {
      return statusParam as 'to-read' | 'in-progress' | 'done';
    }
    return 'to-read';
  }, [statusParam]);

  const statusLabel = useMemo(() => {
    switch (statusSegment) {
      case 'in-progress':
        return '학습 중';
      case 'done':
        return '읽기 완료';
      default:
        return '새로 추가한 논문';
    }
  }, [statusSegment]);

  const toStoredJson = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        return trimmed;
      }
      if (trimmed === '') return '';
      return JSON.stringify(trimmed.split(',').map((v) => v.trim()).filter(Boolean));
    }
    if (Array.isArray(value)) {
      return JSON.stringify(value.map((v) => (typeof v === 'string' ? v : String(v))));
    }
    return JSON.stringify([String(value)]);
  };

  const coalesce = (...values: unknown[]) => {
    for (const value of values) {
      if (value === undefined || value === null) continue;
      if (typeof value === 'string' && value.trim() === '') continue;
      return value;
    }
    return undefined;
  };

  const normalizePaper = (raw: any): PaperListItem => {
    if (!raw || typeof raw !== 'object') {
      return raw as PaperListItem;
    }

    const infoCandidates = [
      raw,
      raw.paperInfo,
      raw.paper?.paperInfo,
      raw.paperMetadata,
      raw.metadata,
      raw.meta,
      raw.paper_info,
      raw.paper?.metadata,
      raw.detail,
    ];

    const pick = (...fields: string[]) => {
      for (const candidate of infoCandidates) {
        if (!candidate || typeof candidate !== 'object') continue;
        for (const field of fields) {
          if (field in candidate && candidate[field] !== undefined && candidate[field] !== null) {
            return candidate[field];
          }
        }
      }
      return undefined;
    };

    const id = coalesce(raw.id, raw.collectionPaperId, raw.collectionItemId) ?? 0;
    const paperId = coalesce(raw.paperId, raw.paper?.id, raw.paper?.paperId, raw.paperInfo?.paperId) ?? 0;

    const title = coalesce(pick('title'), raw.title);
    const abstractText = coalesce(pick('abstractText', 'abstract', 'summary'), raw.abstractText);
    const arxivId = coalesce(pick('arxivId'), raw.arxivId);
    const pdfUrl = coalesce(pick('pdfUrl'), raw.pdfUrl);
    const primaryCategory = coalesce(pick('primaryCategory'), raw.primaryCategory);
    const publishedDate = coalesce(pick('publishedDate', 'publishedAt'), raw.publishedDate);
    const authorsRaw = coalesce(pick('authorsJson', 'authors', 'authorList', 'author', 'authorNames'), raw.authors);
    const categoriesRaw = coalesce(pick('categoriesJson', 'categories', 'categoryList', 'tags'), raw.categories);

    return {
      id: Number(id),
      paperId: Number(paperId),
      status: raw.status,
      lastOpenedAt: raw.lastOpenedAt,
      addedAt: raw.addedAt,
      updatedAt: raw.updatedAt,
      title: title as string | undefined,
      authors: toStoredJson(authorsRaw),
      primaryCategory: primaryCategory as string | undefined,
      categories: toStoredJson(categoriesRaw),
      arxivId: arxivId as string | undefined,
      pdfUrl: pdfUrl as string | undefined,
      abstractText: abstractText as string | undefined,
      publishedDate: publishedDate as string | undefined,
    };
  };

  useEffect(() => {
    const fetchPapers = async () => {
      try {
        setIsLoading(true);
        setError(null);
        setPapers([]);
        loadedDetailIdsRef.current = new Set();
        setDetailErrors({});
        const response = await axiosInstance.get(`/api/collections/${statusSegment}`);
        if (response.data.success) {
          console.debug('MyPapers list response', response.data.data);
          const normalized = (response.data.data.content ?? []).map(normalizePaper);
          const deduped = dedupePapers(normalized);
          setPapers(deduped);

          // 사이드바 카운트 업데이트 이벤트 발송
          const event = new CustomEvent('collection:update_count', {
            detail: { status: statusParam, count: deduped.length }
          });
          window.dispatchEvent(event);
        } else {
          setError(response.data.error?.message || '논문 목록을 불러오는 데 실패했습니다.');
        }
      } catch (err) {
        setError('논문 목록을 불러오는 데 실패했습니다.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPapers();
  }, [statusSegment]);

  const handleDelete = async (paper: PaperListItem) => {
    if (!window.confirm(`'${paper.title}' 논문을 서재에서 삭제하시겠습니까?`)) {
      return;
    }
    try {
      const resp = await axiosInstance.delete(`/api/collection-items/${paper.id}`);
      if (resp.data.success) {
        setPapers(prev => prev.filter(p => p.id !== paper.id));
      } else {
        alert(resp.data.error?.message || "삭제 실패");
      }
    } catch (e) {
      console.error("Delete failed", e);
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  useEffect(() => {
    const loadedIds = loadedDetailIdsRef.current;
    const missing = papers.filter((paper) => !loadedIds.has(paper.id) && !detailErrors[paper.id]);
    if (missing.length === 0) {
      return;
    }

    let cancelled = false;

    (async () => {
      const fetched: Record<number, PaperInfoDetail> = {};
      const failed: Record<number, string> = {};

      await Promise.all(
        missing.map(async (paper) => {
          try {
            const resp = await axiosInstance.get(`/api/collection-items/${paper.id}`);
            if (resp.data.success) {
              console.debug('MyPapers detail response', paper.id, resp.data.data);
              const normalizedDetail = normalizePaper({
                id: paper.id,
                paperId: paper.paperId,
                ...resp.data.data,
              });
              fetched[paper.id] = {
                id: normalizedDetail.id,
                paperId: normalizedDetail.paperId,
                title: normalizedDetail.title,
                arxivId: normalizedDetail.arxivId,
                abstractText: normalizedDetail.abstractText,
                primaryCategory: normalizedDetail.primaryCategory,
                pdfUrl: normalizedDetail.pdfUrl,
                authorsJson: normalizedDetail.authors,
                categoriesJson: normalizedDetail.categories,
                publishedDate: normalizedDetail.publishedDate,
              };
            } else {
              failed[paper.id] = resp.data.error?.message || '메타데이터를 불러오지 못했습니다.';
            }
          } catch (err) {
            console.error(err);
            failed[paper.id] = '메타데이터를 불러오지 못했습니다.';
          }
        })
      );

      if (!cancelled) {
        setDetailErrors((prev) => ({ ...prev, ...failed }));
        if (Object.keys(fetched).length > 0) {
          setPapers((prev) =>
            prev.map((paper) => {
              const detail = fetched[paper.id];
              if (!detail) return paper;
              return {
                ...paper,
                title: detail.title ?? paper.title,
                authors: detail.authorsJson ?? paper.authors,
                categories: detail.categoriesJson ?? paper.categories,
                arxivId: detail.arxivId ?? paper.arxivId,
                pdfUrl: detail.pdfUrl ?? paper.pdfUrl,
                abstractText: detail.abstractText ?? paper.abstractText,
                publishedDate: detail.publishedDate ?? paper.publishedDate,
                primaryCategory: detail.primaryCategory ?? paper.primaryCategory,
              };
            })
          );
          const nextLoaded = new Set(loadedDetailIdsRef.current);
          Object.keys(fetched).forEach((id) => nextLoaded.add(Number(id)));
          loadedDetailIdsRef.current = nextLoaded;
        }
        // setIsFetchingDetails(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [papers, detailErrors, statusSegment]);

  const sortedPapers = useMemo(() => {
    const items = [...papers];
    if (sortBy === 'title') {
      items.sort((a, b) => {
        const ta = (a.title ?? '').toLowerCase();
        const tb = (b.title ?? '').toLowerCase();
        if (!ta && !tb) return 0;
        if (!ta) return 1;
        if (!tb) return -1;
        return ta.localeCompare(tb);
      });
    } else {
      items.sort((a, b) => {
        const da = a.updatedAt || a.addedAt || a.publishedDate || '';
        const db = b.updatedAt || b.addedAt || b.publishedDate || '';
        const va = da ? Date.parse(da) : 0;
        const vb = db ? Date.parse(db) : 0;
        return vb - va;
      });
    }
    return items;
  }, [papers, sortBy]);

  // 로딩 화면
  if (isLoading) {
    return <div className="p-6">Loading papers...</div>;
  }

  // 에러 화면
  if (error) {
    return <div className="p-6 text-red-500">{error}</div>;
  }

  const containerClass =
    variant === 'list'
      ? 'flex flex-col gap-4'
      : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';

  return (
    <div className={`flex-1 ${variant === 'list' ? '' : 'p-6'}`}>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">My Papers</h2>
          <p className="text-sm text-gray-500">{statusLabel}</p>
        </div>
        <div>
          <select
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value === 'title' ? 'title' : 'date')}
          >
            <option value="date">Sort by Date</option>
            <option value="title">Sort by Title</option>
          </select>
        </div>
      </div>

      {/* 논문 목록 */}
      <div className={containerClass}>
        {sortedPapers.length > 0 ? (
          sortedPapers.map((paper) => (
            <PaperCard
              key={paper.id}
              id={paper.id}
              paperId={paper.paperId}
              title={paper.title}
              abstractText={paper.abstractText}
              arxivId={paper.arxivId}
              publishedDate={paper.publishedDate}
              authors={parseJsonArraySafe(paper.authors)}
              categories={parseJsonArraySafe(paper.categories)}
              variant={variant}
              collectionIdForRoute={paper.id}
              actionButton={
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(paper);
                  }}
                  className="px-3 py-1 rounded text-xs font-semibold text-red-600 bg-red-100 hover:bg-red-200 transition-colors"
                >
                  삭제
                </button>
              }
            />
          ))
        ) : (
          <p className="text-gray-500">아직 추가된 논문이 없습니다. 'Search' 페이지에서 논문을 추가해보세요!</p>
        )}
      </div>
    </div>
  );
};

export default MyPapersPage;
