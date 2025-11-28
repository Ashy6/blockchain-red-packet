import { useState, useEffect } from 'react';
import { useAccount, useContractWrite, useWaitForTransactionReceipt, useContractRead, useChainId, useSwitchChain, useWatchContractEvent, usePublicClient } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { RED_PACKET_ADDRESS, RED_PACKET_ABI } from '@/constants/contracts';
import { motion } from 'framer-motion';
import { CreditCard, CheckCircle, AlertCircle, Users, TrendingUp, Clock } from 'lucide-react';

export default function PayCollection() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const publicClient = usePublicClient();
  const isSepolia = chainId === 11155111;

  const [collectionId, setCollectionId] = useState('');
  const [password, setPassword] = useState('');
  const [amount, setAmount] = useState('');
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [paidAmount, setPaidAmount] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const { writeContract, data: hash, isPending, reset } = useContractWrite();
  const { isLoading: isConfirming, isSuccess, isError } = useWaitForTransactionReceipt({ hash });

  // 查询收款信息
  const { data: collectionInfo, refetch: refetchCollectionInfo } = useContractRead({
    address: RED_PACKET_ADDRESS,
    abi: RED_PACKET_ABI,
    functionName: 'getCollectionInfo',
    args: collectionId ? [BigInt(collectionId)] : undefined,
    query: { enabled: !!collectionId },
  });

  // 计算 AA 收款的每人应付金额
  const calculateAAAmount = () => {
    if (!collectionInfo) return null;
    const collectionType = collectionInfo[1]; // 0=AA, 1=众筹
    if (collectionType !== 0) return null;

    const targetAmount = collectionInfo[2]; // 目标金额
    const targetCount = collectionInfo[3]; // 目标人数

    if (targetCount === BigInt(0)) return null;
    const perPersonAmount = targetAmount / targetCount;
    return formatEther(perPersonAmount);
  };

  // 自动设置 AA 收款金额
  useEffect(() => {
    const aaAmount = calculateAAAmount();
    if (aaAmount && !amount) {
      setAmount(aaAmount);
    }
  }, [collectionInfo]);

  // 监听付款事件
  useWatchContractEvent({
    address: RED_PACKET_ADDRESS,
    abi: RED_PACKET_ABI,
    eventName: 'CollectionPaid',
    onLogs(logs) {
      logs.forEach((log) => {
        const { collectionId: eventCollectionId, contributor, amount: eventAmount } = log.args;
        if (contributor === address && eventCollectionId?.toString() === collectionId) {
          const amountETH = formatEther(eventAmount || BigInt(0));
          setPaidAmount(amountETH);

          // 触发自定义事件，通知交易记录组件更新
          window.dispatchEvent(new CustomEvent('collectionPaid', {
            detail: {
              collectionId: eventCollectionId,
              contributor,
              amount: amountETH,
            }
          }));
        }
      });
    },
  });

  const handlePay = async (e: React.FormEvent) => {
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
    if (!collectionId || !amount) {
      setErrorMessage('请填写收款ID和金额');
      return;
    }

    // AA 收款金额验证
    const aaAmount = calculateAAAmount();
    if (aaAmount && amount !== aaAmount) {
      setErrorMessage(`AA 收款需要支付固定金额: ${aaAmount} ETH`);
      return;
    }

    try {
      setHasSubmitted(true);
      reset();
      writeContract({
        address: RED_PACKET_ADDRESS,
        abi: RED_PACKET_ABI,
        functionName: 'payCollection',
        args: [BigInt(collectionId), password],
        value: parseEther(amount),
      });
    } catch (error: any) {
      console.error('付款失败:', error);
      let message = '付款失败';

      const errorStr = error?.message || error?.toString() || '';
      if (errorStr.includes('user rejected') || errorStr.includes('User rejected')) {
        message = '您取消了交易';
      } else if (errorStr.includes('insufficient funds')) {
        message = '钱包余额不足';
      } else if (errorStr.includes('Invalid password')) {
        message = '口令错误，请检查后重试';
      } else if (errorStr.includes('Already paid')) {
        message = '您已经支付过了';
      } else if (errorStr.includes('Must pay exact AA amount')) {
        message = `AA 收款需要支付固定金额: ${aaAmount} ETH`;
      } else if (errorStr.includes('Collection has expired')) {
        message = '收款已过期';
      } else if (errorStr.includes('Collection already completed')) {
        message = '收款已完成';
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
      const fetchReceipt = async () => {
        try {
          const receipt = await publicClient?.getTransactionReceipt({ hash });
          if (receipt?.logs) {
            receipt.logs.forEach((log) => {
              if (log.address.toLowerCase() === RED_PACKET_ADDRESS.toLowerCase()) {
                try {
                  refetchCollectionInfo();
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

      setTimeout(() => {
        setShowSuccess(false);
        setPaidAmount('');
        setCollectionId('');
        setPassword('');
        setAmount('');
      }, 3000);
    }
  }, [isSuccess, hash, publicClient, refetchCollectionInfo]);

  // 交易失败后的处理
  useEffect(() => {
    if (isError) {
      setErrorMessage('交易失败，请重试');
      setHasSubmitted(false);
    }
  }, [isError]);

  // 收款信息显示
  const renderCollectionInfo = () => {
    if (!collectionInfo) return null;

    const collectionType = collectionInfo[1]; // 0=AA, 1=众筹
    const targetAmount = Number(formatEther(collectionInfo[2]));
    const targetCount = Number(collectionInfo[3]);
    const currentAmount = Number(formatEther(collectionInfo[4]));
    const currentCount = Number(collectionInfo[5]);
    const status = collectionInfo[7];

    const isAA = collectionType === 0;
    const progress = isAA
      ? (currentCount / targetCount) * 100
      : (currentAmount / targetAmount) * 100;

    return (
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
        <div className="flex items-center space-x-3 mb-3">
          {isAA ? <Users className="w-6 h-6 text-green-600" /> : <TrendingUp className="w-6 h-6 text-green-600" />}
          <h4 className="font-semibold text-green-900">{isAA ? 'AA 收款' : '众筹收款'} #{collectionId}</h4>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="bg-white rounded-lg p-2">
            <div className="text-xs text-gray-500">
              {isAA ? '目标金额' : '目标金额'}
            </div>
            <div className="text-sm font-bold text-gray-800">
              {targetAmount.toFixed(4)} ETH
            </div>
          </div>
          <div className="bg-white rounded-lg p-2">
            <div className="text-xs text-gray-500">已收金额</div>
            <div className="text-sm font-bold text-gray-800">
              {currentAmount.toFixed(4)} ETH
            </div>
          </div>
          {isAA && (
            <>
              <div className="bg-white rounded-lg p-2">
                <div className="text-xs text-gray-500">目标人数</div>
                <div className="text-sm font-bold text-gray-800">{targetCount} 人</div>
              </div>
              <div className="bg-white rounded-lg p-2">
                <div className="text-xs text-gray-500">已付人数</div>
                <div className="text-sm font-bold text-gray-800">{currentCount} 人</div>
              </div>
              <div className="bg-yellow-50 rounded-lg p-2 col-span-2">
                <div className="text-xs text-gray-500">每人应付</div>
                <div className="text-sm font-bold text-orange-600">
                  {(targetAmount / targetCount).toFixed(4)} ETH
                </div>
              </div>
            </>
          )}
        </div>

        {/* 进度条 */}
        <div className="mb-2">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>进度</span>
            <span>{progress.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-green-400 to-emerald-500 h-2 rounded-full transition-all"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>

        {/* 状态 */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">状态:</span>
          <span
            className={`font-medium px-2 py-1 rounded-full text-xs ${
              status === 0
                ? 'bg-green-100 text-green-700'
                : status === 1
                ? 'bg-gray-100 text-gray-700'
                : 'bg-blue-100 text-blue-700'
            }`}
          >
            {status === 0 ? '🟢 进行中' : status === 1 ? '⏰ 已过期' : '✅ 已完成'}
          </span>
        </div>
      </div>
    );
  };

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
              <div className="font-semibold text-green-800">支付成功！</div>
              {paidAmount && (
                <div className="text-sm text-green-700 mt-1">
                  支付 {Number(paidAmount).toFixed(4)} ETH
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
              <div className="font-semibold text-red-800">支付失败</div>
              <div className="text-sm text-red-700 mt-1">{errorMessage}</div>
            </div>
          </div>
        </motion.div>
      )}

      <motion.form initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} onSubmit={handlePay} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">收款ID</label>
          <input
            type="number"
            min="0"
            value={collectionId}
            onChange={(e) => setCollectionId(e.target.value)}
            placeholder="输入收款ID"
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            required
          />
        </div>

        {/* 显示收款信息 */}
        {renderCollectionInfo()}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">口令</label>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="输入口令"
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            金额（ETH）
            {collectionInfo && collectionInfo[1] === 0 && (
              <span className="ml-2 text-xs text-orange-600">
                * AA 收款需支付固定金额
              </span>
            )}
          </label>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="例如 0.1"
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            required
            readOnly={collectionInfo && collectionInfo[1] === 0}
          />
        </div>

        <button
          type="submit"
          disabled={isConfirming}
          className="w-full py-3 rounded-lg bg-primary-600 text-white font-semibold hover:bg-primary-700 transition disabled:opacity-60"
        >
          {isPending ? '等待钱包确认...' : hasSubmitted && isConfirming ? '交易确认中...' : '支付'}
        </button>
      </motion.form>
    </div>
  );
}