import { useState } from 'react';
import Head from 'next/head';
// import Header from '@/components/Header';
import dynamic from 'next/dynamic';
import ContractInfo from '@/components/ContractInfo';
import { motion } from 'framer-motion';
// 动态禁用 SSR 渲染使用 wagmi 的组件，避免 SSR 环境下报错
const HeaderClient = dynamic(() => import('@/components/Header'), { ssr: false });
const DynamicNetworkStatus = dynamic(() => import('@/components/NetworkStatus'), { ssr: false });
const SendRedPacketClient = dynamic(() => import('@/components/SendRedPacket'), { ssr: false });
const ClaimRedPacketClient = dynamic(() => import('@/components/ClaimRedPacket'), { ssr: false });
const RecordsListClient = dynamic(() => import('@/components/RecordsList'), { ssr: false });

type TabType = 'send' | 'claim';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('send');

  return (
    <>
      <Head>
        <title>区块链红包 - Blockchain Red Packet</title>
        <meta name="description" content="基于以太坊的去中心化红包应用" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen">
        <HeaderClient />

        {/* 网络状态提示 */}
        <DynamicNetworkStatus />

        <main className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 左侧：发红包/抢红包 */}
            <div className="lg:col-span-2">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="bg-white rounded-2xl shadow-2xl overflow-hidden"
              >
                {/* Tab 切换 */}
                <div className="flex border-b border-gray-200">
                  <button
                    onClick={() => setActiveTab('send')}
                    className={`flex-1 px-6 py-4 text-lg font-semibold transition-all ${
                      activeTab === 'send'
                        ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50'
                        : 'text-gray-600 hover:text-primary-500 hover:bg-gray-50'
                    }`}
                  >
                    🧧 发红包
                  </button>
                  <button
                    onClick={() => setActiveTab('claim')}
                    className={`flex-1 px-6 py-4 text-lg font-semibold transition-all ${
                      activeTab === 'claim'
                        ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50'
                        : 'text-gray-600 hover:text-primary-500 hover:bg-gray-50'
                    }`}
                  >
                    🎁 抢红包
                  </button>
                </div>

                {/* Tab 内容 */}
                <div className="p-6">
                  {activeTab === 'send' ? (
                    <SendRedPacketClient />
                  ) : (
                    <ClaimRedPacketClient />
                  )}
                </div>
              </motion.div>
            </div>

            {/* 右侧：记录列表和合约信息 */}
            <div className="lg:col-span-1 space-y-6">
              <RecordsListClient />
              <ContractInfo />
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
