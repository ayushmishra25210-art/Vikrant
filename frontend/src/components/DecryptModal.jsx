import { useState, useEffect } from 'react';
import { CheckCircle2, Loader2, ShieldCheck, Fingerprint, Clock, KeyRound } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';
import apiClient from '../api/client';

const STEP_LABELS = [
  { key: 'recipient', label: 'Recipient identity verified', icon: ShieldCheck },
  { key: 'device', label: 'Device fingerprint verified', icon: Fingerprint },
  { key: 'timestamp', label: 'Timestamp recorded', icon: Clock },
  { key: 'token', label: 'Cryptographic attribution token generated & signed', icon: KeyRound },
];

export default function DecryptModal({ open, document, onClose, onComplete }) {
  const [stepIndex, setStepIndex] = useState(-1);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (open) {
      setStepIndex(-1);
      setResult(null);
      setError('');
      setRunning(false);
    }
  }, [open]);

  const runDecryption = async () => {
    setRunning(true);
    setError('');
    try {
      // Staged visual progression through verification checkpoints
      for (let i = 0; i < STEP_LABELS.length; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, 380));
        setStepIndex(i);
      }

      const response = await apiClient.post(`/documents/${document.id}/decrypt`, null, {
        responseType: 'blob',
      });

      const tokenId = response.headers['x-token-id'];
      const ledgerSequence = response.headers['x-ledger-sequence'];
      const deviceId = response.headers['x-device-id'];

      const blobUrl = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      setResult({ tokenId, ledgerSequence, deviceId, blobUrl });
      onComplete?.();
    } catch (err) {
      setError(err.response?.data?.message || 'Decryption failed. Please try again.');
    } finally {
      setRunning(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const a = window.document.createElement('a');
    a.href = result.blobUrl;
    a.download = `attributed-${document.filename}`;
    a.click();
  };

  return (
    <ConfirmationModal
      open={open}
      title="Secure Document Decryption"
      onClose={onClose}
      hideFooter
      width="max-w-lg"
    >
      <div className="space-y-4">
        <div className="border border-gray-200 rounded p-3 bg-surface">
          <p className="text-[11.5px] text-gray-500">Document</p>
          <p className="text-[13.5px] font-medium text-gray-900">{document?.filename}</p>
          <p className="text-[11.5px] text-gray-500 mt-1">SHA-256: <span className="font-mono">{document?.hash?.slice(0, 32)}...</span></p>
        </div>

        {!result && (
          <div className="space-y-2">
            {STEP_LABELS.map((step, idx) => {
              const Icon = step.icon;
              const done = idx <= stepIndex;
              const active = idx === stepIndex + 1 && running;
              return (
                <div
                  key={step.key}
                  className={`flex items-center gap-3 border rounded px-3 py-2.5 text-[13px] transition-colors ${
                    done ? 'border-green-200 bg-success-bg text-success' : 'border-gray-200 bg-white text-gray-500'
                  }`}
                >
                  {done ? <CheckCircle2 size={16} /> : active ? <Loader2 size={16} className="animate-spin" /> : <Icon size={16} />}
                  <span className={done ? 'font-medium' : ''}>{step.label}</span>
                </div>
              );
            })}
          </div>
        )}

        {error && <p className="text-danger text-[13px] bg-danger-bg border border-red-200 rounded px-3 py-2">{error}</p>}

        {result && (
          <div className="border border-green-200 bg-success-bg rounded p-4 space-y-2">
            <div className="flex items-center gap-2 text-success font-semibold text-[14px]">
              <CheckCircle2 size={18} /> Decryption Successful — Attribution Recorded
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12.5px] text-gray-700">
              <p><span className="text-gray-500">Attribution Token:</span> <span className="font-mono">{result.tokenId}</span></p>
              <p><span className="text-gray-500">Ledger Sequence:</span> #{result.ledgerSequence}</p>
              <p><span className="text-gray-500">Device ID:</span> <span className="font-mono">{result.deviceId}</span></p>
            </div>
            <p className="text-[11.5px] text-gray-500 pt-1">
              A hidden, signed attribution token has been embedded in your copy of this document. The visible content is unchanged.
            </p>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button className="btn btn-secondary" onClick={onClose}>
            {result ? 'Close' : 'Cancel'}
          </button>
          {!result && (
            <button className="btn btn-primary" onClick={runDecryption} disabled={running}>
              {running ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Processing...
                </>
              ) : (
                'Verify & Decrypt'
              )}
            </button>
          )}
          {result && (
            <button className="btn btn-primary" onClick={handleDownload}>
              Download Attributed PDF
            </button>
          )}
        </div>
      </div>
    </ConfirmationModal>
  );
}
