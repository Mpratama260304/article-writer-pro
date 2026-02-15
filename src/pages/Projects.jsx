import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [editId, setEditId] = useState(null);
  const addToast = useToast();

  const fetchProjects = () => {
    fetch('/api/projects')
      .then((r) => r.json())
      .then((data) => { setProjects(data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchProjects(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const url = editId ? `/api/projects/${editId}` : '/api/projects';
    const method = editId ? 'PUT' : 'POST';
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        addToast(editId ? 'Project updated!' : 'Project created!');
        setShowModal(false);
        setForm({ name: '', description: '' });
        setEditId(null);
        fetchProjects();
      }
    } catch (err) {
      addToast('Error saving project', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this project and all its articles?')) return;
    try {
      await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      addToast('Project deleted');
      fetchProjects();
    } catch (err) {
      addToast('Error deleting project', 'error');
    }
  };

  const openEdit = (project) => {
    setForm({ name: project.name, description: project.description || '' });
    setEditId(project.id);
    setShowModal(true);
  };

  if (loading) return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Projects</h1>
        <button
          onClick={() => { setForm({ name: '', description: '' }); setEditId(null); setShowModal(true); }}
          className="btn-primary"
        >
          + Create New Project
        </button>
      </div>

      {projects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <div key={project.id} className="card p-5 hover:bg-dark-hover transition-colors group">
              <Link to={`/projects/${project.id}`} className="block mb-3">
                <h3 className="text-lg font-semibold group-hover:text-accent-blue transition-colors">
                  {project.name}
                </h3>
                {project.description && (
                  <p className="text-sm text-secondary mt-1 line-clamp-2">{project.description}</p>
                )}
              </Link>
              <div className="flex items-center justify-between text-sm text-secondary">
                <span>{project.article_count || 0} articles</span>
                <span>{new Date(project.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex gap-2 mt-3 pt-3 border-t border-gray-800">
                <button onClick={() => openEdit(project)} className="text-xs text-secondary hover:text-white">
                  Edit
                </button>
                <button onClick={() => handleDelete(project.id)} className="text-xs text-accent-red hover:text-red-400">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card p-12 text-center">
          <p className="text-5xl mb-4">📁</p>
          <p className="text-lg text-secondary mb-4">No projects yet</p>
          <button onClick={() => setShowModal(true)} className="btn-primary">
            Create Your First Project
          </button>
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editId ? 'Edit Project' : 'Create New Project'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Project Name</label>
            <input
              type="text"
              className="input-field"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g., Tech Blog Articles"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              className="input-field h-24 resize-none"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Optional description..."
            />
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
