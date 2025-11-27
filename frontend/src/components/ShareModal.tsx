import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Share2, Check } from 'lucide-react';
import { generateShareText, copyToClipboard } from '@/utils/helpers';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  id: bigint;
  type: 'redpacket' | 'collection';
  password: string;
}

export default function ShareModal({
  isOpen,
  onClose,
  id,
  type,
  password,
}: ShareModalProps) {
  const [copied, setCopied] = useState(false);

  const shareText = generateShareText(id, type, password);

  const handleCopy = async () => {
    const success = await copyToClipboard(shareText);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: type === 'redpacket' ? '区块链红包' : '区块链收款',
          text: shareText,
        });
      } catch (err) {
        // 用户取消分享
      }
    } else {
      // 降级到复制
      handleCopy();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 标题 */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800 flex items-center">
                <Share2 className="w-6 h-6 mr-2 text-primary-600" />
                分享{type === 'redpacket' ? '红包' : '收款'}
              </h3>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* 分享信息 */}
            <div className="bg-gradient-to-br from-primary-50 to-pink-50 rounded-lg p-4 mb-4">
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">ID:</span>
                  <span className="font-mono font-semibold text-primary-600">
                    {id.toString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">口令:</span>
                  <span className="font-semibold text-primary-600">
                    {password}
                  </span>
                </div>
              </div>
            </div>

            {/* 分享文本 */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
                {shareText}
              </pre>
            </div>

            {/* 按钮 */}
            <div className="flex space-x-3">
              <button
                onClick={handleCopy}
                className="flex-1 flex items-center justify-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-4 rounded-lg font-semibold transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-5 h-5 text-green-600" />
                    <span className="text-green-600">已复制</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5" />
                    <span>复制</span>
                  </>
                )}
              </button>
              <button
                onClick={handleShare}
                className="flex-1 flex items-center justify-center space-x-2 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white py-3 px-4 rounded-lg font-semibold transition-all"
              >
                <Share2 className="w-5 h-5" />
                <span>分享</span>
              </button>
            </div>

            {/* 提示 */}
            <p className="text-xs text-gray-500 text-center mt-4">
              将此信息发送给朋友，他们就可以领取您的
              {type === 'redpacket' ? '红包' : '收款'}啦！
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
