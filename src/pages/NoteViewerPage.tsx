import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import axiosInstance from '../api/axiosInstance.ts';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

interface CollectionItemDetail {
  id: number;
  paperId: number;
  title?: string;
  pdfUrl?: string;
  arxivId?: string;
}

interface PaperViewDetail {
  sha256: string;
  numPages: number;
}

type Rect = { x: number; y: number; w: number; h: number };

interface AnnotationAnchor {
  id: number;
  exact?: string;
  prefix?: string;
  suffix?: string;
  rects: Rect[];
}

interface AnnotationHighlight {
  id: number;
  color?: string;
  createdBy?: string;
}

interface AnnotationMemo {
  id: number;
  body: string;
  createdBy?: string;
  createdAt?: string;
  parentId?: number | null;
}

interface AnnotationBundle {
  anchor: AnnotationAnchor;
  highlights: AnnotationHighlight[];
  notes: AnnotationMemo[];
}

interface PageAnnotationsResp {
  count: number;
  items: AnnotationBundle[];
  totalHighlights: number;
  totalNotes: number;
  totalAnnotations: number;
}

interface SelectionDraft {
  rects: Rect[];
  text: string;
  toolbar: { x: number; y: number };
}

const DEFAULT_HIGHLIGHT_COLOR = '#fde047';

