import { useEffect, useState } from 'react';
import type { FC, FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const GlobalSearchBar: FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (location.pathname.startsWith('/search')) {
      setInputValue(params.get('q') ?? '');
    }
  }, [location]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed) {
      return;
    }
    navigate(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-3xl items-center gap-3">
      <div className="relative flex-1">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="arXiv 논문을 검색하세요..."
          className="w-full rounded-full border border-gray-200 bg-white px-5 py-3 text-sm text-gray-700 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />
        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-xs text-gray-400">
          ⌘ + K
        </span>
      </div>
      <button
        type="submit"
        className="rounded-full bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-100"
      >
        검색
      </button>
    </form>
  );
};

export default GlobalSearchBar;
