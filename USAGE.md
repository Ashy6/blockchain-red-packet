# 区块链红包项目使用指南

## 项目简介

这是一个基于以太坊的去中心化红包应用，支持发红包、领红包、AA收款、众筹收款等功能。

## 功能特性

### 1. 红包功能

- ✅ **等额红包**：红包金额平均分配给每个领取者
- ✅ **随机红包**：红包金额随机分配
- ✅ **口令保护**：通过口令验证领取权限
- ✅ **时限控制**：支持设置红包有效期（分钟为单位）
- ✅ **过期退款**：超时未领完的红包可退回发起者

### 2. 收款功能

- ✅ **AA收款**：每个人支付固定金额，未收满也转给发起者
- ✅ **众筹收款**：支持任意金额，未达标自动退款
- ✅ **实时进度**：可查看当前收款进度
- ✅ **自动结算**：达到目标自动转账给发起者

### 3. 记录查询

- ✅ **发送记录**：查看所有发出的红包和收款
- ✅ **领取记录**：查看所有领取的红包和支付的收款
- ✅ **实时状态**：显示每笔交易的最新状态

## 快速开始

### 1. 安装依赖

```bash
# 安装合约依赖
npm install

# 安装前端依赖
cd frontend
npm install
```

### 2. 编译合约

```bash
# 编译智能合约
npm run compile
```

### 3. 运行测试

```bash
# 运行合约测试
npm run test
```

### 4. 部署合约

```bash
# 启动本地节点
npm run node

# 在新终端部署合约
npm run deploy
```

部署完成后，将合约地址更新到：

- `frontend/src/constants/contracts.ts` 中的 `RED_PACKET_ADDRESS`
- `subgraph/subgraph.yaml` 中的合约地址

### 5. 启动 The Graph（可选）

```bash
# 安装 The Graph 依赖
cd subgraph
npm install

# 代码生成
npm run codegen

# 构建
npm run build

# 部署到本地节点（需要先启动 Graph Node）
npm run create-local
npm run deploy
```

### 6. 启动前端

```bash
cd frontend
npm run dev
```

前端将在 <http://localhost:3000> 启动

## 使用教程

### 发红包

1. 连接钱包
2. 选择"发红包"标签
3. 选择红包类型（等额/随机）
4. 填写总金额、红包个数、有效时长
5. 设置口令
6. 点击"立即发红包"并确认交易
7. 分享红包ID和口令给朋友

### 抢红包

1. 连接钱包
2. 选择"抢红包"标签
3. 输入红包ID
4. 输入口令
5. 点击"立即领取红包"
6. 等待交易确认

### 发起收款

1. 连接钱包
2. 选择"发起收款"
3. 选择收款类型（AA/众筹）
4. 填写目标金额和人数（AA模式）
5. 设置口令
6. 点击"发起收款"
7. 分享收款ID和口令

### 参与收款

1. 连接钱包
2. 选择"参与收款"标签
3. 输入收款ID
4. 填写支付金额（AA模式为固定金额）
5. 输入口令
6. 点击"立即支付"

## 合约接口说明

### 红包相关

#### createRedPacket

创建红包

```solidity
function createRedPacket(
    PacketType _packetType,  // 0=等额, 1=随机
    uint256 _totalCount,     // 红包个数
    uint256 _duration,       // 有效时长（分钟）
    string memory _password  // 口令
) external payable returns (uint256)
```

#### claimRedPacket

领取红包

```solidity
function claimRedPacket(
    uint256 _packetId,      // 红包ID
    string memory _password // 口令
) external
```

#### refundExpiredRedPacket

退款过期红包

```solidity
function refundExpiredRedPacket(
    uint256 _packetId  // 红包ID
) external
```

### 收款相关

#### createCollection

创建收款

```solidity
function createCollection(
    CollectionType _collectionType,  // 0=AA, 1=众筹
    uint256 _targetAmount,           // 目标金额
    uint256 _targetCount,            // 目标人数（AA模式）
    uint256 _duration,               // 有效时长（分钟）
    string memory _password          // 口令
) external returns (uint256)
```

