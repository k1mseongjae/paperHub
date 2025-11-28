import React, { useEffect, useMemo, useRef, useState } from 'react';
import axiosInstance from '../api/axiosInstance.ts';

type NodeResp = {
  id: number | null;
  arXivId: string;
  title: string;
  abstractText?: string;
  authors?: string;
  primaryCategory?: string;
  publishedDate?: string;
};

type EdgeResp = {
  id: number | null;
  type: string;
  source: string;
  target: string;
  weight?: number | null;
  rank?: number | null;
};

type GraphResp = {
  nodes: NodeResp[];
  edges: EdgeResp[];
};

type Explanation = {
  explanation: string;
  totalScore: number;
  cosineSimilarity: number;
  venueMatch: number;
  categoryMatch: number;
  recency: number;
};

type PositionedNode = NodeResp & { x: number; y: number; isCenter: boolean };
type Vec2 = { x: number; y: number };

const polarToCartesian = (cx: number, cy: number, r: number, angle: number) => ({
  x: cx + r * Math.cos(angle),
  y: cy + r * Math.sin(angle),
});

const computeLayout = (nodes: NodeResp[], width: number, height: number, centerId: string | null) => {
  if (!nodes.length) return [] as PositionedNode[];
  const centerX = width / 2;
  const centerY = height / 2;
  const centerNode = nodes.find((n) => n.arXivId === centerId) ?? nodes[0];

  const others = nodes.filter((n) => n.arXivId !== centerNode.arXivId);
  const radius = Math.max(120, Math.min(width, height) / 2.5);
  const angleStep = others.length ? (Math.PI * 2) / others.length : 0;

  const placed: PositionedNode[] = [
    { ...centerNode, x: centerX, y: centerY, isCenter: true },
  ];

  others.forEach((n, idx) => {
    const { x, y } = polarToCartesian(centerX, centerY, radius, angleStep * idx);
    placed.push({ ...n, x, y, isCenter: false });
  });

  return placed;
};

