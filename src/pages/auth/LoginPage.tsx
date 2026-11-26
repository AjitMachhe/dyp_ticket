import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ROLE_CONFIG } from '../../lib/rbac';
import type { UserRole } from '../../types/database';

export const LoginPage: React.FC = () => {
  const { profile, signIn, signUp, institutions, departments } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [institutionId, setInstitutionId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [idCode, setIdCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (profile) {
      navigate('/dashboard', { replace: true });
    }
  }, [profile, navigate]);

  useEffect(() => {
    if (institutions.length > 0 && !institutionId) {
      setInstitutionId(institutions[0].id);
    }
  }, [institutions, institutionId]);

  const instDepartments = departments.filter((d) => d.institution_id === institutionId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    if (mode === 'login') {
      const res = await signIn(email, password);
      if (res.error) setError(res.error);
      else navigate('/dashboard');
    } else {
      const res = await signUp({
        email,
        password,
        full_name: fullName,
        role,
        institution_id: institutionId || institutions[0]?.id || '',
        department_id: departmentId || undefined,
        employee_or_prn_id: idCode,
      });
      if (res.error) setError(res.error);
      else navigate('/dashboard');
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-canvas flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-brand-600 text-white font-bold text-xl flex items-center justify-center mx-auto shadow-apple-md mb-4">
            DYP
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            D. Y. Patil Group Service Desk
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Sign in with your Student, Faculty, Staff, or Admin account
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-apple-md p-7">
          <div className="flex p-1 bg-slate-100 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition cursor-pointer ${
                mode === 'login' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setMode('register')}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition cursor-pointer ${
                mode === 'register' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
              }`}
            >
              New User Registration
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Account Role *
                    </label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as UserRole)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
                    >
                      {Object.values(ROLE_CONFIG).map((r) => (
                        <option key={r.key} value={r.key}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      PRN / Emp ID
                    </label>
                    <input
                      type="text"
                      value={idCode}
                      onChange={(e) => setIdCode(e.target.value)}
                      placeholder="DYP2026001"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    College / Institution *
                  </label>
                  <select
                    value={institutionId}
                    onChange={(e) => {
                      setInstitutionId(e.target.value);
                      setDepartmentId('');
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
                  >
                    {institutions.map((inst) => (
                      <option key={inst.id} value={inst.id}>
                        {inst.name}
                      </option>
                    ))}
                  </select>
                </div>

                {(role === 'department_hod' || role === 'support_staff') && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Department *
                    </label>
                    <select
                      required
                      value={departmentId}
                      onChange={(e) => setDepartmentId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
                    >
                      <option value="">Select Department</option>
                      {instDepartments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@dypatilgroup.edu.in"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Password *</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm flex items-center justify-center gap-2 transition shadow-xs cursor-pointer"
            >
              <span>
                {submitting
                  ? 'Please wait...'
                  : mode === 'login'
                  ? 'Sign In to Portal'
                  : 'Create Account & Enter'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="flex items-center justify-center gap-4 mt-5 pt-4 border-t border-slate-100 text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Role-Based Access
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Auto-SLA Routing
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};