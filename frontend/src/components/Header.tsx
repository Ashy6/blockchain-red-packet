import { ConnectButton } from '@rainbow-me/rainbowkit';
import { motion } from 'framer-motion';
import { useAccount, useChainId, useBalance } from 'wagmi';
import { hardhat, sepolia, mainnet } from 'wagmi/chains';

export default function Header() {
  const chainId = useChainId();
  const { address, isConnected } = useAccount();
  const chains = [hardhat, sepolia, mainnet];
  const currentChain = chains.find((c) => c.id === chainId);
  const chainName = currentChain?.name ?? '未知网络';
  const { data: balanceData } = useBalance({
    address,
    chainId,
    query: { enabled: Boolean(isConnected && address) },
  });

  return (
    <header className="bg-white/10 backdrop-blur-lg border-b border-white/20">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center space-x-3"
          >
            <div className="text-4xl animate-bounce-slow">🧧</div>
            <div>
              <h1 className="text-2xl font-bold text-white">区块链红包</h1>
              <p className="text-sm text-white/80">Blockchain Red Packet</p>
            </div>
          </motion.div>

          {/* 网络与余额显示 + 钱包连接按钮 */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center space-x-4"
          >
            {/* <div className="hidden sm:flex items-center space-x-3 text-sm text-white/90">
              <span>网络：{chainName} ({chainId ?? '未知'})</span>
              <span>
                余额：{balanceData ? `${balanceData.formatted} ${balanceData.symbol}` : '--'}
              </span>
            </div> */}
            <ConnectButton
              showBalance={true}
              chainStatus="icon"
              accountStatus={{
                smallScreen: 'avatar',
                largeScreen: 'full',
              }}
            />
          </motion.div>
        </div>
      </div>
    </header>
  );
}
