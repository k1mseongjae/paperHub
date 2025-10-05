import React from 'react';
import { useParams } from 'react-router-dom';

// Sample data for highlights and notes
const sampleNotes = [
  { id: 1, paperId: 1, highlight: "The dominant sequence transduction models are based on complex recurrent or convolutional neural networks...", memo: "This is the key concept to understand for the background section.", color: '#FFF3A3' },
  { id: 2, paperId: 1, highlight: "We propose a new simple network architecture, the Transformer, based solely on attention mechanisms.", memo: "Main contribution of this paper. Need to compare with RNN/CNN.", color: '#D4E2FF' },
  { id: 3, paperId: 1, highlight: "Attention Is All You Need", memo: null, color: '#FFDDC1' },
];

const NoteViewerPage = () => {
  const { paperId } = useParams(); // URL from /paper/:paperId

  return (
    <div className="flex h-full gap-6">
      {/* PDF Viewer Placeholder */}
      <div className="flex-1 bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="bg-gray-700 text-white p-3 text-center font-semibold">
          Paper Viewer: Attention Is All You Need.pdf
        </div>
        <div className="p-8 bg-gray-50 h-full overflow-y-auto">
          <p className="text-gray-400">[ This is a placeholder for the PDF content. ]</p>
          <p className="mt-4 text-gray-700 leading-relaxed">
            The dominant sequence transduction models are based on complex recurrent or convolutional neural networks in an encoder-decoder configuration. The best performing models also connect the encoder and decoder through an attention mechanism. We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely.
          </p>
        </div>
      </div>

      {/* Notes and Highlights Sidebar */}
      <aside className="w-96 bg-white rounded-lg shadow-lg flex flex-col">
        <div className="p-4 border-b">
          <h3 className="text-xl font-bold text-gray-800">My Notes & Highlights</h3>
          <p className="text-sm text-gray-500">Paper ID: {paperId}</p>
        </div>
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {sampleNotes.map(note => (
            <div key={note.id} className="p-4 rounded-lg" style={{ backgroundColor: note.color }}>
              <p className="font-semibold text-gray-800 text-sm">"{note.highlight}"</p>
              {note.memo && (
                <p className="mt-2 text-sm bg-white bg-opacity-50 p-2 rounded">{note.memo}</p>
              )}
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
};

export default NoteViewerPage;
