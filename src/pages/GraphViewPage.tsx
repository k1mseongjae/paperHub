import { useRef, useEffect, useState, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import axiosInstance from '../api/axiosInstance';

// --- Types ---

interface GraphNode {
    id: number;
    arXivId: string;
    title: string;
    authors: string;
    publishedDate: string;
    abstractText: string;
    primaryCategory: string;
    val: number; // for node size
    color?: string;
    isLibraryPaper?: boolean; // To distinguish user's papers
}

interface GraphLink {
    source: number | GraphNode;
    target: number | GraphNode;
    distance: number;
    color: string;
}

interface GraphData {
    nodes: GraphNode[];
    links: GraphLink[];
}

// Backend Response Types
interface NodeResp {
    id: number;
    arXivId: string;
    title: string;
    abstractText: string;
    authors: string; // JSON string or plain string
    primaryCategory: string;
    publishedDate: string;
}

interface EdgeResp {
    id: number;
    type: string;
    source: string; // "paper:123"
    target: string; // "paper:456"
    weight: number;
    rank: number;
}

interface GraphResp {
    nodes: NodeResp[];
    edges: EdgeResp[];
}

const GraphViewPage = () => {
    const fgRef = useRef<any>();
    const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expandedNodeIds, setExpandedNodeIds] = useState<Set<number>>(new Set());

    // For the details panel
    const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
    const [isPanelOpen, setIsPanelOpen] = useState(false);

    // 1. Fetch All User's Papers (To Read, In Progress, Done)
    useEffect(() => {
        const fetchAllLibraryPapers = async () => {
            setIsLoading(true);
            try {
                const statuses = ['to-read', 'in-progress', 'done'];
                const requests = statuses.map(status => axiosInstance.get(`/api/collections/${status}`));
                const responses = await Promise.all(requests);

                let allPapers: any[] = [];
                responses.forEach(response => {
                    if (response.data.success && response.data.data.content) {
                        allPapers = [...allPapers, ...response.data.data.content];
                    }
                });

                // Deduplicate by paperId
                const uniquePapers = new Map();
                allPapers.forEach((p: any) => {
                    const paperId = p.paperId || p.paper?.id;
                    if (paperId && !uniquePapers.has(paperId)) {
                        uniquePapers.set(paperId, {
                            id: paperId,
                            arXivId: p.arxivId || p.paper?.arxivId || '', // Ensure field names match API
                            title: p.title || p.paper?.title || 'Untitled',
                            authors: p.authors || p.paper?.authors || '',
                            publishedDate: p.publishedDate || p.paper?.publishedDate || '',
                            abstractText: p.abstractText || p.paper?.abstractText || '',
                            primaryCategory: p.primaryCategory || p.paper?.primaryCategory || '',
                            val: 5, // Initial size
                            isLibraryPaper: true,
                            color: '#4f46e5' // Indigo for library papers
                        });
                    }
                });

                setGraphData({
                    nodes: Array.from(uniquePapers.values()),
                    links: [] // No initial links, just scattered nodes
                });

            } catch (err) {
                console.error('Failed to fetch library papers:', err);
                setError('Failed to load your library.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchAllLibraryPapers();
    }, []);

    // 2. Expand Graph on Node Click
    const expandNode = async (node: GraphNode) => {
        if (expandedNodeIds.has(node.id)) {
            // Already expanded, just select it
            return;
        }

        try {
            // setIsLoadingGraph(true); // Maybe show a small loading indicator?
            const response = await axiosInstance.get<any>(`/api/graph/${node.id}`);

            if (response.data.success) {
                const data: GraphResp = response.data.data;

                setGraphData(prevData => {
                    const newNodes = [...prevData.nodes];
                    const newLinks = [...prevData.links];
                    const existingNodeIds = new Set(prevData.nodes.map(n => n.id));
                    const existingLinkKeys = new Set(prevData.links.map(l => {
                        const sourceId = typeof l.source === 'object' ? (l.source as any).id : l.source;
                        const targetId = typeof l.target === 'object' ? (l.target as any).id : l.target;
                        return `${sourceId}-${targetId}`;
                    }));

                    // Add new nodes
                    data.nodes.forEach(n => {
                        if (!existingNodeIds.has(n.id)) {
                            newNodes.push({
                                id: n.id,
                                arXivId: n.arXivId,
                                title: n.title,
                                authors: n.authors,
                                publishedDate: n.publishedDate,
                                abstractText: n.abstractText,
                                primaryCategory: n.primaryCategory,
                                val: 3, // Smaller size for explored nodes
                                color: '#64748b', // Slate for explored nodes
                                isLibraryPaper: false
                            });
                            existingNodeIds.add(n.id);
                        }
                    });

                    // Add new links
                    data.edges.forEach(e => {
                        const sourceId = parseInt(e.source.split(':')[1]);
                        const targetId = parseInt(e.target.split(':')[1]);
                        const linkKey = `${sourceId}-${targetId}`;

                        if (!existingLinkKeys.has(linkKey)) {
                            newLinks.push({
                                source: sourceId,
                                target: targetId,
                                distance: (1 - e.weight) * 100,
                                color: e.type === 'citation' ? '#ff0000' : '#cbd5e1',
                            });
                            existingLinkKeys.add(linkKey);
                        }
                    });

                    return { nodes: newNodes, links: newLinks };
                });

                setExpandedNodeIds(prev => new Set(prev).add(node.id));
            }
        } catch (err) {
            console.error('Failed to expand graph:', err);
            // Optional: show toast error
        }
    };


    // --- Event Handlers ---

    const handleNodeClick = useCallback((node: any) => {
        setSelectedNode(node as GraphNode);
        setIsPanelOpen(true);
        expandNode(node as GraphNode);

        // Center view on node
        if (fgRef.current) {
            fgRef.current.centerAt(node.x, node.y, 1000);
            fgRef.current.zoom(2, 2000);
        }
    }, [expandedNodeIds]); // Re-create if expanded set changes (though logic handles it)

    const handleBackgroundClick = useCallback(() => {
        setIsPanelOpen(false);
        setSelectedNode(null);
    }, []);

    const handleAddToLibrary = async (node: GraphNode) => {
        try {
            const pdfUrl = `https://arxiv.org/pdf/${node.arXivId}.pdf`;

            const registerResp = await axiosInstance.post('/api/papers/register-from-url', {
                url: pdfUrl,
                title: node.title,
            });

            if (registerResp.data.success) {
                const newPaperId = registerResp.data.data.id;
                await axiosInstance.post('/api/collections/to-read', { paperId: newPaperId });

                // Update node visual state to show it's now in library
                setGraphData(prev => ({
                    ...prev,
                    nodes: prev.nodes.map(n => n.id === node.id ? { ...n, isLibraryPaper: true, color: '#4f46e5', val: 5 } : n)
                }));

                alert(`Added "${node.title}" to your library!`);
            } else {
                alert('Failed to register paper.');
            }
        } catch (err) {
            console.error(err);
            alert('Failed to add paper to library.');
        }
    };

    return (
        <div className="relative w-full h-full bg-slate-50 overflow-hidden flex flex-col">
            {/* Top Info Bar */}
            <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur p-4 rounded-lg shadow-lg border border-slate-200 max-w-md">
                <h2 className="text-lg font-bold text-slate-800">My Library Graph</h2>
                <p className="text-xs text-slate-500 mt-1">
                    Click on a node to explore related papers.
                    <br />
                    <span className="inline-block w-2 h-2 rounded-full bg-indigo-600 mr-1"></span> My Library
                    <span className="inline-block w-2 h-2 rounded-full bg-slate-500 ml-2 mr-1"></span> Explored
                </p>

                {isLoading && <p className="text-xs text-blue-500 mt-2">Loading library...</p>}
                {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
            </div>

            {/* Graph Area */}
            <div className="flex-1">
                <ForceGraph2D
                    ref={fgRef}
                    graphData={graphData}
                    nodeLabel="title"
                    nodeColor={(node: any) => node.color || '#64748b'}
                    nodeRelSize={6}
                    nodeVal="val"
                    linkColor={(link: any) => link.color}
                    linkWidth={1.5}
                    linkDirectionalParticles={2}
                    linkDirectionalParticleSpeed={0.005}
                    onNodeClick={handleNodeClick}
                    onBackgroundClick={handleBackgroundClick}
                    cooldownTicks={100}
                    onEngineStop={() => fgRef.current?.zoomToFit(400)}
                    nodeCanvasObject={(node: any, ctx, globalScale) => {
                        const label = node.title;
                        const fontSize = 12 / globalScale;
                        ctx.font = `${fontSize}px Sans-Serif`;
                        const textWidth = ctx.measureText(label).width;
                        const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2);

                        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                        ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y - bckgDimensions[1] / 2, bckgDimensions[0], bckgDimensions[1]);

                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillStyle = node.color || '#000';
                        ctx.fillText(label, node.x, node.y);

                        ctx.beginPath();
                        ctx.arc(node.x, node.y, node.val || 5, 0, 2 * Math.PI, false);
                        ctx.fillStyle = node.color || '#64748b';
                        ctx.fill();

                        // Add a ring for expanded nodes
                        if (expandedNodeIds.has(node.id)) {
                            ctx.beginPath();
                            ctx.arc(node.x, node.y, (node.val || 5) + 2, 0, 2 * Math.PI, false);
                            ctx.strokeStyle = node.color || '#64748b';
                            ctx.lineWidth = 1;
                            ctx.stroke();
                        }
                    }}
                />
            </div>

            {/* Details Panel */}
            {selectedNode && isPanelOpen && (
                <div className="absolute top-4 right-4 w-80 bg-white shadow-2xl rounded-xl border border-slate-100 overflow-hidden flex flex-col max-h-[calc(100%-2rem)] animate-in slide-in-from-right-4 duration-200">
                    <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-start">
                        <h3 className="font-bold text-slate-800 leading-tight">{selectedNode.title}</h3>
                        <button
                            onClick={() => setIsPanelOpen(false)}
                            className="text-slate-400 hover:text-slate-600"
                        >
                            ✕
                        </button>
                    </div>

                    <div className="p-4 overflow-y-auto flex-1">
                        <div className="mb-4">
                            <span className="text-xs font-bold text-indigo-500 bg-indigo-50 px-2 py-1 rounded-full">
                                {selectedNode.primaryCategory}
                            </span>
                            <span className="text-xs text-slate-500 ml-2">{selectedNode.publishedDate}</span>
                        </div>

                        <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                            {selectedNode.abstractText}
                        </p>

                        <div className="text-xs text-slate-500 mb-4">
                            <strong>Authors:</strong> {selectedNode.authors}
                        </div>

                        <div className="flex gap-2 mt-4">
                            {!selectedNode.isLibraryPaper && (
                                <button
                                    onClick={() => handleAddToLibrary(selectedNode)}
                                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors shadow-sm hover:shadow"
                                >
                                    Add to Library
                                </button>
                            )}
                            <a
                                href={`https://arxiv.org/abs/${selectedNode.arXivId}`}
                                target="_blank"
                                rel="noreferrer"
                                className="flex-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 py-2 px-4 rounded-lg text-sm font-medium text-center transition-colors"
                            >
                                View on ArXiv
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GraphViewPage;
