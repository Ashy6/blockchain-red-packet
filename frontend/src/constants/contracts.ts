// 合约地址 - Sepolia 测试网
// 验证地址：https://eth-sepolia.blockscout.com/address/0x36dd80B169E4C21Aa0E27DD266b5B3a5555806Ea
export const RED_PACKET_ADDRESS = '0x36dd80B169E4C21Aa0E27DD266b5B3a5555806Ea' as `0x${string}`;

// 合约 ABI
export const RED_PACKET_ABI = [
  // 创建红包
  {
    name: 'createRedPacket',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: '_packetType', type: 'uint8' },
      { name: '_totalCount', type: 'uint256' },
      { name: '_duration', type: 'uint256' },
      { name: '_password', type: 'string' },
    ],
    outputs: [{ name: 'packetId', type: 'uint256' }],
  },
  // 领取红包
  {
    name: 'claimRedPacket',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_packetId', type: 'uint256' },
      { name: '_password', type: 'string' },
    ],
    outputs: [],
  },
  // 退款
  {
    name: 'refundExpiredRedPacket',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: '_packetId', type: 'uint256' }],
    outputs: [],
  },
  // 创建收款
  {
    name: 'createCollection',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_collectionType', type: 'uint8' },
      { name: '_targetAmount', type: 'uint256' },
      { name: '_targetCount', type: 'uint256' },
      { name: '_duration', type: 'uint256' },
      { name: '_password', type: 'string' },
    ],
    outputs: [{ name: 'collectionId', type: 'uint256' }],
  },
  // 支付收款
  {
    name: 'payCollection',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: '_collectionId', type: 'uint256' },
      { name: '_password', type: 'string' },
    ],
    outputs: [],
  },
  // 处理过期收款
  {
    name: 'handleExpiredCollection',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: '_collectionId', type: 'uint256' }],
    outputs: [],
  },
  // 查询红包信息
  {
    name: 'getRedPacketInfo',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '_packetId', type: 'uint256' }],
    outputs: [
      { name: 'creator', type: 'address' },
      { name: 'packetType', type: 'uint8' },
      { name: 'totalAmount', type: 'uint256' },
      { name: 'totalCount', type: 'uint256' },
      { name: 'remainingAmount', type: 'uint256' },
      { name: 'remainingCount', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
      { name: 'status', type: 'uint8' },
      { name: 'claimers', type: 'address[]' },
    ],
  },
  // 查询收款信息
  {
    name: 'getCollectionInfo',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '_collectionId', type: 'uint256' }],
    outputs: [
      { name: 'creator', type: 'address' },
      { name: 'collectionType', type: 'uint8' },
      { name: 'targetAmount', type: 'uint256' },
      { name: 'targetCount', type: 'uint256' },
      { name: 'currentAmount', type: 'uint256' },
      { name: 'currentCount', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
      { name: 'status', type: 'uint8' },
      { name: 'contributors', type: 'address[]' },
    ],
  },
  // 用户相关查询
  {
    name: 'getUserSentRedPackets',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '_user', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[]' }],
  },
  {
    name: 'getUserClaimedRedPackets',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '_user', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[]' }],
  },
  {
    name: 'getUserCreatedCollections',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '_user', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[]' }],
  },
  {
    name: 'getUserPaidCollections',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '_user', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[]' }],
  },
  // 计数器
  {
    name: 'getRedPacketCount',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getCollectionCount',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  // 事件
  {
    name: 'RedPacketCreated',
    type: 'event',
    inputs: [
      { indexed: true, name: 'packetId', type: 'uint256' },
      { indexed: true, name: 'creator', type: 'address' },
      { indexed: false, name: 'packetType', type: 'uint8' },
      { indexed: false, name: 'totalAmount', type: 'uint256' },
      { indexed: false, name: 'totalCount', type: 'uint256' },
      { indexed: false, name: 'deadline', type: 'uint256' },
    ],
  },
  {
    name: 'RedPacketClaimed',
    type: 'event',
    inputs: [
      { indexed: true, name: 'packetId', type: 'uint256' },
      { indexed: true, name: 'claimer', type: 'address' },
      { indexed: false, name: 'amount', type: 'uint256' },
    ],
  },
  {
    name: 'RedPacketRefunded',
    type: 'event',
    inputs: [
      { indexed: true, name: 'packetId', type: 'uint256' },
      { indexed: true, name: 'creator', type: 'address' },
      { indexed: false, name: 'refundAmount', type: 'uint256' },
    ],
  },
  {
    name: 'CollectionCreated',
    type: 'event',
    inputs: [
      { indexed: true, name: 'collectionId', type: 'uint256' },
      { indexed: true, name: 'creator', type: 'address' },
      { indexed: false, name: 'collectionType', type: 'uint8' },
      { indexed: false, name: 'targetAmount', type: 'uint256' },
      { indexed: false, name: 'deadline', type: 'uint256' },
    ],
  },
  {
    name: 'CollectionPaid',
    type: 'event',
    inputs: [
      { indexed: true, name: 'collectionId', type: 'uint256' },
      { indexed: true, name: 'contributor', type: 'address' },
      { indexed: false, name: 'amount', type: 'uint256' },
    ],
  },
  {
    name: 'CollectionCompleted',
    type: 'event',
    inputs: [
      { indexed: true, name: 'collectionId', type: 'uint256' },
      { indexed: true, name: 'creator', type: 'address' },
      { indexed: false, name: 'totalAmount', type: 'uint256' },
    ],
  },
  {
    name: 'CollectionRefunded',
    type: 'event',
    inputs: [
      { indexed: true, name: 'collectionId', type: 'uint256' },
      { indexed: true, name: 'contributor', type: 'address' },
      { indexed: false, name: 'refundAmount', type: 'uint256' },
    ],
  },
] as const;
