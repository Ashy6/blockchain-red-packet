import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { hardhat, sepolia, mainnet } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'Blockchain Red Packet',
  projectId: 'YOUR_WALLETCONNECT_PROJECT_ID', // 从 WalletConnect Cloud 获取
  chains: [hardhat, sepolia, mainnet],
  ssr: true,
});
