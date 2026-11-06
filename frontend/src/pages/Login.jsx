import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ErrorMessage from '../components/ErrorMessage';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('admin@sms.local');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      navigate(location.state?.from?.pathname || '/', { replace: true });
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="card w-full max-w-sm p-6">
        <h1 className="text-xl font-bold mb-1">Stock Management System</h1>
        <p className="text-sm text-gray-500 mb-6">Sign in to continue</p>
        <ErrorMessage error={error} />
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="label">Password</label>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button className="btn-primary w-full" disabled={loading} type="submit">
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <p className="text-xs text-gray-400 mt-6">
          Seeded admin: admin@sms.local / Admin@12345 — see backend README for the other seeded role accounts.
        </p>
      </div>
    </div>
  );
}
