import { Routes, Route } from 'react-router-dom';
import { ToastProvider } from './components/Toast';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import ArticleViewer from './pages/ArticleViewer';
import Generator from './pages/Generator';
import Prompts from './pages/Prompts';
import Export from './pages/Export';
import Templates from './pages/Templates';
import Settings from './pages/Settings';

export default function App() {
  return (
    <ToastProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/articles/:id" element={<ArticleViewer />} />
          <Route path="/generator" element={<Generator />} />
          <Route path="/prompts" element={<Prompts />} />
          <Route path="/export" element={<Export />} />
          <Route path="/templates" element={<Templates />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
    </ToastProvider>
  );
}
