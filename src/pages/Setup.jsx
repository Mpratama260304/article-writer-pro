import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { setupApi } from '../api/client';

const LANGUAGES = ['English', 'Indonesian', 'Spanish', 'French', 'German', 'Portuguese', 'Italian', 'Dutch', 'Japanese', 'Korean', 'Chinese'];
const TONES = ['informational', 'casual', 'professional', 'persuasive'];

/**
 * First-run setup wizard. Reads the one-time token from the query string and
 * creates the admin account + AI provider settings.
 */
export default function Setup() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const navigate = useNavigate();
  const addToast = useToast();
  const { refresh } = useAuth();

  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    aiProviderName: '',
    aiBaseUrl: '',
    aiModel: '',
    aiApiKey: '',
    defaultLanguage: 'English',
    defaultTone: 'informational',
  });

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      addToast('Missing setup token. Use the link printed in the server logs.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await setupApi.complete(token, form);
      addToast('Setup complete! Please log in.');
      await refresh();
      navigate('/login', { replace: true });
    } catch (err) {
      addToast(err.message || 'Setup failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold">
            ArticleWriter<span className="text-accent-pink">Pro</span>
          </h1>
          <p className="text-secondary mt-1">First-run setup</p>
        </div>

        {!token && (
          <div className="card p-4 mb-4 border border-red-500/40 text-sm text-red-300">
            No setup token found in the URL. Open the setup link printed in the server logs:
            <code className="block mt-1 text-xs">/setup?token=…</code>
          </div>
        )}

        <form onSubmit={handleSubmit} className="card p-6 space-y-6">
          <section className="space-y-4">
            <h2 className="text-lg font-semibold">Admin account</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Username</label>
                <input className="input-field" value={form.username}
                  onChange={(e) => update('username', e.target.value)} required minLength={1} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input type="email" className="input-field" value={form.email}
                  onChange={(e) => update('email', e.target.value)} required />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <input type="password" className="input-field" value={form.password}
                onChange={(e) => update('password', e.target.value)} required minLength={8}
                placeholder="At least 8 characters" />
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-semibold">AI provider</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Provider name</label>
                <input className="input-field" value={form.aiProviderName}
                  onChange={(e) => update('aiProviderName', e.target.value)} required
                  placeholder="e.g. OpenAI, Groq, OpenRouter" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Model</label>
                <input className="input-field" value={form.aiModel}
                  onChange={(e) => update('aiModel', e.target.value)} required
                  placeholder="e.g. gpt-4o-mini" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Base URL (OpenAI-compatible)</label>
              <input className="input-field" value={form.aiBaseUrl}
                onChange={(e) => update('aiBaseUrl', e.target.value)} required
                placeholder="https://api.openai.com/v1" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">API key</label>
              <input type="password" className="input-field" value={form.aiApiKey}
                onChange={(e) => update('aiApiKey', e.target.value)} required
                placeholder="Stored encrypted — never shown again" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Default language</label>
                <select className="input-field" value={form.defaultLanguage}
                  onChange={(e) => update('defaultLanguage', e.target.value)}>
                  {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Default tone</label>
                <select className="input-field" value={form.defaultTone}
                  onChange={(e) => update('defaultTone', e.target.value)}>
                  {TONES.map((t) => <option key={t} value={t} className="capitalize">{t}</option>)}
                </select>
              </div>
            </div>
          </section>

          <button type="submit" disabled={submitting || !token}
            className="btn-primary w-full py-3 text-lg disabled:opacity-50">
            {submitting ? 'Setting up…' : 'Complete setup'}
          </button>
        </form>
      </div>
    </div>
  );
}
