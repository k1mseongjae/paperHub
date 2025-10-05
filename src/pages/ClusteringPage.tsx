import React, { useState } from 'react';

// Sample data for nodes (topics) and edges (connections)
const nodes = [
  { id: 'nlp', label: 'Natural Language Processing', x: 200, y: 300, size: 30 },
  { id: 'transformer', label: 'Transformer Models', x: 400, y: 200, size: 20 },
  { id: 'bert', label: 'BERT', x: 600, y: 150, size: 15 },
  { id: 'cv', label: 'Computer Vision', x: 300, y: 500, size: 30 },
  { id: 'gan', label: 'GANs', x: 500, y: 550, size: 20 },
  { id: 'rl', label: 'Reinforcement Learning', x: 700, y: 400, size: 25 },
];

const edges = [
  { source: 'nlp', target: 'transformer' },
  { source: 'transformer', target: 'bert' },
  { source: 'cv', target: 'gan' },
  { source: 'nlp', target: 'cv' },
  { source: 'transformer', target: 'rl' },
];

const ClusteringPage = () => {
  const [selectedNode, setSelectedNode] = useState(nodes[0]);

  const findNode = (id: string) => nodes.find(n => n.id === id);

  // Deriving linked topics from the selected node for robust rendering
  const linkedTopics = edges
    .map(edge => {
      if (edge.source === selectedNode.id) {
        return findNode(edge.target);
      }
      if (edge.target === selectedNode.id) {
        return findNode(edge.source);
      }
      return null;
    })
    .filter((node): node is typeof nodes[0] => !!node); // Filter out nulls and satisfy TypeScript

  return (
    <div className="flex h-full">
      <div className="flex-1 bg-gray-800 rounded-lg shadow-inner relative overflow-hidden">
        <svg width="100%" height="100%" className="absolute inset-0">
          <defs>
            <marker id="arrow" viewBox="0 -5 10 10" refX="5" refY="0" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M0,-5L10,0L0,5" fill="#4a5568" />
            </marker>
          </defs>
          {/* Edges */}
          {edges.map((edge, i) => {
            const sourceNode = findNode(edge.source);
            const targetNode = findNode(edge.target);
            if (!sourceNode || !targetNode) return null; // Ensure nodes exist before rendering edge
            return (
              <line
                key={i}
                x1={sourceNode.x}
                y1={sourceNode.y}
                x2={targetNode.x}
                y2={targetNode.y}
                stroke="#4a5568"
                strokeWidth="2"
                markerEnd="url(#arrow)"
              />
            );
          })}
        </svg>
        {/* Nodes */}
        <div className="relative w-full h-full">
            {nodes.map(node => (
            <div
                key={node.id}
                className="absolute flex items-center justify-center rounded-full cursor-pointer transition-all duration-300"
                style={{
                  left: `${node.x - node.size}px`,
                  top: `${node.y - node.size}px`,
                  width: `${node.size * 2}px`,
                  height: `${node.size * 2}px`,
                  backgroundColor: selectedNode.id === node.id ? '#4f46e5' : '#374151',
                  border: `2px solid ${selectedNode.id === node.id ? '#a5b4fc' : '#4b5563'}`,
                }}
                onClick={() => setSelectedNode(node)}
            >
                <span className="text-white text-xs font-semibold select-none">{node.label.split(' ')[0]}</span>
            </div>
            ))}
        </div>
      </div>
      <aside className="w-96 p-6 bg-white ml-6 rounded-lg shadow-md">
        <h3 className="text-xl font-bold text-gray-800">Topic Details</h3>
        {selectedNode && (
          <div className="mt-4">
            <h4 className="text-lg font-semibold text-indigo-600">{selectedNode.label}</h4>
            <p className="mt-2 text-gray-600">Related Papers: 5</p>
            <p className="text-gray-600">Connections: {linkedTopics.length}</p>
            <div className="mt-4">
              <h5 className="font-semibold">Linked Topics:</h5>
              <ul className="list-disc list-inside mt-2 text-sm text-gray-700">
                {linkedTopics.map(topic => (
                  <li key={topic.id}>{topic.label}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
};

export default ClusteringPage;

