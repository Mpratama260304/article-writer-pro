import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useToast } from '../components/Toast';

const LANGUAGES = ['Indonesian', 'English', 'Spanish', 'French', 'German', 'Portuguese', 'Italian', 'Dutch', 'Japanese', 'Korean', 'Chinese', 'Arabic', 'Hindi', 'Thai', 'Vietnamese', 'Malay'];
const TONES = ['informational', 'casual', 'professional', 'persuasive'];
const LENGTHS = [
  { value: 'short', label: 'Short (~500 words)' },
  { value: 'medium', label: 'Medium (~1000 words)' },
  { value: 'long', label: 'Long (~2000 words)' },
];

export default function Generator() {
  const [searchParams] = useSearchParams();
  const addToast = useToast();

  const [projects, setProjects] = useState([]);
  const [prompts, setPrompts] = useState([]);
  const [projectId, setProjectId] = useState(searchParams.get('projectId') || '');
  const [newProjectName, setNewProjectName] = useState('');
  const [keywords, setKeywords] = useState('');
  const [language, setLanguage] = useState('Indonesian');
  const [length, setLength] = useState('medium');
  const [tone, setTone] = useState('informational');
  const [promptId, setPromptId] = useState('');
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetch('/api/projects').then((r) => r.json()).then(setProjects).catch(() => {});
    fetch('/api/prompts').then((r) => r.json()).then((data) => {
      setPrompts(data);
      const def = data.find((p) => p.is_default);
      if (def) setPromptId(String(def.id));
    }).catch(() => {});
  }, []);

  const handleGenerate = async (e) => {
    e.preventDefault();

    const keywordList = keywords.split('\n').map((k) => k.trim()).filter(Boolean);
    if (keywordList.length === 0) {
      addToast('Please enter at least one keyword', 'error');
      return;
    }

    let pid = projectId;

    // Create new project if needed
    if (!pid && newProjectName) {
      try {
        const res = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newProjectName }),
        });
        const proj = await res.json();
        pid = String(proj.id);
        setProjectId(pid);
        setProjects((prev) => [proj, ...prev]);
      } catch {
        addToast('Error creating project', 'error');
        return;
      }
    }

    if (!pid) {
      addToast('Please select or create a project', 'error');
      return;
    }

    setGenerating(true);
    setProgress([]);
    setCurrentIndex(0);
    setTotal(keywordList.length);

    // Initialize progress items
    const initialProgress = keywordList.map((kw) => ({
      keyword: kw,
      status: 'waiting',
    }));
    setProgress(initialProgress);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: parseInt(pid),
          keywords: keywordList,
          language,
          tone,
          length,
          promptId: promptId ? parseInt(promptId) : null,
        }),
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6));
              if (event.type === 'progress') {
                setCurrentIndex(event.current);
                setProgress((prev) => {
                  const updated = [...prev];
                  const idx = updated.findIndex((p) => p.keyword === event.keyword);
                  if (idx >= 0) {
                    updated[idx] = {
                      ...updated[idx],
                      status: event.status,
                      title: event.title,
                      error: event.error,
                      wordCount: event.wordCount,
                    };
                  }
                  return updated;
                });
              } else if (event.type === 'done') {
                addToast(`Generation complete! ${event.total} articles processed.`);
              } else if (event.type === 'error') {
                addToast(event.error, 'error');
              }
            } catch {}
          }
        }
      }
    } catch (err) {
      addToast('Generation failed: ' + err.message, 'error');
    }

    setGenerating(false);
  };

  const statusIcon = (status) => {
    switch (status) {
      case 'waiting': return '⏳';
      case 'generating': return '🔄';
      case 'completed': return '✅';
      case 'failed': return '❌';
      default: return '⏳';
    }
  };

  const completedCount = progress.filter((p) => p.status === 'completed').length;
  const failedCount = progress.filter((p) => p.status === 'failed').length;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Article Generator</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <form onSubmit={handleGenerate} className="card p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Project</label>
            <select
              className="input-field"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            >
              <option value="">-- Select Project --</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {!projectId && (
            <div>
              <label className="block text-sm font-medium mb-1">Or Create New Project</label>
              <input
                type="text"
                className="input-field"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="New project name..."
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Keywords (one per line)</label>
            <textarea
              className="input-field h-32 resize-none font-mono text-sm"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder={"cara membuat website\ntips SEO 2025\npanduan digital marketing"}
              required
            />
            <p className="text-xs text-muted mt-1">
              {keywords.split('\n').filter((k) => k.trim()).length} keywords
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Language</label>
              <select className="input-field" value={language} onChange={(e) => setLanguage(e.target.value)}>
                {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Article Length</label>
              <select className="input-field" value={length} onChange={(e) => setLength(e.target.value)}>
                {LENGTHS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Tone</label>
              <select className="input-field" value={tone} onChange={(e) => setTone(e.target.value)}>
                {TONES.map((t) => <option key={t} value={t} className="capitalize">{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Prompt Template</label>
              <select className="input-field" value={promptId} onChange={(e) => setPromptId(e.target.value)}>
                <option value="">Default</option>
                {prompts.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={generating}
            className="w-full btn-primary text-center py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? '⏳ Generating...' : '🚀 Generate Articles'}
          </button>
        </form>

        {/* Progress Panel */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">Progress</h2>

          {progress.length > 0 && (
            <>
              {/* Progress bar */}
              <div className="mb-4">
                <div className="flex justify-between text-sm text-secondary mb-1">
                  <span>{completedCount + failedCount} of {total} completed</span>
                  <span>{completedCount} ✅ {failedCount > 0 && `${failedCount} ❌`}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-accent-green rounded-full h-2 transition-all duration-500"
                    style={{ width: `${((completedCount + failedCount) / total) * 100}%` }}
                  />
                </div>
              </div>

              {/* Keyword list */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {progress.map((item, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      item.status === 'generating' ? 'bg-accent-blue/10 border border-accent-blue/30' : 'bg-dark-bg'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.keyword}</p>
                      {item.title && <p className="text-xs text-secondary truncate">{item.title}</p>}
                      {item.error && <p className="text-xs text-accent-red truncate">{item.error}</p>}
                      {item.wordCount && <p className="text-xs text-muted">{item.wordCount} words</p>}
                    </div>
                    <span className="text-lg ml-2">{statusIcon(item.status)}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {progress.length === 0 && (
            <div className="text-center py-12 text-secondary">
              <p className="text-4xl mb-3">🚀</p>
              <p>Enter keywords and click Generate to start</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
