import { useState, useEffect, useRef } from 'react';
import { useAccount, useContractWrite, useWaitForTransactionReceipt, useChainId, useSwitchChain } from 'wagmi';
import { parseEther } from 'viem';
import { RED_PACKET_ADDRESS, RED_PACKET_ABI } from '@/constants/contracts';
import { motion } from 'framer-motion';
import { Gift, Shuffle, Users, DollarSign } from 'lucide-react';

type PacketType = 'equal' | 'random';
type Mode = 'redpacket' | 'collection';
type CollectionType = 'aa' | 'crowdfund';

export default function SendRedPacket() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const isSepolia = chainId === 11155111;
  const [mode, setMode] = useState<Mode>('redpacket');

  // 红包参数
  const [packetType, setPacketType] = useState<PacketType>('equal');
  const [amount, setAmount] = useState('');
  const [count, setCount] = useState('');
  const [duration, setDuration] = useState('60');
  const [password, setPassword] = useState('');

  // 收款参数
  const [collectionType, setCollectionType] = useState<CollectionType>('aa');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetCount, setTargetCount] = useState('');

  // 超时状态
  const [isTimeout, setIsTimeout] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { write, data: hash, isPending, reset } = useContractWrite();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  // 监听 loading 状态，设置10秒超时
  useEffect(() => {
    if (isPending || isConfirming) {
      // 清除之前的定时器
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // 设置10秒超时
      timeoutRef.current = setTimeout(() => {
        setIsTimeout(true);
        setErrorMessage('交易超时，请检查网络连接或稍后重试');
        reset(); // 重置交易状态
      }, 10000);
    } else {
      // 清除定时器
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setIsTimeout(false);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isPending, isConfirming, reset]);

  const handleCreateRedPacket = async (e: React.FormEvent) => {
    e.preventDefault();

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
      write({
        address: RED_PACKET_ADDRESS,
        abi: RED_PACKET_ABI,
        functionName: 'createRedPacket',
        args: [
          packetType === 'equal' ? 0 : 1,
          BigInt(count),
          BigInt(duration),
          password,
        ],
        value: parseEther(amount),
      });
    } catch (error) {
      console.error('创建红包失败:', error);
      alert('创建红包失败');
    }
  };

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isConnected || !address) {
      alert('请先连接钱包');
      return;
    }

    if (!isSepolia) {
      alert('请切换到 Sepolia 网络');
      return;
    }

    if (!targetAmount || !password) {
      alert('请填写所有必填字段');
      return;
    }

    if (collectionType === 'aa' && !targetCount) {
      alert('AA模式需要填写目标人数');
      return;
    }

    try {
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
    }
  };

  if (isSuccess) {
    setTimeout(() => {
      setAmount('');
      setCount('');
      setPassword('');
      setTargetAmount('');
      setTargetCount('');
    }, 2000);
  }

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
      {/* 模式切换 */}
      <div className="flex space-x-4">
        <button
          onClick={() => setMode('redpacket')}
          className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
            mode === 'redpacket'
              ? 'bg-primary-600 text-white shadow-lg'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          发红包 🧧
        </button>
        <button
          onClick={() => setMode('collection')}
          className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
            mode === 'collection'
              ? 'bg-primary-600 text-white shadow-lg'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          发起收款 💰
        </button>
      </div>

      {mode === 'redpacket' ? (
        /* 发红包表单 */
        <motion.form
          key="redpacket"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleCreateRedPacket}
          className="space-y-4"
        >
          {/* 红包类型选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              红包类型
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setPacketType('equal')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  packetType === 'equal'
                    ? 'border-primary-600 bg-primary-50'
                    : 'border-gray-200 hover:border-primary-300'
                }`}
              >
                <Gift className="w-6 h-6 mx-auto mb-2 text-primary-600" />
                <div className="text-sm font-semibold">等额红包</div>
                <div className="text-xs text-gray-500">每人金额相同</div>
              </button>
              <button
                type="button"
                onClick={() => setPacketType('random')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  packetType === 'random'
                    ? 'border-primary-600 bg-primary-50'
                    : 'border-gray-200 hover:border-primary-300'
                }`}
              >
                <Shuffle className="w-6 h-6 mx-auto mb-2 text-primary-600" />
                <div className="text-sm font-semibold">随机红包</div>
                <div className="text-xs text-gray-500">金额随机分配</div>
              </button>
            </div>
          </div>

          {/* 总金额 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              总金额 (ETH) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.001"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.1"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            />
          </div>

          {/* 红包个数 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              红包个数 <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              value={count}
              onChange={(e) => setCount(e.target.value)}
              placeholder="5"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            />
          </div>

          {/* 有效时长 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              有效时长 (分钟)
            </label>
            <input
              type="number"
              min="1"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* 口令 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              红包口令 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="输入红包口令"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            />
          </div>

          {/* 提交按钮 */}
          <button
            type="submit"
            disabled={!isConnected || isPending || isConfirming}
            className="w-full bg-gradient-to-r from-primary-600 to-primary-700 text-white py-4 px-6 rounded-lg font-semibold hover:from-primary-700 hover:to-primary-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {isPending || isConfirming
              ? '创建中...'
              : isSuccess
              ? '✅ 创建成功！'
              : '🧧 立即发红包'}
          </button>
        </motion.form>
      ) : (
        /* 发起收款表单 */
        <motion.form
          key="collection"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleCreateCollection}
          className="space-y-4"
        >
          {/* 收款类型选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              收款类型
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setCollectionType('aa')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  collectionType === 'aa'
                    ? 'border-primary-600 bg-primary-50'
                    : 'border-gray-200 hover:border-primary-300'
                }`}
              >
                <Users className="w-6 h-6 mx-auto mb-2 text-primary-600" />
                <div className="text-sm font-semibold">AA收款</div>
                <div className="text-xs text-gray-500">每人等额支付</div>
              </button>
              <button
                type="button"
                onClick={() => setCollectionType('crowdfund')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  collectionType === 'crowdfund'
                    ? 'border-primary-600 bg-primary-50'
                    : 'border-gray-200 hover:border-primary-300'
                }`}
              >
                <DollarSign className="w-6 h-6 mx-auto mb-2 text-primary-600" />
                <div className="text-sm font-semibold">众筹</div>
                <div className="text-xs text-gray-500">任意金额</div>
              </button>
            </div>
          </div>

          {/* 目标金额 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {collectionType === 'aa' ? '单人金额 (ETH)' : '目标总金额 (ETH)'}{' '}
              <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.001"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              placeholder="0.1"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            />
          </div>

          {/* 目标人数（仅AA模式） */}
          {collectionType === 'aa' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                目标人数 <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={targetCount}
                onChange={(e) => setTargetCount(e.target.value)}
                placeholder="5"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
            </div>
          )}

          {/* 有效时长 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              有效时长 (分钟)
            </label>
            <input
              type="number"
              min="1"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* 口令 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              收款口令 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="输入收款口令"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            />
          </div>

          {/* 提交按钮 */}
          <button
            type="submit"
            disabled={!isConnected || isPending || isConfirming}
            className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-4 px-6 rounded-lg font-semibold hover:from-green-700 hover:to-green-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {isPending || isConfirming
              ? '创建中...'
              : isSuccess
              ? '✅ 创建成功！'
              : '💰 发起收款'}
          </button>
        </motion.form>
      )}
    </div>
  );
}
