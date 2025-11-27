const hre = require("hardhat");

async function main() {
  console.log("开始部署 RedPacket 合约...");

  // 获取合约工厂
  const RedPacket = await hre.ethers.getContractFactory("RedPacket");

  // 部署合约
  const redPacket = await RedPacket.deploy();

  await redPacket.waitForDeployment();

  const address = await redPacket.getAddress();

  console.log(`RedPacket 合约已部署到: ${address}`);

  // 保存部署信息
  const fs = require('fs');
  const deployInfo = {
    network: hre.network.name,
    contractAddress: address,
    deployTime: new Date().toISOString()
  };

  fs.writeFileSync(
    './deployment.json',
    JSON.stringify(deployInfo, null, 2)
  );

  console.log("部署信息已保存到 deployment.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
