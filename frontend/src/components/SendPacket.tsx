/**
 * 发送红包
 */
import { useState, useEffect, useRef } from 'react';
import { useAccount, useContractWrite, useWaitForTransactionReceipt, useChainId, useSwitchChain, usePublicClient } from 'wagmi';
import { parseEther, decodeEventLog } from 'viem';
import { RED_PACKET_ADDRESS, RED_PACKET_ABI } from '@/constants/contracts';
import { motion } from 'framer-motion';
import { Gift } from 'lucide-react';

type PacketType = 'equal' | 'random';

export default function SendPacket() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const isSepolia = chainId === 11155111;

  const [packetType, setPacketType] = useState<PacketType>('equal');
  const [amount, setAmount] = useState('');
  const [count, setCount] = useState('');
  const [duration, setDuration] = useState('60');
  const [password, setPassword] = useState('');

  const { writeContractAsync, data: hash, isPending } = useContractWrite();
  const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({ hash });
  const publicClient = usePublicClient();

  const [isTimeout, setIsTimeout] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [createdInfo, setCreatedInfo] = useState<{
    packetId: bigint;
  } | null>(null);

  // 超时与错误处理：当交易等待超过 20 秒，提示用户重试或检查网络
  useEffect(() => {
    if (isPending || isConfirming) {
      setErrorMessage('');
      setIsTimeout(false);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setIsTimeout(true);
        setErrorMessage('交易确认耗时较长，请稍后或重试。');
      }, 20000);
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setIsTimeout(false);
    }
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [isPending, isConfirming]);

  const handleCreateRedPacket = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsTimeout(false);
    setHasSubmitted(true);
    if (!isConnected || !address) {
      alert('请先连接钱包');
      return;
    }
    if (!isSepolia) {
      alert('请切换到 Sepolia 网络');
      return;
    }
    if (!amount || !count || !password) {
      alert('请填写所有必填字段');
      return;
    }
    try {
      await writeContractAsync({
        address: RED_PACKET_ADDRESS,
        abi: RED_PACKET_ABI,
        functionName: 'createRedPacket',
        args: [packetType === 'equal' ? 0 : 1, BigInt(count), BigInt(duration), password],
        value: parseEther(amount),
      });
    } catch (error) {
      console.error('创建红包失败:', error);
      setErrorMessage('创建红包失败');
      setHasSubmitted(false);
    }
  };

  useEffect(() => {
    if (!isPending && !isConfirming) {
      setHasSubmitted(false);
    }
  }, [isPending, isConfirming]);

  useEffect(() => {
    if (!isSuccess || !receipt) return;
    try {
      for (const log of receipt.logs ?? []) {
        try {
          const decoded = decodeEventLog({ abi: RED_PACKET_ABI, data: log.data, topics: log.topics });
          if (decoded.eventName === 'RedPacketCreated') {
            const packetId = decoded.args.packetId as bigint;
            setCreatedInfo({ packetId });
            const detail = {
              packetId: packetId,
              password,
              totalAmount: amount,
              totalCount: Number(count || '0'),
              remainingCount: Number(count || '0'),
              packetType: packetType,
            };
            const evt = new CustomEvent('redPacketCreated', { detail });
            window.dispatchEvent(evt);
            setTimeout(() => {
              setAmount('');
              setCount('');
              setPassword('');
            }, 1500);
            break;
          }
        } catch {}
      }
    } catch {}
  }, [isSuccess, receipt]);

  return (
    <div className="space-y-6">
      {!isSepolia && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="text-sm text-yellow-800">
            当前网络非 Sepolia（Chain ID: {chainId ?? '未知'}）。请切换到 Sepolia 以进行交互。
          </div>
          <button
            type="button"
            onClick={() => switchChain({ chainId: 11155111 })}
            className="mt-2 px-3 py-2 text-sm rounded-lg bg-yellow-600 text-white hover:bg-yellow-700"
          >
            一键切换到 Sepolia
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-sm text-red-800">{errorMessage}</div>
        </div>
      )}
      {isTimeout && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="text-sm text-orange-800">交易等待超时。请检查钱包是否已确认、网络是否拥堵，或稍后重试。</div>
        </div>
      )}

      <motion.form initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} onSubmit={handleCreateRedPacket} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">红包类型</label>
          <div className="grid grid-cols-2 gap-4">
            <button type="button" onClick={() => setPacketType('equal')} className={`p-4 rounded-lg border-2 transition-all ${packetType === 'equal' ? 'border-primary-600 bg-primary-50' : 'border-gray-200 hover:border-primary-300'}`}>
              <Gift className="w-6 h-6 mx-auto mb-2 text-primary-600" />
              <div className="text-sm font-semibold">等额红包</div>
              <div className="text-xs text-gray-500">每人金额相同</div>
            </button>
            <button type="button" onClick={() => setPacketType('random')} className={`p-4 rounded-lg border-2 transition-all ${packetType === 'random' ? 'border-primary-600 bg-primary-50' : 'border-gray-200 hover:border-primary-300'}`}>
              <Gift className="w-6 h-6 mx-auto mb-2 text-primary-600" />
              <div className="text-sm font-semibold">随机红包</div>
              <div className="text-xs text-gray-500">金额随机分配</div>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">总金额（ETH）</label>
            <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="例如 0.5" className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">红包个数</label>
            <input value={count} onChange={(e) => setCount(e.target.value)} placeholder="例如 5" className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
          </div>
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
          {isPending ? '等待钱包确认...' : hasSubmitted && isConfirming ? '交易确认中...' : '发红包'}
        </button>
        {createdInfo && (
          <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="text-sm text-green-800">
              红包已创建：ID #{createdInfo.packetId.toString()}，口令：{password || '（无）'}
            </div>
          </div>
        )}
      </motion.form>
    </div>
  );
}