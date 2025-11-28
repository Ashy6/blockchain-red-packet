import { useState, useEffect } from 'react';
import { useAccount, useContractWrite, useWaitForTransactionReceipt, useContractRead, useChainId, useSwitchChain } from 'wagmi';
import { RED_PACKET_ADDRESS, RED_PACKET_ABI } from '@/constants/contracts';
import { motion } from 'framer-motion';
import { Gift } from 'lucide-react';

export default function ClaimPacket() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const isSepolia = chainId === 11155111;
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const { writeContract, data: hash, isPending, reset } = useContractWrite();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const { data: redPacketInfo } = useContractRead({
    address: RED_PACKET_ADDRESS,
    abi: RED_PACKET_ABI,
    functionName: 'getRedPacketInfo',
    args: id ? [BigInt(id)] : undefined,
    query: { enabled: !!id },
  });

  const handleClaimRedPacket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected || !address) { alert('请先连接钱包'); return; }
    if (!isSepolia) { alert('请切换到 Sepolia 网络'); return; }
    if (!id || !password) { alert('请填写红包ID和口令'); return; }
    try {
      setHasSubmitted(true);
      reset();
      writeContract({
        address: RED_PACKET_ADDRESS,
        abi: RED_PACKET_ABI,
        functionName: 'claimRedPacket',
        args: [BigInt(id), password],
      });
    } catch (error) {
      console.error('领取红包失败:', error);
      alert('领取红包失败');
      setHasSubmitted(false);
    }
  };

  useEffect(() => {
    if (!isPending && !isConfirming) {
      setHasSubmitted(false);
    }
  }, [isPending, isConfirming]);

  if (isSuccess && !showSuccess) {
    setShowSuccess(true);
    setTimeout(() => { setShowSuccess(false); setId(''); setPassword(''); }, 2000);
  }

  return (
    <div className="space-y-6">
      {!isSepolia && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="text-sm text-yellow-800">当前网络非 Sepolia（Chain ID: {chainId ?? '未知'}）。请切换到 Sepolia 以进行交互。</div>
          <button type="button" onClick={() => switchChain({ chainId: 11155111 })} className="mt-2 px-3 py-2 text-sm rounded-lg bg-yellow-600 text-white hover:bg-yellow-700">一键切换到 Sepolia</button>
        </div>
      )}

      <motion.form initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} onSubmit={handleClaimRedPacket} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">红包ID</label>
          <input type="number" min="0" value={id} onChange={(e) => setId(e.target.value)} placeholder="输入红包ID" className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent" required />
        </div>

        {redPacketInfo && (
          <div className="bg-gradient-to-r from-red-50 to-pink-50 p-4 rounded-lg border border-red-200">
            <div className="flex items-center space-x-3 mb-3">
              <Gift className="w-6 h-6 text-red-600" />
              <h4 className="font-semibold text-red-900">红包详情</h4>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-gray-600">类型：</span><span className="font-medium">{redPacketInfo[1] === 0 ? '等额红包' : '随机红包'}</span></div>
              <div><span className="text-gray-600">状态：</span><span className="font-medium">{redPacketInfo[7] === 0 ? '🟢 进行中' : redPacketInfo[7] === 1 ? '🟡 已退款' : '🔴 已完成'}</span></div>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">口令</label>
          <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="输入口令" className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
        </div>

        <button type="submit" disabled={isConfirming} className="w-full py-3 rounded-lg bg-primary-600 text-white font-semibold hover:bg-primary-700 transition disabled:opacity-60">
          {isPending ? '等待钱包确认...' : hasSubmitted && isConfirming ? '交易确认中...' : '抢红包'}
        </button>
      </motion.form>
    </div>
  );
}