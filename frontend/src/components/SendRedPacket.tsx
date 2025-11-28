import { useState, useEffect, useRef } from 'react';
import { useAccount, useContractWrite, useWaitForTransactionReceipt, useChainId, useSwitchChain, usePublicClient } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { RED_PACKET_ADDRESS, RED_PACKET_ABI } from '@/constants/contracts';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Shuffle, Users, DollarSign, Copy, Check } from 'lucide-react';

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

  // 创建成功后的红包信息
  const [createdRedPacket, setCreatedRedPacket] = useState<{
    packetId: string;
    password: string;
    amount: string;
    count: string;
    type: PacketType;
  } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const publicClient = usePublicClient();
  const { writeContract, data: hash, isPending } = useContractWrite();
  const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({
    hash,
    timeout: 60000, // 60秒超时
  });

  // 解析交易成功后的红包 ID
  useEffect(() => {
    if (isSuccess && receipt && mode === 'redpacket') {
      try {
        // 从交易 logs 中解析 RedPacketCreated 事件
        const redPacketCreatedLog = receipt.logs.find(
          (log) =>
            log.address.toLowerCase() === RED_PACKET_ADDRESS.toLowerCase() &&
            log.topics[0] === '0x' + Array.from(
              new TextEncoder().encode('RedPacketCreated(uint256,address,uint8,uint256,uint256,uint256)')
            ).map(b => b.toString(16).padStart(2, '0')).join('')
        );

        if (redPacketCreatedLog && redPacketCreatedLog.topics[1]) {
          // 解析 packetId (第一个 indexed 参数)
          const packetId = BigInt(redPacketCreatedLog.topics[1]).toString();

          // 设置创建的红包信息
          setCreatedRedPacket({
            packetId,
            password,
            amount,
            count,
            type: packetType,
          });

          // 触发自定义事件通知记录列表
          window.dispatchEvent(
            new CustomEvent('redPacketCreated', {
              detail: {
                packetId: BigInt(packetId),
                password,
                totalAmount: amount,
                totalCount: parseInt(count),
                remainingCount: parseInt(count),
                packetType,
              },
            })
          );
        }
      } catch (error) {
        console.error('解析红包ID失败:', error);
      }
    }
  }, [isSuccess, receipt, mode, password, amount, count, packetType]);

  // 复制到剪贴板
  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      console.error('复制失败:', error);
    }
  };

  const handleCreateRedPacket = async (e: React.FormEvent) => {
    e.preventDefault();

    // 清除之前的错误信息和成功提示
    setErrorMessage('');
    setIsTimeout(false);
    setCreatedRedPacket(null);

    if (!isConnected || !address) {
      setErrorMessage('请先连接钱包');
      return;
    }

    if (!isSepolia) {
      setErrorMessage('请切换到 Sepolia 网络');
      return;
    }

    if (!amount || !count || !password) {
      setErrorMessage('请填写所有必填字段');
      return;
    }

    try {
      writeContract({
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
      setErrorMessage('创建红包失败: ' + (error as Error).message);
    }
  };

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();

    // 清除之前的错误信息
    setErrorMessage('');
    setIsTimeout(false);

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
    } catch (error) {
      console.error('创建收款失败:', error);
      setErrorMessage('创建收款失败: ' + (error as Error).message);
    }
  };

  // 成功后延迟清空表单（给用户足够时间复制信息）
  useEffect(() => {
    if (isSuccess && createdRedPacket) {
      setErrorMessage('');
      // 延迟5秒清空表单，让用户有时间复制信息
      const timer = setTimeout(() => {
        setAmount('');
        setCount('');
        setPassword('');
        setTargetAmount('');
        setTargetCount('');
        setCreatedRedPacket(null);
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, createdRedPacket]);

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

      {/* 错误提示 */}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <span className="text-red-600">⚠️</span>
            <span className="text-sm text-red-800">{errorMessage}</span>
          </div>
        </div>
      )}

      {/* 成功提示 - 显示红包ID和口令 */}
      <AnimatePresence>
        {createdRedPacket && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-5 shadow-lg"
          >
            <div className="flex items-center space-x-2 mb-4">
              <span className="text-3xl">🎉</span>
              <div>
                <h3 className="text-lg font-bold text-green-800">红包创建成功！</h3>
                <p className="text-sm text-green-600">请分享红包ID和口令给好友</p>
              </div>
            </div>

            <div className="space-y-3">
              {/* 红包ID */}
              <div className="bg-white rounded-lg p-3 border border-green-200">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="text-xs text-gray-500 mb-1">红包ID</div>
                    <div className="text-lg font-mono font-bold text-gray-800">
                      #{createdRedPacket.packetId}
                    </div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(createdRedPacket.packetId, 'id')}
                    className="ml-2 p-2 hover:bg-green-100 rounded-lg transition-colors"
                  >
                    {copiedField === 'id' ? (
                      <Check className="w-5 h-5 text-green-600" />
                    ) : (
                      <Copy className="w-5 h-5 text-gray-600" />
                    )}
                  </button>
                </div>
              </div>

              {/* 红包口令 */}
              <div className="bg-white rounded-lg p-3 border border-green-200">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="text-xs text-gray-500 mb-1">红包口令</div>
                    <div className="text-lg font-mono font-bold text-gray-800">
                      {createdRedPacket.password}
                    </div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(createdRedPacket.password, 'password')}
                    className="ml-2 p-2 hover:bg-green-100 rounded-lg transition-colors"
                  >
                    {copiedField === 'password' ? (
                      <Check className="w-5 h-5 text-green-600" />
                    ) : (
                      <Copy className="w-5 h-5 text-gray-600" />
                    )}
                  </button>
                </div>
              </div>

              {/* 红包详情 */}
              <div className="bg-white rounded-lg p-3 border border-green-200">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">总金额</div>
                    <div className="text-sm font-bold text-gray-800">
                      {createdRedPacket.amount} ETH
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">红包个数</div>
                    <div className="text-sm font-bold text-gray-800">
                      {createdRedPacket.count} 个
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">类型</div>
                    <div className="text-sm font-bold text-gray-800">
                      {createdRedPacket.type === 'equal' ? '等额' : '随机'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-xs text-center text-gray-500 pt-2">
                💡 提示：此信息将在 8 秒后自动清除
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
