import React, { useState } from 'react';
import {
  ShieldCheck,
  UserCheck,
  Lock,
  ArrowRight,
  Sparkles,
  Train,
  CheckCircle2,
  KeyRound,
  FileSpreadsheet,
} from 'lucide-react';
import { User, UserRole } from '../../types';
import { MOCK_USERS } from '../../data/mockData';
import { loginUser } from '../../services/api';

interface AuthScreenProps {
  onLoginSuccess: (user: User) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess }) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>('RAILWAY_PLANNER');
  const [username, setUsername] = useState('planner@railsync.gov.in');
  const [password, setPassword] = useState('••••••••');
  const [loading, setLoading] = useState(false);

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    const user = MOCK_USERS.find((u) => u.role === role);
    if (user) {
      setUsername(user.email);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const user = await loginUser(username, password);
      onLoginSuccess(user);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080d19] flex items-center justify-center p-4">
      {/* Background ambient lighting */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(37,99,235,0.15),rgba(255,255,255,0))] pointer-events-none"></div>

      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 rounded-2xl bg-[#0c1427] border border-sky-900/40 shadow-2xl overflow-hidden relative z-10">
        {/* Left: Branding & Hackathon Mission */}
        <div className="p-8 bg-gradient-to-br from-[#0c152a] to-[#070c17] flex flex-col justify-between border-b md:border-b-0 md:border-r border-sky-900/30">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-sky-500 to-blue-700 flex items-center justify-center text-white font-black text-base shadow-lg shadow-sky-500/20 border border-sky-300/40">
                RS
              </div>
              <div>
                <span className="font-bold text-base tracking-widest text-slate-100 font-mono flex items-center gap-2">
                  RAILSYNC
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                </span>
                <span className="text-[11px] text-sky-400 font-mono block">
                  AI BLOCK PLANNING ENGINE
                </span>
              </div>
            </div>

            <h2 className="text-xl font-bold text-slate-100 leading-snug">
              Intelligent, Conflict-Aware Railway Maintenance Scheduling
            </h2>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Transforming manual Indian Railways block coordination into automated multi-department optimization, headway conflict detection, and deterministic safety validation.
            </p>

            <div className="mt-6 space-y-2.5 font-mono text-[11px] text-slate-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
                <span>Multi-Department Constraint Optimization</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
                <span>Spatial-Temporal Train-Block Overlap Detection</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
                <span>Deterministic 7-Point Safety Publishing Gate</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
                <span>Bi-Directional Python REST & Sheets Sync</span>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-800 text-[11px] text-slate-500 font-mono flex items-center justify-between">
            <span>SMART INDIA HACKATHON</span>
            <span className="text-emerald-400">SIH-2026</span>
          </div>
        </div>

        {/* Right: Quick Persona Selection & Login */}
        <div className="p-8 flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 font-mono">
                Select Operating Persona
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-sky-300 border border-blue-800">
                LIVE DEMO ACCESS
              </span>
            </div>

            {/* Role buttons */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono mb-4">
              {MOCK_USERS.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => handleRoleSelect(user.role)}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    selectedRole === user.role
                      ? 'bg-blue-950/80 border-sky-500 text-sky-100 ring-1 ring-sky-500/40'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="font-bold text-[11px] text-slate-200 truncate">{user.name}</div>
                  <div className="text-[10px] text-sky-400 truncate mt-0.5">{user.role}</div>
                  <div className="text-[9px] text-slate-500 truncate">{user.department}</div>
                </button>
              ))}
            </div>

            {/* Credentials form */}
            <form onSubmit={handleLogin} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Official Email / Username
                </label>
                <input
                  type="email"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-200 font-mono text-xs focus:border-sky-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Security Passkey
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-200 font-mono text-xs focus:border-sky-500 focus:outline-none"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 hover:from-blue-500 hover:to-sky-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-900/40 mt-4 transition-all"
              >
                <span>{loading ? 'Authenticating Officer...' : 'ACCESS RAILSYNC COMMAND CENTER'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>

          <div className="text-[11px] text-slate-500 font-mono text-center">
            Decision-support software for Indian Railways maintenance operations.
          </div>
        </div>
      </div>
    </div>
  );
};
