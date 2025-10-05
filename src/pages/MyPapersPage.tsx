// src/pages/MyPapersPage.tsx

import React from 'react';

// 실제로는 API를 통해 받아올 논문 데이터의 예시입니다.
const samplePapers = [
  {
    id: 1,
    title: 'Attention Is All You Need',
    authors: 'Vaswani, et al.',
    year: '2017',
    summary: 'The dominant sequence transduction models are based on complex recurrent or convolutional neural networks...',
    tags: ['NLP', 'Transformer', 'Machine Learning'],
  },
  {
    id: 2,
    title: 'BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding',
    authors: 'Devlin, et al.',
    year: '2018',
    summary: 'We introduce a new language representation model called BERT, which stands for Bidirectional Encoder Representations from Transformers.',
    tags: ['NLP', 'BERT', 'Pre-training'],
  },
  // ... more papers
];

const MyPapersPage = () => {
  return (
    <div className="flex-1 p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">My Papers</h2>
        <div>
          <select className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option>Sort by Date</option>
            <option>Sort by Title</option>
            <option>Sort by Author</option>
          </select>
        </div>
      </div>

      {/* Paper List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {samplePapers.map((paper) => (
          <div key={paper.id} className="p-6 bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow">
            <h3 className="text-lg font-bold text-gray-800">{paper.title}</h3>
            <p className="text-sm text-gray-600 mt-1">{paper.authors} - {paper.year}</p>
            <p className="text-sm text-gray-500 mt-3 h-20 overflow-hidden">{paper.summary}</p>
            <div className="mt-4">
              {paper.tags.map(tag => (
                <span key={tag} className="inline-block bg-indigo-100 text-indigo-700 text-xs font-semibold mr-2 px-2.5 py-0.5 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MyPapersPage;