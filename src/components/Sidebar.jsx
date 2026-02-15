import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Dashboard', icon: '⊙' },
  { to: '/projects', label: 'Projects', icon: '📁' },
  { to: '/generator', label: 'Generator', icon: '⚡' },
  { to: '/prompts', label: 'Prompts', icon: '📋' },
  { to: '/export', label: 'Export', icon: '📦' },
  { to: '/templates', label: 'HTML Templates', icon: '🎨' },
  { to: '/settings', label: 'Settings', icon: '⚙' },
];

export default function Sidebar({ collapsed, onToggle }) {
  return (
    <>
      {/* Mobile overlay */}
      {!collapsed && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={onToggle} />
      )}

      <aside
        className={`fixed top-0 left-0 h-full bg-dark-sidebar z-40 flex flex-col transition-transform duration-300 ${
          collapsed ? '-translate-x-full lg:translate-x-0 lg:w-60' : 'translate-x-0 w-60'
        }`}
        style={{ width: '240px' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-6">
          <div className="w-8 h-8 rounded-full bg-accent-pink flex items-center justify-center text-white font-bold text-sm">
            A
          </div>
          <span className="text-lg font-bold">
            ArticleWriter<span className="text-accent-pink">Pro</span>
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => { if (window.innerWidth < 1024) onToggle?.(); }}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-white'
                    : 'text-secondary hover:text-white'
                }`
              }
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 text-xs text-muted">
          v1.0.0 • Portable Edition
        </div>
      </aside>
    </>
  );
}
