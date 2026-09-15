import { useEffect, useState } from 'react';
import { ShieldCheck, ShieldAlert, Link2 } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import apiClient from '../api/client';

export default function LedgerPage() {
  const [ledger, setLedger] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const load = (p = 1) => {
    setLoading(true);
    apiClient
      .get('/ledger', { params: { page: p, limit: 15 } })
      .then(({ data }) => setLedger(data))
      .finally(() => setLoading(false));
  };

  useEffect(() => load(page), [page]);

  const columns = [
    { key: 'sequence', header: 'Block #', render: (e) => `#${e.sequence}` },
    { key: 'tokenId', header: 'Token ID', render: (e) => <span className="font-mono text-[12px]">{e.tokenId}</span> },
    { key: 'recipient', header: 'Recipient', render: (e) => (e.recipient ? `${e.recipient.name} (${e.recipient.employeeId})` : '—') },
    { key: 'document', header: 'Document', render: (e) => e.document?.name || '—' },
    { key: 'previousHash', header: 'Previous Hash', render: (e) => <span className="font-mono text-[11px]">{e.previousHash.slice(0, 14)}...</span> },
    { key: 'currentHash', header: 'Current Hash', render: (e) => <span className="font-mono text-[11px]">{e.currentHash.slice(0, 14)}...</span> },
    { key: 'timestamp', header: 'Timestamp', render: (e) => new Date(e.timestamp).toLocaleString('en-IN') },
    { key: 'ledgerStatus', header: 'Status', render: (e) => <StatusBadge status={e.ledgerStatus} /> },
  ];

  const totalPages = ledger ? Math.max(Math.ceil(ledger.totalEntries / ledger.limit), 1) : 1;

  return (
    <AppLayout title="Immutable Provenance Ledger" subtitle="Append-only, cryptographically chained record of every decryption event">
      {loading && !ledger && <p className="text-sm text-gray-500">Loading ledger...</p>}

      {ledger && (
        <>
          <div
            className={`flex items-center gap-3 rounded border px-4 py-3 mb-5 ${
              ledger.chainValid ? 'bg-success-bg border-green-200' : 'bg-danger-bg border-red-200'
            }`}
          >
            {ledger.chainValid ? <ShieldCheck className="text-success" size={22} /> : <ShieldAlert className="text-danger" size={22} />}
            <div>
              <p className={`text-[14px] font-semibold ${ledger.chainValid ? 'text-success' : 'text-danger'}`}>
                {ledger.chainValid ? 'Ledger Chain Integrity: VERIFIED' : 'Ledger Chain Integrity: COMPROMISED'}
              </p>
              <p className="text-[12px] text-gray-600">
                {ledger.totalEntries} total entries &middot; Genesis hash: <span className="font-mono">{ledger.genesisHash.slice(0, 20)}...</span>
              </p>
            </div>
          </div>

          <div className="section-panel mb-5">
            <h2 className="text-card-heading text-gray-900 mb-3 flex items-center gap-2">
              <Link2 size={17} className="text-navy-600" /> Chain Visualization
            </h2>
            <div className="flex items-center gap-1 overflow-x-auto pb-2">
              {ledger.entries.map((e, idx) => (
                <div key={e.sequence} className="flex items-center shrink-0">
                  <div
                    className={`border rounded px-3 py-2 text-center min-w-[110px] ${
                      e.ledgerStatus === 'verified' ? 'border-green-300 bg-success-bg' : 'border-red-300 bg-danger-bg'
                    }`}
                  >
                    <p className="text-[11px] text-gray-500">Block #{e.sequence}</p>
                    <p className="font-mono text-[10.5px] text-gray-700">{e.currentHash.slice(0, 8)}...</p>
                  </div>
                  {idx < ledger.entries.length - 1 && <div className="w-4 h-px bg-gray-300 mx-1" />}
                </div>
              ))}
            </div>
          </div>

          <div className="section-panel">
            <h2 className="text-card-heading text-gray-900 mb-3">Ledger Entries</h2>
            <DataTable columns={columns} rows={ledger.entries} rowKey={(e) => e.sequence} emptyMessage="No ledger entries yet." />
            <div className="flex items-center justify-between mt-3 text-[13px]">
              <span className="text-gray-500">
                Page {ledger.page} of {totalPages}
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
        </>
      )}
    </AppLayout>
  );
}
