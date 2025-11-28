import { useState, useEffect } from 'react';
import { useAccount, useContractWrite, useWaitForTransactionReceipt, useContractRead, useChainId, useSwitchChain, useWatchContractEvent, usePublicClient } from 'wagmi';
import { RED_PACKET_ADDRESS, RED_PACKET_ABI } from '@/constants/contracts';
import { motion } from 'framer-motion';
import { Gift, CheckCircle, AlertCircle } from 'lucide-react';
import { formatEther } from 'viem';

export default function ClaimPacket() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const publicClient = usePublicClient();
  const isSepolia = chainId === 11155111;
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [claimedAmount, setClaimedAmount] = useState<string>('');
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const { writeContract, data: hash, isPending, reset } = useContractWrite();
  const { isLoading: isConfirming, isSuccess, isError } = useWaitForTransactionReceipt({ hash });

  const { data: redPacketInfo, refetch: refetchRedPacketInfo } = useContractRead({
    address: RED_PACKET_ADDRESS,
    abi: RED_PACKET_ABI,
    functionName: 'getRedPacketInfo',
    args: id ? [BigInt(id)] : undefined,
    query: { enabled: !!id },
  });

  // 监听领取红包事件
  useWatchContractEvent({
    address: RED_PACKET_ADDRESS,
    abi: RED_PACKET_ABI,
    eventName: 'RedPacketClaimed',
    onLogs(logs) {
      logs.forEach((log) => {
        const { packetId, claimer, amount } = log.args;
        if (claimer === address && packetId?.toString() === id) {
          const amountETH = formatEther(amount || BigInt(0));
          setClaimedAmount(amountETH);

          // 触发自定义事件，通知交易记录组件更新
          window.dispatchEvent(new CustomEvent('redPacketClaimed', {
            detail: {
              packetId,
              claimer,
              amount: amountETH,
            }
          }));
        }
      });
    },
  });

  const handleClaimRedPacket = async (e: React.FormEvent) => {
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
    if (!id || !password) {
      setErrorMessage('请填写红包ID和口令');
      return;
    }

    try {
      setHasSubmitted(true);
      reset();
      writeContract({
        address: RED_PACKET_ADDRESS,
        abi: RED_PACKET_ABI,
        functionName: 'claimRedPacket',
        args: [BigInt(id), password],
      });
    } catch (error: any) {
      console.error('领取红包失败:', error);
      let message = '领取红包失败';

      // 友好的错误提示
      const errorStr = error?.message || error?.toString() || '';
      if (errorStr.includes('user rejected') || errorStr.includes('User rejected')) {
        message = '您取消了交易';
      } else if (errorStr.includes('insufficient funds')) {
        message = '钱包余额不足（需要少量 Gas 费用）';
      } else if (errorStr.includes('Invalid password')) {
        message = '口令错误，请检查后重试';
      } else if (errorStr.includes('Already claimed')) {
        message = '您已经领取过这个红包了';
      } else if (errorStr.includes('No red packets remaining')) {
        message = '红包已被抢完，下次早点来哦';
      } else if (errorStr.includes('Red packet has expired')) {
        message = '红包已过期';
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
      // 获取交易回执以获取领取的金额
      const fetchReceipt = async () => {
        try {
          const receipt = await publicClient?.getTransactionReceipt({ hash });
          if (receipt?.logs) {
            // 解析日志获取领取金额
            receipt.logs.forEach((log) => {
              if (log.address.toLowerCase() === RED_PACKET_ADDRESS.toLowerCase()) {
                try {
                  // 刷新红包信息
                  refetchRedPacketInfo();
                } catch (err) {
                  console.error('解析日志失败:', err);
                }
              }
            });
          }
        } catch (err) {
          console.error('获取交易回执失败:', err);
        }
      };

      fetchReceipt();
      setShowSuccess(true);

      // 2秒后重置表单
      setTimeout(() => {
        setShowSuccess(false);
        setClaimedAmount('');
        setId('');
        setPassword('');
      }, 3000);
    }
  }, [isSuccess, hash, publicClient, refetchRedPacketInfo]);

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
              <div className="font-semibold text-green-800">领取成功！</div>
              {claimedAmount && (
                <div className="text-sm text-green-700 mt-1">
                  获得 {Number(claimedAmount).toFixed(4)} ETH
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
              <div className="font-semibold text-red-800">领取失败</div>
              <div className="text-sm text-red-700 mt-1">{errorMessage}</div>
            </div>
          </div>
        </motion.div>
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