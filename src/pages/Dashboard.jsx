import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard/stats')
      .then((r) => r.json())
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;

  const cards = [
    { label: 'Total Projects', value: stats?.totalProjects || 0, icon: '📁', color: 'text-accent-orange' },
    { label: 'Total Articles', value: stats?.totalArticles || 0, icon: '📝', color: 'text-accent-blue' },
    { label: 'Completed', value: stats?.completedArticles || 0, icon: '✅', color: 'text-accent-green' },
    { label: 'Pending', value: stats?.pendingArticles || 0, icon: '⏳', color: 'text-accent-yellow' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((card) => (
          <div key={card.label} className="card p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-secondary text-sm">{card.label}</span>
              <span className="text-2xl">{card.icon}</span>
            </div>
            <div className={`text-3xl font-bold ${card.color}`}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3 mb-8">
        <Link to="/generator" className="btn-primary flex items-center gap-2">
          <span>⚡</span> Generate Articles
        </Link>
        <Link to="/projects" className="btn-secondary flex items-center gap-2">
          <span>📁</span> View Projects
        </Link>
      </div>

      {/* Recent Articles */}
      <div className="card">
        <div className="p-5 border-b border-gray-800">
          <h2 className="text-lg font-semibold">Recent Articles</h2>
        </div>
        {stats?.recentArticles?.length > 0 ? (
          <div className="divide-y divide-gray-800">
            {stats.recentArticles.map((article) => (
              <div key={article.id} className="p-4 flex items-center justify-between hover:bg-dark-hover transition-colors">
                <div>
                  <p className="font-medium">{article.title || article.keyword}</p>
                  <p className="text-sm text-secondary">
                    {article.project_name} • {new Date(article.created_at).toLocaleDateString()}
                  </p>
                </div>
                <StatusBadge status={article.status} />
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-secondary">
            <p className="text-4xl mb-3">📝</p>
            <p>No articles yet. Start generating!</p>
          </div>
        )}
      </div>
    </div>
  );
}
