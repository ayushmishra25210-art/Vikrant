import { useEffect, useState } from 'react';
import { FileText, CheckCircle2, Clock, Link2, KeyRound } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import DashboardCard from '../components/DashboardCard';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import DecryptModal from '../components/DecryptModal';
import apiClient from '../api/client';

export default function RecipientDashboard() {
  const [documents, setDocuments] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [decryptTarget, setDecryptTarget] = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([apiClient.get('/documents'), apiClient.get('/dashboard/recipient')])
      .then(([docsRes, statsRes]) => {
        setDocuments(docsRes.data.documents);
        setStats(statsRes.data.cards);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const columns = [
    { key: 'filename', header: 'Document', render: (d) => <span className="font-medium text-gray-900">{d.filename}</span> },
    { key: 'classification', header: 'Classification', render: (d) => <StatusBadge status={d.classification} /> },
    { key: 'uploadTime', header: 'Upload Date', render: (d) => new Date(d.uploadTime).toLocaleDateString('en-IN') },
    { key: 'myStatus', header: 'Status', render: (d) => <StatusBadge status={d.myStatus} /> },
    {
      key: 'actions',
      header: 'Action',
      render: (d) => (
        <button className="btn btn-primary !py-1 !px-3 text-[12.5px]" onClick={() => setDecryptTarget(d)}>
          <KeyRound size={13} /> {d.myStatus === 'decrypted' ? 'Decrypt Again' : 'Decrypt'}
        </button>
      ),
    },
  ];

  return (
    <AppLayout title="Assigned Documents" subtitle="Confidential documents assigned to you for authorised access">
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <DashboardCard label="Assigned Documents" value={stats.assignedDocuments} icon={FileText} tone="navy" />
          <DashboardCard label="Decrypted" value={stats.decryptedDocuments} icon={CheckCircle2} tone="success" />
          <DashboardCard label="Pending" value={stats.pendingDocuments} icon={Clock} tone="warning" />
          <DashboardCard label="My Provenance Records" value={stats.myProvenanceRecords} icon={Link2} tone="navy" />
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Loading assigned documents...</p>
      ) : (
        <div className="section-panel">
          <DataTable columns={columns} rows={documents} emptyMessage="No documents have been assigned to you yet." />
        </div>
      )}

      <DecryptModal
        open={Boolean(decryptTarget)}
        document={decryptTarget}
        onClose={() => setDecryptTarget(null)}
        onComplete={load}
      />
    </AppLayout>
  );
}
