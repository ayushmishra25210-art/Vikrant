import { useState } from 'react';
import { LogOut, ChevronDown, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function GovNavbar() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="bg-navy-600 border-b-4 border-navy-700 text-white">
      <div className="h-1 w-full bg-gradient-to-r from-[#0B3D91] via-[#FFFFFF] to-[#FF9933]" />
      <div className="px-6 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/emblem.svg" alt="Government of India" className="w-9 h-9" />
          <div className="leading-tight">
            <p className="text-[15px] font-semibold tracking-wide">e-Prahari</p>
            <p className="text-[11px] text-navy-100 opacity-85">Cryptographic Attribution &amp; Document Provenance System</p>
          </div>
        </div>

        <div className="flex items-center gap-5">
          <div className="hidden sm:flex items-center gap-1.5 text-[12.5px] text-navy-50 border border-white/25 rounded px-2.5 py-1">
            <ShieldCheck size={14} />
            <span>Secure Session</span>
          </div>

          {user && (
            <div className="relative">
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center gap-2 text-sm hover:bg-white/10 rounded px-2 py-1.5"
              >
                <div className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center text-xs font-semibold">
                  {user.name?.charAt(0)}
                </div>
                <div className="text-left hidden md:block">
                  <p className="text-[13px] font-medium leading-tight">{user.name}</p>
                  <p className="text-[11px] text-navy-100 opacity-80 leading-tight">
                    {user.employeeId} &middot; {user.role === 'admin' ? 'Administrator' : 'Recipient'}
                  </p>
                </div>
                <ChevronDown size={14} />
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-1 w-48 bg-white text-gray-800 rounded border border-gray-200 shadow-sm py-1 z-50">
                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 text-left"
                  >
                    <LogOut size={14} />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
