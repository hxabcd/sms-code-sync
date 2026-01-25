import React, { useState } from 'react';
import { MessageSquare, Clock, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CodeCard = ({ code, sender, timestamp }) => {
  const [copied, setCopied] = useState(false);

  const formatRelativeTime = (ts) => {
    const diff = (Date.now() / 1000) - ts;
    if (diff < 60) return '刚刚';
    if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
    return '很久以前';
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="glass-card rounded-2xl p-6 relative group overflow-hidden"
    >
      <div className="flex items-center gap-3 mb-4 text-gray-400">
        <div className="bg-white/5 p-2 rounded-lg">
          <MessageSquare size={18} />
        </div>
        <span className="font-semibold text-sm truncate">{sender || '未知发送者'}</span>
      </div>

      <div className="flex flex-col items-center gap-2">
        <div className="text-5xl font-black tracking-widest text-primary mb-2 font-mono">
          {code}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <Clock size={12} />
          {formatRelativeTime(timestamp)}
        </div>
      </div>

      <button
        onClick={handleCopy}
        className={`mt-6 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
          copied 
          ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
          : 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10'
        }`}
      >
        {copied ? (
          <>
            <Check size={16} /> 已复制
          </>
        ) : (
          <>
            <Copy size={16} /> 复制验证码
          </>
        )}
      </button>

      {/* Hover background effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </motion.div>
  );
};

export default CodeCard;
