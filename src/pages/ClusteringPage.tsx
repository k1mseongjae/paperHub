import React, { useEffect, useMemo, useRef, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import type { ForceGraphMethods, LinkObject, NodeObject } from 'react-force-graph-2d';
import axiosInstance from '../api/axiosInstance.ts';
import { getCategoryName } from '../utils/categories';

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
  keywords?: string[];
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

type GraphNode = NodeObject & {
  id: string;
  arXivId: string;
  title: string;
  abstractText?: string;
  authors?: string;
  primaryCategory?: string;
  publishedDate?: string;
  isCenter?: boolean;
  color?: string;
};

type GraphLink = LinkObject & {
  source: string;
  target: string;
  value?: number;
  keywords?: string[];
};

const palette = ['#8b5cf6', '#22d3ee', '#f59e0b', '#10b981', '#ef4444', '#0ea5e9'];

const pickColor = (cat?: string) => {
  if (!cat) return '#38bdf8';
  const idx = Math.abs(cat.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0)) % palette.length;
  return palette[idx];
};

const parseAuthors = (raw?: string) => {
  if (!raw) return '';
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.join(', ');
    }
  } catch (e) {
    /* ignore */
  }
  return raw;
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
  const [dimensions, setDimensions] = useState({ width: 960, height: 640 });

  const containerRef = useRef<HTMLDivElement | null>(null);
  const fgRef = useRef<ForceGraphMethods<GraphNode, GraphLink> | undefined>(undefined);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect) {
        setDimensions({ width: rect.width, height: rect.height });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (fgRef.current) {
      // link force distance 설정
      fgRef.current.d3Force('link')?.distance((link: any) => {
        // weight(유사도) 높을수록 거리 짧게
        const val = link.value ?? 0.5;
        // 거리 조정
        return 100 / (val + 0.1);
      });
      // 시뮬레이션 재가열
      fgRef.current.d3ReheatSimulation();
    }
  }, [graph]);

  const fetchGraph = async (arxivId: string, merge = false) => {
    setLoading(true);
    setError(null);
    setCenterArxivId(arxivId);

    setSelectedArxiv(arxivId);
    try {
      const resp = await axiosInstance.get(`/api/graph/${encodeURIComponent(arxivId)}`);
      if (resp.data?.success) {
        const newGraph = resp.data.data as GraphResp;
        if (merge) {
          setGraph((prev) => {
            if (!prev) return newGraph;
            // 노드 병합
            const existingNodeIds = new Set(prev.nodes.map((n) => n.arXivId));
            const uniqueNewNodes = newGraph.nodes.filter((n) => !existingNodeIds.has(n.arXivId));
            const mergedNodes = [...prev.nodes, ...uniqueNewNodes];

            // 엣지 병합
            const existingEdges = new Set(prev.edges.map((e) => `${e.source}-${e.target}`));
            const uniqueNewEdges = newGraph.edges.filter((e) => !existingEdges.has(`${e.source}-${e.target}`));
            const mergedEdges = [...prev.edges, ...uniqueNewEdges];

            return { nodes: mergedNodes, edges: mergedEdges };
          });
        } else {
          setGraph(newGraph);
        }
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

  const fetchLibraryGraph = async () => {
    setLoading(true);
    setError(null);
    setCenterArxivId(null); // 중심 노드 없음
    try {
      // status=done (읽은 논문)
      const resp = await axiosInstance.get('/api/graph/library?status=done');
      if (resp.data?.success) {
        setGraph(resp.data.data as GraphResp);
      } else {
        setError('서재 그래프를 불러오지 못했습니다.');
      }
    } catch (e) {
      console.error(e);
      setError('서재 그래프 로딩 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const fetchExplanation = async (recId: string) => {
    // centerArxivId가 있으면 사용
    if (!centerArxivId) {
      setError('기준 논문(Center)이 없어 추천 이유를 불러올 수 없습니다.');
      return;
    }
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

  useEffect(() => {
    fetchLibraryGraph();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!arxivIdInput.trim()) {
      setError('arXiv ID를 입력해주세요.');
      return;
    }
    fetchGraph(arxivIdInput.trim());
  };

  const graphData = useMemo(() => {
    if (!graph) return { nodes: [], links: [] };
    const nodes: GraphNode[] = graph.nodes.map((n) => {
      // centerArxivId 여부 확인
      const isCenter = centerArxivId ? n.arXivId === centerArxivId : false;
      return {
        id: n.arXivId,
        arXivId: n.arXivId,
        title: n.title,
        abstractText: n.abstractText,
        authors: n.authors,
        primaryCategory: n.primaryCategory,
        publishedDate: n.publishedDate,
        isCenter,
        color: isCenter ? '#fbbf24' : pickColor(n.primaryCategory),
        val: isCenter ? 8 : 4,
      };
    });
    const links: GraphLink[] = graph.edges.map((e) => ({
      source: e.source,
      target: e.target,
      value: e.weight ?? 1.2,
      keywords: e.keywords,
    }));
    return { nodes, links };
  }, [graph, centerArxivId]);

  const selectedNode = useMemo(
    () => graphData.nodes.find((n) => n.arXivId === selectedArxiv) ?? null,
    [graphData.nodes, selectedArxiv]
  );
  const selectedReason = selectedArxiv ? explanations[selectedArxiv] : undefined;

  const nodeCanvasObject = (nodeObj: NodeObject, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const node = nodeObj as GraphNode;
    const radius = node.isCenter ? 11 : 8;
    ctx.beginPath();
    ctx.arc(node.x ?? 0, node.y ?? 0, radius, 0, 2 * Math.PI, false);
    ctx.fillStyle = node.color ?? '#38bdf8';
    ctx.shadowColor = node.isCenter ? 'rgba(251,191,36,0.7)' : 'rgba(14,165,233,0.6)';
    ctx.shadowBlur = node.isCenter ? 28 : 16;
    ctx.fill();
    ctx.shadowBlur = 0;

    const showLabel = globalScale > 1.6 || selectedArxiv === node.arXivId || node.isCenter;
    if (!showLabel) return;

    const label = node.title || node.arXivId;
    const fontSize = Math.max(10, 14 / globalScale);
    ctx.font = `${fontSize}px 'Inter', system-ui`;
    const textWidth = ctx.measureText(label).width;
    const padding = 6;
    const bWidth = textWidth + padding * 2;
    const bHeight = fontSize + padding * 2;
    const x = (node.x ?? 0) - bWidth / 2;
    const y = (node.y ?? 0) - radius - bHeight - 4;

    ctx.fillStyle = 'rgba(15,23,42,0.9)';
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 8, y);
    ctx.lineTo(x + bWidth - 8, y);
    ctx.quadraticCurveTo(x + bWidth, y, x + bWidth, y + 8);
    ctx.lineTo(x + bWidth, y + bHeight - 8);
    ctx.quadraticCurveTo(x + bWidth, y + bHeight, x + bWidth - 8, y + bHeight);
    ctx.lineTo(x + 8, y + bHeight);
    ctx.quadraticCurveTo(x, y + bHeight, x, y + bHeight - 8);
    ctx.lineTo(x, y + 8);
    ctx.quadraticCurveTo(x, y, x + 8, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#e2e8f0';
    ctx.fillText(label, x + padding, y + padding + fontSize - 2);
  };

  const handleNodeClick = (nodeObj: NodeObject) => {
    const node = nodeObj as GraphNode;
    setSelectedArxiv(node.arXivId);

    // 확장 로직
    // arXiv ID 없음(메타데이터 부재) -> 확장 불가
    if (!node.arXivId) {
      setError('이 논문은 메타데이터가 없어 확장할 수 없습니다.');
      return;
    }

    fetchGraph(node.arXivId, true);

    if (!node.isCenter) {
      // fetchExplanation(node.arXivId); // 자동 호출 제거
    }
    fgRef.current?.centerAt(node.x ?? 0, node.y ?? 0, 600);
    fgRef.current?.zoom(1.5, 600);
  };

  const zoomBy = (delta: number) => {
    const current = fgRef.current?.zoom() ?? 1;
    const next = Math.min(4, Math.max(0.5, current * delta));
    fgRef.current?.zoom(next, 400);
  };

  return (
    <div className="flex h-full flex-col gap-4 lg:flex-row">
      <div className="flex flex-1 flex-col rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-6 shadow-2xl ring-1 ring-white/10 min-h-0">
        <form onSubmit={handleSubmit} className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center shrink-0">
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
            {loading ? '검색 중...' : '검색'}
          </button>
          <button
            type="button"
            onClick={fetchLibraryGraph}
            disabled={loading}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700 disabled:cursor-wait disabled:bg-emerald-400"
          >
            내 서재로 초기화
          </button>
        </form>

        <div
          ref={containerRef}
          className="relative flex-1 w-full overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-inner min-h-0"
        >
          <ForceGraph2D
            ref={fgRef}
            width={dimensions.width}
            height={dimensions.height}
            graphData={graphData}
            backgroundColor="rgba(15,23,42,1)"
            linkColor={() => 'rgba(148,163,184,0.55)'}
            linkWidth={(l) => Math.max(1.4, Math.min(4, (l as GraphLink).value ?? 1.4))}
            linkLabel={(l) => {
              const link = l as GraphLink;
              if (link.keywords && link.keywords.length > 0) {
                return `Keywords: ${link.keywords.join(', ')}`;
              }
              return '';
            }}
            nodeRelSize={6}
            cooldownTicks={80}
            onNodeClick={handleNodeClick}
            onNodeHover={(node) => {
              if (!node) return;
              const gn = node as GraphNode;
              setSelectedArxiv(gn.arXivId);
            }}
            enableNodeDrag
            enableZoomInteraction
            minZoom={0.5}
            maxZoom={4}
            nodeCanvasObject={nodeCanvasObject}
          />

          {!graph && !loading && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-indigo-100">
              arXiv ID를 입력하고 그래프를 불러와 주세요.
            </div>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-indigo-100">
          <button
            type="button"
            onClick={() => zoomBy(1.2)}
            className="rounded-lg border border-white/20 bg-white/10 px-2 py-1 font-semibold hover:bg-white/20"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => zoomBy(0.8)}
            className="rounded-lg border border-white/20 bg-white/10 px-2 py-1 font-semibold hover:bg-white/20"
          >
            -
          </button>
          <button
            type="button"
            onClick={() => fgRef.current?.zoomToFit(400)}
            className="rounded-lg border border-white/20 bg-white/10 px-2 py-1 font-semibold hover:bg-white/20"
          >
            Fit
          </button>
          <span className="opacity-80">노드 드래그 / 배경 휠 줌</span>
        </div>

        {error && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>

      <aside className="w-full md:w-96 shrink-0 rounded-2xl border border-gray-100 bg-white p-5 shadow-xl overflow-y-auto">
        <h3 className="text-lg font-semibold text-gray-900">노드 정보</h3>
        {!selectedNode && <p className="mt-3 text-sm text-gray-600">노드를 선택하면 상세정보가 나타납니다.</p>}
        {selectedNode && (
          <div className="mt-3 space-y-3">
            <div>
              <p className="text-xs font-semibold uppercase text-gray-500">{selectedNode.isCenter ? '기준 논문' : '추천 논문'}</p>
              <p className="mt-1 text-base font-semibold text-gray-900">{selectedNode.title || selectedNode.arXivId}</p>
              {selectedNode.authors && (
                <div className="mt-2 space-y-1 text-sm text-gray-700">
                  <div className="text-xs font-semibold uppercase text-gray-500">저자</div>
                  <p className="leading-relaxed">{parseAuthors(selectedNode.authors)}</p>
                </div>
              )}
              {selectedNode.primaryCategory && (
                <span className="mt-2 inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                  {getCategoryName(selectedNode.primaryCategory)}
                </span>
              )}
              {selectedNode.publishedDate && (
                <span className="ml-2 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  {selectedNode.publishedDate}
                </span>
              )}
            </div>
            {selectedNode.abstractText && (
              <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-800">
                <div className="text-xs font-semibold uppercase text-gray-500">초록</div>
                <p className="mt-1 line-clamp-8 whitespace-pre-wrap leading-relaxed">{selectedNode.abstractText}</p>
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
                  <div className="mt-2">
                    {explaining === selectedNode.arXivId ? (
                      <p className="text-sm text-indigo-800">추천 이유 생성 중...</p>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fetchExplanation(selectedNode.arXivId)}
                        className="w-full rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-700"
                      >
                        추천 이유 보기
                      </button>
                    )}
                  </div>
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
