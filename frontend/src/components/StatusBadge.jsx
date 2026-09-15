const VARIANTS = {
  pending: { bg: 'bg-warning-bg', text: 'text-warning', border: 'border-amber-300', label: 'Pending' },
  decrypted: { bg: 'bg-success-bg', text: 'text-success', border: 'border-green-300', label: 'Decrypted' },
  verified: { bg: 'bg-success-bg', text: 'text-success', border: 'border-green-300', label: 'Verified' },
  broken: { bg: 'bg-danger-bg', text: 'text-danger', border: 'border-red-300', label: 'Broken' },
  pass: { bg: 'bg-success-bg', text: 'text-success', border: 'border-green-300', label: 'Pass' },
  fail: { bg: 'bg-danger-bg', text: 'text-danger', border: 'border-red-300', label: 'Fail' },
  active: { bg: 'bg-success-bg', text: 'text-success', border: 'border-green-300', label: 'Active' },
  UNCLASSIFIED: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300', label: 'Unclassified' },
  RESTRICTED: { bg: 'bg-warning-bg', text: 'text-warning', border: 'border-amber-300', label: 'Restricted' },
  CONFIDENTIAL: { bg: 'bg-navy-50', text: 'text-navy-700', border: 'border-navy-100', label: 'Confidential' },
  SECRET: { bg: 'bg-danger-bg', text: 'text-danger', border: 'border-red-300', label: 'Secret' },
};

export default function StatusBadge({ status, children }) {
  const variant = VARIANTS[status] || { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300', label: status };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded border text-xs font-medium ${variant.bg} ${variant.text} ${variant.border}`}
    >
      {children || variant.label}
    </span>
  );
}