const colorToRgba = (hex: string, alpha = 0.35) => {
  const cleaned = hex.replace('#', '');
  if (cleaned.length === 3) {
    const r = parseInt(cleaned[0] + cleaned[0], 16);
    const g = parseInt(cleaned[1] + cleaned[1], 16);
    const b = parseInt(cleaned[2] + cleaned[2], 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  if (cleaned.length === 6 || cleaned.length === 8) {
    const r = parseInt(cleaned.substring(0, 2), 16);
    const g = parseInt(cleaned.substring(2, 4), 16);
    const b = parseInt(cleaned.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return `rgba(253, 224, 71, ${alpha})`;
};

const NoteViewerPage: React.FC = () => {
  const { paperId: paperIdParam } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [collectionItem, setCollectionItem] = useState<CollectionItemDetail | null>(null);
  const [paperDetail, setPaperDetail] = useState<PaperViewDetail | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [title, setTitle] = useState<string>('Loading...');
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState<number>(1);
  const [annotations, setAnnotations] = useState<PageAnnotationsResp | null>(null);
  const [annotationsLoading, setAnnotationsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectionDraft, setSelectionDraft] = useState<SelectionDraft | null>(null);
  const [selectedAnchorId, setSelectedAnchorId] = useState<number | null>(null);
  const [memoDraft, setMemoDraft] = useState('');

  const pageContainerRef = useRef<HTMLDivElement | null>(null);

  const paperId = useMemo(() => {
    if (!paperIdParam) return null;
    const parsed = Number(paperIdParam);
    return Number.isNaN(parsed) ? null : parsed;
  }, [paperIdParam]);

  const collectionId = useMemo(() => {
    const raw = searchParams.get('collectionId');
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isNaN(parsed) ? null : parsed;
  }, [searchParams]);

  useEffect(() => {
    const fetchInitial = async () => {
      if (!paperId) {
        setError('유효하지 않은 논문 ID 입니다.');
        return;
      }

      try {
        setError(null);
        if (collectionId) {
          const resp = await axiosInstance.get(`/api/collection-items/${collectionId}`);
          if (resp.data.success) {
            const info = resp.data.data as CollectionItemDetail;
            setCollectionItem(info);
            setTitle(info.title ?? '제목 미상');
            if (info.pdfUrl) {
              setPdfUrl(info.pdfUrl);
            }
          }
        }

        const paperResp = await axiosInstance.get(`/api/papers/${paperId}`);
        if (paperResp.data.success) {
          const data = paperResp.data.data as PaperViewDetail;
          setPaperDetail(data);
          setNumPages(data.numPages ?? 1);
        }
      } catch (e) {
        console.error(e);
        setError('논문 정보를 불러오지 못했습니다.');
      }
    };

    fetchInitial();
  }, [paperId, collectionId]);

  const paperSha = paperDetail?.sha256;

  const fetchAnnotations = useCallback(async (page: number) => {
    if (!paperSha) return;
    try {
      setAnnotationsLoading(true);
      const resp = await axiosInstance.get('/api/page-annotations', {
        params: { sha256: paperSha, page },
      });
      if (resp.data.success) {
        setAnnotations(resp.data.data as PageAnnotationsResp);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAnnotationsLoading(false);
    }
  }, [paperSha]);

  useEffect(() => {
    if (paperSha) {
      fetchAnnotations(currentPage);
    }
  }, [paperSha, currentPage, fetchAnnotations]);

  const clearSelection = useCallback(() => {
    setSelectionDraft(null);
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
    }
  }, []);

  const updateSelectionFromWindow = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      setSelectionDraft(null);
      return;
    }

    const range = selection.getRangeAt(0);
    const container = pageContainerRef.current;
    if (!container) {
      setSelectionDraft(null);
      return;
    }
    const commonAncestor = range.commonAncestorContainer as Node;
    if (!container.contains(commonAncestor)) {
      setSelectionDraft(null);
      return;
    }

    const bounds = container.getBoundingClientRect();
    const clientRects = Array.from(range.getClientRects()).filter((rect) => {
      return rect.width > 0 && rect.height > 0;
    });

    if (!clientRects.length || bounds.width === 0 || bounds.height === 0) {
      setSelectionDraft(null);
      return;
    }

    const rects: Rect[] = clientRects.map((rect) => ({
      x: (rect.left - bounds.left) / bounds.width,
      y: (rect.top - bounds.top) / bounds.height,
      w: rect.width / bounds.width,
      h: rect.height / bounds.height,
    }));

    const firstRect = clientRects[0];
    const toolbarX = firstRect.left - bounds.left;
    const toolbarY = Math.max(firstRect.top - bounds.top - 36, 0);

    setSelectionDraft({
      rects,
      text: selection.toString(),
      toolbar: { x: toolbarX, y: toolbarY },
    });
  }, []);

  useEffect(() => {
    const handleMouseUp = () => {
      setTimeout(updateSelectionFromWindow, 0);
    };
    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, [updateSelectionFromWindow]);

  const handleCreateHighlight = useCallback(async (color: string) => {
    if (!selectionDraft || !paperSha) return;
    if (!selectionDraft.rects.length) return;

    try {
      await axiosInstance.post('/api/highlights', {
        paperSha256: paperSha,
        page: currentPage,
        rects: selectionDraft.rects,
        exact: selectionDraft.text,
        color,
      });
      clearSelection();
      fetchAnnotations(currentPage);
    } catch (e) {
      console.error(e);
      alert('하이라이트를 저장하지 못했습니다.');
    }
  }, [selectionDraft, paperSha, currentPage, clearSelection, fetchAnnotations]);

  const handleAddMemo = useCallback(async () => {
    if (!selectedAnchorId) {
      alert('먼저 하이라이트를 선택해주세요.');
      return;
    }
    const text = memoDraft.trim();
    if (!text) {
      alert('메모 내용을 입력해주세요.');
      return;
    }
    try {
      await axiosInstance.post('/api/memos', {
        anchorId: selectedAnchorId,
        body: text,
      });
      setMemoDraft('');
      fetchAnnotations(currentPage);
    } catch (e) {
      console.error(e);
      alert('메모를 저장하지 못했습니다.');
    }
  }, [selectedAnchorId, memoDraft, currentPage, fetchAnnotations]);

  useEffect(() => {
    setMemoDraft('');
  }, [selectedAnchorId]);

  const highlightLayers = useMemo(() => {
    if (!annotations) return [] as Array<{ rect: Rect; color: string; anchorId: number; highlightId: number }>;
    const layers: Array<{ rect: Rect; color: string; anchorId: number; highlightId: number }> = [];
    annotations.items.forEach((item) => {
      const anchorRects = item.anchor.rects || [];
      item.highlights.forEach((highlight) => {
        anchorRects.forEach((rect) => {
          layers.push({
            rect,
            color: highlight.color || DEFAULT_HIGHLIGHT_COLOR,
            anchorId: item.anchor.id,
            highlightId: highlight.id,
          });
        });
      });
    });
    return layers;
  }, [annotations]);

  const renderSidebar = () => (
    <aside className="w-96 bg-white rounded-lg shadow-lg flex flex-col">
      <div className="p-4 border-b">
        <h3 className="text-xl font-bold text-gray-800">내 하이라이트 & 메모</h3>
        <p className="text-sm text-gray-500">페이지 {currentPage} / {numPages}</p>
      </div>
      <div className="flex-1 overflow-y-auto">
        {annotationsLoading && (
          <p className="p-4 text-sm text-gray-500">불러오는 중...</p>
        )}
        {!annotationsLoading && (!annotations || annotations.count === 0) && (
          <p className="p-4 text-sm text-gray-500">이 페이지에는 아직 하이라이트가 없습니다.</p>
        )}
        <div className="p-4 space-y-4">
          {annotations?.items.map((item) => {
            const color = item.highlights[0]?.color || DEFAULT_HIGHLIGHT_COLOR;
            const isActive = selectedAnchorId === item.anchor.id;
            return (
              <div
                key={item.anchor.id}
                className={`rounded-lg border ${isActive ? 'border-indigo-400' : 'border-gray-200'} bg-white shadow-sm`}
              >
                <button
                  type="button"
                  onClick={() => setSelectedAnchorId(item.anchor.id)}
                  className="w-full text-left p-4"
                >
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Highlight</div>
                  <div
                    className="mt-2 rounded-md p-3 text-sm"
                    style={{ backgroundColor: colorToRgba(color, 0.4) }}
                  >
                    {item.anchor.exact || '(텍스트 없음)'}
                  </div>
                  <div className="mt-3 text-xs text-gray-500">노트 {item.notes.length}개</div>
                </button>
                {isActive && (
                  <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-3">
                    <div className="space-y-2">
                      {item.notes.length === 0 && (
                        <p className="text-xs text-gray-500">아직 메모가 없습니다.</p>
                      )}
                      {item.notes.map((memo) => (
                        <div key={memo.id} className="rounded-md bg-white p-3 text-sm text-gray-700 shadow">
                          <div className="whitespace-pre-wrap leading-relaxed">{memo.body}</div>
                          <div className="mt-2 text-xs text-gray-400">작성자: {memo.createdBy ?? '나'}</div>
                        </div>
                      ))}
                    </div>
                    <div>
                      <textarea
                        className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                        rows={3}
                        placeholder="메모를 입력하세요"
                        value={memoDraft}
                        onChange={(e) => setMemoDraft(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={handleAddMemo}
                        className="mt-2 inline-flex items-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700"
                      >
                        메모 추가
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );

  if (error) {
    return (
      <div className="p-8">
        <p className="text-red-500">{error}</p>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mt-4 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          돌아가기
        </button>
      </div>
    );
  }

  if (!pdfUrl) {
    return (
      <div className="p-8">
        <h2 className="text-xl font-semibold text-gray-800">PDF를 찾을 수 없습니다.</h2>
        <p className="mt-2 text-gray-600">논문 불러오기 오류.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full gap-6">
      <div className="flex-1 bg-white rounded-lg shadow-lg overflow-hidden flex flex-col">
        <div className="flex items-center justify-between bg-gray-100 px-6 py-4 border-b">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 line-clamp-1">{title}</h2>
            {collectionItem?.arxivId && (
              <p className="text-xs text-gray-500 mt-1">arXiv: {collectionItem.arxivId}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              className="rounded-md border border-gray-300 px-3 py-1 text-sm text-gray-600 hover:bg-gray-200"
            >
              이전
            </button>
            <span className="text-sm text-gray-600">
              {currentPage} / {numPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, numPages))}
              className="rounded-md border border-gray-300 px-3 py-1 text-sm text-gray-600 hover:bg-gray-200"
            >
              다음
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-gray-50 p-4">
          <div className="mx-auto max-w-4xl">
            <div className="relative" ref={pageContainerRef}>
              <Document file={pdfUrl} onLoadSuccess={(info) => setNumPages(info.numPages)} loading={<p className="p-4 text-gray-500">PDF 불러오는 중...</p>}>
                <Page
                  pageNumber={currentPage}
                  width={880}
                  renderAnnotationLayer={false}
                  renderTextLayer
                />
              </Document>

              <div className="pointer-events-none absolute inset-0">
                {highlightLayers.map(({ rect, color, anchorId, highlightId }) => (
                  <div
                    key={`${anchorId}-${highlightId}-${rect.x}-${rect.y}-${rect.w}-${rect.h}`}
                    style={{
                      position: 'absolute',
                      left: `${rect.x * 100}%`,
                      top: `${rect.y * 100}%`,
                      width: `${rect.w * 100}%`,
                      height: `${rect.h * 100}%`,
                      backgroundColor: colorToRgba(color),
                      borderRadius: '4px',
                    }}
                    className="pointer-events-auto"
                    onClick={() => setSelectedAnchorId(anchorId)}
                  />
                ))}
              </div>

              {selectionDraft && (
                <div
                  style={{
                    position: 'absolute',
                    left: Math.min(selectionDraft.toolbar.x, (pageContainerRef.current?.clientWidth ?? 0) - 160),
                    top: selectionDraft.toolbar.y,
                  }}
                  className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm shadow-md"
                >
                  <span className="text-xs text-gray-500 mr-2">선택 영역</span>
                  <button
                    type="button"
                    className="rounded bg-indigo-600 px-3 py-1 text-white hover:bg-indigo-700"
                    onClick={() => handleCreateHighlight(DEFAULT_HIGHLIGHT_COLOR)}
                  >
                    하이라이트
                  </button>
                  <button type="button" className="text-xs text-gray-500" onClick={clearSelection}>
                    취소
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {renderSidebar()}
    </div>
  );
};

export default NoteViewerPage;
