import { useState } from 'react';
import { Loader2, SearchCheck } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import UploadComponent from '../components/UploadComponent';
import VerificationReport from '../components/VerificationReport';
import apiClient from '../api/client';

const PIPELINE_STAGES = ['Uploaded PDF', 'Extract Metadata', 'Verify Signature', 'Compare Hash', 'Verify Ledger', 'Recipient Identified'];

export default function LeakInvestigationPage() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');

  const handleInvestigate = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    setReport(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const { data } = await apiClient.post('/verify-leak', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setReport(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Leak investigation failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout title="Leak Investigation" subtitle="Trace a leaked or unauthorised copy of a confidential document back to the responsible recipient">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 section-panel h-fit">
          <h2 className="text-card-heading text-gray-900 mb-3">Upload Leaked Document</h2>
          <UploadComponent file={file} onFileSelected={setFile} />
          <button className="btn btn-primary w-full mt-4" onClick={handleInvestigate} disabled={!file || loading}>
            {loading ? <Loader2 size={14} className="animate-spin" /> : <SearchCheck size={15} />}
            {loading ? 'Analysing...' : 'Run Verification Pipeline'}
          </button>
          {error && <p className="text-[12.5px] text-danger bg-danger-bg border border-red-200 rounded px-3 py-2 mt-3">{error}</p>}

          <div className="mt-5 border-t border-gray-200 pt-4">
            <p className="text-[12px] font-medium text-gray-700 mb-2 uppercase tracking-wide">Verification Pipeline</p>
            <ol className="space-y-1.5">
              {PIPELINE_STAGES.map((stage, idx) => (
                <li key={stage} className="flex items-center gap-2 text-[12.5px] text-gray-600">
                  <span className="w-5 h-5 rounded-full bg-navy-50 text-navy-700 text-[11px] font-semibold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  {stage}
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="lg:col-span-2">
          {!report && !loading && (
            <div className="section-panel flex flex-col items-center justify-center py-20 text-gray-400">
              <SearchCheck size={36} className="mb-3" />
              <p className="text-[13.5px]">Upload a document to begin the leak investigation.</p>
            </div>
          )}
          {loading && (
            <div className="section-panel flex flex-col items-center justify-center py-20 text-gray-500">
              <Loader2 size={30} className="animate-spin mb-3 text-navy-600" />
              <p className="text-[13.5px]">Running cryptographic verification pipeline...</p>
            </div>
          )}
          {report && <VerificationReport report={report} />}
        </div>
      </div>
    </AppLayout>
  );
}
