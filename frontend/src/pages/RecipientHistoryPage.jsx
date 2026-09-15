import { useEffect, useState } from 'react';
import AppLayout from '../components/AppLayout';
import Timeline from '../components/Timeline';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';

export default function RecipientHistoryPage() {
  const { user } = useAuth();
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    apiClient
      .get(`/recipient/${user.id}/history`)
      .then(({ data }) => setHistory(data.history))
      .finally(() => setLoading(false));
  }, [user]);

  const items = history?.map((h) => ({
    title: `Decrypted "${h.document?.name || 'Unknown document'}"`,
    subtitle: `Token ${h.tokenId} · Device ${h.deviceId} · Ledger #${h.sequence}`,
    timestamp: h.timestamp,
    hash: h.currentHash,
  }));

  return (
    <AppLayout title="My Decryption History" subtitle="A complete, immutable record of every document you have decrypted">
      {loading && <p className="text-sm text-gray-500">Loading history...</p>}
      {history && (
        <div className="section-panel max-w-3xl">
          <Timeline items={items} />
        </div>
      )}
    </AppLayout>
  );
}
