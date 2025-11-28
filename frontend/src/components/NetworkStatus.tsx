import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function NetworkStatus() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  const isWrongNetwork = isConnected && chainId !== sepolia.id;

  if (!isWrongNetwork) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="bg-yellow-50 border-l-4 border-yellow-400 p-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-yellow-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-yellow-800">
                网络错误
              </p>
              <p className="text-xs text-yellow-700 mt-1">
                请切换到 Sepolia 测试网络
              </p>
            </div>
          </div>
          {switchChain && (
            <button
              onClick={() => switchChain({ chainId: sepolia.id })}
              className="ml-4 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              切换网络
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
