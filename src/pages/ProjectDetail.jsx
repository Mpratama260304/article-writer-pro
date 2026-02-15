import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import StatusBadge from '../components/StatusBadge';
import { useToast } from '../components/Toast';
import LoadingSpinner from '../components/LoadingSpinner';

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const addToast = useToast();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProject = () => {
    fetch(`/api/projects/${id}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data) => { setProject(data); setLoading(false); })
      .catch(() => { setLoading(false); navigate('/projects'); });
  };

  useEffect(() => { fetchProject(); }, [id]);

  const handleDeleteArticle = async (articleId) => {
    if (!confirm('Delete this article?')) return;
    try {
      await fetch(`/api/articles/${articleId}`, { method: 'DELETE' });
      addToast('Article deleted');
      fetchProject();
    } catch {
      addToast('Error deleting article', 'error');
    }
  };

  const handleExport = async (type) => {
    try {
      const res = await fetch(`/api/export/${type}/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const err = await res.json();
        addToast(err.error || 'Export failed', 'error');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const ext = type === 'wordpress' ? 'xml' : 'zip';
      a.href = url;
      a.download = `${project.name}-${type}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
      addToast(`${type} export downloaded!`);
    } catch {
      addToast('Export error', 'error');
    }
  };

  if (loading) return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;
  if (!project) return null;

  const articles = project.articles || [];

  return (
    <div>
      <Link to="/projects" className="inline-flex items-center gap-1 text-secondary hover:text-white mb-4 text-sm">
        ← Back
      </Link>

      <h1 className="text-3xl font-bold mb-1">{project.name}</h1>
      <p className="text-secondary mb-6">
        {project.description && <>{project.description} • </>}
        {articles.length} articles
      </p>

      <div className="flex flex-wrap gap-3 mb-8">
        <Link
          to={`/generator?projectId=${id}`}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white bg-accent-green hover:bg-emerald-600 transition-colors"
        >
          ⚡ Generate More
        </Link>
        <button
          onClick={() => handleExport('wordpress')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium border border-accent-orange text-accent-orange hover:bg-accent-orange/10 transition-colors"
        >
          📦 Export WordPress
        </button>
        <button
          onClick={() => handleExport('html')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium border border-accent-blue text-accent-blue hover:bg-accent-blue/10 transition-colors"
        >
          📦 Export HTML
        </button>
      </div>

      {articles.length > 0 ? (
        <div className="space-y-2">
          {articles.map((article) => (
            <div key={article.id} className="card p-4 flex items-center justify-between hover:bg-dark-hover transition-colors">
              <div className="flex-1 min-w-0">
                <Link
                  to={`/articles/${article.id}`}
                  className="font-medium hover:text-accent-blue transition-colors block truncate"
                >
                  {article.title || article.keyword}
                </Link>
                <p className="text-sm text-secondary mt-0.5">
                  Keyword: {article.keyword} • {new Date(article.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-3 ml-4">
                <StatusBadge status={article.status} />
                <button
                  onClick={() => handleDeleteArticle(article.id)}
                  className="text-accent-red hover:text-red-400 transition-colors"
                  title="Delete"
                >
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card p-12 text-center">
          <p className="text-4xl mb-3">📝</p>
          <p className="text-secondary mb-4">No articles in this project yet</p>
          <Link to={`/generator?projectId=${id}`} className="btn-primary">
            Generate Articles
          </Link>
        </div>
      )}
    </div>
  );
}
