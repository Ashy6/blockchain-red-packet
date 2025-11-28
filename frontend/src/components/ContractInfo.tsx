import { useState } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, Copy, Check, Shield } from 'lucide-react';
import { RED_PACKET_ADDRESS } from '@/constants/contracts';
import { copyToClipboard, getVerificationLink, getExplorerLink } from '@/utils/helpers';
import { useChainId } from 'wagmi';

export default function ContractInfo() {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const chainId = useChainId();
  const networkName = chainId === 11155111 ? 'Sepolia' : chainId === 1 ? 'Mainnet' : chainId === 31337 ? 'Hardhat' : `Chain ${chainId ?? '未知'}`;

  const handleCopy = async () => {
    const success = await copyToClipboard(RED_PACKET_ADDRESS);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-2xl overflow-hidden"
    >
      {/* 标题 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 flex items-center justify-between hover:from-blue-700 hover:to-purple-700 transition-all"
      >
        <div className="flex items-center space-x-2">
          <Shield className="w-5 h-5 text-white" />
          <h3 className="text-lg font-bold text-white">合约信息</h3>
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.3 }}
          className="text-white"
        >
          ▼
        </motion.div>
      </button>

      {/* 内容 */}
      <motion.div
        initial={false}
        animate={{ height: isExpanded ? 'auto' : 0 }}
        className="overflow-hidden"
      >
        <div className="p-6 space-y-4">
          {/* 合约地址 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              合约地址
            </label>
            <div className="flex items-center space-x-2">
              <code className="flex-1 bg-gray-100 px-3 py-2 rounded-lg text-sm font-mono overflow-x-auto">
                {RED_PACKET_ADDRESS}
              </code>
              <button
                onClick={handleCopy}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="复制地址"
              >
                {copied ? (
                  <Check className="w-5 h-5 text-green-600" />
                ) : (
                  <Copy className="w-5 h-5 text-gray-600" />
                )}
              </button>
            </div>
          </div>

          {/* 网络信息 */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">网络:</span>
              <span className="ml-2 font-semibold">{networkName}</span>
            </div>
            <div>
              <span className="text-gray-600">Chain ID:</span>
              <span className="ml-2 font-semibold">{chainId ?? '未知'}</span>
            </div>
          </div>

          {/* 验证链接 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              合约验证
            </label>
            <div className="space-y-2">
              <a
                href={getVerificationLink('blockscout')}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors group"
              >
                <div className="flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-900">
                    Blockscout 验证
                  </span>
                </div>
                <ExternalLink className="w-4 h-4 text-green-600 group-hover:translate-x-1 transition-transform" />
              </a>

              <a
                href={getVerificationLink('sourcify')}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors group"
              >
                <div className="flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">
                    Sourcify 验证
                  </span>
                </div>
                <ExternalLink className="w-4 h-4 text-blue-600 group-hover:translate-x-1 transition-transform" />
              </a>

              <a
                href={getExplorerLink('address', RED_PACKET_ADDRESS)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors group"
              >
                <div className="flex items-center space-x-2">
                  <ExternalLink className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-medium text-purple-900">
                    Etherscan 浏览器
                  </span>
                </div>
                <ExternalLink className="w-4 h-4 text-purple-600 group-hover:translate-x-1 transition-transform" />
              </a>
            </div>
          </div>

          {/* 获取测试 ETH */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-yellow-900 mb-2">
              💰 获取测试 ETH
            </h4>
            <p className="text-xs text-yellow-800 mb-2">
              在 Sepolia 测试网使用需要测试 ETH，可以从以下水龙头获取：
            </p>
            <div className="space-y-1">
              <a
                href="https://sepoliafaucet.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-xs text-blue-600 hover:text-blue-800 hover:underline"
              >
                • Alchemy Faucet
              </a>
              <a
                href="https://www.infura.io/faucet/sepolia"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-xs text-blue-600 hover:text-blue-800 hover:underline"
              >
                • Infura Faucet
              </a>
              <a
                href="https://faucets.chain.link/sepolia"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-xs text-blue-600 hover:text-blue-800 hover:underline"
              >
                • Chainlink Faucet
              </a>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
