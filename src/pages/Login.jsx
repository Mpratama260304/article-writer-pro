import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

import LoadingSpinner from '../components/LoadingSpinner';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';

/** Admin login page. */
export default function Login() {
  const { user, loading, setupRequired, login } = useAuth();
  const navigate = useNavigate();
  const addToast = useToast();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }
  if (setupRequired) return <Navigate to="/setup" replace />;
  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login(username, password);
      navigate('/', { replace: true });
    } catch (err) {
      addToast(err.message || 'Login failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold">
            ArticleWriter<span className="text-accent-pink">Pro</span>
          </h1>
          <p className="text-secondary mt-1">Sign in to continue</p>
        </div>
        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Username or email</label>
            <input className="input-field" value={username}
              onChange={(e) => setUsername(e.target.value)} required autoFocus />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input type="password" className="input-field" value={password}
              onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button type="submit" disabled={submitting}
            className="btn-primary w-full py-2.5 disabled:opacity-50">
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
