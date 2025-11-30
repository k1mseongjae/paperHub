import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import axiosInstance from '../api/axiosInstance.ts';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';
import { useAuthStore } from '../state/authStore';

import 'react-pdf/dist/esm/Page/TextLayer.css';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

type ReadingStatus = 'TO_READ' | 'IN_PROGRESS' | 'DONE';

interface CollectionItemDetail {
  id: number;
  paperId: number;
  title?: string;
  pdfUrl?: string;
  arxivId?: string;
  status?: ReadingStatus;
  favorite?: boolean;
  tags?: Record<string, unknown>;
}

interface PaperViewDetail {
  sha256: string;
  numPages: number;
}

interface StatusChangeResp {
  collectionPaperId: number;
  paperId: number;
  status: ReadingStatus;
  lastOpenedAt?: string;
  addedAt?: string;
  updatedAt?: string;
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

const STATUS_OPTIONS: Array<{
  status: ReadingStatus;
  slug: 'to-read' | 'in-progress' | 'done';
  label: string;
  description: string;
  badgeClass: string;
}> = [
    {
      status: 'TO_READ',
      slug: 'to-read',
      label: '새로 추가한 논문',
      description: '나중에 읽을 목록에 보관합니다.',
      badgeClass: 'bg-sky-100 text-sky-700',
    },
    {
      status: 'IN_PROGRESS',
      slug: 'in-progress',
      label: '학습 중',
      description: '지금 읽고 있는 논문입니다.',
      badgeClass: 'bg-amber-100 text-amber-700',
    },
    {
      status: 'DONE',
      slug: 'done',
      label: '완료됨',
      description: '읽기를 마친 논문입니다.',
      badgeClass: 'bg-emerald-100 text-emerald-700',
    },
  ];

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

const MemoItem: React.FC<{
  memo: AnnotationMemo;
  onEdit: (id: number, newBody: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}> = ({ memo, onEdit, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editBody, setEditBody] = useState(memo.body);

  const handleSave = async () => {
    if (editBody.trim() === '') return;
    await onEdit(memo.id, editBody);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="rounded-md bg-white p-3 text-sm text-gray-700 shadow ring-2 ring-indigo-100">
        <textarea
          className="w-full rounded-md border border-gray-200 px-2 py-1 text-sm focus:border-indigo-400 focus:outline-none"
          rows={3}
          value={editBody}
          onChange={(e) => setEditBody(e.target.value)}
        />
        <div className="mt-2 flex justify-end gap-2">
          <button
            onClick={() => setIsEditing(false)}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            className="rounded bg-indigo-600 px-2 py-1 text-xs text-white hover:bg-indigo-700"
          >
            저장
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative rounded-md bg-white p-3 text-sm text-gray-700 shadow hover:bg-gray-50">
      <div className="whitespace-pre-wrap leading-relaxed">{memo.body}</div>
      <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
        <span>작성자: {memo.createdBy ?? '나'}</span>
        <div className="hidden gap-2 group-hover:flex">
          <button
            onClick={() => {
              setEditBody(memo.body);
              setIsEditing(true);
            }}
            className="text-indigo-500 hover:text-indigo-700"
          >
            수정
          </button>
          <button
            onClick={() => {
              if (confirm('메모를 삭제하시겠습니까?')) {
                onDelete(memo.id);
              }
            }}
            className="text-red-500 hover:text-red-700"
          >
            삭제
          </button>
        </div>
      </div>
    </div>
  );
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
  const [collectionStatus, setCollectionStatus] = useState<ReadingStatus | null>(null);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  const pageContainerRef = useRef<HTMLDivElement | null>(null);
  const statusMenuRef = useRef<HTMLDivElement | null>(null);
  const token = useAuthStore((state) => state.token);

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

  const currentStatusOption = useMemo(
    () => STATUS_OPTIONS.find((option) => option.status === collectionStatus) ?? null,
    [collectionStatus]
  );

  const statusButtonLabel = currentStatusOption?.label ?? '상태 지정';
  const statusBadgeClass = currentStatusOption?.badgeClass ?? 'bg-gray-200 text-gray-600';
  const statusDescription = currentStatusOption?.description ?? '읽기 상태를 선택하세요.';

  useEffect(() => {
    const fetchInitial = async () => {
      if (!paperId) {
        setError('유효하지 않은 논문 ID 입니다.');
        return;
      }

      try {
        setError(null);
        setStatusMenuOpen(false);
        setCollectionStatus(null);
        setCollectionItem(null);
        if (collectionId) {
          const resp = await axiosInstance.get(`/api/collection-items/${collectionId}`);
          if (resp.data.success) {
            const info = resp.data.data as CollectionItemDetail;
            setCollectionItem(info);
            setTitle(info.title ?? '제목 미상');
            if (info.status) {
              setCollectionStatus(info.status);
            }
          }
        }

        const paperResp = await axiosInstance.get(`/api/papers/${paperId}`);
        if (paperResp.data.success) {
          const data = paperResp.data.data as PaperViewDetail;
          setPaperDetail(data);
          setNumPages(data.numPages ?? 1);
          // CORS 회피: 백엔드 파일 엔드포인트 사용
          setPdfUrl(`/api/papers/${paperId}/file`);
        }
      } catch (e) {
        console.error(e);
        setError('논문 정보를 불러오지 못했습니다.');
      }
    };

    fetchInitial();
  }, [paperId, collectionId]);

  useEffect(() => {
    if (!collectionId) {
      setCollectionStatus(null);
      return;
    }
    setCollectionStatus(collectionItem?.status ?? null);
  }, [collectionId, collectionItem]);

  const paperSha = paperDetail?.sha256;
  const documentFile = useMemo(() => {
    if (!pdfUrl) return null;
    if (!token) return pdfUrl;
    return {
      url: pdfUrl,
      httpHeaders: {
        Authorization: `Bearer ${token}`,
      },
      withCredentials: true,
    };
  }, [pdfUrl, token]);

  // --- 세션 추적 Refs ---
  const mountTimeRef = useRef<number>(Date.now());
  const maxPageRef = useRef<number>(1);
  const lastPageRef = useRef<number>(1);

  // 페이지 변경 시 Refs 업데이트
  useEffect(() => {
    lastPageRef.current = currentPage;
    if (currentPage > maxPageRef.current) {
      maxPageRef.current = currentPage;
    }
  }, [currentPage]);

  // 언마운트 시 세션 데이터 전송
  useEffect(() => {
    // paperId 변경 시 마운트 시간 초기화
    mountTimeRef.current = Date.now();
    maxPageRef.current = 1;
    lastPageRef.current = 1;

    return () => {
      if (!paperId) return;

      const sessionSeconds = Math.floor((Date.now() - mountTimeRef.current) / 1000);
      const data = {
        sessionSeconds,
        lastPage: lastPageRef.current,
        maxPage: maxPageRef.current,
        pageCount: numPages,
      };

      const url = `/api/papers/${paperId}/sessions`;
      const payload = JSON.stringify(data);

      if (token) {
        // keepalive fetch 사용 (Auth 헤더 포함)
        fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: payload,
          keepalive: true,
        }).catch((err) => console.warn('Failed to send session data', err));
      } else {
        // 비인증 상태 Fallback
        const blob = new Blob([payload], { type: 'application/json' });
        const success = navigator.sendBeacon(url, blob);
        if (!success) {
          console.warn('Failed to queue session data with sendBeacon');
        }
      }
    };
  }, [paperId, numPages, token]);
  // -----------------------------

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

