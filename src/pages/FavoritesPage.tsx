import React, { useEffect, useMemo, useState } from 'react';
import axiosInstance from '../api/axiosInstance';
import { getFavoriteIds } from '../state/favoritesStore';
import PaperCard from '../components/PaperCard';
import { parseJsonArraySafe } from '../utils/papers';

interface FavoritePaper {
  collectionId: number;
  paperId: number;
  title?: string;
  abstractText?: string;
  arxivId?: string;
  publishedDate?: string;
  authorsJson?: string;
  categoriesJson?: string;
}

const FavoritesPage: React.FC = () => {
  const [papers, setPapers] = useState<FavoritePaper[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const favoriteIds = useMemo(() => getFavoriteIds(), []);

  useEffect(() => {
    if (favoriteIds.length === 0) {
      setPapers([]);
      setError(null);
      return;
    }
    let cancelled = false;
    const fetchFavorites = async () => {
      setLoading(true);
      setError(null);
      try {
        const results: FavoritePaper[] = [];
        await Promise.all(
          favoriteIds.map(async (id) => {
            try {
              const resp = await axiosInstance.get(`/api/collection-items/${id}`);
              if (resp.data?.success && resp.data.data) {
                const data = resp.data.data as any;
                results.push({
                  collectionId: Number(data.id ?? id),
                  paperId: Number(data.paperId ?? 0),
                  title: data.title,
                  abstractText: data.abstractText,
                  arxivId: data.arxivId,
                  publishedDate: data.publishedDate,
                  authorsJson: data.authorsJson,
                  categoriesJson: data.categoriesJson,
                });
              }
            } catch (e) {
              console.error('Failed to load favorite item', id, e);
            }
          })
        );
        if (!cancelled) {
          setPapers(results);
        }
      } catch (e) {
        if (!cancelled) {
          setError('즐겨찾기 목록을 불러오지 못했습니다.');
          console.error(e);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    fetchFavorites();
    return () => {
      cancelled = true;
    };
  }, [favoriteIds]);

  return (
    <div className="flex-1 p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">즐겨찾기</h2>
          <p className="text-sm text-gray-500">즐겨찾기로 표시한 논문들을 모아서 보여줍니다.</p>
        </div>
      </div>

      {loading && <p className="text-sm text-gray-500">즐겨찾기 목록을 불러오는 중입니다...</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}

      {!loading && !error && favoriteIds.length === 0 && (
        <p className="text-sm text-gray-500">즐겨찾기한 논문이 없습니다. 논문 뷰어에서 즐겨찾기를 추가해보세요.</p>
      )}

      {!loading && !error && favoriteIds.length > 0 && papers.length === 0 && (
        <p className="text-sm text-gray-500">
          즐겨찾기한 일부 논문 정보를 불러오지 못했습니다. 나중에 다시 시도해 주세요.
        </p>
      )}

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {papers.map((paper) => (
          <PaperCard
            key={paper.collectionId}
            id={paper.collectionId}
            paperId={paper.paperId}
            title={paper.title}
            abstractText={paper.abstractText}
            arxivId={paper.arxivId}
            publishedDate={paper.publishedDate}
            authors={parseJsonArraySafe(paper.authorsJson)}
            categories={parseJsonArraySafe(paper.categoriesJson)}
            collectionIdForRoute={paper.collectionId}
          />
        ))}
      </div>
    </div>
  );
};

export default FavoritesPage;