const ClusteringPage: React.FC = () => {
  const [arxivIdInput, setArxivIdInput] = useState('');
  const [graph, setGraph] = useState<GraphResp | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedArxiv, setSelectedArxiv] = useState<string | null>(null);
  const [centerArxivId, setCenterArxivId] = useState<string | null>(null);
  const [explanations, setExplanations] = useState<Record<string, Explanation>>({});
  const [explaining, setExplaining] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [panning, setPanning] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [pan, setPan] = useState<Vec2>({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [viewport, setViewport] = useState({ width: 900, height: 560 });
  const [positions, setPositions] = useState<Record<string, PositionedNode>>({});

  useEffect(() => {
    const updateSize = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        setViewport({ width: rect.width, height: rect.height });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const positionedNodes = useMemo(() => Object.values(positions), [positions]);

  const nodeById = (arxivId: string) => positionedNodes.find((n) => n.arXivId === arxivId);

  const fetchGraph = async (arxivId: string) => {
    setLoading(true);
    setError(null);
    setCenterArxivId(arxivId);
    setSelectedArxiv(arxivId);
    try {
      const resp = await axiosInstance.get(`/api/graph/${encodeURIComponent(arxivId)}`);
      if (resp.data?.success) {
        setGraph(resp.data.data as GraphResp);
        const layout = computeLayout(
          (resp.data.data as GraphResp).nodes,
          viewport.width,
          viewport.height,
          arxivId
        );
        const mapped: Record<string, PositionedNode> = {};
        layout.forEach((n) => {
          mapped[n.arXivId] = n;
        });
        setPositions(mapped);
      } else {
        setError('그래프를 불러오지 못했습니다.');
      }
    } catch (e) {
      console.error(e);
      setError('그래프 로딩 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const fetchExplanation = async (recId: string) => {
    if (!centerArxivId) return;
    if (explanations[recId]) return;
    setExplaining(recId);
    try {
      const resp = await axiosInstance.get(
        `/api/recommendations/similar/${encodeURIComponent(centerArxivId)}/${encodeURIComponent(recId)}/explanation`
      );
      if (resp.data?.success) {
        const data = resp.data.data as Explanation;
        setExplanations((prev) => ({ ...prev, [recId]: data }));
      } else {
        setError('추천 이유를 불러오지 못했습니다.');
      }
    } catch (e) {
      console.error(e);
      setError('추천 이유를 불러오지 못했습니다.');
    } finally {
      setExplaining(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!arxivIdInput.trim()) {
      setError('arXiv ID를 입력해주세요.');
      return;
    }
    fetchGraph(arxivIdInput.trim());
  };

  useEffect(() => {
    if (!graph || !centerArxivId) return;
    const layout = computeLayout(graph.nodes, viewport.width, viewport.height, centerArxivId);
    const mapped: Record<string, PositionedNode> = {};
    layout.forEach((n) => {
      mapped[n.arXivId] = n;
    });
    setPositions(mapped);
  }, [graph, viewport, centerArxivId]);

  const clampToViewport = (x: number, y: number) => ({
    x: Math.max(40, Math.min((viewport.width - 40), x)),
    y: Math.max(40, Math.min((viewport.height - 40), y)),
  });

  const screenToGraph = (clientX: number, clientY: number): Vec2 | null => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: (clientX - rect.left - pan.x) / scale,
      y: (clientY - rect.top - pan.y) / scale,
    };
  };

  const handlePointerDown = (e: React.PointerEvent, arxivId: string) => {
    const node = positions[arxivId];
    const graphPoint = screenToGraph(e.clientX, e.clientY);
    if (!node || !graphPoint) return;
    e.stopPropagation();
    dragOffsetRef.current = {
      x: node.x - graphPoint.x,
      y: node.y - graphPoint.y,
    };
    setDragging(arxivId);
    setSelectedArxiv(arxivId);
    if (!node.isCenter) {
      fetchExplanation(arxivId);
    }
  };

  useEffect(() => {
    if (!dragging) return;
    const handleMove = (e: PointerEvent) => {
      const point = screenToGraph(e.clientX, e.clientY);
      if (!point) return;
      const { x, y } = clampToViewport(
        point.x + dragOffsetRef.current.x,
        point.y + dragOffsetRef.current.y
      );
      setPositions((prev) => {
        const node = prev[dragging];
        if (!node) return prev;
        return { ...prev, [dragging]: { ...node, x, y } };
      });
    };
    const handleUp = () => setDragging(null);
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [dragging, scale, pan]);

  const handleCanvasPointerDown = (e: React.PointerEvent) => {
    if (dragging) return;
    const target = e.target as HTMLElement;
    if (target.closest('[data-node]')) {
      return;
    }
    setPanning(true);
    dragOffsetRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  useEffect(() => {
    if (!panning) return;
    const move = (e: PointerEvent) => {
      setPan({
        x: e.clientX - dragOffsetRef.current.x,
        y: e.clientY - dragOffsetRef.current.y,
      });
    };
    const up = () => setPanning(false);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, [panning, pan.x, pan.y]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    setPan((prevPan) => {
      setScale((prevScale) => {
        const factor = e.deltaY < 0 ? 1.08 : 0.92;
        const nextScale = Math.min(2.4, Math.max(0.6, prevScale * factor));
        const scaleRatio = nextScale / prevScale;
        const newPan = {
          x: mouseX - (mouseX - prevPan.x) * scaleRatio,
          y: mouseY - (mouseY - prevPan.y) * scaleRatio,
        };
        setPan(newPan);
        return nextScale;
      });
      return prevPan;
    });
  };

  const resetView = () => {
    setPan({ x: 0, y: 0 });
    setScale(1);
  };

  const selectedNode = selectedArxiv ? nodeById(selectedArxiv) : null;
  const selectedReason = selectedArxiv ? explanations[selectedArxiv] : undefined;

  return (
    <div className="flex h-full flex-col gap-4 lg:flex-row">
      <div className="flex-1 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-6 shadow-2xl ring-1 ring-white/10">
        <form onSubmit={handleSubmit} className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="text"
            placeholder="arXiv ID 입력 (예: 2401.12345)"
            value={arxivIdInput}
            onChange={(e) => setArxivIdInput(e.target.value)}
            className="flex-1 rounded-lg border border-indigo-200/70 bg-white/90 px-3 py-2 text-sm text-gray-800 shadow focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-700 disabled:cursor-wait disabled:bg-indigo-400"
          >
            {loading ? '불러오는 중...' : '그래프 불러오기'}
          </button>
        </form>

        <div
          ref={containerRef}
          onPointerDown={handleCanvasPointerDown}
          onWheel={handleWheel}
          className="relative min-h-[420px] h-[600px] overflow-hidden rounded-2xl border border-white/10 bg-gradient-radial from-slate-900 via-slate-950 to-black shadow-inner"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.06),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(99,102,241,0.08),transparent_25%),radial-gradient(circle_at_50%_80%,rgba(14,165,233,0.08),transparent_30%)]" />

          <div
            className="absolute inset-0"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
              transformOrigin: '0 0',
              transition: dragging || panning ? 'none' : 'transform 120ms ease-out',
            }}
          >
            {graph && (
              <svg className="absolute inset-0 h-full w-full">
                <defs>
                  <linearGradient id="edgeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#a5b4fc" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#67e8f9" stopOpacity="0.75" />
                  </linearGradient>
                  <marker id="arrowhead" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#67e8f9" />
                  </marker>
                </defs>
                {graph.edges.map((edge) => {
                  const source = nodeById(edge.source);
                  const target = nodeById(edge.target);
                  if (!source || !target) return null;
                  const strokeWidth = edge.weight ? Math.max(1.5, Math.min(4, edge.weight)) : 1.6;
                  return (
                    <line
                      key={`${edge.source}-${edge.target}-${edge.rank ?? ''}`}
                      x1={source.x}
                      y1={source.y}
                      x2={target.x}
                      y2={target.y}
                      stroke="url(#edgeGradient)"
                      strokeWidth={strokeWidth}
                      markerEnd="url(#arrowhead)"
                      opacity={0.7}
                    />
                  );
                })}
              </svg>
            )}

            <div className="relative h-full w-full">
              {positionedNodes.map((node) => {
                const isSelected = node.arXivId === selectedArxiv;
                const size = node.isCenter ? 96 : 78;
                return (
                  <React.Fragment key={node.arXivId}>
                    <div
                      data-node
                      className={`group absolute cursor-pointer rounded-full border text-center shadow-xl transition-all duration-150 ${
                        node.isCenter
                          ? 'bg-amber-400/95 border-amber-100 text-slate-950'
                          : isSelected
                            ? 'bg-indigo-400/95 border-indigo-100 text-slate-900'
                            : 'bg-slate-800/90 border-slate-500 text-slate-100'
                      }`}
                      style={{
                        left: `${node.x - size / 2}px`,
                        top: `${node.y - size / 2}px`,
                        width: `${size}px`,
                        height: `${size}px`,
                        transform: 'translate(-50%, -50%)',
                      }}
                      onPointerDown={(e) => handlePointerDown(e, node.arXivId)}
                    >
                      <div className="flex h-full flex-col items-center justify-center px-3">
                        <div className="text-[10px] uppercase tracking-wide opacity-80">
                          {node.isCenter ? '기준 논문' : '추천'}
                        </div>
                        <div className="mt-1 line-clamp-2 text-[11px] font-semibold leading-tight">
                          {node.title || node.arXivId}
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <div
                        className="pointer-events-none absolute z-20 w-64 -translate-x-1/2 -translate-y-full rounded-xl border border-white/10 bg-slate-900/90 p-3 text-left text-xs text-slate-50 shadow-2xl backdrop-blur-lg ring-1 ring-indigo-400/30"
                        style={{ left: node.x, top: node.y - size / 2 - 12 }}
                      >
                        <div className="text-[10px] uppercase text-amber-200">{node.isCenter ? '기준 논문' : '추천'}</div>
                        <div className="mt-1 text-sm font-semibold leading-snug text-white line-clamp-3">{node.title}</div>
                        {node.authors && <div className="mt-1 text-[11px] text-slate-200 line-clamp-2">{node.authors}</div>}
                        {node.abstractText && (
                          <div className="mt-2 line-clamp-3 text-[11px] leading-relaxed text-slate-200">
                            {node.abstractText}
                          </div>
                        )}
                      </div>
                    )}
                  </React.Fragment>
                );
              })}

              {!graph && !loading && (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-indigo-100">
                  arXiv ID를 입력하고 그래프를 불러와 주세요.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-indigo-100">
          <button
            type="button"
            onClick={() => setScale((s) => Math.min(2.4, s * 1.15))}
            className="rounded-lg border border-white/20 bg-white/10 px-2 py-1 font-semibold hover:bg-white/20"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => setScale((s) => Math.max(0.6, s * 0.85))}
            className="rounded-lg border border-white/20 bg-white/10 px-2 py-1 font-semibold hover:bg-white/20"
          >
            -
          </button>
          <button
            type="button"
            onClick={resetView}
            className="rounded-lg border border-white/20 bg-white/10 px-2 py-1 font-semibold hover:bg-white/20"
          >
            Reset
          </button>
          <span className="opacity-80">드래그: 노드 이동 / 배경 드래그: 패닝 / 휠: 줌</span>
        </div>

        {error && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>

      <aside className="w-full md:w-96 shrink-0 rounded-2xl border border-gray-100 bg-white p-5 shadow-xl">
        <h3 className="text-lg font-semibold text-gray-900">노드 정보</h3>
        {!selectedNode && <p className="mt-3 text-sm text-gray-600">노드를 선택하면 상세정보가 나타납니다.</p>}
        {selectedNode && (
          <div className="mt-3 space-y-3">
            <div>
              <p className="text-xs font-semibold uppercase text-gray-500">{selectedNode.isCenter ? '기준 논문' : '추천 논문'}</p>
              <p className="mt-1 text-base font-semibold text-gray-900">{selectedNode.title || selectedNode.arXivId}</p>
              {selectedNode.authors && (
                <p className="mt-1 text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                  {selectedNode.authors}
                </p>
              )}
              {selectedNode.primaryCategory && (
                <span className="mt-2 inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                  {selectedNode.primaryCategory}
                </span>
              )}
            </div>
            {selectedNode.abstractText && (
              <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
                <p className="line-clamp-6 whitespace-pre-wrap leading-relaxed">{selectedNode.abstractText}</p>
              </div>
            )}

            {!selectedNode.isCenter && (
              <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-3">
                <div className="flex items-center justify-between text-xs font-semibold text-indigo-700">
                  <span>추천 이유</span>
                  {explaining === selectedNode.arXivId && <span className="animate-pulse text-indigo-500">생성 중...</span>}
                </div>
                {selectedReason ? (
                  <div className="mt-2 space-y-2 text-sm text-indigo-900">
                    <p className="whitespace-pre-wrap leading-relaxed">{selectedReason.explanation}</p>
                    <div className="text-xs text-indigo-700">
                      점수: 종합 {selectedReason.totalScore.toFixed(3)}, 내용유사 {selectedReason.cosineSimilarity.toFixed(3)}, 카테고리 {selectedReason.categoryMatch.toFixed(3)}, 최신성 {selectedReason.recency.toFixed(3)}
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-indigo-800">
                    {explaining === selectedNode.arXivId ? '추천 이유 생성 중...' : '노드를 클릭하면 추천 이유를 불러옵니다.'}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </aside>
    </div>
  );
};

export default ClusteringPage;
