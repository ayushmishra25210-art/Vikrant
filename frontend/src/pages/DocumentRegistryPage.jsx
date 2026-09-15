import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, UserPlus } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import ConfirmationModal from '../components/ConfirmationModal';
import apiClient from '../api/client';

export default function DocumentRegistryPage() {
  const [documents, setDocuments] = useState([]);
  const [recipients, setRecipients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assignTarget, setAssignTarget] = useState(null);
  const [selected, setSelected] = useState([]);
  const [assigning, setAssigning] = useState(false);
  const [message, setMessage] = useState('');

  const loadDocuments = () => {
    setLoading(true);
    apiClient
      .get('/documents')
      .then(({ data }) => setDocuments(data.documents))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadDocuments();
    apiClient.get('/recipient').then(({ data }) => setRecipients(data.recipients));
  }, []);

  const openAssign = (doc) => {
    setAssignTarget(doc);
    setSelected([]);
    setMessage('');
  };

  const availableRecipients = assignTarget
    ? recipients.filter((r) => !assignTarget.recipients.some((ar) => ar.employeeId === r.employeeId))
    : [];

  const handleAssign = async () => {
    if (!selected.length) return;
    setAssigning(true);
    try {
      await apiClient.post(`/documents/${assignTarget.id}/assign`, { recipientIds: selected });
      setMessage('Recipients assigned successfully.');
      loadDocuments();
      setTimeout(() => setAssignTarget(null), 900);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Assignment failed.');
    } finally {
      setAssigning(false);
    }
  };

  const columns = [
    { key: 'filename', header: 'Document', render: (d) => <span className="font-medium text-gray-900">{d.filename}</span> },
    { key: 'classification', header: 'Classification', render: (d) => <StatusBadge status={d.classification} /> },
    { key: 'uploadTime', header: 'Upload Date', render: (d) => new Date(d.uploadTime).toLocaleDateString('en-IN') },
    {
      key: 'recipients',
      header: 'Recipients',
      render: (d) => (
        <div className="flex flex-wrap gap-1">
          {d.recipients.length === 0 && <span className="text-gray-400 text-[12.5px]">None assigned</span>}
          {d.recipients.map((r) => (
            <span key={r.employeeId} className="text-[11.5px] bg-gray-100 border border-gray-200 rounded px-1.5 py-0.5">
              {r.employeeId}
              <StatusBadge status={r.status}>{r.status === 'decrypted' ? '✓' : '…'}</StatusBadge>
            </span>
          ))}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Action',
      render: (d) => (
        <div className="flex items-center gap-2">
          <Link to={`/admin/documents/${d.id}`} className="btn btn-outline !py-1 !px-2 text-[12.5px]">
            <Eye size={13} /> Provenance
          </Link>
          <button onClick={() => openAssign(d)} className="btn btn-secondary !py-1 !px-2 text-[12.5px]">
            <UserPlus size={13} /> Assign
          </button>
        </div>
      ),
    },
  ];

  return (
    <AppLayout title="Document Registry" subtitle="All encrypted documents held in the system">
      {loading ? (
        <p className="text-sm text-gray-500">Loading documents...</p>
      ) : (
        <DataTable columns={columns} rows={documents} emptyMessage="No documents uploaded yet." />
      )}

      <ConfirmationModal
        open={Boolean(assignTarget)}
        title={`Assign Recipients — ${assignTarget?.filename || ''}`}
        onClose={() => setAssignTarget(null)}
        onConfirm={handleAssign}
        confirmLabel={assigning ? 'Assigning...' : 'Assign Selected'}
        confirmDisabled={assigning || selected.length === 0}
      >
        {message && <p className="text-[12.5px] text-navy-700 bg-navy-50 border border-navy-100 rounded px-3 py-2 mb-3">{message}</p>}
        <div className="border border-gray-200 rounded divide-y divide-gray-200 max-h-64 overflow-y-auto">
          {availableRecipients.map((r) => (
            <label key={r.employeeId} className="flex items-center gap-3 px-3 py-2.5 text-[13.5px] cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                checked={selected.includes(r.employeeId)}
                onChange={() =>
                  setSelected((prev) =>
                    prev.includes(r.employeeId) ? prev.filter((e) => e !== r.employeeId) : [...prev, r.employeeId]
                  )
                }
                className="accent-navy-600"
              />
              <span className="font-medium text-gray-900">{r.name}</span>
              <span className="text-gray-500">({r.employeeId})</span>
            </label>
          ))}
          {availableRecipients.length === 0 && (
            <p className="text-sm text-gray-500 px-3 py-3">All recipients are already assigned to this document.</p>
          )}
        </div>
      </ConfirmationModal>
    </AppLayout>
  );
}
