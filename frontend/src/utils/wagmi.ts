import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { hardhat, sepolia, mainnet } from 'wagmi/chains';

// 从环境变量读取 WalletConnect 项目 ID（需要在 .env.local 中配置 NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID）
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? 'my-project-id';

export const config = getDefaultConfig({
  appName: 'Blockchain Red Packet',
  projectId,
  chains: [hardhat, sepolia, mainnet],
});
