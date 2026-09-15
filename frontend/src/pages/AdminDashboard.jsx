import { useEffect, useState } from 'react';
import { FileText, Users, KeyRound, Link2 } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import DashboardCard from '../components/DashboardCard';
import DataTable from '../components/DataTable';
import apiClient from '../api/client';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiClient
      .get('/dashboard/admin')
      .then(({ data }) => setStats(data))
      .catch(() => setError('Failed to load dashboard statistics.'))
      .finally(() => setLoading(false));
  }, []);

  const columns = [
    { key: 'sequence', header: 'Ledger #', render: (r) => `#${r.sequence}` },
    { key: 'recipient', header: 'Recipient' },
    { key: 'document', header: 'Document' },
    { key: 'classification', header: 'Classification' },
    { key: 'deviceId', header: 'Device ID', render: (r) => <span className="font-mono text-[12px]">{r.deviceId}</span> },
    { key: 'timestamp', header: 'Timestamp', render: (r) => new Date(r.timestamp).toLocaleString('en-IN') },
  ];

  return (
    <AppLayout title="Administrator Dashboard" subtitle="System-wide overview of documents, recipients and provenance activity">
      {loading && <p className="text-sm text-gray-500">Loading dashboard...</p>}
      {error && <p className="text-sm text-danger">{error}</p>}

      {stats && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <DashboardCard label="Documents Uploaded" value={stats.cards.documentsUploaded} icon={FileText} tone="navy" />
            <DashboardCard label="Active Recipients" value={stats.cards.activeRecipients} icon={Users} tone="success" />
            <DashboardCard label="Today's Decryptions" value={stats.cards.todaysDecryptions} icon={KeyRound} tone="warning" />
            <DashboardCard label="Provenance Records" value={stats.cards.provenanceRecords} icon={Link2} tone="navy" />
          </div>

          <div className="section-panel">
            <h2 className="text-card-heading text-gray-900 mb-3">Recent Activity</h2>
            <DataTable columns={columns} rows={stats.recentActivity} rowKey={(r) => r.sequence} emptyMessage="No activity recorded yet." />
          </div>
        </>
      )}
    </AppLayout>
  );
}
