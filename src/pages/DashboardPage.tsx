import { useEffect, useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import axiosInstance from '../api/axiosInstance';
import ClusteringPage from './ClusteringPage';

// --- 타입 ---
interface UserPaperStatsResp {
  userId: number;
  paperId: number;
  // 시간/세션
  firstOpenedAt?: string;
  lastOpenedAt?: string;
  totalOpenCount: number;
  totalReadTimeSec: number;
  totalSessions: number;
  maxSessionTimeSec: number;
  avgSessionTimeSec: number;
  // 읽기 진행도
  lastPageRead?: number;
  maxPageReached?: number;
  pageCount?: number;
  completionRatio?: number;
  isCompleted?: boolean;
  // 상호작용
  totalHighlightCount: number;
  totalMemoCount: number;
  // 메타
  createdAt?: string;
  updatedAt?: string;
  // [NEW] Backend Optimization: Title & Status included
  title?: string;
  status?: 'TO_READ' | 'IN_PROGRESS' | 'DONE';
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];
const STATUS_COLORS = {
  TO_READ: '#9ca3af',    // Gray
  IN_PROGRESS: '#3b82f6', // Blue
  DONE: '#10b981'        // Green
};

const DashboardPage = () => {
  const [viewMode, setViewMode] = useState<'dashboard' | 'graph'>('dashboard');
  const [stats, setStats] = useState<UserPaperStatsResp[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Fetch Stats (Now includes title & status)
        const statsResp = await axiosInstance.get('/api/userStats');
        if (statsResp.data.success) {
          setStats(statsResp.data.data);
        }
      } catch (e) {
        console.error('Failed to fetch dashboard data', e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // --- 차트용 파생 데이터 ---

  // 1. 요약 통계
  const totalPapers = stats.length;
  const totalReadTime = stats.reduce((acc, curr) => acc + curr.totalReadTimeSec, 0);
  const completedPapers = stats.filter(s => s.isCompleted).length;
  const totalHighlights = stats.reduce((acc, curr) => acc + curr.totalHighlightCount, 0);

  // 2. Activity (최근 7일) - 상태별 스택

  const activityData = useMemo(() => {
    const data: Record<string, { date: string; TO_READ: number; IN_PROGRESS: number; DONE: number }> = {};
    const now = new Date();

    // 최근 7일 초기화
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      data[key] = { date: key, TO_READ: 0, IN_PROGRESS: 0, DONE: 0 };
    }

    stats.forEach(s => {
      if (s.lastOpenedAt) {
        const date = s.lastOpenedAt.split('T')[0];
        if (data[date]) {
          const status = s.status || 'TO_READ'; // 정보 없으면 TO_READ 기본값
          data[date][status]++;
        }
      }
    });

    return Object.values(data);
  }, [stats]);

  // 3. Top Papers (읽은 시간 순)
  const topPapersData = useMemo(() => {
    return [...stats]
      .sort((a, b) => b.totalReadTimeSec - a.totalReadTimeSec)
      .slice(0, 5)
      .map(s => ({
        name: s.title || `Paper ${s.paperId}`,
        time: Math.round(s.totalReadTimeSec / 60) // 분 단위
      }));
  }, [stats]);

  // 4. 완료 상태
  const completionData = useMemo(() => {
    const done = stats.filter(s => s.isCompleted).length;
    const inProgress = stats.length - done;
    return [
      { name: '완료', value: done },
      { name: '학습 중', value: inProgress }
    ];
  }, [stats]);


  // --- 렌더링 헬퍼 ---
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}시간 ${m}분`;
    return `${m}분`;
  };

  const renderViewSwitcher = () => (
    <div className="inline-flex items-center overflow-hidden rounded-lg border border-indigo-100 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setViewMode('dashboard')}
        className={`px-4 py-2 text-sm font-medium transition-colors ${viewMode === 'dashboard'
          ? 'bg-indigo-600 text-white'
          : 'text-gray-600 hover:bg-indigo-50 hover:text-indigo-600'
          }`}
      >
        대시보드
      </button>
      <button
        type="button"
        onClick={() => setViewMode('graph')}
        className={`px-4 py-2 text-sm font-medium transition-colors border-l border-indigo-100 ${viewMode === 'graph'
          ? 'bg-indigo-600 text-white'
          : 'text-gray-600 hover:bg-indigo-50 hover:text-indigo-600'
          }`}
      >
        논문 추천
      </button>
    </div>
  );

  if (viewMode === 'graph') {
    return (
      <div className="flex flex-col h-full">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between mb-6 shrink-0">
          <div>
            <h2 className="text-2xl font-semibold text-gray-800">논문 추천</h2>
            <p className="mt-2 text-gray-600">논문 간의 연결 관계를 탐색해보세요.</p>
          </div>
          {renderViewSwitcher()}
        </div>
        <div className="flex-1 min-h-0 rounded-lg bg-white shadow">
          <ClusteringPage />
        </div>
      </div>
    );
  }

  return (
    <div className="pb-10">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between mb-8">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">대시보드</h2>
          <p className="mt-2 text-gray-600">학습 진행 상황을 한눈에 확인하세요.</p>
        </div>
        {renderViewSwitcher()}
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-500">데이터를 불러오는 중...</div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* 요약 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-indigo-50">
              <h3 className="text-sm font-medium text-gray-500 uppercase">총 읽은 논문</h3>
              <p className="mt-2 text-3xl font-bold text-gray-800">{totalPapers}편</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-indigo-50">
              <h3 className="text-sm font-medium text-gray-500 uppercase">총 학습 시간</h3>
              <p className="mt-2 text-3xl font-bold text-gray-800">{formatTime(totalReadTime)}</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-indigo-50">
              <h3 className="text-sm font-medium text-gray-500 uppercase">완독한 논문</h3>
              <p className="mt-2 text-3xl font-bold text-gray-800">{completedPapers}편</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-indigo-50">
              <h3 className="text-sm font-medium text-gray-500 uppercase">하이라이트</h3>
              <p className="mt-2 text-3xl font-bold text-gray-800">{totalHighlights}개</p>
            </div>
          </div>

          {/* 차트 행 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 활동 차트 */}
            <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-indigo-50">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">최근 7일 학습 활동</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={activityData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tickFormatter={(val) => val.slice(5)} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="TO_READ" name="새로 추가한 논문" stackId="a" fill={STATUS_COLORS.TO_READ} />
                    <Bar dataKey="IN_PROGRESS" name="학습 중" stackId="a" fill={STATUS_COLORS.IN_PROGRESS} />
                    <Bar dataKey="DONE" name="읽기 완료" stackId="a" fill={STATUS_COLORS.DONE} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 상태 파이 차트 */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-indigo-50">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">학습 상태 비율</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={completionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {completionData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* 차트 행 2 */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-indigo-50">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">가장 오래 읽은 논문 TOP 5</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topPapersData} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={150}
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => value.length > 20 ? `${value.substring(0, 20)}...` : value}
                  />
                  <Tooltip />
                  <Bar dataKey="time" name="학습 시간(분)" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
