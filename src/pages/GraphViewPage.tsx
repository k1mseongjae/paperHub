import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import axiosInstance from '../api/axiosInstance';

// Mock data based on user request
const MOCK_DATA = {
    nodes: [
        {
            id: 11671,
            arXivId: "2401.07709v2",
            title: "Towards Efficient Diffusion-Based Image Editing with Instant Attention Masks",
            abstractText: "Diffusion-based Image Editing (DIE) is an emerging research hot-spot...",
            authors: "[\"Siyu Zou\", \"Jiji Tang\", \"Yiyi Zhou\", \"Jing He\", \"Chaoyi Zhao\", \"Rongsheng Zhang\", \"Zhipeng Hu\", \"Xiaoshuai Sun\"]",
            primaryCategory: "cs.CV",
            publishedDate: "2024-01-15"
        },
        {
            id: 13063,
            arXivId: "13063", // Using ID as arXivId if null in original, or just unique ID
            title: "Meaning guided video captioning",
            authors: "Rushi J. Babariya, Toru Tamaki",
            publishedDate: "2019-12-12"
        },
        {
            id: 11673,
            arXivId: "11673",
            title: "SVG: 3D Stereoscopic Video Generation via Denoising Frame Matrix",
            authors: "Peng Dai, Feitong Tan, Qiangeng Xu, David Futschik, Ruofei Du, Sean Fanello, Xiaojuan Qi, Yinda Zhang",
            publishedDate: "2024-06-29"
        },
        {
            id: 11362,
            arXivId: "11362",
            title: "Emu Video: Factorizing Text-to-Video Generation by Explicit Image Conditioning",
            authors: "Rohit Girdhar, Mannat Singh, Andrew Brown, Quentin Duval, Samaneh Azadi, Sai Saketh Rambhatla, Akbar Shah, Xi Yin, Devi Parikh, Ishan Misra",
            publishedDate: "2023-11-17"
        },
        {
            id: 6406,
            arXivId: "6406",
            title: "Text-Animator: Controllable Visual Text Video Generation",
            authors: "Lin Liu, Quande Liu, Shengju Qian, Yuan Zhou, Wengang Zhou, Houqiang Li, Lingxi Xie, Qi Tian",
            publishedDate: "2024-06-25"
        },
        {
            id: 11552,
            arXivId: "11552",
            title: "Video Generation Beyond a Single Clip",
            authors: "Hsin-Ping Huang, Yu-Chuan Su, Ming-Hsuan Yang",
            publishedDate: "2023-04-15"
        },
        {
            id: 11679,
            arXivId: "11679",
            title: "360DVD: Controllable Panorama Video Generation with 360-Degree Video Diffusion Model",
            authors: "Qian Wang, Weiqi Li, Chong Mou, Xinhua Cheng, Jian Zhang",
            publishedDate: "2024-01-12"
        },
        {
            id: 822,
            arXivId: "822",
            title: "Context as Memory: Scene-Consistent Interactive Long Video Generation with Memory Retrieval",
            authors: "Jiwen Yu, Jianhong Bai, Yiran Qin, Quande Liu, Xintao Wang, Pengfei Wan, Di Zhang, Xihui Liu",
            publishedDate: "2025-06-03"
        },
        {
            id: 11720,
            arXivId: "11720",
            title: "S3Aug: Segmentation, Sampling, and Shift for Action Recognition",
            authors: "Taiki Sugiura, Toru Tamaki",
            publishedDate: "2023-10-23"
        },
        {
            id: 13141,
            arXivId: "13141",
            title: "Poet: Product-oriented Video Captioner for E-commerce",
            authors: "Shengyu Zhang, Ziqi Tan, Jin Yu, Zhou Zhao, Kun Kuang, Jie Liu, Jingren Zhou, Hongxia Yang, Fei Wu",
            publishedDate: "2020-08-16"
        },
        {
            id: 12702,
            arXivId: "12702",
            title: "Technical Report for Soccernet 2023 -- Dense Video Captioning",
            authors: "Zheng Ruan, Ruixuan Liu, Shimin Chen, Mengying Zhou, Xinquan Yang, Wei Li, Chen Chen, Wei Shen",
            publishedDate: "2024-10-31"
        }
    ],
    edges: [
        { source: 11671, target: 13063, weight: 0.838 },
        { source: 11671, target: 11673, weight: 0.833 },
        { source: 11671, target: 11362, weight: 0.824 },
        { source: 11671, target: 6406, weight: 0.824 },
        { source: 11671, target: 11552, weight: 0.812 },
        { source: 11671, target: 11679, weight: 0.809 },
        { source: 11671, target: 822, weight: 0.807 },
        { source: 11671, target: 11720, weight: 0.801 },
        { source: 11671, target: 13141, weight: 0.800 },
        { source: 11671, target: 12702, weight: 0.792 }
    ]
};

