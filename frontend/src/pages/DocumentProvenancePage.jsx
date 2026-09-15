import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import Timeline from '../components/Timeline';
import StatusBadge from '../components/StatusBadge';
import apiClient from '../api/client';

export default function DocumentProvenancePage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get(`/documents/${id}/provenance`)
      .then(({ data }) => setData(data))
      .finally(() => setLoading(false));
  }, [id]);

  const timelineItems = data?.provenance.map((p) => ({
    title: `Decrypted by ${p.recipient?.name || 'Unknown'} (${p.recipient?.employeeId || '—'})`,
    subtitle: `Token ${p.tokenId} · Device ${p.deviceId} · Ledger #${p.sequence}`,
    timestamp: p.timestamp,
    hash: p.currentHash,
  }));

  return (
    <AppLayout
      title="Document Provenance"
      subtitle={data ? data.document.name : ''}
      actions={
        <Link to="/admin/documents" className="btn btn-secondary">
          <ArrowLeft size={14} /> Back to Registry
        </Link>
      }
    >
      {loading && <p className="text-sm text-gray-500">Loading provenance history...</p>}
      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 section-panel">
            <h2 className="text-card-heading text-gray-900 mb-3">Chronological Decryption &amp; Attribution Timeline</h2>
            <Timeline items={timelineItems} />
          </div>
          <div className="section-panel h-fit">
            <h3 className="text-card-heading text-gray-900 mb-3">Document Details</h3>
            <dl className="text-[13px] space-y-2.5">
              <div>
                <dt className="text-gray-500 text-[11.5px]">Classification</dt>
                <dd><StatusBadge status={data.document.classification} /></dd>
              </div>
              <div>
                <dt className="text-gray-500 text-[11.5px]">Original Document Hash (SHA-256)</dt>
                <dd className="font-mono text-[11.5px] break-all">{data.document.hash}</dd>
              </div>
              <div>
                <dt className="text-gray-500 text-[11.5px]">Total Attribution Events</dt>
                <dd className="font-medium">{data.provenance.length}</dd>
              </div>
            </dl>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
