import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Camera,
  Car,
  MapPin,
  ClipboardCheck,
  FileText,
  Users,
  AlertTriangle,
  LogOut,
  Menu,
  X,
  Bell,
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { label: 'Capture', icon: Camera, path: '/capture' },
  { label: 'Vehicles', icon: Car, path: '/vehicles' },
  { label: 'Zones', icon: MapPin, path: '/zones' },
  { label: 'Checklists', icon: ClipboardCheck, path: '/checklists' },
  { label: 'Reports', icon: FileText, path: '/reports' },
  { label: 'Team', icon: Users, path: '/team' },
  { label: 'Issues', icon: AlertTriangle, path: '/issues' },
];

function getPageTitle(pathname) {
  const item = navItems.find((n) => pathname.startsWith(n.path));
  return item ? item.label : 'Dashboard';
}

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const pageTitle = getPageTitle(location.pathname);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-[#0A1628] transition-transform duration-200 ease-in-out
          lg:static lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-6">
          <span className="text-lg font-bold tracking-wide text-white">
            CPC SERVICES
          </span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-md p-1 text-gray-400 hover:text-white lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        {/* User info */}
        <div className="border-t border-white/10 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#2563EB] text-sm font-semibold text-white">
              WN
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">
                Worker Name
              </p>
              <p className="truncate text-xs text-gray-400">Sydney Airport</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto border-t border-white/10 px-3 py-4">
          <ul className="space-y-1">
            {navItems.map(({ label, icon: Icon, path }) => {
              const isActive = location.pathname.startsWith(path);
              return (
                <li key={path}>
                  <Link
                    to={path}
                    onClick={() => setSidebarOpen(false)}
                    className={`
                      flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors
                      ${
                        isActive
                          ? 'border-l-[3px] border-[#3B82F6] bg-[#2563EB]/10 pl-[9px] text-white'
                          : 'text-gray-400 hover:bg-[#2563EB]/5 hover:text-gray-200'
                      }
                    `}
                  >
                    <Icon size={18} />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Bottom */}
        <div className="border-t border-white/10 px-3 py-4">
          <Link
            to="/login"
            className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-gray-400 transition-colors hover:bg-[#2563EB]/5 hover:text-gray-200"
          >
            <LogOut size={18} />
            Logout
          </Link>
          <p className="mt-3 px-3 text-xs text-gray-600">v1.0.0</p>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 shadow-sm sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 lg:hidden"
            >
              <Menu size={20} />
            </button>
            <h1 className="text-lg font-semibold text-gray-900">
              {pageTitle}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Notification bell */}
            <button className="relative rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700">
              <Bell size={20} />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
            </button>

            {/* User avatar */}
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2563EB] text-xs font-semibold text-white">
              WN
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
