import { Navigate } from 'react-router-dom';

import LoadingSpinner from './LoadingSpinner';
import { useAuth } from '../context/AuthContext';

/**
 * Guards dashboard routes:
 *  - while loading -> spinner
 *  - setup required -> /setup
 *  - not authenticated -> /login
 *  - otherwise renders children
 */
export default function ProtectedRoute({ children }) {
  const { loading, user, setupRequired } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (setupRequired) return <Navigate to="/setup" replace />;
  if (!user) return <Navigate to="/login" replace />;

  return children;
}
