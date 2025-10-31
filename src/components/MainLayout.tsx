import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { useAuthStore } from '../state/authStore';
import GlobalSearchBar from './GlobalSearchBar';

interface CollectionCounts {
  toRead: number;
  inProgress: number;
  done: number;
  favorites: number;
}

interface CategoryNode {
  code: string;
  name: string;
  paperCount: number;
  isExpanded?: boolean;
  isLoading?: boolean;
  children?: CategoryNode[];
}

const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  const location = useLocation();

  const [collectionCounts, setCollectionCounts] = useState<CollectionCounts>({
    toRead: 0,
    inProgress: 0,
    done: 0,
    favorites: 0,
  });
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  useEffect(() => {
    fetchCollectionCounts();
  }, []);

  useEffect(() => {
    fetchRootCategories();
  }, []);

  const fetchCollectionCounts = async () => {
    try {
      const resp = await axiosInstance.get('/api/collections/count');
      if (resp.data?.success) {
        const counts = resp.data.data?.counts ?? {};
        setCollectionCounts({
          toRead: counts.TO_READ ?? 0,
          inProgress: counts.IN_PROGRESS ?? 0,
          done: counts.DONE ?? 0,
          favorites: counts.FAVORITES ?? 0,
        });
      }
    } catch (error) {
      console.error('Failed to fetch collection counts', error);
    }
  };

  const fetchRootCategories = async () => {
    setLoadingCategories(true);
    try {
      const resp = await axiosInstance.get('/api/categories/root', {
        params: {
          level: 'root',
          withCounts: true,
          page: 0,
          size: 50,
          sort: 'code,asc',
        },
      });

      if (resp.data?.success) {
        const rows = Array.isArray(resp.data.data?.content) ? resp.data.data.content : [];
        setCategories(
          rows.map((row: any) => ({
            code: row.code,
            name: row.name ?? row.code,
            paperCount: row.paperCount ?? 0,
            isExpanded: false,
            isLoading: false,
          }))
        );
      }
    } catch (error) {
      console.error('Failed to fetch root categories', error);
    } finally {
      setLoadingCategories(false);
    }
  };

  const fetchCategoryChildren = async (code: string) => {
    try {
      const resp = await axiosInstance.get(`/api/categories/${code}/children`);
      if (resp.data?.success) {
        const rows = Array.isArray(resp.data.data?.content) ? resp.data.data.content : resp.data.data ?? [];
        return rows.map(
          (row: any): CategoryNode => ({
            code: row.code,
            name: row.name ?? row.code,
            paperCount: row.paperCount ?? 0,
          })
        );
      }
    } catch (error) {
      console.error(`Failed to fetch children for category ${code}`, error);
    }
    return [];
  };

  const toggleCategory = async (code: string) => {
    setCategories((prev) =>
      prev.map((cat) =>
        cat.code === code
          ? {
              ...cat,
              isExpanded: !cat.isExpanded,
              isLoading: !cat.isExpanded && !cat.children,
            }
          : cat
      )
    );

    const target = categories.find((cat) => cat.code === code);
    if (!target || target.children || target.isExpanded) return;

    const children = await fetchCategoryChildren(code);
    setCategories((prev) =>
      prev.map((cat) =>
        cat.code === code
          ? {
              ...cat,
              isExpanded: true,
              isLoading: false,
              children,
            }
          : cat
      )
    );
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const collectionLinks = useMemo(
    () => [
      {
        label: '즐겨찾기',
        to: '/favorites',
        badge: collectionCounts.favorites,
        active: location.pathname === '/favorites',
      },
      {
        label: '읽을 예정',
        to: '/collections?status=to-read',
        badge: collectionCounts.toRead,
        active: location.pathname.startsWith('/collections') && location.search.includes('status=to-read'),
      },
      {
        label: '읽는 중',
        to: '/collections?status=in-progress',
        badge: collectionCounts.inProgress,
        active: location.pathname.startsWith('/collections') && location.search.includes('status=in-progress'),
      },
      {
        label: '완료된 논문',
        to: '/collections?status=done',
        badge: collectionCounts.done,
        active: location.pathname.startsWith('/collections') && location.search.includes('status=done'),
      },
    ],
    [collectionCounts, location.pathname, location.search]
  );

  const badge = (value: number) => (
    <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-600">{value}</span>
  );

  const itemClass = 'flex items-center justify-between rounded-md px-4 py-2 text-sm transition-colors';
  const activeItemClass = 'bg-indigo-100 text-indigo-700 font-semibold';
  const defaultItemClass = 'text-gray-600 hover:bg-indigo-50 hover:text-indigo-600';

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="flex w-80 flex-col border-r border-gray-100 bg-white px-6 py-8 shadow-lg">
        <div className="mb-8">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="text-left text-3xl font-bold text-indigo-600"
          >
            PaperHub
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-6 overflow-y-auto pr-2">
          <section>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">내 컬렉션</p>
            <ul className="space-y-1">
              {collectionLinks.map((link) => (
                <li key={link.label}>
                  <button
                    type="button"
                    onClick={() => navigate(link.to)}
                    className={`${itemClass} ${link.active ? activeItemClass : defaultItemClass}`}
                  >
                    <span>{link.label}</span>
                    {badge(link.badge)}
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">arXiv 카테고리</p>
            {loadingCategories && <p className="px-4 py-2 text-xs text-gray-400">카테고리 로딩 중...</p>}
            <ul className="space-y-1">
              {categories.map((category) => {
                const isActiveRoot =
                  location.pathname.startsWith(`/category/${category.code}`) ||
                  category.children?.some((child) => location.pathname.startsWith(`/category/${child.code}`));
                return (
                  <li key={category.code}>
                    <div className="flex flex-col">
                      <button
                        type="button"
                        onClick={() => toggleCategory(category.code)}
                        className={`${itemClass} ${isActiveRoot ? activeItemClass : defaultItemClass}`}
                      >
                        <span className="flex items-center gap-2">
                          <span>{category.name}</span>
                          <span className="text-xs text-gray-400">{category.isExpanded ? 'v' : '>'}</span>
                        </span>
                        {badge(category.paperCount)}
                      </button>
                      {category.isExpanded && (
                        <div className="mt-1 space-y-1 pl-4">
                          {category.isLoading && (
                            <p className="px-2 py-1 text-xs text-gray-400">하위 카테고리 로딩 중...</p>
                          )}
                          {category.children?.map((child) => {
                            const isActiveChild = location.pathname.startsWith(`/category/${child.code}`);
                            return (
                              <button
                                key={child.code}
                                type="button"
                                onClick={() => navigate(`/category/${child.code}`)}
                                className={`${itemClass} ${
                                  isActiveChild ? activeItemClass : defaultItemClass
                                }`}
                              >
                                <span>{child.name}</span>
                                {badge(child.paperCount)}
                              </button>
                            );
                          })}
                          {!category.isLoading && (!category.children || category.children.length === 0) && (
                            <p className="px-2 py-1 text-xs text-gray-400">하위 카테고리가 없습니다.</p>
                          )}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        </nav>

        <div className="mt-8">
          <button
            onClick={handleLogout}
            className="w-full rounded-md px-4 py-2 text-sm text-gray-500 transition hover:bg-red-50 hover:text-red-600"
          >
            Logout
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-center border-b bg-white px-8 py-4">
          <GlobalSearchBar />
        </header>
        <main className="flex-1 overflow-y-auto bg-gray-50 p-8">{children}</main>
      </div>
    </div>
  );
};

export default MainLayout;
