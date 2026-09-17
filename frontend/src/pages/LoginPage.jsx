import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, Loader2, Fingerprint, MessageSquareLock, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const DEMO_CREDENTIALS = [
  { role: 'Admin', employeeId: 'EMP001', password: 'Admin@123', name: 'Rajesh Kumar Sharma' },
  { role: 'Recipient', employeeId: 'EMP101', password: 'Recipient@123', name: 'Anita Desai' },
  { role: 'Recipient', employeeId: 'EMP102', password: 'Recipient@123', name: 'Vikram Singh Rathore' },
  { role: 'Recipient', employeeId: 'EMP103', password: 'Recipient@123', name: 'Priya Nair' },
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');

  const fillCredentials = (cred) => {
    setEmployeeId(cred.employeeId);
    setPassword(cred.password);
    setError('');
    setNotice('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(employeeId, password);
      navigate(user.role === 'admin' ? '/admin/dashboard' : '/recipient/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <div className="h-1.5 w-full bg-gradient-to-r from-[#0B3D91] via-[#FFFFFF] to-[#FF9933]" />
      <header className="bg-navy-600 text-white py-3 px-6 flex items-center gap-3">
        <img src="/emblem.svg" alt="Government of India" className="w-8 h-8" />
        <div>
          <p className="text-[14px] font-semibold">Government of India</p>
          <p className="text-[11px] text-navy-100 opacity-85">National Informatics Centre &middot; Vikrant Portal</p>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-5xl flex flex-col lg:flex-row items-stretch gap-5">
          <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-5 shadow-sm border border-gray-200 rounded overflow-hidden bg-white">
            <div className="md:col-span-2 bg-navy-700 text-white p-8 flex flex-col justify-between">
              <div>
                <img src="/emblem.svg" alt="" className="w-14 h-14 mb-5" />
                <h1 className="text-[22px] font-semibold leading-snug">Vikrant</h1>
                <p className="text-[13px] text-navy-100 opacity-90 mt-1">
                  Cryptographic Attribution and Immutable Decryption Provenance System for Multi-Recipient Encrypted Document Distribution
                </p>
              </div>
              <ul className="text-[12.5px] text-navy-100 opacity-90 space-y-2 mt-8">
                <li>&bull; AES-256-GCM document encryption</li>
                <li>&bull; RSA-4096 per-recipient key protection</li>
                <li>&bull; Ed25519 signed attribution tokens</li>
                <li>&bull; Immutable, chain-verified provenance ledger</li>
              </ul>
              <p className="text-[10.5px] text-navy-100 opacity-60 mt-8">
                This is an official Government of India information system. Unauthorised access is a punishable offence under the IT Act, 2000.
              </p>
            </div>

            <div className="md:col-span-3 p-8">
              <h2 className="text-section-heading text-gray-900">Secure Sign In</h2>
              <p className="text-[13px] text-gray-500 mt-1 mb-5">Enter your registered Employee ID and password to continue.</p>

              {notice && <p className="text-[12.5px] text-navy-700 bg-navy-50 border border-navy-100 rounded px-3 py-2 mb-3">{notice}</p>}
              {error && <p className="text-[12.5px] text-danger bg-danger-bg border border-red-200 rounded px-3 py-2 mb-3">{error}</p>}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="gov-label">Employee ID</label>
                  <div className="relative">
                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      className="gov-input pl-9"
                      placeholder="e.g. EMP001"
                      value={employeeId}
                      onChange={(e) => setEmployeeId(e.target.value)}
                      autoComplete="username"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="gov-label">Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="password"
                      className="gov-input pl-9"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      required
                    />
                  </div>
                </div>

                <button type="submit" className="btn btn-primary w-full" disabled={loading}>
                  {loading ? <Loader2 size={15} className="animate-spin" /> : null}
                  {loading ? 'Authenticating...' : 'Sign In'}
                </button>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setNotice('Digital Certificate (DSC) login requires a registered USB token / smart card reader. Not available in this demonstration environment.')}
                    className="btn btn-outline text-[13px]"
                  >
                    <Fingerprint size={14} /> Digital Certificate
                  </button>
                  <button
                    type="button"
                    onClick={() => setNotice('An OTP has been simulated as sent to your registered mobile number. OTP-based login is disabled in this demonstration build — please use your Employee ID and password.')}
                    className="btn btn-outline text-[13px]"
                  >
                    <MessageSquareLock size={14} /> Login with OTP
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="w-full lg:w-[300px] shrink-0 bg-white border border-gray-200 rounded shadow-sm p-4 h-fit">
            <div className="flex items-center justify-between mb-1">
              <p className="flex items-center gap-1.5 text-[12.5px] font-medium text-gray-700">
                <KeyRound size={13} className="text-navy-600" /> Demo Credentials
              </p>
              <span className="text-[10px] font-semibold tracking-wide text-warning bg-warning-bg border border-amber-200 rounded px-1.5 py-0.5 shrink-0">
                DEMO ONLY
              </span>
            </div>
            <p className="text-[11px] text-gray-400 mb-3">Click "Fill" to autofill the sign-in form, then press Sign In.</p>

            <div className="space-y-2">
              {DEMO_CREDENTIALS.map((cred) => (
                <div key={cred.employeeId} className="border border-gray-200 rounded p-2.5 flex items-center gap-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium border shrink-0 ${
                          cred.role === 'Admin'
                            ? 'bg-navy-50 text-navy-700 border-navy-100'
                            : 'bg-success-bg text-success border-green-200'
                        }`}
                      >
                        {cred.role}
                      </span>
                      <span className="font-mono text-[12.5px] font-medium text-gray-900">{cred.employeeId}</span>
                    </div>
                    <p className="text-[11.5px] text-gray-600 truncate">{cred.name}</p>
                    <p className="font-mono text-[11px] text-gray-400">{cred.password}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => fillCredentials(cred)}
                    className="btn btn-secondary !py-1 !px-2.5 text-[11.5px] shrink-0"
                  >
                    Fill
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <footer className="text-center text-[11px] text-gray-500 py-4 border-t border-gray-200 bg-white">
        &copy; 2026 National Informatics Centre. Content owned by respective participating departments.
      </footer>
    </div>
  );
}
