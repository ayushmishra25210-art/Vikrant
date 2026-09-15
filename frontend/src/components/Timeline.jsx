import { CheckCircle2, Circle } from 'lucide-react';

// items: [{ title, subtitle, timestamp, hash }]
export default function Timeline({ items }) {
  if (!items?.length) {
    return <p className="text-sm text-gray-500 py-4">No provenance events recorded yet.</p>;
  }
  return (
    <ol className="relative border-l-2 border-navy-100 ml-2">
      {items.map((item, idx) => (
        <li key={idx} className="mb-6 ml-5">
          <span className="absolute -left-[9px] flex items-center justify-center w-4 h-4 rounded-full bg-white">
            <CheckCircle2 size={16} className="text-success" />
          </span>
          <div className="border border-gray-200 rounded p-3 bg-white">
            <div className="flex items-center justify-between flex-wrap gap-1">
              <p className="text-[13.5px] font-medium text-gray-900">{item.title}</p>
              <span className="text-[11.5px] text-gray-500">{new Date(item.timestamp).toLocaleString('en-IN')}</span>
            </div>
            {item.subtitle && <p className="text-[12.5px] text-gray-600 mt-0.5">{item.subtitle}</p>}
            {item.hash && (
              <p className="text-[11px] text-gray-400 font-mono mt-1.5 break-all">Block hash: {item.hash}</p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
