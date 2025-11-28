import { useState, useEffect } from 'react';
import { useAccount, useContractRead, useContractWrite, useWaitForTransactionReceipt, useChainId, useSwitchChain } from 'wagmi';
import { RED_PACKET_ADDRESS, RED_PACKET_ABI } from '@/constants/contracts';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Users, TrendingUp, Clock, Zap, RefreshCw, Filter, AlertCircle } from 'lucide-react';
import { formatEther, parseEther } from 'viem';

type FilterType = 'all' | 'redpacket' | 'collection';

export default function RedPacketPool() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const isSepolia = chainId === 11155111;
  const [filter, setFilter] = useState<FilterType>('all');
  const [quickClaimId, setQuickClaimId] = useState<string>('');
  const [quickClaimPassword, setQuickClaimPassword] = useState<string>('');
  const [showQuickClaim, setShowQuickClaim] = useState(false);
  const [claimType, setClaimType] = useState<'redpacket' | 'collection'>('redpacket');

  // 查询红包总数
  const { data: redPacketCount, refetch: refetchRedPacketCount } = useContractRead({
    address: RED_PACKET_ADDRESS,
    abi: RED_PACKET_ABI,
    functionName: 'getRedPacketCount',
  });

  // 查询收款总数
  const { data: collectionCount, refetch: refetchCollectionCount } = useContractRead({
    address: RED_PACKET_ADDRESS,
    abi: RED_PACKET_ABI,
    functionName: 'getCollectionCount',
  });

  const { writeContract, data: hash, isPending, reset } = useContractWrite();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // 自动刷新
  useEffect(() => {
    const interval = setInterval(() => {
      refetchRedPacketCount();
      refetchCollectionCount();
    }, 10000); // 每10秒刷新一次

    return () => clearInterval(interval);
  }, [refetchRedPacketCount, refetchCollectionCount]);

  // 交易成功后刷新
  useEffect(() => {
    if (isSuccess) {
      setTimeout(() => {
        refetchRedPacketCount();
        refetchCollectionCount();
        setShowQuickClaim(false);
        setQuickClaimId('');
        setQuickClaimPassword('');
      }, 2000);
    }
  }, [isSuccess, refetchRedPacketCount, refetchCollectionCount]);

  const handleQuickClaim = async () => {
    if (!isConnected || !address) {
      alert('请先连接钱包');
      return;
    }
    if (!isSepolia) {
      alert('请切换到 Sepolia 网络');
      return;
    }
    if (!quickClaimId) {
      alert('请输入ID');
      return;
    }

    try {
      reset();
      if (claimType === 'redpacket') {
        writeContract({
          address: RED_PACKET_ADDRESS,
          abi: RED_PACKET_ABI,
          functionName: 'claimRedPacket',
          args: [BigInt(quickClaimId), quickClaimPassword],
        });
      } else {
        // 收款需要金额，这里简化处理
        alert('请使用"付款"标签进行支付');
      }
    } catch (error) {
      console.error('快速领取失败:', error);
      alert('操作失败');
    }
  };

  const handleRefresh = () => {
    refetchRedPacketCount();
    refetchCollectionCount();
  };

  const totalRedPackets = Number(redPacketCount || 0);
  const totalCollections = Number(collectionCount || 0);

  return (
    <div className="space-y-6">
      {/* 标题和操作栏 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Zap className="w-7 h-7 mr-2 text-yellow-500" />
            红包池
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            实时展示所有可用的红包和收款
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          title="刷新"
        >
          <RefreshCw className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* 网络提示 */}
      {!isSepolia && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="text-sm text-yellow-800">
            当前网络非 Sepolia（Chain ID: {chainId ?? '未知'}）。请切换到 Sepolia 查看红包池。
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

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-r from-red-500 to-pink-500 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm opacity-90">红包总数</div>
              <div className="text-3xl font-bold mt-1">{totalRedPackets}</div>
            </div>
            <Gift className="w-12 h-12 opacity-80" />
          </div>
        </div>
        <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm opacity-90">收款总数</div>
              <div className="text-3xl font-bold mt-1">{totalCollections}</div>
            </div>
            <Users className="w-12 h-12 opacity-80" />
          </div>
        </div>
        <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm opacity-90">总计</div>
              <div className="text-3xl font-bold mt-1">{totalRedPackets + totalCollections}</div>
            </div>
            <TrendingUp className="w-12 h-12 opacity-80" />
          </div>
        </div>
      </div>

      {/* 过滤器 */}
      <div className="flex items-center space-x-2">
        <Filter className="w-5 h-5 text-gray-500" />
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            filter === 'all'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          全部
        </button>
        <button
          onClick={() => setFilter('redpacket')}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            filter === 'redpacket'
              ? 'bg-red-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          🧧 红包
        </button>
        <button
          onClick={() => setFilter('collection')}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            filter === 'collection'
              ? 'bg-green-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          💰 收款
        </button>
      </div>

      {/* 红包列表 */}
      <div className="space-y-4">
        {(filter === 'all' || filter === 'redpacket') && totalRedPackets > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
              <Gift className="w-5 h-5 mr-2 text-red-500" />
              可领取红包 ({totalRedPackets})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: Math.min(totalRedPackets, 10) }, (_, i) => (
                <RedPacketCard key={`rp-${i}`} packetId={BigInt(i)} />
              ))}
            </div>
          </div>
        )}

        {(filter === 'all' || filter === 'collection') && totalCollections > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
              <Users className="w-5 h-5 mr-2 text-green-500" />
              可参与收款 ({totalCollections})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: Math.min(totalCollections, 10) }, (_, i) => (
                <CollectionCard key={`col-${i}`} collectionId={BigInt(i)} />
              ))}
            </div>
          </div>
        )}

        {totalRedPackets === 0 && totalCollections === 0 && (
          <div className="text-center py-12">
            <AlertCircle className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">红包池暂时为空</p>
            <p className="text-sm text-gray-400 mt-2">创建红包或收款，让它们出现在这里！</p>
          </div>
        )}
      </div>
    </div>
  );
}

