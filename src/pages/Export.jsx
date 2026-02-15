import { useState, useEffect } from 'react';
import { useToast } from '../components/Toast';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Export() {
  const [projects, setProjects] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [projectDetail, setProjectDetail] = useState(null);
  const addToast = useToast();

  useEffect(() => {
    Promise.all([
      fetch('/api/projects').then((r) => r.json()),
      fetch('/api/templates').then((r) => r.json()),
    ]).then(([p, t]) => {
      setProjects(p);
      setTemplates(t);
      const def = t.find((x) => x.is_default);
      if (def) setSelectedTemplate(String(def.id));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selectedProject) {
      fetch(`/api/projects/${selectedProject}`)
        .then((r) => r.json())
        .then(setProjectDetail)
        .catch(() => {});
    } else {
      setProjectDetail(null);
    }
  }, [selectedProject]);

  const handleExport = async (type) => {
    if (!selectedProject) {
      addToast('Please select a project', 'error');
      return;
    }
    setExporting(true);
    try {
      const body = type === 'html' ? { templateId: selectedTemplate ? parseInt(selectedTemplate) : null } : {};
      const res = await fetch(`/api/export/${type}/${selectedProject}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        addToast(err.error || 'Export failed', 'error');
        setExporting(false);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const ext = type === 'wordpress' ? 'xml' : 'zip';
      a.href = url;
      a.download = `export-${type}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
      addToast(`${type} export downloaded!`);
    } catch {
      addToast('Export error', 'error');
    }
    setExporting(false);
  };

  if (loading) return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;

  const completedCount = projectDetail?.articles?.filter((a) => a.status === 'completed').length || 0;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Export Articles</h1>

      <div className="card p-6 mb-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Select Project</label>
            <select
              className="input-field"
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
            >
              <option value="">-- Select Project --</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.article_count || 0} articles)
                </option>
              ))}
            </select>
          </div>

          {selectedProject && (
            <div>
              <label className="block text-sm font-medium mb-1">HTML Template (for HTML export)</label>
              <select
                className="input-field"
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} {t.is_default ? '(Default)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {selectedProject && projectDetail && (
        <>
          <div className="card p-5 mb-6">
            <h3 className="font-semibold mb-2">Preview</h3>
            <p className="text-sm text-secondary">
              Project: <strong className="text-white">{projectDetail.name}</strong> •{' '}
              {completedCount} completed articles ready to export
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => handleExport('wordpress')}
              disabled={exporting || completedCount === 0}
              className="card p-6 text-center hover:bg-dark-hover transition-colors disabled:opacity-50"
            >
              <p className="text-4xl mb-3">📰</p>
              <h3 className="font-semibold text-accent-orange mb-1">WordPress XML</h3>
              <p className="text-sm text-secondary">Valid WXR import file</p>
            </button>

            <button
              onClick={() => handleExport('html')}
              disabled={exporting || completedCount === 0}
              className="card p-6 text-center hover:bg-dark-hover transition-colors disabled:opacity-50"
            >
              <p className="text-4xl mb-3">🌐</p>
              <h3 className="font-semibold text-accent-blue mb-1">HTML Bundle</h3>
              <p className="text-sm text-secondary">ZIP with HTML files</p>
            </button>

            <button
              onClick={() => handleExport('markdown')}
              disabled={exporting || completedCount === 0}
              className="card p-6 text-center hover:bg-dark-hover transition-colors disabled:opacity-50"
            >
              <p className="text-4xl mb-3">📝</p>
              <h3 className="font-semibold text-accent-purple mb-1">Markdown Bundle</h3>
              <p className="text-sm text-secondary">ZIP with .md files</p>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
