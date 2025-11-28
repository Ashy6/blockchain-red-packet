import { useState } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import ContractInfo from '@/components/ContractInfo';
import { motion } from 'framer-motion';
// 动态禁用 SSR 渲染使用 wagmi 的组件，避免 SSR 环境下报错
const HeaderClient = dynamic(() => import('@/components/Header'), { ssr: false });
const DynamicNetworkStatus = dynamic(() => import('@/components/NetworkStatus'), { ssr: false });
const SendPacketClient = dynamic(() => import('@/components/SendPacket'), { ssr: false });  // 发送红包
const ClaimPacketClient = dynamic(() => import('@/components/ClaimPacket').then(mod => mod.default), { ssr: false }); // 抢红包
const CreateCollectionClient = dynamic(() => import('@/components/CreateCollection'), { ssr: false }); // 创建收款
const PayCollectionClient = dynamic(() => import('@/components/PayCollection'), { ssr: false });  // 收款
const RecordsListClient = dynamic(() => import('@/components/RecordsList'), { ssr: false }); // 记录列表

enum TabType {
  SendPacket = 'sendPacket',  // 发红包
  ClaimPacket = 'claimPacket',  // 抢红包
  Collection = 'collection',  // 收款
  Remittance = 'remittance',  // 付款
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>(TabType.SendPacket);

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
            {/* 左侧：四个功能选项卡 */}
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
                    onClick={() => setActiveTab(TabType.SendPacket)}
                    className={`flex-1 px-6 py-4 text-lg font-semibold transition-all ${
                      activeTab === TabType.SendPacket
                        ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50'
                        : 'text-gray-600 hover:text-primary-500 hover:bg-gray-50'
                    }`}
                  >
                    🧧 发红包
                  </button>
                  <button
                    onClick={() => setActiveTab(TabType.ClaimPacket)}
                    className={`flex-1 px-6 py-4 text-lg font-semibold transition-all ${
                      activeTab === TabType.ClaimPacket
                        ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50'
                        : 'text-gray-600 hover:text-primary-500 hover:bg-gray-50'
                    }`}
                  >
                    🎁 抢红包
                  </button>
                  <button
                    onClick={() => setActiveTab(TabType.Collection)}
                    className={`flex-1 px-6 py-4 text-lg font-semibold transition-all ${
                      activeTab === TabType.Collection
                        ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50'
                        : 'text-gray-600 hover:text-primary-500 hover:bg-gray-50'
                    }`}
                  >
                    🧾 收款
                  </button>
                  <button
                    onClick={() => setActiveTab(TabType.Remittance)}
                    className={`flex-1 px-6 py-4 text-lg font-semibold transition-all ${
                      activeTab === TabType.Remittance
                        ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50'
                        : 'text-gray-600 hover:text-primary-500 hover:bg-gray-50'
                    }`}
                  >
                    💳 付款
                  </button>
                </div>

                {/* Tab 内容 */}
                <div className="p-6">
                  {activeTab === TabType.SendPacket && <SendPacketClient />}
                  {activeTab === TabType.ClaimPacket && <ClaimPacketClient />}
                  {activeTab === TabType.Collection && <CreateCollectionClient />}
                  {activeTab === TabType.Remittance && <PayCollectionClient />}
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
