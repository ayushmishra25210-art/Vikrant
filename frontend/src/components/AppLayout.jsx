import GovNavbar from './GovNavbar';
import Sidebar from './Sidebar';

export default function AppLayout({ children, title, subtitle, actions }) {
  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <GovNavbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 px-6 py-6 max-w-[1400px]">
          {(title || actions) && (
            <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
              <div>
                {title && <h1 className="text-page-title text-gray-900">{title}</h1>}
                {subtitle && <p className="text-[13.5px] text-gray-500 mt-1">{subtitle}</p>}
              </div>
              {actions && <div className="flex items-center gap-2">{actions}</div>}
            </div>
          )}
          {children}
        </main>
      </div>
      <footer className="border-t border-gray-200 bg-white text-center py-3 text-[11.5px] text-gray-500">
        e-Prahari &middot; Smart India Hackathon Prototype &middot; Ministry of Electronics &amp; Information Technology (Demonstration Build)
      </footer>
    </div>
  );
}
