import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseEther } from 'viem';
import { RED_PACKET_ADDRESS, RED_PACKET_ABI } from '@/constants/contracts';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, DollarSign } from 'lucide-react';

type ClaimMode = 'redpacket' | 'collection';

export default function ClaimRedPacket() {
  const { address, isConnected } = useAccount();
  const [mode, setMode] = useState<ClaimMode>('redpacket');
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  // 查询红包信息
  const { data: redPacketInfo } = useReadContract({
    address: RED_PACKET_ADDRESS,
    abi: RED_PACKET_ABI,
    functionName: 'getRedPacketInfo',
    args: id ? [BigInt(id)] : undefined,
    query: {
      enabled: mode === 'redpacket' && !!id,
    },
  });

  // 查询收款信息
  const { data: collectionInfo } = useReadContract({
    address: RED_PACKET_ADDRESS,
    abi: RED_PACKET_ABI,
    functionName: 'getCollectionInfo',
    args: id ? [BigInt(id)] : undefined,
    query: {
      enabled: mode === 'collection' && !!id,
    },
  });

  const handleClaimRedPacket = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isConnected || !address) {
      alert('请先连接钱包');
      return;
    }

    if (!id || !password) {
      alert('请填写红包ID和口令');
      return;
    }

    try {
      writeContract({
        address: RED_PACKET_ADDRESS,
        abi: RED_PACKET_ABI,
        functionName: 'claimRedPacket',
        args: [BigInt(id), password],
      });
    } catch (error) {
      console.error('领取红包失败:', error);
      alert('领取红包失败');
    }
  };

  const handlePayCollection = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isConnected || !address) {
      alert('请先连接钱包');
      return;
    }

    if (!id || !password) {
      alert('请填写收款ID和口令');
      return;
    }

    if (!payAmount) {
      alert('请填写支付金额');
      return;
    }

    try {
      writeContract({
        address: RED_PACKET_ADDRESS,
        abi: RED_PACKET_ABI,
        functionName: 'payCollection',
        args: [BigInt(id), password],
        value: parseEther(payAmount),
      });
    } catch (error) {
      console.error('支付失败:', error);
      alert('支付失败');
    }
  };

  if (isSuccess && !showSuccess) {
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      setId('');
      setPassword('');
      setPayAmount('');
    }, 3000);
  }

  return (
    <div className="space-y-6">
      {/* 成功动画 */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 10, 0] }}
              transition={{ duration: 0.5, repeat: 2 }}
              className="bg-white rounded-3xl p-12 shadow-2xl text-center"
            >
              <div className="text-8xl mb-4">🎉</div>
              <h3 className="text-3xl font-bold text-primary-600 mb-2">
                {mode === 'redpacket' ? '领取成功！' : '支付成功！'}
              </h3>
              <p className="text-gray-600">
                {mode === 'redpacket'
                  ? '恭喜你抢到红包！'
                  : '收款已记录！'}
              </p>
            </motion.div>
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
          领红包 🎁
        </button>
        <button
          onClick={() => setMode('collection')}
          className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
            mode === 'collection'
              ? 'bg-primary-600 text-white shadow-lg'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          参与收款 💳
        </button>
      </div>

      {mode === 'redpacket' ? (
        /* 领红包表单 */
        <motion.form
          key="claim"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleClaimRedPacket}
          className="space-y-4"
        >
          {/* 红包ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              红包ID <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder="输入红包ID"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            />
          </div>

          {/* 显示红包信息 */}
          {redPacketInfo && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-gradient-to-r from-red-50 to-pink-50 p-4 rounded-lg border border-red-200"
            >
              <div className="flex items-center space-x-3 mb-3">
                <Gift className="w-6 h-6 text-red-600" />
                <h4 className="font-semibold text-red-900">红包详情</h4>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-600">类型：</span>
                  <span className="font-medium">
                    {redPacketInfo[1] === 0 ? '等额红包' : '随机红包'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">状态：</span>
                  <span className="font-medium">
                    {redPacketInfo[7] === 0
                      ? '🟢 进行中'
                      : redPacketInfo[7] === 1
                      ? '🔴 已过期'
                      : '✅ 已领完'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">剩余个数：</span>
                  <span className="font-medium text-primary-600">
                    {redPacketInfo[5].toString()} 个
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">总个数：</span>
                  <span className="font-medium">
                    {redPacketInfo[3].toString()} 个
                  </span>
                </div>
              </div>
            </motion.div>
          )}

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
            className="w-full bg-gradient-to-r from-red-600 to-pink-600 text-white py-4 px-6 rounded-lg font-semibold hover:from-red-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {isPending || isConfirming
              ? '领取中...'
              : '🎁 立即领取红包'}
          </button>
        </motion.form>
      ) : (
        /* 参与收款表单 */
        <motion.form
          key="pay"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handlePayCollection}
          className="space-y-4"
        >
          {/* 收款ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              收款ID <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder="输入收款ID"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            />
          </div>

          {/* 显示收款信息 */}
          {collectionInfo && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200"
            >
              <div className="flex items-center space-x-3 mb-3">
                <DollarSign className="w-6 h-6 text-green-600" />
                <h4 className="font-semibold text-green-900">收款详情</h4>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-600">类型：</span>
                  <span className="font-medium">
                    {collectionInfo[1] === 0 ? 'AA收款' : '众筹'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">状态：</span>
                  <span className="font-medium">
                    {collectionInfo[7] === 0
                      ? '🟢 进行中'
                      : collectionInfo[7] === 1
                      ? '🔴 已过期'
                      : '✅ 已完成'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">
                    {collectionInfo[1] === 0 ? '单人金额：' : '目标金额：'}
                  </span>
                  <span className="font-medium text-green-600">
                    {(Number(collectionInfo[2]) / 1e18).toFixed(4)} ETH
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">当前人数：</span>
                  <span className="font-medium">
                    {collectionInfo[5].toString()}
                    {collectionInfo[1] === 0 &&
                      ` / ${collectionInfo[3].toString()}`}
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* 支付金额 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              支付金额 (ETH) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.001"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              placeholder={
                collectionInfo && collectionInfo[1] === 0
                  ? `固定金额: ${(Number(collectionInfo[2]) / 1e18).toFixed(4)}`
                  : '输入任意金额'
              }
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            />
            {collectionInfo && collectionInfo[1] === 0 && (
              <p className="text-xs text-gray-500 mt-1">
                AA模式需支付固定金额：
                {(Number(collectionInfo[2]) / 1e18).toFixed(4)} ETH
              </p>
            )}
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
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-4 px-6 rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {isPending || isConfirming ? '支付中...' : '💳 立即支付'}
          </button>
        </motion.form>
      )}

      {/* 温馨提示 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">💡 温馨提示</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• 每个地址只能领取一次红包</li>
          <li>• 红包过期后剩余金额将退回发起者</li>
          <li>• AA收款未满额也会转给发起者</li>
          <li>• 众筹未达标会自动退款给所有参与者</li>
        </ul>
      </div>
    </div>
  );
}
