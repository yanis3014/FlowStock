import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  Package,
  MapPin,
  Truck,
  ShoppingCart,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { to: '/', label: 'Tableau de bord', icon: LayoutDashboard },
  { to: '/products', label: 'Produits', icon: Package },
  { to: '/locations', label: 'Emplacements', icon: MapPin },
  { to: '/suppliers', label: 'Fournisseurs', icon: Truck },
  { to: '/sales', label: 'Ventes', icon: ShoppingCart },
];

export default function Layout() {
  const { user, tenant, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-64 flex-col bg-white border-r border-gray-200 transition-transform lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center gap-2 border-b border-gray-200 px-6">
          <Package className="h-7 w-7 text-indigo-600" />
          <span className="text-lg font-bold text-gray-900">FlowStock</span>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`
              }
              end={to === '/'}
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-gray-200 p-4">
          <div className="mb-3 px-3">
            <p className="text-sm font-medium text-gray-900">
              {user?.first_name} {user?.last_name}
            </p>
            <p className="text-xs text-gray-500">{tenant?.company_name}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-700 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            Déconnexion
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center gap-4 border-b border-gray-200 bg-white px-6 lg:hidden">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-600">
            {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
          <div className="flex items-center gap-2">
            <Package className="h-6 w-6 text-indigo-600" />
            <span className="text-lg font-bold">FlowStock</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
