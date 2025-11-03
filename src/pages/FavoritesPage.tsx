import React from 'react';

const FavoritesPage: React.FC = () => {
  return (
    <div className="flex-1 rounded-lg bg-white p-6 shadow">
      <h2 className="text-2xl font-semibold text-gray-800">즐겨찾기</h2>
      <p className="mt-2 text-sm text-gray-500">
        즐겨찾기 된 논문이 없습니다. 
      </p>
    </div>
  );
};

export default FavoritesPage;
