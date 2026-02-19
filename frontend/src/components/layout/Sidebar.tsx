import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Users, 
  UserCircle,
  Package, 
  Box, 
  Settings,
  Shield
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

interface NavItem {
  path: string;
  labelKey: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  {
    path: '/dashboard',
    labelKey: 'sidebar.dashboard',
    icon: <LayoutDashboard size={20} />,
  },
  {
    path: '/orders',
    labelKey: 'sidebar.orders',
    icon: <ShoppingCart size={20} />,
  },
  {
    path: '/suppliers',
    labelKey: 'sidebar.suppliers',
    icon: <Package size={20} />,
    adminOnly: true,
  },
  {
    path: '/products',
    labelKey: 'sidebar.products',
    icon: <Box size={20} />,
  },
  {
    path: '/customers',
    labelKey: 'sidebar.customers',
    icon: <UserCircle size={20} />,
  },
  {
    path: '/users',
    labelKey: 'sidebar.users',
    icon: <Shield size={20} />,
    adminOnly: true,
  },
  {
    path: '/settings',
    labelKey: 'sidebar.settings',
    icon: <Settings size={20} />,
  },
];

export default function Sidebar() {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const isAdmin = user?.role === 'SUPER_ADMIN';

  const filteredNavItems = navItems.filter(
    (item) => !item.adminOnly || isAdmin
  );

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        {filteredNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `nav-item ${isActive ? 'active' : ''}`
            }
          >
            {item.icon}
            <span className="nav-label">{t(item.labelKey)}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

