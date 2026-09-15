import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import apiClient from '../api/client';

export default function AuditPage() {
  const [entries, setEntries] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(12);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const handle = setTimeout(() => {
      apiClient
        .get('/ledger', { params: { page, limit, search: search || undefined } })
        .then(({ data }) => {
          setEntries(data.entries);
          setTotal(data.totalEntries);
        })
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(handle);
  }, [page, limit, search]);

  const filteredEntries = statusFilter === 'all' ? entries : entries.filter((e) => e.ledgerStatus === statusFilter);
  const totalPages = Math.max(Math.ceil(total / limit), 1);

  const columns = [
    { key: 'recipient', header: 'Recipient', render: (e) => (e.recipient ? `${e.recipient.name} (${e.recipient.employeeId})` : '—') },
    { key: 'document', header: 'Document', render: (e) => e.document?.name || '—' },
    { key: 'timestamp', header: 'Timestamp', render: (e) => new Date(e.timestamp).toLocaleString('en-IN') },
    { key: 'deviceId', header: 'Device', render: (e) => <span className="font-mono text-[12px]">{e.deviceId}</span> },
    { key: 'signature', header: 'Signature', render: (e) => <span className="font-mono text-[11px]">{e.signature.slice(0, 18)}...</span> },
    { key: 'ledgerStatus', header: 'Ledger Status', render: (e) => <StatusBadge status={e.ledgerStatus} /> },
  ];

  return (
    <AppLayout title="Audit Trail" subtitle="Search and filter every recorded decryption and attribution event">
      <div className="section-panel mb-5">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="gov-input pl-9"
              placeholder="Search by recipient, document, token ID or device..."
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
            />
          </div>
          <select
            className="gov-input sm:w-52"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Ledger Statuses</option>
            <option value="verified">Verified Only</option>
            <option value="broken">Broken Only</option>
          </select>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading audit records...</p>
      ) : (
        <div className="section-panel">
          <DataTable columns={columns} rows={filteredEntries} rowKey={(e) => e.sequence} emptyMessage="No matching audit records found." />
          <div className="flex items-center justify-between mt-3 text-[13px]">
            <span className="text-gray-500">
              Showing page {page} of {totalPages} ({total} total records)
            </span>
            <div className="flex gap-2">
              <button className="btn btn-secondary !py-1 !px-3" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </button>
              <button className="btn btn-secondary !py-1 !px-3" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
