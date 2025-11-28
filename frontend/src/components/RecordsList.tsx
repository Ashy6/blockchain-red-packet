import { useState, useEffect } from 'react';
import { useAccount, useContractRead, useChainId, useSwitchChain } from 'wagmi';
import { RED_PACKET_ADDRESS, RED_PACKET_ABI } from '@/constants/contracts';
import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight, Clock, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';

type RecordType = 'sent' | 'claimed';

export default function RecordsList() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const isSepolia = chainId === 11155111;
  const [recordType, setRecordType] = useState<RecordType>('sent');
  const [recentCreated, setRecentCreated] = useState<{
    packetId: bigint;
    password: string;
    totalAmount: string;
    totalCount: number;
    remainingCount: number;
    packetType: 'equal' | 'random';
  } | null>(null);

  const [recentClaimed, setRecentClaimed] = useState<{
    packetId: bigint;
    claimer: string;
    amount: string;
  } | null>(null);

  // 监听红包创建事件
  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{
        packetId: bigint;
        password: string;
        totalAmount: string;
        totalCount: number;
        remainingCount: number;
        packetType: 'equal' | 'random';
      }>;
      if (ce.detail) {
        setRecentCreated(ce.detail);
        setRecordType('sent');
      }
    };
    window.addEventListener('redPacketCreated', handler as EventListener);
    return () => window.removeEventListener('redPacketCreated', handler as EventListener);
  }, []);

  // 查询用户发送的红包
  const { data: sentRedPackets, refetch: refetchSent } = useContractRead({
    address: RED_PACKET_ADDRESS,
    abi: RED_PACKET_ABI,
    functionName: 'getUserSentRedPackets',
    args: address ? [address] : undefined,
    query: {
      enabled: isConnected && !!address && recordType === 'sent',
    },
  });

  // 查询用户领取的红包
  const { data: claimedRedPackets, refetch: refetchClaimed } = useContractRead({
    address: RED_PACKET_ADDRESS,
    abi: RED_PACKET_ABI,
    functionName: 'getUserClaimedRedPackets',
    args: address ? [address] : undefined,
    query: {
      enabled: isConnected && !!address && recordType === 'claimed',
    },
  });

  // 监听红包领取事件
  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{
        packetId: bigint;
        claimer: string;
        amount: string;
      }>;
      if (ce.detail) {
        setRecentClaimed(ce.detail);
        setRecordType('claimed');
        // 刷新领取记录
        setTimeout(() => {
          refetchClaimed();
        }, 1000);
        // 5秒后清除高亮
        setTimeout(() => setRecentClaimed(null), 5000);
      }
    };
    window.addEventListener('redPacketClaimed', handler as EventListener);
    return () => window.removeEventListener('redPacketClaimed', handler as EventListener);
  }, [refetchClaimed]);

  // 查询用户创建的收款
  const { data: createdCollections } = useContractRead({
    address: RED_PACKET_ADDRESS,
    abi: RED_PACKET_ABI,
    functionName: 'getUserCreatedCollections',
    args: address ? [address] : undefined,
    query: {
      enabled: isConnected && !!address && recordType === 'sent',
    },
  });

  // 查询用户参与的收款
  const { data: paidCollections } = useContractRead({
    address: RED_PACKET_ADDRESS,
    abi: RED_PACKET_ABI,
    functionName: 'getUserPaidCollections',
    args: address ? [address] : undefined,
    query: {
      enabled: isConnected && !!address && recordType === 'claimed',
    },
  });

  const renderRecords = () => {
    if (!isConnected) {
      return (
        <div className="text-center py-12 text-gray-500">
          <p>请先连接钱包</p>
        </div>
      );
    }

    if (!isSepolia) {
      return (
        <div className="text-center py-12 text-yellow-800 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p>当前网络非 Sepolia（Chain ID: {chainId ?? '未知'}）。请切换到 Sepolia 查看记录。</p>
          <button
            type="button"
            onClick={() => switchChain({ chainId: 11155111 })}
            className="mt-3 px-3 py-2 text-sm rounded-lg bg-yellow-600 text-white hover:bg-yellow-700"
          >
            一键切换到 Sepolia
          </button>
        </div>
      );
    }

    if (recordType === 'sent') {
      const redPacketCount = sentRedPackets?.length || 0;
      const collectionCount = createdCollections?.length || 0;

      if (redPacketCount === 0 && collectionCount === 0) {
        return (
          <div className="text-center py-12 text-gray-500">
            <ArrowUpRight className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>暂无发送记录</p>
          </div>
        );
      }

      return (
        <div className="space-y-3">
          {recentCreated && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-100 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <div className="text-2xl">🧧</div>
                  <div>
                    <div className="font-semibold text-gray-800">
                      {recentCreated.packetType === 'equal' ? '等额' : '随机'}红包 #{recentCreated.packetId.toString()}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">口令：{recentCreated.password || '（无）'}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-green-600">
                    - {Number(recentCreated.totalAmount).toFixed(4)} ETH
                  </div>
                  <div className="text-xs text-gray-500">
                    剩余：{recentCreated.remainingCount}/{recentCreated.totalCount}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
          {/* 发送的红包 */}
          {sentRedPackets?.map((packetId, index) => (
            <RedPacketRecord key={`rp-${index}`} packetId={packetId} isSent />
          ))}

          {/* 创建的收款 */}
          {createdCollections?.map((collectionId, index) => (
            <CollectionRecord
              key={`col-${index}`}
              collectionId={collectionId}
              isCreator
            />
          ))}
        </div>
      );
    } else {
      const redPacketCount = claimedRedPackets?.length || 0;
      const collectionCount = paidCollections?.length || 0;

      if (redPacketCount === 0 && collectionCount === 0 && !recentClaimed) {
        return (
          <div className="text-center py-12 text-gray-500">
            <ArrowDownRight className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>暂无领取记录</p>
          </div>
        );
      }

      return (
        <div className="space-y-3">
          {/* 最近领取的红包高亮显示 */}
          {recentClaimed && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-4 border-2 border-yellow-300 shadow-lg"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <div className="text-3xl animate-bounce">🎉</div>
                  <div>
                    <div className="font-bold text-gray-800 text-lg">
                      领取成功！
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      红包 #{recentClaimed.packetId.toString()}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-orange-600">
                    + {Number(recentClaimed.amount).toFixed(4)} ETH
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    刚刚
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* 领取的红包 */}
          {claimedRedPackets?.map((packetId, index) => (
            <RedPacketRecord key={`rp-${index}`} packetId={packetId} />
          ))}

          {/* 参与的收款 */}
          {paidCollections?.map((collectionId, index) => (
            <CollectionRecord key={`col-${index}`} collectionId={collectionId} />
          ))}
        </div>
      );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="bg-white rounded-2xl shadow-2xl overflow-hidden"
    >
      {/* 标题 */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4">
        <h2 className="text-xl font-bold text-white">📊 交易记录</h2>
      </div>

      {/* Tab 切换 */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setRecordType('sent')}
          className={`flex-1 px-4 py-3 text-sm font-semibold transition-all ${
            recordType === 'sent'
              ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50'
              : 'text-gray-600 hover:text-primary-500 hover:bg-gray-50'
          }`}
        >
          <ArrowUpRight className="w-4 h-4 inline mr-1" />
          支出记录
        </button>
        <button
          onClick={() => setRecordType('claimed')}
          className={`flex-1 px-4 py-3 text-sm font-semibold transition-all ${
            recordType === 'claimed'
              ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50'
              : 'text-gray-600 hover:text-primary-500 hover:bg-gray-50'
          }`}
        >
          <ArrowDownRight className="w-4 h-4 inline mr-1" />
          领取记录
        </button>
      </div>

      {/* 记录列表 */}
      <div className="p-4 max-h-[600px] overflow-y-auto">{renderRecords()}</div>
    </motion.div>
  );
}

// 红包记录项组件
function RedPacketRecord({
  packetId,
  isSent = false,
}: {
  packetId: bigint;
  isSent?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const { data: packetInfo } = useContractRead({
    address: RED_PACKET_ADDRESS,
    abi: RED_PACKET_ABI,
    functionName: 'getRedPacketInfo',
    args: [packetId],
  });

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      console.error('复制失败:', error);
    }
  };

  if (!packetInfo) return null;

  const totalAmount = Number(packetInfo[2]) / 1e18;
  const remainingAmount = Number(packetInfo[4]) / 1e18;
  const remainingCount = Number(packetInfo[5]);
  const totalCount = Number(packetInfo[3]);
  const packetType = packetInfo[1] === 0 ? '等额' : '随机';
  const status = packetInfo[7];
  const claimedCount = totalCount - remainingCount;
  const claimedAmount = totalAmount - remainingAmount;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-gradient-to-r from-red-50 to-pink-50 rounded-lg border border-red-100 hover:shadow-md transition-all overflow-hidden"
    >
      <div
        className="p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center space-x-2">
            <div className="text-2xl">🧧</div>
            <div>
              <div className="font-semibold text-gray-800">
                {packetType}红包 #{packetId.toString()}
              </div>
              <div className="text-xs text-gray-500 flex items-center mt-1">
                <Clock className="w-3 h-3 mr-1" />
                {status === 0
                  ? '进行中'
                  : status === 1
                  ? '已过期'
                  : '已领完'}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="text-right">
              <div className="text-sm font-medium text-red-600">
                {isSent ? '-' : '+'} {totalAmount.toFixed(4)} ETH
              </div>
              <div className="text-xs text-gray-500">
                {claimedCount}/{totalCount} 已领
              </div>
            </div>
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </div>
        </div>
      </div>

      {/* 展开的详细信息 */}
      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="border-t border-red-200 bg-white px-4 py-3"
        >
          <div className="space-y-3">
            {/* 红包ID - 可复制 */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">红包ID:</span>
              <div className="flex items-center space-x-2">
                <span className="font-mono font-medium text-gray-800">
                  #{packetId.toString()}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    copyToClipboard(packetId.toString(), 'id');
                  }}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                >
                  {copiedField === 'id' ? (
                    <Check className="w-3 h-3 text-green-600" />
                  ) : (
                    <Copy className="w-3 h-3 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            {/* 金额统计 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-red-50 rounded-lg p-2">
                <div className="text-xs text-gray-500">总金额</div>
                <div className="text-sm font-bold text-gray-800">
                  {totalAmount.toFixed(4)} ETH
                </div>
              </div>
              <div className="bg-red-50 rounded-lg p-2">
                <div className="text-xs text-gray-500">已领取</div>
                <div className="text-sm font-bold text-gray-800">
                  {claimedAmount.toFixed(4)} ETH
                </div>
              </div>
              <div className="bg-red-50 rounded-lg p-2">
                <div className="text-xs text-gray-500">剩余金额</div>
                <div className="text-sm font-bold text-gray-800">
                  {remainingAmount.toFixed(4)} ETH
                </div>
              </div>
              <div className="bg-red-50 rounded-lg p-2">
                <div className="text-xs text-gray-500">剩余个数</div>
                <div className="text-sm font-bold text-gray-800">
                  {remainingCount} / {totalCount}
                </div>
              </div>
            </div>

            {/* 红包类型 */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">红包类型:</span>
              <span className="font-medium text-gray-800">
                {packetType}
                {packetType === '等额' && totalCount > 0 && (
                  <span className="text-xs text-gray-500 ml-1">
                    (每个 {(totalAmount / totalCount).toFixed(4)} ETH)
                  </span>
                )}
              </span>
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
                {status === 0 ? '🟢 进行中' : status === 1 ? '⏰ 已过期' : '✅ 已领完'}
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

// 收款记录项组件
function CollectionRecord({
  collectionId,
  isCreator = false,
}: {
  collectionId: bigint;
  isCreator?: boolean;
}) {
  const { data: collectionInfo } = useContractRead({
    address: RED_PACKET_ADDRESS,
    abi: RED_PACKET_ABI,
    functionName: 'getCollectionInfo',
    args: [collectionId],
  });

  if (!collectionInfo) return null;

  const currentAmount = Number(collectionInfo[4]) / 1e18;
  const targetAmount = Number(collectionInfo[2]) / 1e18;
  const collectionType = collectionInfo[1] === 0 ? 'AA' : '众筹';
  const status = collectionInfo[7];

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-100 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center space-x-2">
          <div className="text-2xl">💰</div>
          <div>
            <div className="font-semibold text-gray-800">
              {collectionType}收款 #{collectionId.toString()}
            </div>
            <div className="text-xs text-gray-500 flex items-center mt-1">
              <Clock className="w-3 h-3 mr-1" />
              {status === 0
                ? '进行中'
                : status === 1
                ? '已过期'
                : '已完成'}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-medium text-green-600">
            {isCreator ? '+' : '-'} {currentAmount.toFixed(4)} ETH
          </div>
          {collectionType === '众筹' && (
            <div className="text-xs text-gray-500">
              目标: {targetAmount.toFixed(4)} ETH
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
