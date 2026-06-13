import { useState, useEffect } from 'react';

import { useToast } from '../components/Toast';
import LoadingSpinner from '../components/LoadingSpinner';
import { api } from '../api/client';

const LANGUAGES = ['English', 'Indonesian', 'Spanish', 'French', 'German', 'Portuguese', 'Italian', 'Dutch', 'Japanese', 'Korean', 'Chinese'];
const TONES = ['informational', 'casual', 'professional', 'persuasive'];

export default function Settings() {
  const [settings, setSettings] = useState({});
  const [newApiKey, setNewApiKey] = useState('');
  const [replacingKey, setReplacingKey] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const addToast = useToast();

  const load = () => {
    api
      .get('/api/settings')
      .then((data) => { setSettings(data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(load, []);

  const update = (key, value) => setSettings((prev) => ({ ...prev, [key]: value }));

  const buildPayload = () => {
    const payload = {
      ai_provider_name: settings.ai_provider_name || '',
      ai_base_url: settings.ai_base_url || '',
      ai_model: settings.ai_model || '',
      max_tokens: settings.max_tokens || 4096,
      temperature: settings.temperature || 0.7,
      default_language: settings.default_language || 'English',
      default_tone: settings.default_tone || 'informational',
      rate_limit_ms: settings.rate_limit_ms || 2000,
      concurrency: settings.concurrency || 1,
    };
    // Only send a new key when the admin explicitly entered one.
    if (replacingKey && newApiKey.trim()) {
      payload.ai_api_key = newApiKey.trim();
    }
    return payload;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = await api.put('/api/settings', buildPayload());
      setSettings(data);
      setNewApiKey('');
      setReplacingKey(false);
      addToast('Settings saved successfully!');
    } catch (err) {
      addToast(err.message || 'Error saving settings', 'error');
    }
    setSaving(false);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const body = {
        ai_base_url: settings.ai_base_url || '',
        ai_model: settings.ai_model || '',
      };
      if (replacingKey && newApiKey.trim()) body.ai_api_key = newApiKey.trim();
      const data = await api.post('/api/settings/test-connection', body);
      addToast('Connection successful! ' + (data.message || ''));
    } catch (err) {
      addToast('Connection failed: ' + (err.message || 'Unknown error'), 'error');
    }
    setTesting(false);
  };

  if (loading) return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      {/* AI Provider Section */}
      <div className="card p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">AI Provider</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Provider Name</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. OpenAI, Groq, OpenRouter"
                value={settings.ai_provider_name || ''}
                onChange={(e) => update('ai_provider_name', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Model</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. gpt-4o-mini"
                value={settings.ai_model || ''}
                onChange={(e) => update('ai_model', e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">API Base URL</label>
            <input
              type="text"
              className="input-field"
              placeholder="https://api.openai.com/v1"
              value={settings.ai_base_url || ''}
              onChange={(e) => update('ai_base_url', e.target.value)}
            />
          </div>

          {/* API key — masked, replace-only */}
          <div>
            <label className="block text-sm font-medium mb-1">API Key</label>
            {!replacingKey ? (
              <div className="flex items-center gap-3">
                <code className="input-field flex-1 text-secondary">
                  {settings.ai_api_key_set ? (settings.ai_api_key_masked || '••••') : 'Not set'}
                </code>
                <button type="button" className="btn-secondary whitespace-nowrap"
                  onClick={() => { setReplacingKey(true); setNewApiKey(''); }}>
                  {settings.ai_api_key_set ? 'Replace Key' : 'Add Key'}
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  className="input-field pr-28"
                  placeholder="Enter new API key (stored encrypted)"
                  value={newApiKey}
                  onChange={(e) => setNewApiKey(e.target.value)}
                  autoFocus
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-2">
                  <button type="button" onClick={() => setShowApiKey(!showApiKey)}
                    className="text-sm text-secondary hover:text-white">
                    {showApiKey ? 'Hide' : 'Show'}
                  </button>
                  <button type="button" onClick={() => { setReplacingKey(false); setNewApiKey(''); }}
                    className="text-sm text-secondary hover:text-white">
                    Cancel
                  </button>
                </div>
              </div>
            )}
            <p className="text-xs text-muted mt-1">
              The full key is never shown again. Leave unchanged to keep the existing key.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Max Tokens: {settings.max_tokens || 4096}
              </label>
              <input type="range" min="1024" max="16384" step="512"
                value={settings.max_tokens || 4096}
                onChange={(e) => update('max_tokens', e.target.value)} className="w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Temperature: {settings.temperature || 0.7}
              </label>
              <input type="range" min="0" max="1" step="0.1"
                value={settings.temperature || 0.7}
                onChange={(e) => update('temperature', e.target.value)} className="w-full" />
            </div>
          </div>

          <button onClick={handleTestConnection} disabled={testing}
            className="btn-secondary flex items-center gap-2">
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
              <select className="input-field" value={settings.default_language || 'English'}
                onChange={(e) => update('default_language', e.target.value)}>
                {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Default Tone</label>
              <select className="input-field" value={settings.default_tone || 'informational'}
                onChange={(e) => update('default_tone', e.target.value)}>
                {TONES.map((t) => <option key={t} value={t} className="capitalize">{t}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Rate Limit Delay: {settings.rate_limit_ms || 2000}ms
              </label>
              <input type="range" min="0" max="10000" step="500"
                value={settings.rate_limit_ms || 2000}
                onChange={(e) => update('rate_limit_ms', e.target.value)} className="w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Concurrency: {settings.concurrency || 1}
              </label>
              <input type="range" min="1" max="10" step="1"
                value={settings.concurrency || 1}
                onChange={(e) => update('concurrency', e.target.value)} className="w-full" />
            </div>
          </div>
        </div>
      </div>

      <button onClick={handleSave} disabled={saving} className="btn-primary px-8 py-3 text-lg">
        {saving ? 'Saving...' : '💾 Save Settings'}
      </button>
    </div>
  );
}
