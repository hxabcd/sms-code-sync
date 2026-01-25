import React, { useState, useEffect } from 'react';
import { ShieldCheck, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { fetchProfiles } from '../api/client';

const VerificationCard = ({ onVerified }) => {
  const [profiles, setProfiles] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState('');
  const [totp, setTotp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProfiles().then(res => {
      setProfiles(res.data);
      if (res.data.length > 0) setSelectedProfile(res.data[0]);
    });
  }, []);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (totp.length !== 6) return;

    setLoading(true);
    setError('');
    try {
      await onVerified(selectedProfile, totp);
    } catch (err) {
      setError(err.response?.data?.error || '验证失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-8 w-full max-w-md rounded-2xl flex flex-col items-center gap-6"
    >
      <div className="bg-primary/20 p-4 rounded-full">
        <ShieldCheck size={48} className="text-primary" />
      </div>

      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">身份验证</h2>
        <p className="text-gray-400 text-sm">请输入六位 TOTP 验证码以继续</p>
      </div>

      <form onSubmit={handleVerify} className="w-full space-y-6">
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-2">
            <User size={14} /> 用户配置
          </label>
          <select
            value={selectedProfile}
            onChange={(e) => setSelectedProfile(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium"
          >
            {profiles.map(p => (
              <option key={p} value={p} className="bg-slate-900">{p}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-500 uppercase">验证代码</label>
          <input
            type="text"
            inputMode="numeric"
            value={totp}
            maxLength={6}
            onChange={(e) => setTotp(e.target.value.replace(/[^0-9]/g, ''))}
            placeholder="------"
            className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-center text-2xl font-bold tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-gray-600 transition-all"
          />
        </div>

        {error && <p className="text-red-400 text-sm text-center">{error}</p>}

        <button
          disabled={totp.length !== 6 || loading}
          className={`w-full py-4 rounded-xl font-bold text-lg transition-all transform active:scale-95 ${totp.length === 6 && !loading
            ? 'bg-primary hover:bg-primary-hover text-white shadow-lg shadow-primary/20'
            : 'bg-white/5 text-gray-500 cursor-not-allowed border border-white/5'
            }`}
        >
          {loading ? '验证中...' : '确认验证'}
        </button>
      </form>
    </motion.div>
  );
};

export default VerificationCard;
