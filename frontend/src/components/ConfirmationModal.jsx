import { X } from 'lucide-react';

export default function ConfirmationModal({
  open,
  title,
  children,
  onClose,
  onConfirm,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmDisabled = false,
  confirmTone = 'primary',
  hideFooter = false,
  width = 'max-w-md',
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className={`relative bg-white rounded border border-gray-300 w-full ${width} shadow-sm`}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200">
          <h3 className="text-card-heading text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {!hideFooter && (
          <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-gray-200 bg-surface rounded-b">
            <button className="btn btn-secondary" onClick={onClose}>
              {cancelLabel}
            </button>
            <button
              className={`btn ${confirmTone === 'danger' ? 'btn-danger' : 'btn-primary'}`}
              onClick={onConfirm}
              disabled={confirmDisabled}
            >
              {confirmLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
