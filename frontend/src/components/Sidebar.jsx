import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  UploadCloud,
  FileText,
  Link2,
  SearchCheck,
  ClipboardList,
  History,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ADMIN_LINKS = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/upload', label: 'Upload Document', icon: UploadCloud },
  { to: '/admin/documents', label: 'Document Registry', icon: FileText },
  { to: '/admin/ledger', label: 'Provenance Ledger', icon: Link2 },
  { to: '/admin/leak-investigation', label: 'Leak Investigation', icon: SearchCheck },
  { to: '/admin/audit', label: 'Audit Trail', icon: ClipboardList },
];

const RECIPIENT_LINKS = [
  { to: '/recipient/dashboard', label: 'Assigned Documents', icon: LayoutDashboard },
  { to: '/recipient/history', label: 'My Decryption History', icon: History },
];

export default function Sidebar() {
  const { user } = useAuth();
  const links = user?.role === 'admin' ? ADMIN_LINKS : RECIPIENT_LINKS;

  return (
    <aside className="w-60 bg-white border-r border-gray-200 min-h-[calc(100vh-58px)] hidden lg:block">
      <nav className="py-3">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-4 py-2.5 text-sm border-l-[3px] transition-colors ${
                isActive
                  ? 'border-navy-600 bg-navy-50 text-navy-700 font-medium'
                  : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="mx-4 mt-4 p-3 border border-gray-200 rounded bg-surface text-[11.5px] text-gray-500 leading-relaxed">
        This system logs and cryptographically attributes every document decryption. All activity is monitored and auditable.
      </div>
    </aside>
  );
}