const GraphViewPage: React.FC = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
    const [selectedNode, setSelectedNode] = useState<any>(null);
    const [addingId, setAddingId] = useState<string | null>(null);

    // Transform data for react-force-graph
    const graphData = useMemo(() => {
        return {
            nodes: MOCK_DATA.nodes.map(n => ({ ...n, val: 1 })), // val for size
            links: MOCK_DATA.edges.map(e => ({
                source: e.source,
                target: e.target,
                value: e.weight
            }))
        };
    }, []);

    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                setDimensions({
                    width: containerRef.current.clientWidth,
                    height: containerRef.current.clientHeight
                });
            }
        };

        window.addEventListener('resize', updateDimensions);
        updateDimensions();

        return () => window.removeEventListener('resize', updateDimensions);
    }, []);

    const handleNodeClick = (node: any) => {
        setSelectedNode(node);
    };

    const handleAddPaper = async (node: any) => {
        if (!node.arXivId) {
            alert('arXiv ID가 없어 논문을 추가할 수 없습니다.');
            return;
        }

        setAddingId(node.id);

        try {
            // Construct PDF link from arXiv ID
            const pdfLink = `https://arxiv.org/pdf/${node.arXivId}.pdf`;

            const response = await fetch(pdfLink);
            if (!response.ok) {
                throw new Error('PDF download failed');
            }
            const pdfBlob = await response.blob();

            const filename = `${node.arXivId}.pdf`;
            const pdfFile = new File([pdfBlob], filename, { type: 'application/pdf' });

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

            alert(`'${node.title}' 논문을 내 서재에 추가했습니다.`);
        } catch (error) {
            console.error('Failed to add paper:', error);
            const errObj =
                (error as { response?: { data?: { error?: { message?: string } } } } | undefined) ?? {};
            const message =
                errObj.response?.data?.error?.message || (error as Error).message || '논문 추가에 실패했습니다.';
            alert(message);
        } finally {
            setAddingId(null);
        }
    };

    const nodeCanvasObject = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
        const label = node.title;
        const fontSize = 12 / globalScale;
        ctx.font = `${fontSize}px Sans-Serif`;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        if (node.id === 11671) {
            ctx.fillStyle = 'rgba(255, 200, 200, 0.8)';
        }

        // Draw node circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, 5, 0, 2 * Math.PI, false);
        ctx.fill();

        // Draw text label below node
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = node.id === 11671 ? '#ff5252' : '#448aff';

        // Only show label if zoomed in enough or it's the central node
        if (globalScale > 1.5 || node.id === 11671) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'; // White text for better visibility on dark background
            ctx.fillText(label, node.x, node.y + 8);
        }
    }, []);

    return (
        <div className="flex h-full w-full flex-col overflow-hidden bg-gray-50">
            <div className="flex items-center justify-between border-b bg-white px-6 py-4 shadow-sm">
                <h1 className="text-xl font-bold text-gray-800">Paper Graph View</h1>
                <div className="text-sm text-gray-500">
                    Interactive citation/similarity network
                </div>
            </div>

            <div className="relative flex flex-1 overflow-hidden">
                {/* Graph Container */}
                <div ref={containerRef} className="flex-1 bg-gray-900">
                    <ForceGraph2D
                        width={dimensions.width}
                        height={dimensions.height}
                        graphData={graphData}
                        nodeLabel="title"
                        nodeColor={(node: any) => (node.id === 11671 ? '#ff5252' : '#448aff')} // Highlight the central node
                        nodeRelSize={6}
                        linkColor={() => 'rgba(255,255,255,0.2)'}
                        onNodeClick={handleNodeClick}
                        backgroundColor="#111827" // gray-900
                        d3VelocityDecay={0.1}
                        cooldownTicks={100}
                        nodeCanvasObject={nodeCanvasObject}
                        nodeCanvasObjectMode={() => 'after'}
                    />
                </div>

                {/* Sidebar for Details */}
                {selectedNode && (
                    <div className="absolute right-0 top-0 h-full w-80 overflow-y-auto border-l border-gray-200 bg-white p-6 shadow-xl transition-transform">
                        <div className="mb-4 flex items-start justify-between">
                            <h2 className="text-lg font-bold text-gray-900">{selectedNode.title}</h2>
                            <button
                                onClick={() => setSelectedNode(null)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <span className="text-xs font-semibold uppercase text-gray-500">Published Date</span>
                                <p className="text-sm text-gray-700">{selectedNode.publishedDate || 'N/A'}</p>
                            </div>

                            <div>
                                <span className="text-xs font-semibold uppercase text-gray-500">Authors</span>
                                <p className="text-sm text-gray-700">
                                    {selectedNode.authors ? selectedNode.authors.replace(/[\[\]"]/g, '') : 'Unknown'}
                                </p>
                            </div>

                            {selectedNode.abstractText && (
                                <div>
                                    <span className="text-xs font-semibold uppercase text-gray-500">Abstract</span>
                                    <p className="mt-1 text-sm leading-relaxed text-gray-600">
                                        {selectedNode.abstractText}
                                    </p>
                                </div>
                            )}

                            <div className="pt-4">
                                <button
                                    onClick={() => handleAddPaper(selectedNode)}
                                    disabled={addingId === selectedNode.id}
                                    className="w-full rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:bg-green-400"
                                >
                                    {addingId === selectedNode.id ? 'Adding...' : 'Add to My Papers'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GraphViewPage;
