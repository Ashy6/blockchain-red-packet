import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'

// 模拟 viem：只用到 decodeEventLog
vi.mock('viem', async () => {
  const actual = await vi.importActual<any>('viem')
  return {
    ...actual,
    decodeEventLog: vi.fn(() => ({
      eventName: 'RedPacketCreated',
      args: { packetId: BigInt(123) },
    })),
  }
})

// 全局可控的 wagmi 状态
const wagmiState = {
  isConnected: true,
  address: '0xabc',
  chainId: 11155111,
  isPending: false,
  isConfirming: false,
  isSuccess: false,
  receipt: { logs: [{ data: '0x', topics: ['0x'] }] },
}

vi.mock('wagmi', async () => {
  return {
    useAccount: () => ({ address: wagmiState.address, isConnected: wagmiState.isConnected }),
    useChainId: () => wagmiState.chainId,
    useSwitchChain: () => ({ switchChain: vi.fn() }),
    usePublicClient: () => ({ getLogs: vi.fn() }),
    useContractWrite: () => ({
      writeAsync: vi.fn(async () => '0xhash'),
      data: '0xhash',
      isPending: wagmiState.isPending,
    }),
    useWaitForTransactionReceipt: () => ({
      isLoading: wagmiState.isConfirming,
      isSuccess: wagmiState.isSuccess,
      data: wagmiState.receipt,
    }),
  }
})

import SendPacket from '@/components/SendPacket'

describe('SendPacket', () => {
  beforeEach(() => {
    wagmiState.isPending = false
    wagmiState.isConfirming = false
    wagmiState.isSuccess = false
  })

  it('初始显示为“发红包”', () => {
    render(<SendPacket />)
    expect(screen.getByRole('button', { name: '发红包' })).toBeInTheDocument()
  })

  it('钱包确认阶段显示“等待钱包确认...”', () => {
    wagmiState.isPending = true
    render(<SendPacket />)
    expect(screen.getByRole('button', { name: '等待钱包确认...' })).toBeInTheDocument()
  })

  it('提交后链上确认阶段显示“交易确认中...”', async () => {
    const user = userEvent.setup()
    wagmiState.isConfirming = true
    render(<SendPacket />)
    // 填入必填项
    await user.type(screen.getByPlaceholderText('例如 0.5'), '0.5')
    await user.type(screen.getByPlaceholderText('例如 5'), '5')
    await user.type(screen.getByPlaceholderText('例如 60'), '60')
    await user.type(screen.getByPlaceholderText('输入口令'), 'testpwd')
    await user.click(screen.getByRole('button', { name: '发红包' }))
    // 提交后组件内部 hasSubmitted=true，结合 isConfirming 显示文案
    expect(await screen.findByRole('button', { name: '交易确认中...' })).toBeInTheDocument()
  })

  it('交易成功后提示红包ID与口令', async () => {
    const user = userEvent.setup()
    wagmiState.isSuccess = true
    render(<SendPacket />)
    await user.type(screen.getByPlaceholderText('例如 0.5'), '0.5')
    await user.type(screen.getByPlaceholderText('例如 5'), '5')
    await user.type(screen.getByPlaceholderText('例如 60'), '60')
    await user.type(screen.getByPlaceholderText('输入口令'), 'abc123')
    // 成功信息渲染
    expect(await screen.findByText(/红包已创建：ID #123，口令：abc123/)).toBeInTheDocument()
  })
})