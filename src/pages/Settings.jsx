import { useState, useEffect } from 'react';
import { useToast } from '../components/Toast';
import LoadingSpinner from '../components/LoadingSpinner';

const MODELS = [
  { id: 'glm-4-7-251222', name: 'GLM 4.7' },
  { id: 'glm-5', name: 'GLM 5' },
  { id: 'kimi-k2', name: 'Kimi K2' },
  { id: 'deepseek-v3.2', name: 'DeepSeek V3.2' },
];

const LANGUAGES = ['Indonesian', 'English', 'Spanish', 'French', 'German', 'Portuguese', 'Italian', 'Dutch', 'Japanese', 'Korean', 'Chinese'];
const TONES = ['informational', 'casual', 'professional', 'persuasive'];

export default function Settings() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const addToast = useToast();

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => { setSettings(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        addToast('Settings saved successfully!');
      }
    } catch {
      addToast('Error saving settings', 'error');
    }
    setSaving(false);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const res = await fetch('/api/settings/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (data.success) {
        addToast('Connection successful! ' + (data.message || ''));
      } else {
        addToast('Connection failed: ' + (data.error || 'Unknown error'), 'error');
      }
    } catch (err) {
      addToast('Connection test failed', 'error');
    }
    setTesting(false);
  };

  const update = (key, value) => setSettings((prev) => ({ ...prev, [key]: value }));

  if (loading) return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      {/* AI Provider Section */}
      <div className="card p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">AI Provider</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">API Base URL</label>
            <input
              type="text"
              className="input-field"
              value={settings.api_base_url || ''}
              onChange={(e) => update('api_base_url', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">API Key</label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                className="input-field pr-20"
                value={settings.api_key || ''}
                onChange={(e) => update('api_key', e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-secondary hover:text-white px-2"
              >
                {showApiKey ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Model</label>
            <select
              className="input-field"
              value={settings.model || ''}
              onChange={(e) => update('model', e.target.value)}
            >
              {MODELS.map((m) => (
                <option key={m.id} value={m.id}>{m.name} ({m.id})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Max Tokens: {settings.max_tokens || 4096}
              </label>
              <input
                type="range"
                min="1024"
                max="16384"
                step="512"
                value={settings.max_tokens || 4096}
                onChange={(e) => update('max_tokens', e.target.value)}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted">
                <span>1024</span>
                <span>16384</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Temperature: {settings.temperature || 0.7}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={settings.temperature || 0.7}
                onChange={(e) => update('temperature', e.target.value)}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted">
                <span>0.0 (Precise)</span>
                <span>1.0 (Creative)</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleTestConnection}
            disabled={testing}
            className="btn-secondary flex items-center gap-2"
          >
            {testing ? '⏳ Testing...' : '🔌 Test Connection'}
          </button>
        </div>
      </div>

      {/* General Section */}
      <div className="card p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">General</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Default Language</label>
              <select
                className="input-field"
                value={settings.default_language || 'Indonesian'}
                onChange={(e) => update('default_language', e.target.value)}
              >
                {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Default Tone</label>
              <select
                className="input-field"
                value={settings.default_tone || 'informational'}
                onChange={(e) => update('default_tone', e.target.value)}
              >
                {TONES.map((t) => <option key={t} value={t} className="capitalize">{t}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Rate Limit Delay: {settings.rate_limit_ms || 2000}ms
            </label>
            <input
              type="range"
              min="500"
              max="10000"
              step="500"
              value={settings.rate_limit_ms || 2000}
              onChange={(e) => update('rate_limit_ms', e.target.value)}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted">
              <span>500ms</span>
              <span>10000ms</span>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="btn-primary px-8 py-3 text-lg"
      >
        {saving ? 'Saving...' : '💾 Save Settings'}
      </button>
    </div>
  );
}
