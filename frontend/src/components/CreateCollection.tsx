import { useState, useEffect } from 'react';
import { useAccount, useContractWrite, useWaitForTransactionReceipt, useChainId, useSwitchChain } from 'wagmi';
import { parseEther } from 'viem';
import { RED_PACKET_ADDRESS, RED_PACKET_ABI } from '@/constants/contracts';
import { motion } from 'framer-motion';
import { Users } from 'lucide-react';

type CollectionType = 'aa' | 'crowdfund';

export default function CreateCollection() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const isSepolia = chainId === 11155111;

  const [collectionType, setCollectionType] = useState<CollectionType>('aa');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetCount, setTargetCount] = useState('');
  const [duration, setDuration] = useState('60');
  const [password, setPassword] = useState('');
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const { write, data: hash, isPending, reset } = useContractWrite();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected || !address) { alert('请先连接钱包'); return; }
    if (!isSepolia) { alert('请切换到 Sepolia 网络'); return; }
    if (!targetAmount || !password) { alert('请填写所有必填字段'); return; }
    if (collectionType === 'aa' && !targetCount) { alert('AA模式需要填写目标人数'); return; }

    try {
      setHasSubmitted(true);
      reset();
      write({
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
    } catch (error) {
      console.error('创建收款失败:', error);
      alert('创建收款失败');
      setHasSubmitted(false);
    }
  };

  useEffect(() => {
    if (!isPending && !isConfirming) {
      setHasSubmitted(false);
    }
  }, [isPending, isConfirming]);

  if (isSuccess) {
    setTimeout(() => { setTargetAmount(''); setTargetCount(''); setPassword(''); }, 1500);
  }

  return (
    <div className="space-y-6">
      {!isSepolia && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="text-sm text-yellow-800">当前网络非 Sepolia（Chain ID: {chainId ?? '未知'}）。请切换到 Sepolia 以进行交互。</div>
          <button type="button" onClick={() => switchChain({ chainId: 11155111 })} className="mt-2 px-3 py-2 text-sm rounded-lg bg-yellow-600 text-white hover:bg-yellow-700">一键切换到 Sepolia</button>
        </div>
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