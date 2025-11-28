const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("RedPacket Contract", function () {
  let redPacket;
  let owner, addr1, addr2, addr3;

  beforeEach(async function () {
    [owner, addr1, addr2, addr3] = await ethers.getSigners();

    const RedPacket = await ethers.getContractFactory("RedPacket");
    redPacket = await RedPacket.deploy();
    await redPacket.waitForDeployment();
  });

  describe("红包功能测试", function () {
    const password = "test123";
    const totalAmount = ethers.parseEther("1.0");
    const totalCount = 5;
    const duration = 60; // 60分钟

    describe("创建红包", function () {
      it("应该成功创建等额红包", async function () {
        const tx = await redPacket.createRedPacket(
          0, // EQUAL
          totalCount,
          duration,
          password,
          { value: totalAmount }
        );

        await expect(tx)
          .to.emit(redPacket, "RedPacketCreated")
          .withArgs(0, owner.address, 0, totalAmount, totalCount, await time.latest() + duration * 60);

        const info = await redPacket.getRedPacketInfo(0);
        expect(info.creator).to.equal(owner.address);
        expect(info.totalAmount).to.equal(totalAmount);
        expect(info.totalCount).to.equal(totalCount);
      });

      it("应该成功创建随机红包", async function () {
        await redPacket.createRedPacket(
          1, // RANDOM
          totalCount,
          duration,
          password,
          { value: totalAmount }
        );

        const info = await redPacket.getRedPacketInfo(0);
        expect(info.packetType).to.equal(1); // RANDOM
      });

      it("金额为0时应该失败", async function () {
        await expect(
          redPacket.createRedPacket(0, totalCount, duration, password, { value: 0 })
        ).to.be.revertedWith("Amount must be greater than 0");
      });

      it("红包个数小于1时应该失败", async function () {
        await expect(
          redPacket.createRedPacket(0, 0, duration, password, { value: totalAmount })
        ).to.be.revertedWith("Count must be at least 1");
      });

      it("口令为空时应该失败", async function () {
        await expect(
          redPacket.createRedPacket(0, totalCount, duration, "", { value: totalAmount })
        ).to.be.revertedWith("Password cannot be empty");
      });

      it("创建后应记录在用户发送列表", async function () {
        await redPacket.createRedPacket(0, totalCount, duration, password, { value: totalAmount });
        const sent = await redPacket.getUserSentRedPackets(owner.address);
        expect(sent.length).to.equal(1);
        expect(sent[0]).to.equal(0n);
      });
    });

    describe("领取红包", function () {
      beforeEach(async function () {
        // 创建一个等额红包
        await redPacket.createRedPacket(
          0, // EQUAL
          totalCount,
          duration,
          password,
          { value: totalAmount }
        );
      });

      it("应该成功领取等额红包", async function () {
        const expectedAmount = totalAmount / BigInt(totalCount);

        const balanceBefore = await ethers.provider.getBalance(addr1.address);

        const tx = await redPacket.connect(addr1).claimRedPacket(0, password);
        const receipt = await tx.wait();

        const balanceAfter = await ethers.provider.getBalance(addr1.address);
        const gasUsed = receipt.gasUsed * receipt.gasPrice;

        // 验证余额变化
        expect(balanceAfter - balanceBefore + gasUsed).to.equal(expectedAmount);

        // 验证事件
        await expect(tx)
          .to.emit(redPacket, "RedPacketClaimed")
          .withArgs(0, addr1.address, expectedAmount);

        // 验证红包状态
        const info = await redPacket.getRedPacketInfo(0);
        expect(info.remainingCount).to.equal(totalCount - 1);
      });

      it("错误口令应该失败", async function () {
        await expect(
          redPacket.connect(addr1).claimRedPacket(0, "wrongpassword")
        ).to.be.revertedWith("Invalid password");
      });

      it("重复领取应该失败", async function () {
        await redPacket.connect(addr1).claimRedPacket(0, password);

        await expect(
          redPacket.connect(addr1).claimRedPacket(0, password)
        ).to.be.revertedWith("Already claimed");
      });

      it("领完后应该失败", async function () {
        // 领取所有红包
        await redPacket.connect(addr1).claimRedPacket(0, password);
        await redPacket.connect(addr2).claimRedPacket(0, password);
        await redPacket.connect(addr3).claimRedPacket(0, password);

        const [signer4] = await ethers.getSigners();
        await redPacket.connect(signer4).claimRedPacket(0, password);

        const [, , , , signer5] = await ethers.getSigners();
        await redPacket.connect(signer5).claimRedPacket(0, password);

        // 尝试再领取
        const [, , , , , signer6] = await ethers.getSigners();
        await expect(
          redPacket.connect(signer6).claimRedPacket(0, password)
        ).to.be.revertedWith("No red packets remaining");
      });
    });

    describe("随机红包", function () {
      it("应该能领取随机金额", async function () {
        await redPacket.createRedPacket(
          1, // RANDOM
          3,
          duration,
          password,
          { value: ethers.parseEther("1.0") }
        );

        await redPacket.connect(addr1).claimRedPacket(0, password);
        await redPacket.connect(addr2).claimRedPacket(0, password);
        await redPacket.connect(addr3).claimRedPacket(0, password);

        const info = await redPacket.getRedPacketInfo(0);
        expect(info.remainingCount).to.equal(0);
        expect(info.remainingAmount).to.equal(0);
      });
    });

    describe("红包退款", function () {
      it("过期后应该能退款", async function () {
        await redPacket.createRedPacket(0, totalCount, duration, password, {
          value: totalAmount
        });

        // 快进时间到过期后
        await time.increase(duration * 60 + 1);

        const balanceBefore = await ethers.provider.getBalance(owner.address);

        const tx = await redPacket.refundExpiredRedPacket(0);
        const receipt = await tx.wait();
        const gasUsed = receipt.gasUsed * receipt.gasPrice;

        const balanceAfter = await ethers.provider.getBalance(owner.address);

        // 验证退款金额
        expect(balanceAfter - balanceBefore + gasUsed).to.equal(totalAmount);

        // 验证事件
        await expect(tx)
          .to.emit(redPacket, "RedPacketRefunded")
          .withArgs(0, owner.address, totalAmount);
      });

      it("未过期时退款应该失败", async function () {
        await redPacket.createRedPacket(0, totalCount, duration, password, {
          value: totalAmount
        });

        await expect(
          redPacket.refundExpiredRedPacket(0)
        ).to.be.revertedWith("Red packet not expired yet");
      });

      it("非创建者退款应该失败", async function () {
        await redPacket.createRedPacket(0, totalCount, duration, password, {
          value: totalAmount
        });

        await time.increase(duration * 60 + 1);

        await expect(
          redPacket.connect(addr1).refundExpiredRedPacket(0)
        ).to.be.revertedWith("Only creator can refund");
      });

      it("部分领取后应该退还剩余金额", async function () {
        await redPacket.createRedPacket(0, totalCount, duration, password, {
          value: totalAmount
        });

        // 领取一个红包
        await redPacket.connect(addr1).claimRedPacket(0, password);

        // 快进到过期
        await time.increase(duration * 60 + 1);

        const expectedRefund = totalAmount - (totalAmount / BigInt(totalCount));

        const tx = await redPacket.refundExpiredRedPacket(0);
        await expect(tx)
          .to.emit(redPacket, "RedPacketRefunded")
          .withArgs(0, owner.address, expectedRefund);
      });
    });
  });

  describe("收款功能测试", function () {
    const password = "collection123";
    const duration = 60;

    describe("AA收款", function () {
      const targetAmount = ethers.parseEther("0.1");
      const targetCount = 3;

      beforeEach(async function () {
        await redPacket.createCollection(
          0, // AA
          targetAmount,
          targetCount,
          duration,
          password
        );
      });

      it("应该成功创建AA收款", async function () {
        const info = await redPacket.getCollectionInfo(0);
        expect(info.creator).to.equal(owner.address);
        expect(info.collectionType).to.equal(0); // AA
        expect(info.targetAmount).to.equal(targetAmount);
        expect(info.targetCount).to.equal(targetCount);
      });

      it("应该成功参与AA收款", async function () {
        const tx = await redPacket
          .connect(addr1)
          .payCollection(0, password, { value: targetAmount });

        await expect(tx)
          .to.emit(redPacket, "CollectionPaid")
          .withArgs(0, addr1.address, targetAmount);

        const info = await redPacket.getCollectionInfo(0);
        expect(info.currentCount).to.equal(1);
        expect(info.currentAmount).to.equal(targetAmount);
      });

      it("支付金额不等于目标金额应该失败", async function () {
        await expect(
          redPacket
            .connect(addr1)
            .payCollection(0, password, { value: ethers.parseEther("0.2") })
        ).to.be.revertedWith("Must pay exact AA amount");
      });

      it("达到目标人数后应该自动结算", async function () {
        const balanceBefore = await ethers.provider.getBalance(owner.address);

        await redPacket.connect(addr1).payCollection(0, password, { value: targetAmount });
        await redPacket.connect(addr2).payCollection(0, password, { value: targetAmount });
        await redPacket.connect(addr3).payCollection(0, password, { value: targetAmount });

        const balanceAfter = await ethers.provider.getBalance(owner.address);
        const expectedTotal = targetAmount * BigInt(targetCount);

        expect(balanceAfter - balanceBefore).to.equal(expectedTotal);

        const info = await redPacket.getCollectionInfo(0);
        expect(info.status).to.equal(2); // COMPLETED
      });

      it("超额参与应该失败", async function () {
        await redPacket.connect(addr1).payCollection(0, password, { value: targetAmount });
        await redPacket.connect(addr2).payCollection(0, password, { value: targetAmount });
        await redPacket.connect(addr3).payCollection(0, password, { value: targetAmount });

        const [, , , , addr4] = await ethers.getSigners();
        await expect(
          redPacket.connect(addr4).payCollection(0, password, { value: targetAmount })
        ).to.be.revertedWith("Collection is not active");
      });

      it("过期未收满应该转给创建者", async function () {
        await redPacket.connect(addr1).payCollection(0, password, { value: targetAmount });

        // 快进到过期
        await time.increase(duration * 60 + 1);

        const balanceBefore = await ethers.provider.getBalance(owner.address);

        // 使用其他地址触发过期处理，避免创建者因交易气费影响余额断言
        await redPacket.connect(addr2).handleExpiredCollection(0);

        const balanceAfter = await ethers.provider.getBalance(owner.address);

        // AA模式：未收满也给创建者
        expect(balanceAfter - balanceBefore).to.equal(targetAmount);
      });
    });

    describe("众筹收款", function () {
      const targetAmount = ethers.parseEther("1.0");

      beforeEach(async function () {
        await redPacket.createCollection(
          1, // CROWDFUND
          targetAmount,
          0, // 众筹模式不需要targetCount
          duration,
          password
        );
      });

      it("应该成功创建众筹", async function () {
        const info = await redPacket.getCollectionInfo(0);
        expect(info.collectionType).to.equal(1); // CROWDFUND
        expect(info.targetAmount).to.equal(targetAmount);
      });

      it("应该能支付任意金额", async function () {
        const amount1 = ethers.parseEther("0.3");
        const amount2 = ethers.parseEther("0.5");

        await redPacket.connect(addr1).payCollection(0, password, { value: amount1 });
        await redPacket.connect(addr2).payCollection(0, password, { value: amount2 });

        const info = await redPacket.getCollectionInfo(0);
        expect(info.currentAmount).to.equal(amount1 + amount2);
        expect(info.currentCount).to.equal(2);
      });

      it("达到目标金额应该自动结算", async function () {
        const balanceBefore = await ethers.provider.getBalance(owner.address);

        await redPacket
          .connect(addr1)
          .payCollection(0, password, { value: ethers.parseEther("0.6") });
        await redPacket
          .connect(addr2)
          .payCollection(0, password, { value: ethers.parseEther("0.4") });

        const balanceAfter = await ethers.provider.getBalance(owner.address);

        expect(balanceAfter - balanceBefore).to.equal(targetAmount);

        const info = await redPacket.getCollectionInfo(0);
        expect(info.status).to.equal(2); // COMPLETED
      });

      it("过期未达标应该退款", async function () {
        const amount1 = ethers.parseEther("0.3");
        const amount2 = ethers.parseEther("0.2");

        await redPacket.connect(addr1).payCollection(0, password, { value: amount1 });
        await redPacket.connect(addr2).payCollection(0, password, { value: amount2 });

        const balance1Before = await ethers.provider.getBalance(addr1.address);
        const balance2Before = await ethers.provider.getBalance(addr2.address);

        // 快进到过期
        await time.increase(duration * 60 + 1);

        await redPacket.handleExpiredCollection(0);

        const balance1After = await ethers.provider.getBalance(addr1.address);
        const balance2After = await ethers.provider.getBalance(addr2.address);

        // 众筹模式：未达标应该退款
        expect(balance1After - balance1Before).to.equal(amount1);
        expect(balance2After - balance2Before).to.equal(amount2);
      });
    });
  });

  describe("查询功能测试", function () {
    it("应该能查询用户发送的红包", async function () {
      await redPacket.createRedPacket(0, 5, 60, "pass1", {
        value: ethers.parseEther("1.0")
      });
      await redPacket.createRedPacket(1, 3, 60, "pass2", {
        value: ethers.parseEther("0.5")
      });

      const sentPackets = await redPacket.getUserSentRedPackets(owner.address);
      expect(sentPackets.length).to.equal(2);
      expect(sentPackets[0]).to.equal(0);
      expect(sentPackets[1]).to.equal(1);
    });

    it("应该能查询用户领取的红包", async function () {
      await redPacket.createRedPacket(0, 5, 60, "pass1", {
        value: ethers.parseEther("1.0")
      });

      await redPacket.connect(addr1).claimRedPacket(0, "pass1");

      const claimedPackets = await redPacket.getUserClaimedRedPackets(addr1.address);
      expect(claimedPackets.length).to.equal(1);
      expect(claimedPackets[0]).to.equal(0);
    });

    it("应该能查询红包总数", async function () {
      await redPacket.createRedPacket(0, 5, 60, "pass1", {
        value: ethers.parseEther("1.0")
      });
      await redPacket.createRedPacket(1, 3, 60, "pass2", {
        value: ethers.parseEther("0.5")
      });

      const count = await redPacket.getRedPacketCount();
      expect(count).to.equal(2);
    });

    it("应该能查询收款总数", async function () {
      await redPacket.createCollection(0, ethers.parseEther("0.1"), 3, 60, "pass1");
      await redPacket.createCollection(1, ethers.parseEther("1.0"), 0, 60, "pass2");

      const count = await redPacket.getCollectionCount();
      expect(count).to.equal(2);
    });
  });
});
