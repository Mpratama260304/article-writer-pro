import { useState } from 'react';
import Sidebar from './Sidebar';

export default function Layout({ children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  return (
    <div className="min-h-screen bg-dark-bg">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-dark-sidebar z-20 flex items-center px-4 py-3 border-b border-gray-800">
        <button
          onClick={() => setSidebarCollapsed(false)}
          className="text-white text-xl mr-3"
        >
          ☰
        </button>
        <span className="font-bold">
          ArticleWriter<span className="text-accent-pink">Pro</span>
        </span>
      </div>

      {/* Main content */}
      <main className="lg:ml-60 min-h-screen pt-14 lg:pt-0">
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
