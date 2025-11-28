import { formatEther, parseEther } from 'viem';

/**
 * 格式化 ETH 金额显示
 */
export function formatETH(value: bigint | string, decimals: number = 4): string {
  try {
    const eth = typeof value === 'string' ? value : formatEther(value);
    const num = parseFloat(eth);
    return num.toFixed(decimals);
  } catch {
    return '0.0000';
  }
}

/**
 * 格式化地址显示（缩短）
 */
export function formatAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * 格式化时间显示
 */
export function formatTime(timestamp: bigint | number): string {
  const time = typeof timestamp === 'bigint' ? Number(timestamp) : timestamp;
  const date = new Date(time * 1000);

  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}天前`;
  if (hours > 0) return `${hours}小时前`;
  if (minutes > 0) return `${minutes}分钟前`;
  return '刚刚';
}

/**
 * 格式化截止时间
 */
export function formatDeadline(timestamp: bigint | number): string {
  const time = typeof timestamp === 'bigint' ? Number(timestamp) : timestamp;
  const date = new Date(time * 1000);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day} ${hour}:${minute}`;
}

/**
 * 检查是否已过期
 */
export function isExpired(deadline: bigint | number): boolean {
  const time = typeof deadline === 'bigint' ? Number(deadline) : deadline;
  return Date.now() > time * 1000;
}

/**
 * 获取剩余时间描述
 */
export function getTimeRemaining(deadline: bigint | number): string {
  const time = typeof deadline === 'bigint' ? Number(deadline) : deadline;
  const now = Date.now();
  const diff = time * 1000 - now;

  if (diff <= 0) return '已过期';

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `剩余 ${days}天`;
  if (hours > 0) return `剩余 ${hours}小时`;
  if (minutes > 0) return `剩余 ${minutes}分钟`;
  return `剩余 ${seconds}秒`;
}

/**
 * 获取红包类型文本
 */
export function getPacketTypeText(type: number): string {
  return type === 0 ? '等额红包' : '随机红包';
}

/**
 * 获取收款类型文本
 */
export function getCollectionTypeText(type: number): string {
  return type === 0 ? 'AA收款' : '众筹收款';
}

/**
 * 获取状态文本
 */
export function getStatusText(status: number): string {
  switch (status) {
    case 0:
      return '进行中';
    case 1:
      return '已过期';
    case 2:
      return '已完成';
    default:
      return '未知';
  }
}

/**
 * 获取状态颜色
 */
export function getStatusColor(status: number): string {
  switch (status) {
    case 0:
      return 'text-green-600';
    case 1:
      return 'text-gray-600';
    case 2:
      return 'text-blue-600';
    default:
      return 'text-gray-600';
  }
}

/**
 * 获取状态图标
 */
export function getStatusIcon(status: number): string {
  switch (status) {
    case 0:
      return '🟢';
    case 1:
      return '🔴';
    case 2:
      return '✅';
    default:
      return '⚪';
  }
}

/**
 * 计算红包进度百分比
 */
export function getRedPacketProgress(
  remaining: bigint,
  total: bigint
): number {
  if (total === BigInt(0)) return 0;
  const claimed = total - remaining;
  return Math.floor((Number(claimed) / Number(total)) * 100);
}

/**
 * 计算收款进度百分比
 */
export function getCollectionProgress(
  current: bigint,
  target: bigint
): number {
  if (target === BigInt(0)) return 0;
  return Math.floor((Number(current) / Number(target)) * 100);
}

/**
 * 复制到剪贴板
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // 降级方案
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  }
}

/**
 * 生成分享文本
 */
export function generateShareText(
  id: bigint,
  type: 'redpacket' | 'collection',
  password: string
): string {
  const typeText = type === 'redpacket' ? '红包' : '收款';
  return `🧧 我在区块链红包 Dapp 创建了一个${typeText}！

ID: ${id.toString()}
口令: ${password}

合约地址: 0x36dd80B169E4C21Aa0E27DD266b5B3a5555806Ea
网络: Sepolia 测试网

快来参与吧！🎉`;
}

/**
 * 验证输入金额
 */
export function validateAmount(amount: string): boolean {
  if (!amount || amount === '0') return false;
  const num = parseFloat(amount);
  return !isNaN(num) && num > 0;
}

/**
 * 验证输入个数
 */
export function validateCount(count: string): boolean {
  if (!count) return false;
  const num = parseInt(count);
  return !isNaN(num) && num >= 1;
}

/**
 * 验证口令
 */
export function validatePassword(password: string): boolean {
  return password.length > 0;
}

/**
 * 获取区块浏览器链接
 */
export function getExplorerLink(
  type: 'address' | 'tx',
  value: string
): string {
  const baseUrl = 'https://sepolia.etherscan.io';
  return type === 'address'
    ? `${baseUrl}/address/${value}`
    : `${baseUrl}/tx/${value}`;
}

/**
 * 获取合约验证链接
 */
export function getVerificationLink(type: 'sourcify' | 'blockscout' | 'routescan'): string {
  const address = '0x36dd80B169E4C21Aa0E27DD266b5B3a5555806Ea';
  switch (type) {
    case 'sourcify':
      return `https://repo.sourcify.dev/11155111/${address}/`;
    case 'blockscout':
      return `https://eth-sepolia.blockscout.com/address/${address}?tab=contract`;
    case 'routescan':
      return `https://testnet.routescan.io/address/${address}/contract/11155111/code`;
  }
}

/**
 * 错误消息友好化
 */
export function getFriendlyErrorMessage(error: any): string {
  const message = error?.message || error?.toString() || '未知错误';

  if (message.includes('user rejected')) {
    return '用户取消了交易';
  }
  if (message.includes('insufficient funds')) {
    return '余额不足';
  }
  if (message.includes('Invalid password')) {
    return '口令错误';
  }
  if (message.includes('Already claimed')) {
    return '您已经领取过了';
  }
  if (message.includes('No red packets remaining')) {
    return '红包已被领完';
  }
  if (message.includes('Red packet has expired')) {
    return '红包已过期';
  }
  if (message.includes('Must pay exact AA amount')) {
    return 'AA模式需要支付精确金额';
  }

  return message;
}
