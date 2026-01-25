import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { checkSession, verifyTOTP, fetchCodes, logoutProfile, fetchProfiles } from './api/client';
import { useSSE } from './hooks/useSSE';
import Header from './components/Header';
import VerificationCard from './components/VerificationCard';
import CodeCard from './components/CodeCard';
import { RefreshCw, PackageOpen } from 'lucide-react';

function App() {
  const [verifiedProfile, setVerifiedProfile] = useState(null);
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState(null);

  const handleLogout = useCallback(async () => {
    if (verifiedProfile) {
      try { await logoutProfile(verifiedProfile); } catch (e) { }
      setVerifiedProfile(null);
      setCodes([]);
      if (sessionTimeout) clearTimeout(sessionTimeout);
    }
  }, [verifiedProfile, sessionTimeout]);

  const loadData = useCallback(async (profile) => {
    try {
      const res = await fetchCodes(profile);
      setCodes(res.data.codes || []);
    } catch (err) {
      if (err.response?.status === 403) handleLogout();
    }
  }, [handleLogout]);

  // Session timer logic
  const startSessionTimer = useCallback((remainingSeconds) => {
    if (sessionTimeout) clearTimeout(sessionTimeout);
    if (remainingSeconds > 0) {
      const timeout = setTimeout(() => {
        console.warn('Session expired. Logging out...');
        handleLogout();
      }, remainingSeconds * 1000);
      setSessionTimeout(timeout);
    }
  }, [handleLogout, sessionTimeout]);

  // Check existing session on mount
  useEffect(() => {
    const init = async () => {
      try {
        const { data: profiles } = await fetchProfiles();
        for (const p of profiles) {
          const { data: session } = await checkSession(p);
          if (session.verified) {
            setVerifiedProfile(p);
            loadData(p);
            startSessionTimer(session.remaining);
            break;
          }
        }
      } catch (err) {
        console.error('Init failed:', err);
      } finally {
        setLoading(false);
      }
    };
    init();
    return () => { if (sessionTimeout) clearTimeout(sessionTimeout); };
  }, []); // Only on mount

  // Handle new messages from SSE
  useSSE(verifiedProfile, (data) => {
    setIsConnected(true);
    loadData(verifiedProfile);
    // You could add a toast notification here
  });

  const handleVerified = async (profile, token) => {
    const { data } = await verifyTOTP(profile, token);
    setVerifiedProfile(profile);
    loadData(profile);
    startSessionTimer(data.remaining);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="animate-spin text-primary" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans selection:bg-primary/30">
      <Header
        profile={verifiedProfile}
        onLogout={handleLogout}
        isConnected={!!verifiedProfile}
      />

      <main className="pt-28 pb-12 px-6 max-w-7xl mx-auto">
        <AnimatePresence mode="wait">
          {!verifiedProfile ? (
            <div key="verify" className="flex items-center justify-center py-20">
              <VerificationCard onVerified={handleVerified} />
            </div>
          ) : (
            <motion.div
              key="codes"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <h1 className="text-3xl font-black tracking-tight">
                  实时验证码
                </h1>
                <div className="bg-white/5 px-4 py-2 rounded-xl text-xs font-bold text-gray-500 uppercase tracking-widest border border-white/5">
                  已同步 {codes.length} 条
                </div>
              </div>

              {codes.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {codes.map((item, idx) => (
                    <CodeCard
                      key={`${item.timestamp}-${idx}`}
                      code={item.code}
                      sender={item.sender}
                      timestamp={item.timestamp}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-40 text-gray-500 gap-4 glass-card rounded-3xl">
                  <PackageOpen size={64} className="opacity-20" />
                  <p className="font-medium">暂无验证码，请在手机端发送后重试</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

export default App;
