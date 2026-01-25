import React from 'react';
import { LogOut, Radio } from 'lucide-react';
import { motion } from 'framer-motion';

const Header = ({ profile, onLogout, isConnected }) => {
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 left-0 right-0 z-50 p-4"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between glass rounded-2xl px-6 py-3 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Radio className="text-primary" size={24} />
            {isConnected && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
            )}
          </div>
          <span className="font-black text-xl tracking-tight hidden sm:inline-block">SMS Code Sync</span>
        </div>

        {profile && (
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">当前用户</span>
              <span className="text-sm font-bold text-gray-200 uppercase">{profile}</span>
            </div>
            <button
              onClick={onLogout}
              className="bg-red-500/10 hover:bg-red-500/20 text-red-500 p-2.5 rounded-xl transition-all border border-red-500/20 active:scale-90"
              title="退出登录"
            >
              <LogOut size={18} />
            </button>
          </div>
        )}
      </div>
    </motion.header>
  );
};

export default Header;
