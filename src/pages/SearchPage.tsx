// src/pages/SearchPage.tsx

import React from 'react';

const SearchPage = () => {
  return (
    <div className="flex-1 p-6">
      <h2 className="text-2xl font-semibold text-gray-800 mb-6">Search Papers</h2>
      
      {/* Search Input and Filters */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <div className="flex items-center space-x-4">
          <input 
            type="text" 
            placeholder="Search by keyword, title, author..." 
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button className="px-6 py-2 font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700">
            Search
          </button>
        </div>
        <div className="flex space-x-8 mt-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Year</label>
            <input type="number" placeholder="2023" className="w-full mt-1 px-3 py-2 border rounded-md text-sm"/>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Journal</label>
            <input type="text" placeholder="e.g., NeurIPS" className="w-full mt-1 px-3 py-2 border rounded-md text-sm"/>
          </div>
        </div>
      </div>

      {/* Search Results */}
      <div>
        <h3 className="text-lg font-semibold text-gray-700">Results</h3>
        <p className="text-gray-500 text-sm mt-2">No results found. Try a different query.</p>
        {/* 나중에 검색 결과가 있을 때 여기에 목록을 표시합니다. */}
      </div>
    </div>
  );
};

export default SearchPage;