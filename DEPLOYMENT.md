# 🚀 部署信息

## 合约已成功部署到 Sepolia 测试网！

### 📝 基本信息

- **网络**: Sepolia Testnet
- **Chain ID**: 11155111
- **合约地址**: `0x36dd80B169E4C21Aa0E27DD266b5B3a5555806Ea`
- **部署时间**: 2025-11-27
- **编译器版本**: Solidity 0.8.20

### 🔗 验证链接

合约已通过多个平台验证，您可以在以下链接查看合约源代码：

1. **Sourcify** (开源验证)
   - https://repo.sourcify.dev/11155111/0x36dd80B169E4C21Aa0E27DD266b5B3a5555806Ea/

2. **Blockscout** (区块浏览器)
   - https://eth-sepolia.blockscout.com/address/0x36dd80B169E4C21Aa0E27DD266b5B3a5555806Ea?tab=contract

3. **Routescan** (多链浏览器)
   - https://testnet.routescan.io/address/0x36dd80B169E4C21Aa0E27DD266b5B3a5555806Ea/contract/11155111/code

### 🌐 区块浏览器

您也可以在 Etherscan 上查看合约：
- https://sepolia.etherscan.io/address/0x36dd80B169E4C21Aa0E27DD266b5B3a5555806Ea

### 🎯 如何使用

#### 1. 获取测试 ETH

在 Sepolia 测试网使用前，您需要获取一些测试 ETH：

- **Alchemy Faucet**: https://sepoliafaucet.com/
- **Infura Faucet**: https://www.infura.io/faucet/sepolia
- **Chainlink Faucet**: https://faucets.chain.link/sepolia

#### 2. 连接钱包到 Sepolia

1. 打开 MetaMask 或其他钱包
2. 切换网络到 "Sepolia Test Network"
3. 如果没有该网络，手动添加：
   - 网络名称: Sepolia
   - RPC URL: https://sepolia.infura.io/v3/YOUR_INFURA_KEY
   - Chain ID: 11155111
   - 货币符号: ETH
   - 区块浏览器: https://sepolia.etherscan.io

#### 3. 访问前端应用

```bash
cd frontend
npm run dev
```

打开 http://localhost:3000，连接钱包并开始使用！

### 🧪 测试合约功能

#### 发送等额红包

```javascript
// 使用 ethers.js 或前端界面
await redPacket.createRedPacket(
  0,              // 等额红包
  5,              // 5个红包
  60,             // 60分钟有效
  "恭喜发财",      // 口令
  { value: parseEther("0.01") }  // 0.01 ETH
);
```

#### 领取红包

```javascript
await redPacket.claimRedPacket(
  0,              // 红包ID
  "恭喜发财"      // 口令
);
```

### 📊 合约统计

您可以通过以下方式查询合约数据：

```javascript
// 获取红包总数
const count = await redPacket.getRedPacketCount();

// 获取红包信息
const info = await redPacket.getRedPacketInfo(packetId);

// 获取用户发送的红包
const sent = await redPacket.getUserSentRedPackets(userAddress);
```

### 🔐 安全提示

1. ✅ 合约已通过 Sourcify、Blockscout 和 Routescan 验证
2. ✅ 源代码完全开源，可在验证链接查看
3. ⚠️ 这是测试网合约，仅用于测试和学习
4. ⚠️ 不要在主网部署前进行充分的安全审计

### 📱 社交分享

分享您的红包给朋友：

```
🧧 我在 Sepolia 测试网创建了一个区块链红包！

合约地址: 0x36dd80B169E4C21Aa0E27DD266b5B3a5555806Ea
红包ID: [您的红包ID]
口令: [您设置的口令]

快来领取吧！需要先获取 Sepolia 测试 ETH：
https://sepoliafaucet.com/
```

### 🛠 开发者资源

#### 合约交互示例

```typescript
import { ethers } from 'ethers';

// 连接到 Sepolia
const provider = new ethers.providers.JsonRpcProvider(
  'https://sepolia.infura.io/v3/YOUR_INFURA_KEY'
);

// 合约实例
const redPacket = new ethers.Contract(
  '0x36dd80B169E4C21Aa0E27DD266b5B3a5555806Ea',
  RED_PACKET_ABI,
  provider
);

// 查询红包信息
const info = await redPacket.getRedPacketInfo(0);
console.log('红包信息:', info);
```

#### The Graph 子图

如果您部署了 The Graph 子图，可以使用 GraphQL 查询数据：

```graphql
{
  redPackets(first: 10, orderBy: createdAt, orderDirection: desc) {
    id
    creator
    packetType
    totalAmount
    totalCount
    remainingCount
    status
  }
}
```

### 🎉 下一步

1. ✅ 合约已部署并验证
2. ✅ 前端配置已更新
3. ✅ The Graph 配置已更新
4. 📝 获取测试 ETH
5. 🧪 测试所有功能
6. 🚀 邀请朋友一起测试！

### 💡 常见问题

**Q: 如何获取测试 ETH？**
A: 访问 https://sepoliafaucet.com/ 输入您的钱包地址即可领取。

**Q: 交易失败怎么办？**
A: 检查是否有足够的测试 ETH，确认网络是 Sepolia，查看错误信息。

**Q: 红包可以退款吗？**
A: 是的，过期后创建者可以调用 `refundExpiredRedPacket` 退款。

**Q: 支持主网吗？**
A: 当前仅部署在测试网，主网部署需要经过专业安全审计。

### 📞 联系方式

如有问题或建议，欢迎：
- 提交 GitHub Issue
- 在区块浏览器查看合约交互
- 查看详细文档 USAGE.md

---

**祝您使用愉快！🎊**
