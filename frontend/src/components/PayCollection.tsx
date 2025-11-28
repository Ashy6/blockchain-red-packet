import { useState, useEffect } from 'react';
import { useAccount, useContractWrite, useWaitForTransactionReceipt, useChainId, useSwitchChain } from 'wagmi';
import { parseEther } from 'viem';
import { RED_PACKET_ADDRESS, RED_PACKET_ABI } from '@/constants/contracts';
import { motion } from 'framer-motion';
import { CreditCard } from 'lucide-react';

export default function PayCollection() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const isSepolia = chainId === 11155111;

  const [collectionId, setCollectionId] = useState('');
  const [amount, setAmount] = useState('');
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const { writeContract, data: hash, isPending, reset } = useContractWrite();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected || !address) { alert('请先连接钱包'); return; }
    if (!isSepolia) { alert('请切换到 Sepolia 网络'); return; }
    if (!collectionId || !amount) { alert('请填写收款ID和金额'); return; }
    try {
      setHasSubmitted(true);
      reset();
      writeContract({
        address: RED_PACKET_ADDRESS,
        abi: RED_PACKET_ABI,
        functionName: 'payCollection',
        args: [BigInt(collectionId), ''],
        value: parseEther(amount),
      });
    } catch (error) {
      console.error('付款失败:', error);
      alert('付款失败');
      setHasSubmitted(false);
    }
  };

  useEffect(() => {
    if (!isPending && !isConfirming) {
      setHasSubmitted(false);
    }
  }, [isPending, isConfirming]);

  return (
    <div className="space-y-6">
      {!isSepolia && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="text-sm text-yellow-800">当前网络非 Sepolia（Chain ID: {chainId ?? '未知'}）。请切换到 Sepolia 以进行交互。</div>
          <button type="button" onClick={() => switchChain({ chainId: 11155111 })} className="mt-2 px-3 py-2 text-sm rounded-lg bg-yellow-600 text-white hover:bg-yellow-700">一键切换到 Sepolia</button>
        </div>
      )}

      <motion.form initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} onSubmit={handlePay} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">收款ID</label>
            <input value={collectionId} onChange={(e) => setCollectionId(e.target.value)} placeholder="输入收款ID" className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">金额（ETH）</label>
            <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="例如 0.1" className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
          </div>
        </div>

        <button type="submit" disabled={isConfirming} className="w-full py-3 rounded-lg bg-primary-600 text-white font-semibold hover:bg-primary-700 transition disabled:opacity-60">
          {isPending ? '等待钱包确认...' : hasSubmitted && isConfirming ? '交易确认中...' : '支付'}
        </button>
      </motion.form>
    </div>
  );
}