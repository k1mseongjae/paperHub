import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  const [isSidebarOpen, setSidebarOpen] = useState(false); // hover-driven sidebar

  const fetchCollectionCounts = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    fetchCollectionCounts();
  }, [fetchCollectionCounts]);

  useEffect(() => {
    fetchRootCategories();
  }, []);

  useEffect(() => {
    const handleRefresh = () => {
      fetchCollectionCounts();
    };
    window.addEventListener('collection:refresh', handleRefresh);
    return () => window.removeEventListener('collection:refresh', handleRefresh);
  }, [fetchCollectionCounts]);

  const fetchRootCategories = async () => {
    setLoadingCategories(true);
    try {
      const resp = await axiosInstance.get('/api/paper-infos/categories/root', {
        params: { page: 0, size: 50 },
      });
      if (resp.data?.success) {
        const rows = Array.isArray(resp.data.data?.content) ? resp.data.data.content : [];
        if (rows.length > 0) {
          setCategories(
            rows.map((row: any) => ({
              code: row.code,
              name: row.name ?? row.code,
              paperCount: row.paperCount ?? 0,
              isExpanded: false,
              isLoading: false,
            }))
          );
          return;
        }
      }
      throw new Error('paper_infos categories empty');
    } catch (error) {
      console.warn('paper_infos root categories unavailable, fallback to /api/categories/root', error);
      try {
        const fallback = await axiosInstance.get('/api/categories/root', {
          params: {
            level: 'root',
            withCounts: true,
            page: 0,
            size: 50,
            sort: 'code,asc',
          },
        });
        if (fallback.data?.success) {
          const rows = Array.isArray(fallback.data.data?.content) ? fallback.data.data.content : [];
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
      } catch (fallbackErr) {
        console.error('Failed to fetch fallback root categories', fallbackErr);
      }
    } finally {
      setLoadingCategories(false);
    }
  };

  const fetchCategoryChildren = async (code: string) => {
    try {
      const resp = await axiosInstance.get(`/api/paper-infos/categories/${code}/children`, {
        params: { page: 0, size: 100 },
      });
      if (resp.data?.success) {
        const rows = Array.isArray(resp.data.data?.content) ? resp.data.data.content : resp.data.data ?? [];
        if (rows.length > 0) {
          return rows.map(
            (row: any): CategoryNode => ({
              code: row.code,
              name: row.name ?? row.code,
              paperCount: row.paperCount ?? 0,
            })
          );
        }
      }
      throw new Error('paper_infos children empty');
    } catch (error) {
      console.warn(`paper_infos children unavailable for ${code}, fallback to /api/categories`, error);
      try {
        const fallback = await axiosInstance.get(`/api/categories/${code}/children`);
        if (fallback.data?.success) {
          const rows = Array.isArray(fallback.data.data?.content) ? fallback.data.data.content : fallback.data.data ?? [];
          return rows.map(
            (row: any): CategoryNode => ({
              code: row.code,
              name: row.name ?? row.code,
              paperCount: row.paperCount ?? 0,
            })
          );
        }
      } catch (fallbackErr) {
        console.error(`Failed to fetch fallback children for ${code}`, fallbackErr);
      }
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
      <aside
        className={`flex flex-col border-r border-gray-100 bg-white py-8 shadow-lg overflow-hidden transition-[width] duration-200 ease-out ${
          isSidebarOpen ? 'w-80 px-6' : 'w-16 px-2'
        }`}
        onMouseEnter={() => setSidebarOpen(true)}
        onMouseLeave={() => setSidebarOpen(false)}
        style={{ willChange: 'width' }}
      >
        <div className="mb-8">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="text-left font-bold text-indigo-600 transition-opacity duration-200"
          >
            {isSidebarOpen ? (
              <span className={`text-3xl transition-all duration-200 whitespace-nowrap`}>
                PaperHub
              </span>
            ) : (
              <span
                aria-label="PaperHub"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-indigo-600 text-xl leading-none"
                title="PaperHub"
              >
                📚
              </span>
            )}
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-6 overflow-y-auto pr-1">
          <section>
            <p className={`mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400 transition-opacity ${
              isSidebarOpen ? 'opacity-100' : 'opacity-0'
            }`}>내 컬렉션</p>
            <ul className="space-y-1">
              {collectionLinks.map((link) => (
                <li key={link.label}>
                  <button
                    type="button"
                    onClick={() => navigate(link.to)}
                    className={`${itemClass} ${link.active ? activeItemClass : defaultItemClass}`}
                    title={isSidebarOpen ? undefined : link.label}
                  >
                    <span
                      className={`whitespace-nowrap transition-opacity duration-150 ${
                        isSidebarOpen ? 'opacity-100' : 'opacity-0'
                      }`}
                      aria-hidden={!isSidebarOpen}
                    >
                      {link.label}
                    </span>
                    {isSidebarOpen ? badge(link.badge) : null}
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <p className={`mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400 transition-opacity ${
              isSidebarOpen ? 'opacity-100' : 'opacity-0'
            }`}>arXiv 카테고리</p>
            {loadingCategories && isSidebarOpen && (
              <p className="px-4 py-2 text-xs text-gray-400">카테고리 로딩 중...</p>
            )}
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
                        title={isSidebarOpen ? undefined : category.name}
                      >
                        <span className="flex items-center gap-2 overflow-hidden">
                          <span
                            className={`whitespace-nowrap transition-opacity duration-150 ${
                              isSidebarOpen ? 'opacity-100' : 'opacity-0'
                            }`}
                            aria-hidden={!isSidebarOpen}
                          >
                            {category.name}
                          </span>
                          {isSidebarOpen && (
                            <span className="text-xs text-gray-400">{category.isExpanded ? 'v' : '>'}</span>
                          )}
                        </span>
                        {isSidebarOpen ? badge(category.paperCount) : null}
                      </button>
                      {isSidebarOpen && category.isExpanded && (
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

        <div className={`mt-8 transition-opacity duration-200 ${isSidebarOpen ? 'opacity-100' : 'opacity-0'}`}>
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