#### payCollection

参与收款

```solidity
function payCollection(
    uint256 _collectionId,   // 收款ID
    string memory _password  // 口令
) external payable
```

#### handleExpiredCollection

处理过期收款

```solidity
function handleExpiredCollection(
    uint256 _collectionId  // 收款ID
) external
```

### 查询相关

#### getRedPacketInfo

获取红包信息

```solidity
function getRedPacketInfo(uint256 _packetId)
    external view returns (
        address creator,
        PacketType packetType,
        uint256 totalAmount,
        uint256 totalCount,
        uint256 remainingAmount,
        uint256 remainingCount,
        uint256 deadline,
        Status status,
        address[] memory claimers
    )
```

#### getCollectionInfo

获取收款信息

```solidity
function getCollectionInfo(uint256 _collectionId)
    external view returns (
        address creator,
        CollectionType collectionType,
        uint256 targetAmount,
        uint256 targetCount,
        uint256 currentAmount,
        uint256 currentCount,
        uint256 deadline,
        Status status,
        address[] memory contributors
    )
```

## 配置说明

### 前端配置

1. **合约地址**
   - 文件：`frontend/src/constants/contracts.ts`
   - 修改 `RED_PACKET_ADDRESS` 为实际部署的合约地址

2. **WalletConnect 项目ID**
   - 文件：`frontend/src/utils/wagmi.ts`
   - 在 <https://cloud.walletconnect.com/> 注册并获取项目ID
   - 修改 `projectId` 为你的项目ID

3. **网络配置**
   - 文件：`frontend/src/utils/wagmi.ts`
   - 可以添加或删除支持的网络

### 子图配置

1. **合约地址**
   - 文件：`subgraph/subgraph.yaml`
   - 修改 `address` 为实际部署的合约地址

2. **网络**
   - 修改 `network` 为目标网络（如 mainnet, sepolia, localhost）

3. **起始区块**
   - 修改 `startBlock` 为合约部署的区块号

## 注意事项

1. **安全性**
   - 口令会被哈希存储在链上
   - 每个地址只能领取一次红包
   - 建议在测试网充分测试后再部署到主网

2. **Gas 费用**
   - 创建红包/收款需要支付 gas 费
   - 领取红包/参与收款也需要支付 gas 费
   - 建议在 gas 费较低时操作

3. **时间限制**
   - 时限以分钟为单位
   - 过期后需手动调用退款函数
   - 建议设置合理的有效时长

4. **金额限制**
   - 红包个数至少为1个
   - 金额必须大于0
   - AA收款必须支付精确金额

## 故障排除

### 合约部署失败

- 检查网络连接
- 确认钱包余额充足
- 验证 hardhat.config.js 配置

### 前端无法连接钱包

- 检查 WalletConnect 项目ID
- 确认浏览器已安装钱包插件
- 尝试切换到支持的网络

### 交易失败

- 检查 gas 费用设置
- 确认合约地址正确
- 查看合约错误信息

### The Graph 同步问题

- 检查 Graph Node 是否运行
- 验证合约地址和 ABI 是否匹配
- 查看子图日志

## 开发指南

### 添加新功能

1. **合约层**
   - 在 `contracts/RedPacket.sol` 添加新函数
   - 添加相应的事件
   - 编写测试用例

2. **前端层**
   - 更新 `frontend/src/constants/contracts.ts` 的 ABI
   - 创建或修改组件
   - 添加状态管理逻辑

3. **子图层**
   - 更新 `subgraph/schema.graphql` 数据模型
   - 修改 `subgraph/src/mapping.ts` 事件处理
   - 重新生成代码并部署

### 测试流程

1. **单元测试**

   ```bash
   npm run test
   ```

2. **集成测试**
   - 启动本地节点
   - 部署合约
   - 在前端进行功能测试

3. **测试网测试**
   - 部署到 Sepolia 测试网
   - 使用测试网 ETH 进行测试
   - 验证所有功能正常

## 许可证

MIT License

## 联系方式

如有问题或建议，请提交 Issue 或 Pull Request。
