import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Users, 
  Package, 
  Box, 
  Settings,
  Shield 
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  {
    path: '/dashboard',
    label: 'Dashboard',
    icon: <LayoutDashboard size={20} />,
  },
  {
    path: '/orders',
    label: 'Orders',
    icon: <ShoppingCart size={20} />,
  },
  {
    path: '/suppliers',
    label: 'Suppliers',
    icon: <Package size={20} />,
    adminOnly: true,
  },
  {
    path: '/products',
    label: 'Products',
    icon: <Box size={20} />,
    adminOnly: true,
  },
  {
    path: '/users',
    label: 'Users',
    icon: <Shield size={20} />,
    adminOnly: true,
  },
  {
    path: '/settings',
    label: 'Settings',
    icon: <Settings size={20} />,
  },
];

export default function Sidebar() {
  const { user } = useAuthStore();
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
            <span className="nav-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

