export default function DashboardCard({ label, value, icon: Icon, tone = 'navy' }) {
  const toneClasses = {
    navy: 'text-navy-700 bg-navy-50',
    success: 'text-success bg-success-bg',
    warning: 'text-warning bg-warning-bg',
    danger: 'text-danger bg-danger-bg',
  };
  return (
    <div className="card p-4 flex items-center justify-between">
      <div>
        <p className="text-[12.5px] text-gray-500 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-[26px] font-semibold text-gray-900 mt-1 leading-none">{value}</p>
      </div>
      {Icon && (
        <div className={`w-10 h-10 rounded flex items-center justify-center ${toneClasses[tone]}`}>
          <Icon size={20} />
        </div>
      )}
    </div>
  );
}
