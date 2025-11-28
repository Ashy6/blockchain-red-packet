import { useState, useEffect } from 'react';
import { useAccount, useContractRead, useChainId, useSwitchChain } from 'wagmi';
import { RED_PACKET_ADDRESS, RED_PACKET_ABI } from '@/constants/contracts';
import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight, Clock } from 'lucide-react';

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
  const { data: sentRedPackets } = useContractRead({
    address: RED_PACKET_ADDRESS,
    abi: RED_PACKET_ABI,
    functionName: 'getUserSentRedPackets',
    args: address ? [address] : undefined,
    query: {
      enabled: isConnected && !!address && recordType === 'sent',
    },
  });

  // 查询用户领取的红包
  const { data: claimedRedPackets } = useContractRead({
    address: RED_PACKET_ADDRESS,
    abi: RED_PACKET_ABI,
    functionName: 'getUserClaimedRedPackets',
    args: address ? [address] : undefined,
    query: {
      enabled: isConnected && !!address && recordType === 'claimed',
    },
  });

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

      if (redPacketCount === 0 && collectionCount === 0) {
        return (
          <div className="text-center py-12 text-gray-500">
            <ArrowDownRight className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>暂无领取记录</p>
          </div>
        );
      }

      return (
        <div className="space-y-3">
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
  const { data: packetInfo } = useContractRead({
    address: RED_PACKET_ADDRESS,
    abi: RED_PACKET_ABI,
    functionName: 'getRedPacketInfo',
    args: [packetId],
  });

  if (!packetInfo) return null;

  const totalAmount = Number(packetInfo[2]) / 1e18;
  const remainingCount = Number(packetInfo[5]);
  const totalCount = Number(packetInfo[3]);
  const packetType = packetInfo[1] === 0 ? '等额' : '随机';
  const status = packetInfo[7];

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-gradient-to-r from-red-50 to-pink-50 rounded-lg p-4 border border-red-100 hover:shadow-md transition-shadow"
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
        <div className="text-right">
          <div className="text-sm font-medium text-red-600">
            {isSent ? '-' : '+'} {totalAmount.toFixed(4)} ETH
          </div>
          <div className="text-xs text-gray-500">
            {totalCount - remainingCount}/{totalCount}
          </div>
        </div>
      </div>
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
