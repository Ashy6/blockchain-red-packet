import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  RedPacketCreated,
  RedPacketClaimed,
  RedPacketRefunded,
  CollectionCreated,
  CollectionPaid,
  CollectionCompleted,
  CollectionRefunded,
} from "../generated/RedPacket/RedPacket";
import {
  RedPacket,
  Claimer,
  Collection,
  Contributor,
  User,
} from "../generated/schema";

// 获取或创建用户
function getOrCreateUser(address: Bytes): User {
  let user = User.load(address.toHexString());
  if (user == null) {
    user = new User(address.toHexString());
    user.address = address;
    user.sentRedPackets = [];
    user.createdCollections = [];
    user.totalSentAmount = BigInt.fromI32(0);
    user.totalClaimedAmount = BigInt.fromI32(0);
    user.totalCollectedAmount = BigInt.fromI32(0);
    user.totalPaidAmount = BigInt.fromI32(0);
    user.save();
  }
  return user;
}

// 处理红包创建事件
export function handleRedPacketCreated(event: RedPacketCreated): void {
  let redPacket = new RedPacket(event.params.packetId.toString());
  redPacket.packetId = event.params.packetId;
  redPacket.creator = event.params.creator;
  redPacket.packetType = event.params.packetType == 0 ? "EQUAL" : "RANDOM";
  redPacket.totalAmount = event.params.totalAmount;
  redPacket.totalCount = event.params.totalCount;
  redPacket.remainingAmount = event.params.totalAmount;
  redPacket.remainingCount = event.params.totalCount;
  redPacket.deadline = event.params.deadline;
  redPacket.status = "ACTIVE";
  redPacket.createdAt = event.block.timestamp;
  redPacket.save();

  // 更新用户信息
  let user = getOrCreateUser(event.params.creator);
  let sentPackets = user.sentRedPackets;
  sentPackets.push(redPacket.id);
  user.sentRedPackets = sentPackets;
  user.totalSentAmount = user.totalSentAmount.plus(event.params.totalAmount);
  user.save();
}

// 处理红包领取事件
export function handleRedPacketClaimed(event: RedPacketClaimed): void {
  let redPacket = RedPacket.load(event.params.packetId.toString());
  if (redPacket != null) {
    redPacket.remainingAmount = redPacket.remainingAmount.minus(
      event.params.amount
    );
    redPacket.remainingCount = redPacket.remainingCount.minus(
      BigInt.fromI32(1)
    );

    if (redPacket.remainingCount == BigInt.fromI32(0)) {
      redPacket.status = "COMPLETED";
      redPacket.completedAt = event.block.timestamp;
    }

    redPacket.save();
  }

  // 创建领取记录
  let claimerId =
    event.params.packetId.toString() +
    "-" +
    event.params.claimer.toHexString();
  let claimer = new Claimer(claimerId);
  claimer.redPacket = event.params.packetId.toString();
  claimer.claimer = event.params.claimer;
  claimer.amount = event.params.amount;
  claimer.claimedAt = event.block.timestamp;
  claimer.save();

  // 更新用户信息
  let user = getOrCreateUser(event.params.claimer);
  user.totalClaimedAmount = user.totalClaimedAmount.plus(event.params.amount);
  user.save();
}

// 处理红包退款事件
export function handleRedPacketRefunded(event: RedPacketRefunded): void {
  let redPacket = RedPacket.load(event.params.packetId.toString());
  if (redPacket != null) {
    redPacket.status = "EXPIRED";
    redPacket.remainingAmount = BigInt.fromI32(0);
    redPacket.completedAt = event.block.timestamp;
    redPacket.save();
  }
}

// 处理收款创建事件
export function handleCollectionCreated(event: CollectionCreated): void {
  let collection = new Collection(event.params.collectionId.toString());
  collection.collectionId = event.params.collectionId;
  collection.creator = event.params.creator;
  collection.collectionType = event.params.collectionType == 0 ? "AA" : "CROWDFUND";
  collection.targetAmount = event.params.targetAmount;
  collection.targetCount = BigInt.fromI32(0); // 需要从合约读取
  collection.currentAmount = BigInt.fromI32(0);
  collection.currentCount = BigInt.fromI32(0);
  collection.deadline = event.params.deadline;
  collection.status = "ACTIVE";
  collection.createdAt = event.block.timestamp;
  collection.save();

  // 更新用户信息
  let user = getOrCreateUser(event.params.creator);
  let createdCollections = user.createdCollections;
  createdCollections.push(collection.id);
  user.createdCollections = createdCollections;
  user.save();
}

// 处理收款支付事件
export function handleCollectionPaid(event: CollectionPaid): void {
  let collection = Collection.load(event.params.collectionId.toString());
  if (collection != null) {
    collection.currentAmount = collection.currentAmount.plus(
      event.params.amount
    );
    collection.currentCount = collection.currentCount.plus(BigInt.fromI32(1));
    collection.save();
  }

  // 创建参与记录
  let contributorId =
    event.params.collectionId.toString() +
    "-" +
    event.params.contributor.toHexString();
  let contributor = new Contributor(contributorId);
  contributor.collection = event.params.collectionId.toString();
  contributor.contributor = event.params.contributor;
  contributor.amount = event.params.amount;
  contributor.paidAt = event.block.timestamp;
  contributor.refunded = false;
  contributor.save();

  // 更新用户信息
  let user = getOrCreateUser(event.params.contributor);
  user.totalPaidAmount = user.totalPaidAmount.plus(event.params.amount);
  user.save();
}

// 处理收款完成事件
export function handleCollectionCompleted(event: CollectionCompleted): void {
  let collection = Collection.load(event.params.collectionId.toString());
  if (collection != null) {
    collection.status = "COMPLETED";
    collection.completedAt = event.block.timestamp;
    collection.save();
  }

  // 更新创建者收款总额
  let user = getOrCreateUser(event.params.creator);
  user.totalCollectedAmount = user.totalCollectedAmount.plus(
    event.params.totalAmount
  );
  user.save();
}

// 处理收款退款事件
export function handleCollectionRefunded(event: CollectionRefunded): void {
  let contributorId =
    event.params.collectionId.toString() +
    "-" +
    event.params.contributor.toHexString();
  let contributor = Contributor.load(contributorId);
  if (contributor != null) {
    contributor.refunded = true;
    contributor.save();
  }

  // 更新用户支付总额（减去退款）
  let user = getOrCreateUser(event.params.contributor);
  user.totalPaidAmount = user.totalPaidAmount.minus(
    event.params.refundAmount
  );
  user.save();

  // 检查是否所有贡献者都退款了
  let collection = Collection.load(event.params.collectionId.toString());
  if (collection != null) {
    collection.status = "EXPIRED";
    collection.currentAmount = BigInt.fromI32(0);
    collection.completedAt = event.block.timestamp;
    collection.save();
  }
}
