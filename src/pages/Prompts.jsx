import { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Prompts() {
  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: '', template: '', is_default: false });
  const addToast = useToast();

  const fetchPrompts = () => {
    fetch('/api/prompts')
      .then((r) => r.json())
      .then((data) => { setPrompts(data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchPrompts(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const url = editId ? `/api/prompts/${editId}` : '/api/prompts';
    const method = editId ? 'PUT' : 'POST';
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        addToast(editId ? 'Prompt updated!' : 'Prompt created!');
        setShowModal(false);
        setForm({ name: '', template: '', is_default: false });
        setEditId(null);
        fetchPrompts();
      }
    } catch {
      addToast('Error saving prompt', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this prompt?')) return;
    try {
      await fetch(`/api/prompts/${id}`, { method: 'DELETE' });
      addToast('Prompt deleted');
      fetchPrompts();
    } catch {
      addToast('Error deleting prompt', 'error');
    }
  };

  const openEdit = (prompt) => {
    setForm({ name: prompt.name, template: prompt.template, is_default: !!prompt.is_default });
    setEditId(prompt.id);
    setShowModal(true);
  };

  if (loading) return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Prompt Templates</h1>
        <button
          onClick={() => { setForm({ name: '', template: '', is_default: false }); setEditId(null); setShowModal(true); }}
          className="btn-primary"
        >
          + New Prompt
        </button>
      </div>

      {prompts.length > 0 ? (
        <div className="space-y-3">
          {prompts.map((prompt) => (
            <div key={prompt.id} className="card p-5 hover:bg-dark-hover transition-colors">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold flex items-center gap-2">
                    {prompt.name}
                    {prompt.is_default ? (
                      <span className="text-xs bg-accent-purple/20 text-accent-purple px-2 py-0.5 rounded-full">Default</span>
                    ) : null}
                  </h3>
                  <p className="text-xs text-muted mt-1">
                    Created: {new Date(prompt.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(prompt)} className="text-sm text-secondary hover:text-white">Edit</button>
                  <button onClick={() => handleDelete(prompt.id)} className="text-sm text-accent-red hover:text-red-400">Delete</button>
                </div>
              </div>
              <pre className="text-xs text-secondary bg-dark-bg p-3 rounded-lg overflow-x-auto max-h-32 whitespace-pre-wrap font-mono">
                {prompt.template}
              </pre>
            </div>
          ))}
        </div>
      ) : (
        <div className="card p-12 text-center">
          <p className="text-5xl mb-4">📋</p>
          <p className="text-secondary">No prompts yet</p>
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editId ? 'Edit Prompt' : 'Create Prompt'} maxWidth="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Prompt Name</label>
            <input
              type="text"
              className="input-field"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g., SEO Blog Post"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Template</label>
            <textarea
              className="input-field h-64 resize-none font-mono text-sm"
              value={form.template}
              onChange={(e) => setForm({ ...form, template: e.target.value })}
              placeholder="Use {keyword}, {language}, {tone}, {length} as variables..."
              required
            />
            <p className="text-xs text-muted mt-1">
              Variables: {'{keyword}'}, {'{language}'}, {'{tone}'}, {'{length}'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_default"
              checked={form.is_default}
              onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
              className="rounded"
            />
            <label htmlFor="is_default" className="text-sm">Set as default prompt</label>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">{editId ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
