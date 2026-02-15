import { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';
import LoadingSpinner from '../components/LoadingSpinner';

const SAMPLE_DATA = {
  title: 'Sample Article Title',
  content: '<h2>Introduction</h2><p>This is a sample article content for preview purposes. It demonstrates how your template will look with actual data.</p><h3>Key Points</h3><ul><li>Point one</li><li>Point two</li><li>Point three</li></ul>',
  keyword: 'sample keyword',
  date: new Date().toLocaleDateString(),
  author: 'ArticleWriterPro',
};

export default function Templates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewHTML, setPreviewHTML] = useState('');
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: '', content: '', is_default: false });
  const addToast = useToast();

  const fetchTemplates = () => {
    fetch('/api/templates')
      .then((r) => r.json())
      .then((data) => { setTemplates(data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchTemplates(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const url = editId ? `/api/templates/${editId}` : '/api/templates';
    const method = editId ? 'PUT' : 'POST';
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        addToast(editId ? 'Template updated!' : 'Template created!');
        setShowModal(false);
        setForm({ name: '', content: '', is_default: false });
        setEditId(null);
        fetchTemplates();
      }
    } catch {
      addToast('Error saving template', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this template?')) return;
    try {
      await fetch(`/api/templates/${id}`, { method: 'DELETE' });
      addToast('Template deleted');
      fetchTemplates();
    } catch {
      addToast('Error deleting template', 'error');
    }
  };

  const openEdit = (template) => {
    setForm({ name: template.name, content: template.content, is_default: !!template.is_default });
    setEditId(template.id);
    setShowModal(true);
  };

  const handlePreview = (content) => {
    let html = content;
    html = html.replace(/{{title}}/g, SAMPLE_DATA.title);
    html = html.replace(/{{content}}/g, SAMPLE_DATA.content);
    html = html.replace(/{{keyword}}/g, SAMPLE_DATA.keyword);
    html = html.replace(/{{date}}/g, SAMPLE_DATA.date);
    html = html.replace(/{{author}}/g, SAMPLE_DATA.author);
    setPreviewHTML(html);
    setShowPreview(true);
  };

  if (loading) return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">HTML Templates</h1>
        <button
          onClick={() => { setForm({ name: '', content: '', is_default: false }); setEditId(null); setShowModal(true); }}
          className="btn-primary"
        >
          + New Template
        </button>
      </div>

      {templates.length > 0 ? (
        <div className="space-y-3">
          {templates.map((template) => (
            <div key={template.id} className="card p-5 hover:bg-dark-hover transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold flex items-center gap-2">
                    {template.name}
                    {template.is_default ? (
                      <span className="text-xs bg-accent-green/20 text-accent-green px-2 py-0.5 rounded-full">Default</span>
                    ) : null}
                  </h3>
                  <p className="text-xs text-muted mt-1">
                    Created: {new Date(template.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handlePreview(template.content)} className="text-sm text-accent-blue hover:text-blue-400">Preview</button>
                  <button onClick={() => openEdit(template)} className="text-sm text-secondary hover:text-white">Edit</button>
                  <button onClick={() => handleDelete(template.id)} className="text-sm text-accent-red hover:text-red-400">Delete</button>
                </div>
              </div>
              <pre className="text-xs text-secondary bg-dark-bg p-3 rounded-lg overflow-x-auto max-h-24 whitespace-pre-wrap font-mono">
                {template.content.substring(0, 300)}...
              </pre>
            </div>
          ))}
        </div>
      ) : (
        <div className="card p-12 text-center">
          <p className="text-5xl mb-4">🎨</p>
          <p className="text-secondary">No templates yet</p>
        </div>
      )}

      {/* Edit/Create Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editId ? 'Edit Template' : 'Create Template'} maxWidth="max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Template Name</label>
            <input
              type="text"
              className="input-field"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g., Modern Blog"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">HTML Content</label>
            <textarea
              className="input-field h-80 resize-none font-mono text-sm"
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="<!DOCTYPE html>..."
              required
            />
            <p className="text-xs text-muted mt-1">
              Variables: {'{{title}}'}, {'{{content}}'}, {'{{keyword}}'}, {'{{date}}'}, {'{{author}}'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="tmpl_default"
              checked={form.is_default}
              onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
              className="rounded"
            />
            <label htmlFor="tmpl_default" className="text-sm">Set as default template</label>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => handlePreview(form.content)} className="btn-secondary">Preview</button>
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">{editId ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </Modal>

      {/* Preview Modal */}
      <Modal isOpen={showPreview} onClose={() => setShowPreview(false)} title="Template Preview" maxWidth="max-w-4xl">
        <div className="bg-white rounded-lg overflow-hidden">
          <iframe
            srcDoc={previewHTML}
            className="w-full h-[500px] border-0"
            title="Template Preview"
            sandbox="allow-same-origin"
          />
        </div>
      </Modal>
    </div>
  );
}