// 红包卡片组件
function RedPacketCard({ packetId }: { packetId: bigint }) {
  const { address } = useAccount();
  const { data: packetInfo } = useContractRead({
    address: RED_PACKET_ADDRESS,
    abi: RED_PACKET_ABI,
    functionName: 'getRedPacketInfo',
    args: [packetId],
  });

  if (!packetInfo) return null;

  const totalAmount = Number(formatEther(packetInfo[2]));
  const totalCount = Number(packetInfo[3]);
  const remainingAmount = Number(formatEther(packetInfo[4]));
  const remainingCount = Number(packetInfo[5]);
  const packetType = packetInfo[1] === 0 ? '等额' : '随机';
  const status = packetInfo[7];
  const claimers = packetInfo[8] as `0x${string}`[];

  // 只显示进行中且有剩余的红包
  if (status !== 0 || remainingCount === 0) return null;

  const progress = ((totalCount - remainingCount) / totalCount) * 100;
  const hasClaimed = address && claimers.includes(address);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      className="bg-gradient-to-br from-red-50 to-pink-50 rounded-xl p-4 border-2 border-red-200 hover:border-red-300 transition-all cursor-pointer"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className="text-3xl">🧧</div>
          <div>
            <div className="font-bold text-gray-800">
              {packetType}红包 #{packetId.toString()}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {remainingCount} / {totalCount} 个可领
            </div>
          </div>
        </div>
        {hasClaimed ? (
          <span className="px-2 py-1 bg-gray-200 text-gray-600 text-xs rounded-full">
            已领取
          </span>
        ) : (
          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
            可领取
          </span>
        )}
      </div>

      <div className="mb-3">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-600">剩余金额</span>
          <span className="font-bold text-red-600">{remainingAmount.toFixed(4)} ETH</span>
        </div>
        <div className="w-full bg-red-100 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-red-400 to-pink-500 h-2 rounded-full transition-all"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      </div>

      <a
        href="#"
        onClick={(e) => {
          e.preventDefault();
          const claimTab = document.querySelector('[data-tab="claimPacket"]') as HTMLButtonElement;
          if (claimTab) claimTab.click();
        }}
        className={`block w-full text-center py-2 rounded-lg font-medium transition-all ${
          hasClaimed
            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
            : 'bg-red-500 text-white hover:bg-red-600'
        }`}
      >
        {hasClaimed ? '已领取' : '立即领取'}
      </a>
    </motion.div>
  );
}

// 收款卡片组件
function CollectionCard({ collectionId }: { collectionId: bigint }) {
  const { address } = useAccount();
  const { data: collectionInfo } = useContractRead({
    address: RED_PACKET_ADDRESS,
    abi: RED_PACKET_ABI,
    functionName: 'getCollectionInfo',
    args: [collectionId],
  });

  if (!collectionInfo) return null;

  const collectionType = collectionInfo[1]; // 0=AA, 1=众筹
  const targetAmount = Number(formatEther(collectionInfo[2]));
  const targetCount = Number(collectionInfo[3]);
  const currentAmount = Number(formatEther(collectionInfo[4]));
  const currentCount = Number(collectionInfo[5]);
  const status = collectionInfo[7];
  const contributors = collectionInfo[8] as `0x${string}`[];

  // 只显示进行中的收款
  if (status !== 0) return null;

  const isAA = collectionType === 0;
  const progress = isAA
    ? (currentCount / targetCount) * 100
    : (currentAmount / targetAmount) * 100;
  const hasPaid = address && contributors.includes(address);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border-2 border-green-200 hover:border-green-300 transition-all cursor-pointer"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className="text-3xl">💰</div>
          <div>
            <div className="font-bold text-gray-800">
              {isAA ? 'AA' : '众筹'}收款 #{collectionId.toString()}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {isAA ? `${currentCount}/${targetCount} 人` : `${currentAmount.toFixed(2)}/${targetAmount.toFixed(2)} ETH`}
            </div>
          </div>
        </div>
        {hasPaid ? (
          <span className="px-2 py-1 bg-gray-200 text-gray-600 text-xs rounded-full">
            已支付
          </span>
        ) : (
          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
            可支付
          </span>
        )}
      </div>

      <div className="mb-3">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-600">
            {isAA ? '每人应付' : '目标金额'}
          </span>
          <span className="font-bold text-green-600">
            {isAA ? (targetAmount / targetCount).toFixed(4) : targetAmount.toFixed(4)} ETH
          </span>
        </div>
        <div className="w-full bg-green-100 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-green-400 to-emerald-500 h-2 rounded-full transition-all"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      </div>

      <a
        href="#"
        onClick={(e) => {
          e.preventDefault();
          const payTab = document.querySelector('[data-tab="remittance"]') as HTMLButtonElement;
          if (payTab) payTab.click();
        }}
        className={`block w-full text-center py-2 rounded-lg font-medium transition-all ${
          hasPaid
            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
            : 'bg-green-500 text-white hover:bg-green-600'
        }`}
      >
        {hasPaid ? '已支付' : '立即支付'}
      </a>
    </motion.div>
  );
}
