import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Loader2 } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import UploadComponent from '../components/UploadComponent';
import apiClient from '../api/client';

const CLASSIFICATIONS = ['UNCLASSIFIED', 'RESTRICTED', 'CONFIDENTIAL', 'SECRET'];

export default function DocumentUploadPage() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [classification, setClassification] = useState('CONFIDENTIAL');
  const [description, setDescription] = useState('');
  const [recipients, setRecipients] = useState([]);
  const [selectedRecipients, setSelectedRecipients] = useState([]);
  const [progress, setProgress] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    apiClient.get('/recipient').then(({ data }) => setRecipients(data.recipients));
  }, []);

  const toggleRecipient = (employeeId) => {
    setSelectedRecipients((prev) =>
      prev.includes(employeeId) ? prev.filter((e) => e !== employeeId) : [...prev, employeeId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a PDF document to upload.');
      return;
    }
    setError('');
    setSuccess(null);
    setSubmitting(true);
    setProgress(0);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('classification', classification);
    formData.append('description', description);
    formData.append('recipients', JSON.stringify(selectedRecipients));

    try {
      const { data } = await apiClient.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (evt) => {
          const pct = Math.round((evt.loaded * 100) / (evt.total || evt.loaded));
          setProgress(pct);
        },
      });
      setSuccess(data.document);
      setFile(null);
      setDescription('');
      setSelectedRecipients([]);
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed.');
    } finally {
      setSubmitting(false);
      setProgress(null);
    }
  };

  return (
    <AppLayout title="Upload Confidential Document" subtitle="Encrypt a document and assign authorised recipients">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <form onSubmit={handleSubmit} className="lg:col-span-2 section-panel space-y-5">
          {error && <p className="text-[13px] text-danger bg-danger-bg border border-red-200 rounded px-3 py-2">{error}</p>}
          {success && (
            <div className="text-[13px] text-success bg-success-bg border border-green-200 rounded px-3 py-2 flex items-start gap-2">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Document encrypted and stored successfully.</p>
                <p className="text-[12px] text-gray-600 mt-0.5">
                  SHA-256: <span className="font-mono">{success.hash}</span>
                </p>
                <button
                  type="button"
                  className="text-navy-700 underline text-[12.5px] mt-1"
                  onClick={() => navigate('/admin/documents')}
                >
                  View in Document Registry &rarr;
                </button>
              </div>
            </div>
          )}

          <div>
            <label className="gov-label">Document (PDF only)</label>
            <UploadComponent file={file} onFileSelected={setFile} progress={progress} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="gov-label">Classification</label>
              <select className="gov-input" value={classification} onChange={(e) => setClassification(e.target.value)}>
                {CLASSIFICATIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="gov-label">Reference / Description</label>
              <input
                className="gov-input"
                placeholder="e.g. File No. 12/2026-Policy"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="gov-label">Assign Recipients</label>
            <div className="border border-gray-200 rounded divide-y divide-gray-200">
              {recipients.map((r) => (
                <label key={r.employeeId} className="flex items-center gap-3 px-3 py-2.5 text-[13.5px] cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={selectedRecipients.includes(r.employeeId)}
                    onChange={() => toggleRecipient(r.employeeId)}
                    className="accent-navy-600"
                  />
                  <span className="font-medium text-gray-900">{r.name}</span>
                  <span className="text-gray-500">({r.employeeId})</span>
                  <span className="text-gray-400 text-[12px] ml-auto">{r.department}</span>
                </label>
              ))}
              {recipients.length === 0 && <p className="text-sm text-gray-500 px-3 py-3">No recipients available.</p>}
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting && <Loader2 size={14} className="animate-spin" />}
            {submitting ? 'Encrypting & Uploading...' : 'Encrypt & Upload Document'}
          </button>
        </form>

        <div className="section-panel h-fit">
          <h3 className="text-card-heading text-gray-900 mb-3">Cryptographic Process</h3>
          <ol className="text-[13px] text-gray-600 space-y-2.5 list-decimal list-inside">
            <li>SHA-256 hash of the original document is computed.</li>
            <li>Document is encrypted once with AES-256-GCM.</li>
            <li>The AES content key is wrapped separately with each recipient's RSA-4096 public key.</li>
            <li>Only the encrypted copy is stored on disk — plaintext is discarded after encryption.</li>
            <li>Recipients can only unwrap the key with their own private key upon decryption.</li>
          </ol>
        </div>
      </div>
    </AppLayout>
  );
}