  useEffect(() => {
    if (!statusMenuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (statusMenuRef.current && !statusMenuRef.current.contains(event.target as Node)) {
        setStatusMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [statusMenuOpen]);

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

  const handleDeleteHighlight = useCallback(async (highlightId: number) => {
    if (!confirm('하이라이트를 삭제하시겠습니까?')) return;
    try {
      await axiosInstance.delete(`/api/highlights/${highlightId}`);
      setSelectedAnchorId(null);
      fetchAnnotations(currentPage);
    } catch (e) {
      console.error(e);
      alert('하이라이트 삭제 실패');
    }
  }, [currentPage, fetchAnnotations]);

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

  const handleEditMemo = useCallback(async (id: number, newBody: string) => {
    try {
      await axiosInstance.patch(`/api/memos/${id}`, { body: newBody });
      await fetchAnnotations(currentPage);
    } catch (e) {
      console.error(e);
      alert('메모 수정 실패');
    }
  }, [currentPage, fetchAnnotations]);

  const handleDeleteMemo = useCallback(async (id: number) => {
    try {
      await axiosInstance.delete(`/api/memos/${id}`);
      await fetchAnnotations(currentPage);
    } catch (e) {
      console.error(e);
      alert('메모 삭제 실패');
    }
  }, [currentPage, fetchAnnotations]);

  const handleChangeStatus = useCallback(
    async (slug: 'to-read' | 'in-progress' | 'done') => {
      if (!collectionId) {
        alert('내 서재에 추가된 논문만 상태를 변경할 수 있습니다.');
        return;
      }
      if (statusUpdating) return;
      setStatusUpdating(true);
      try {
        const resp = await axiosInstance.patch(`/api/collection-items/${slug}/${collectionId}`, {});
        if (resp.data?.success) {
          const data = resp.data.data as StatusChangeResp;
          // 비인증 상태 Fallback
          setCollectionStatus(data.status);
          setCollectionItem((prev) => (prev ? { ...prev, status: data.status } : prev));
          window.dispatchEvent(new Event('collection:refresh'));
          setStatusMenuOpen(false);
        } else {
          const message = resp.data?.error?.message || '상태를 변경하지 못했습니다.';
          console.error('status change failed', resp.data);
          alert(message);
        }
      } catch (e) {
        console.error(e);
        alert('상태를 변경하지 못했습니다.');
      } finally {
        setStatusUpdating(false);
      }
    },
    [collectionId, statusUpdating]
  );

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
          {annotations?.items
            .filter(item => item.highlights.length > 0 || item.notes.length > 0)
            .map((item) => {
              const color = item.highlights[0]?.color || DEFAULT_HIGHLIGHT_COLOR;
              const highlightId = item.highlights[0]?.id;
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
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Highlight</div>
                      {isActive && highlightId && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteHighlight(highlightId);
                          }}
                          className="text-xs text-red-500 hover:text-red-700 hover:underline"
                        >
                          삭제
                        </button>
                      )}
                    </div>
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
                          <MemoItem
                            key={memo.id}
                            memo={memo}
                            onEdit={handleEditMemo}
                            onDelete={handleDeleteMemo}
                          />
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

  if (!documentFile) {
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
            <div className="relative w-fit" ref={pageContainerRef}>
              <Document file={documentFile} onLoadSuccess={(info) => setNumPages(info.numPages)} loading={<p className="p-4 text-gray-500">PDF 불러오는 중...</p>}>
                <Page
                  pageNumber={currentPage}
                  width={880}
                  renderAnnotationLayer={false}
                  renderTextLayer
                />
              </Document>

              <div className="pointer-events-none absolute inset-0">
                {highlightLayers.map(({ rect, color, anchorId, highlightId }, index) => (
                  <div
                    key={`${anchorId}-${highlightId}-${index}`}
                    style={{
                      position: 'absolute',
                      left: `${rect.x * 100}%`,
                      top: `${rect.y * 100}%`,
                      width: `${rect.w * 100}%`,
                      height: `${rect.h * 100}%`,
                      backgroundColor: colorToRgba(color),
                      borderRadius: '4px',
                    }}
                    className="pointer-events-auto cursor-pointer hover:opacity-80"
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
                  className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm shadow-md z-50"
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
      {collectionId && (
        <div className="fixed bottom-8 right-8 z-40">
          <div ref={statusMenuRef} className="relative">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setStatusMenuOpen((prev) => !prev)}
                disabled={statusUpdating}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold shadow-lg transition ${statusBadgeClass} ${statusUpdating ? 'opacity-80 cursor-wait' : 'cursor-pointer hover:shadow-xl'} ${statusMenuOpen ? 'ring-2 ring-indigo-200 ring-offset-2' : ''}`}
              >
                <span>{statusButtonLabel}</span>
                <span className="text-xs text-current">▾</span>
              </button>
            </div>
            {statusMenuOpen && (
              <div className="absolute bottom-12 right-0 w-64 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl">
                <div className="border-b border-gray-100 bg-gray-50 px-4 py-3">
                  <p className="text-xs text-gray-500">{statusDescription}</p>
                </div>
                <div className="divide-y divide-gray-100">
                  {STATUS_OPTIONS.map((option) => {
                    const isActive = option.status === collectionStatus;
                    return (
                      <button
                        key={option.status}
                        type="button"
                        onClick={() => handleChangeStatus(option.slug)}
                        disabled={statusUpdating || isActive}
                        className={`w-full px-4 py-3 text-left text-sm transition ${isActive ? 'bg-indigo-50 font-semibold text-indigo-700' : 'hover:bg-gray-50'
                          } ${statusUpdating ? 'cursor-wait' : ''}`}
                      >
                        <div className="flex items-center justify-between">
                          <span>{option.label}</span>
                          {isActive && <span className="text-xs text-indigo-500">선택됨</span>}
                        </div>
                        <p className="mt-1 text-xs text-gray-500">{option.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NoteViewerPage;
