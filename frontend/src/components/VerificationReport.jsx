import { CheckCircle2, XCircle, ShieldAlert, ShieldCheck } from 'lucide-react';
import StatusBadge from './StatusBadge';

export default function VerificationReport({ report }) {
  if (!report) return null;
  const { steps, identifiedRecipient, conclusion, leakedFileHash, document, chainValid } = report;
  const allPassed = steps.every((s) => s.status === 'pass');

  return (
    <div className="border border-gray-300 rounded overflow-hidden">
      <div className={`px-5 py-3 flex items-center gap-2 border-b ${allPassed ? 'bg-success-bg border-green-200' : 'bg-danger-bg border-red-200'}`}>
        {allPassed ? <ShieldCheck className="text-success" size={20} /> : <ShieldAlert className="text-danger" size={20} />}
        <div>
          <p className={`text-[15px] font-semibold ${allPassed ? 'text-success' : 'text-danger'}`}>
            {allPassed ? 'Attribution Confirmed' : 'Verification Incomplete'}
          </p>
          <p className="text-[12.5px] text-gray-600">Official Cryptographic Verification Report</p>
        </div>
      </div>

      <div className="p-5 bg-white">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5 text-[13px]">
          <div className="border border-gray-200 rounded p-3 bg-surface">
            <p className="text-gray-500">Leaked File Hash (SHA-256)</p>
            <p className="font-mono text-[11.5px] break-all mt-1 text-gray-800">{leakedFileHash}</p>
          </div>
          <div className="border border-gray-200 rounded p-3 bg-surface">
            <p className="text-gray-500">Matched Source Document</p>
            <p className="mt-1 text-gray-800">{document ? document.name : 'Not identified'}</p>
            {document && <StatusBadge status={document.classification} />}
          </div>
        </div>

        <table className="gov-table mb-5">
          <thead>
            <tr>
              <th style={{ width: '32px' }}></th>
              <th>Verification Step</th>
              <th>Result</th>
              <th>Detail</th>
            </tr>
          </thead>
          <tbody>
            {steps.map((s, idx) => (
              <tr key={idx}>
                <td>{idx + 1}</td>
                <td className="font-medium">{s.step}</td>
                <td>
                  {s.status === 'pass' ? (
                    <span className="inline-flex items-center gap-1 text-success text-xs font-medium">
                      <CheckCircle2 size={14} /> Pass
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-danger text-xs font-medium">
                      <XCircle size={14} /> Fail
                    </span>
                  )}
                </td>
                <td className="text-[12.5px] text-gray-600">{s.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {identifiedRecipient && (
          <div className="border border-navy-100 bg-navy-50 rounded p-4 mb-4">
            <p className="text-[12.5px] text-navy-700 font-semibold uppercase tracking-wide mb-2">Recipient Identified</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[13px]">
              <div>
                <p className="text-gray-500 text-[11.5px]">Name</p>
                <p className="font-medium text-gray-900">{identifiedRecipient.name}</p>
              </div>
              <div>
                <p className="text-gray-500 text-[11.5px]">Employee ID</p>
                <p className="font-medium text-gray-900">{identifiedRecipient.employeeId}</p>
              </div>
              <div>
                <p className="text-gray-500 text-[11.5px]">Department</p>
                <p className="font-medium text-gray-900">{identifiedRecipient.department}</p>
              </div>
              <div>
                <p className="text-gray-500 text-[11.5px]">Decryption Device</p>
                <p className="font-medium text-gray-900 font-mono text-[12px]">{identifiedRecipient.deviceId}</p>
              </div>
            </div>
          </div>
        )}

        <div className={`rounded p-3 text-[13.5px] font-medium ${allPassed ? 'bg-success-bg text-success' : 'bg-danger-bg text-danger'}`}>
          {conclusion}
        </div>
        {chainValid !== null && (
          <p className="text-[11.5px] text-gray-500 mt-2">
            Overall provenance ledger integrity at time of verification:{' '}
            <span className={chainValid ? 'text-success font-medium' : 'text-danger font-medium'}>
              {chainValid ? 'INTACT' : 'COMPROMISED'}
            </span>
          </p>
        )}
      </div>
    </div>
  );
}
