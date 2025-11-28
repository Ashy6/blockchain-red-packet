import { useState, useCallback } from 'react';
import { useContractRead, useContractWrite, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import { RED_PACKET_ADDRESS, RED_PACKET_ABI } from '@/constants/contracts';
import { getFriendlyErrorMessage } from '@/utils/helpers';

/**
 * 红包操作的自定义 Hook
 */
export function useRedPacket() {
  const [error, setError] = useState<string | null>(null);

  const { writeContract, data: hash, isPending } = useContractWrite();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  /**
   * 创建红包
   */
  const createRedPacket = useCallback(
    async (
      packetType: 0 | 1, // 0=等额, 1=随机
      totalCount: number,
      duration: number,
      password: string,
      amount: string
    ) => {
      setError(null);
      try {
        writeContract({
          address: RED_PACKET_ADDRESS,
          abi: RED_PACKET_ABI,
          functionName: 'createRedPacket',
          args: [packetType, BigInt(totalCount), BigInt(duration), password],
          value: parseEther(amount),
        });
      } catch (err) {
        const message = getFriendlyErrorMessage(err);
        setError(message);
        throw new Error(message);
      }
    },
    [writeContract]
  );

  /**
   * 领取红包
   */
  const claimRedPacket = useCallback(
    async (packetId: bigint, password: string) => {
      setError(null);
      try {
        writeContract({
          address: RED_PACKET_ADDRESS,
          abi: RED_PACKET_ABI,
          functionName: 'claimRedPacket',
          args: [packetId, password],
        });
      } catch (err) {
        const message = getFriendlyErrorMessage(err);
        setError(message);
        throw new Error(message);
      }
    },
    [writeContract]
  );

  /**
   * 退款过期红包
   */
  const refundRedPacket = useCallback(
    async (packetId: bigint) => {
      setError(null);
      try {
        writeContract({
          address: RED_PACKET_ADDRESS,
          abi: RED_PACKET_ABI,
          functionName: 'refundExpiredRedPacket',
          args: [packetId],
        });
      } catch (err) {
        const message = getFriendlyErrorMessage(err);
        setError(message);
        throw new Error(message);
      }
    },
    [writeContract]
  );

  return {
    createRedPacket,
    claimRedPacket,
    refundRedPacket,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

/**
 * 收款操作的自定义 Hook
 */
export function useCollection() {
  const [error, setError] = useState<string | null>(null);

  const { writeContract, data: hash, isPending } = useContractWrite();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  /**
   * 创建收款
   */
  const createCollection = useCallback(
    async (
      collectionType: 0 | 1, // 0=AA, 1=众筹
      targetAmount: string,
      targetCount: number,
      duration: number,
      password: string
    ) => {
      setError(null);
      try {
        writeContract({
          address: RED_PACKET_ADDRESS,
          abi: RED_PACKET_ABI,
          functionName: 'createCollection',
          args: [
            collectionType,
            parseEther(targetAmount),
            BigInt(targetCount),
            BigInt(duration),
            password,
          ],
        });
      } catch (err) {
        const message = getFriendlyErrorMessage(err);
        setError(message);
        throw new Error(message);
      }
    },
    [writeContract]
  );

  /**
   * 参与收款
   */
  const payCollection = useCallback(
    async (collectionId: bigint, password: string, amount: string) => {
      setError(null);
      try {
        writeContract({
          address: RED_PACKET_ADDRESS,
          abi: RED_PACKET_ABI,
          functionName: 'payCollection',
          args: [collectionId, password],
          value: parseEther(amount),
        });
      } catch (err) {
        const message = getFriendlyErrorMessage(err);
        setError(message);
        throw new Error(message);
      }
    },
    [writeContract]
  );

  /**
   * 处理过期收款
   */
  const handleExpiredCollection = useCallback(
    async (collectionId: bigint) => {
      setError(null);
      try {
        writeContract({
          address: RED_PACKET_ADDRESS,
          abi: RED_PACKET_ABI,
          functionName: 'handleExpiredCollection',
          args: [collectionId],
        });
      } catch (err) {
        const message = getFriendlyErrorMessage(err);
        setError(message);
        throw new Error(message);
      }
    },
    [writeContract]
  );

  return {
    createCollection,
    payCollection,
    handleExpiredCollection,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

/**
 * 查询红包信息的 Hook
 */
export function useRedPacketInfo(packetId: bigint | undefined) {
  const { data, isLoading, isError, refetch } = useContractRead({
    address: RED_PACKET_ADDRESS,
    abi: RED_PACKET_ABI,
    functionName: 'getRedPacketInfo',
    args: packetId !== undefined ? [packetId] : undefined,
    query: {
      enabled: packetId !== undefined,
    },
  });

  return {
    redPacketInfo: data,
    isLoading,
    isError,
    refetch,
  };
}

/**
 * 查询收款信息的 Hook
 */
export function useCollectionInfo(collectionId: bigint | undefined) {
  const { data, isLoading, isError, refetch } = useContractRead({
    address: RED_PACKET_ADDRESS,
    abi: RED_PACKET_ABI,
    functionName: 'getCollectionInfo',
    args: collectionId !== undefined ? [collectionId] : undefined,
    query: {
      enabled: collectionId !== undefined,
    },
  });

  return {
    collectionInfo: data,
    isLoading,
    isError,
    refetch,
  };
}

/**
 * 查询用户统计的 Hook
 */
export function useUserStats(userAddress: `0x${string}` | undefined) {
  // 查询发送的红包
  const { data: sentRedPackets } = useContractRead({
    address: RED_PACKET_ADDRESS,
    abi: RED_PACKET_ABI,
    functionName: 'getUserSentRedPackets',
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!userAddress,
    },
  });

  // 查询领取的红包
  const { data: claimedRedPackets } = useContractRead({
    address: RED_PACKET_ADDRESS,
    abi: RED_PACKET_ABI,
    functionName: 'getUserClaimedRedPackets',
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!userAddress,
    },
  });

  // 查询创建的收款
  const { data: createdCollections } = useContractRead({
    address: RED_PACKET_ADDRESS,
    abi: RED_PACKET_ABI,
    functionName: 'getUserCreatedCollections',
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!userAddress,
    },
  });

  // 查询参与的收款
  const { data: paidCollections } = useContractRead({
    address: RED_PACKET_ADDRESS,
    abi: RED_PACKET_ABI,
    functionName: 'getUserPaidCollections',
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!userAddress,
    },
  });

  return {
    sentRedPackets: (sentRedPackets as bigint[]) || [],
    claimedRedPackets: (claimedRedPackets as bigint[]) || [],
    createdCollections: (createdCollections as bigint[]) || [],
    paidCollections: (paidCollections as bigint[]) || [],
    totalSent: (sentRedPackets as bigint[])?.length || 0,
    totalClaimed: (claimedRedPackets as bigint[])?.length || 0,
    totalCreated: (createdCollections as bigint[])?.length || 0,
    totalPaid: (paidCollections as bigint[])?.length || 0,
  };
}
