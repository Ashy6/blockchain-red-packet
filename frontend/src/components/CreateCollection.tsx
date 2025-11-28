import { useState, useEffect } from 'react';
import { useAccount, useContractWrite, useWaitForTransactionReceipt, useChainId, useSwitchChain, useWatchContractEvent, usePublicClient } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { RED_PACKET_ADDRESS, RED_PACKET_ABI } from '@/constants/contracts';
import { motion } from 'framer-motion';
import { Users, CheckCircle, AlertCircle } from 'lucide-react';

type CollectionType = 'aa' | 'crowdfund';

export default function CreateCollection() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const publicClient = usePublicClient();
  const isSepolia = chainId === 11155111;

  const [collectionType, setCollectionType] = useState<CollectionType>('aa');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetCount, setTargetCount] = useState('');
  const [duration, setDuration] = useState('60');
  const [password, setPassword] = useState('');
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdCollectionId, setCreatedCollectionId] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const { writeContract, data: hash, isPending, reset } = useContractWrite();
  const { isLoading: isConfirming, isSuccess, isError } = useWaitForTransactionReceipt({ hash });

  // 监听收款创建事件
  useWatchContractEvent({
    address: RED_PACKET_ADDRESS,
    abi: RED_PACKET_ABI,
    eventName: 'CollectionCreated',
    onLogs(logs) {
      logs.forEach((log) => {
        const { collectionId, creator } = log.args;
        if (creator === address && collectionId) {
          setCreatedCollectionId(collectionId.toString());

          // 触发自定义事件通知记录列表更新
          window.dispatchEvent(new CustomEvent('collectionCreated', {
            detail: {
              collectionId,
              password,
              targetAmount,
              targetCount: collectionType === 'aa' ? targetCount : '0',
              collectionType,
            }
          }));
        }
      });
    },
  });

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!isConnected || !address) {
      setErrorMessage('请先连接钱包');
      return;
    }
    if (!isSepolia) {
      setErrorMessage('请切换到 Sepolia 网络');
      return;
    }
    if (!targetAmount || !password) {
      setErrorMessage('请填写所有必填字段');
      return;
    }
    if (collectionType === 'aa' && !targetCount) {
      setErrorMessage('AA模式需要填写目标人数');
      return;
    }

    try {
      setHasSubmitted(true);
      reset();
      writeContract({
        address: RED_PACKET_ADDRESS,
        abi: RED_PACKET_ABI,
        functionName: 'createCollection',
        args: [
          collectionType === 'aa' ? 0 : 1,
          parseEther(targetAmount),
          collectionType === 'aa' ? BigInt(targetCount || '0') : BigInt(0),
          BigInt(duration),
          password,
        ],
      });
    } catch (error: any) {
      console.error('创建收款失败:', error);
      let message = '创建收款失败';

      const errorStr = error?.message || error?.toString() || '';
      if (errorStr.includes('user rejected') || errorStr.includes('User rejected')) {
        message = '您取消了交易';
      } else if (errorStr.includes('insufficient funds')) {
        message = '钱包余额不足（需要少量 Gas 费用）';
      } else if (error?.shortMessage) {
        message = error.shortMessage;
      }

      setErrorMessage(message);
      setHasSubmitted(false);
    }
  };

  // 处理交易状态变化
  useEffect(() => {
    if (!isPending && !isConfirming) {
      setHasSubmitted(false);
    }
  }, [isPending, isConfirming]);

  // 交易成功后的处理
  useEffect(() => {
    if (isSuccess && hash) {
      setShowSuccess(true);

      setTimeout(() => {
        setShowSuccess(false);
        setCreatedCollectionId('');
        setTargetAmount('');
        setTargetCount('');
        setPassword('');
      }, 3000);
    }
  }, [isSuccess, hash]);

  // 交易失败后的处理
  useEffect(() => {
    if (isError) {
      setErrorMessage('交易失败，请重试');
      setHasSubmitted(false);
    }
  }, [isError]);

  return (
    <div className="space-y-6">
      {/* 网络提示 */}
      {!isSepolia && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="text-sm text-yellow-800">当前网络非 Sepolia（Chain ID: {chainId ?? '未知'}）。请切换到 Sepolia 以进行交互。</div>
          <button type="button" onClick={() => switchChain({ chainId: 11155111 })} className="mt-2 px-3 py-2 text-sm rounded-lg bg-yellow-600 text-white hover:bg-yellow-700">一键切换到 Sepolia</button>
        </div>
      )}

      {/* 成功提示 */}
      {showSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="bg-green-50 border border-green-200 rounded-lg p-4"
        >
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <div>
              <div className="font-semibold text-green-800">创建成功！</div>
              {createdCollectionId && (
                <div className="text-sm text-green-700 mt-1">
                  收款 ID: #{createdCollectionId}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* 错误提示 */}
      {errorMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 rounded-lg p-4"
        >
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-6 h-6 text-red-600" />
            <div>
              <div className="font-semibold text-red-800">创建失败</div>
              <div className="text-sm text-red-700 mt-1">{errorMessage}</div>
            </div>
          </div>
        </motion.div>
      )}

      <motion.form initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} onSubmit={handleCreateCollection} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">收款类型</label>
          <div className="grid grid-cols-2 gap-4">
            <button type="button" onClick={() => setCollectionType('aa')} className={`p-4 rounded-lg border-2 transition-all ${collectionType === 'aa' ? 'border-primary-600 bg-primary-50' : 'border-gray-200 hover:border-primary-300'}`}>
              <Users className="w-6 h-6 mx-auto mb-2 text-primary-600" />
              <div className="text-sm font-semibold">AA 收款</div>
              <div className="text-xs text-gray-500">按目标人数固定金额</div>
            </button>
            <button type="button" onClick={() => setCollectionType('crowdfund')} className={`p-4 rounded-lg border-2 transition-all ${collectionType === 'crowdfund' ? 'border-primary-600 bg-primary-50' : 'border-gray-200 hover:border-primary-300'}`}>
              <Users className="w-6 h-6 mx-auto mb-2 text-primary-600" />
              <div className="text-sm font-semibold">众筹收款</div>
              <div className="text-xs text-gray-500">达到目标金额即结算</div>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">目标金额（ETH）</label>
            <input value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} placeholder="例如 1.0" className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
          </div>
          {collectionType === 'aa' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">目标人数</label>
              <input value={targetCount} onChange={(e) => setTargetCount(e.target.value)} placeholder="例如 3" className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">有效时长（分钟）</label>
            <input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="例如 60" className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">口令</label>
            <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="输入口令" className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
          </div>
        </div>

        <button type="submit" disabled={isConfirming} className="w-full py-3 rounded-lg bg-primary-600 text-white font-semibold hover:bg-primary-700 transition disabled:opacity-60">
          {isPending ? '等待钱包确认...' : hasSubmitted && isConfirming ? '交易确认中...' : '发起收款'}
        </button>
      </motion.form>
    </div>
  );
}