// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title RedPacket - 区块链红包合约
 * @notice 支持发红包、领红包、AA收款、众筹收款等功能
 * @dev 实现了等额红包、随机红包、AA收款、众筹收款以及超时退款机制
 */
contract RedPacket {

    // ============ 枚举定义 ============

    /**
     * @notice 红包类型
     * @dev EQUAL: 等额红包, RANDOM: 随机红包
     */
    enum PacketType { EQUAL, RANDOM }

    /**
     * @notice 收款类型
     * @dev AA: AA收款(等额), CROWDFUND: 众筹收款(任意金额)
     */
    enum CollectionType { AA, CROWDFUND }

    /**
     * @notice 活动状态
     * @dev ACTIVE: 进行中, EXPIRED: 已过期, COMPLETED: 已完成
     */
    enum Status { ACTIVE, EXPIRED, COMPLETED }

    // ============ 结构体定义 ============

    /**
     * @notice 红包信息结构体
     * @param creator 红包创建者地址
     * @param packetType 红包类型（等额/随机）
     * @param totalAmount 红包总金额
     * @param totalCount 红包总个数
     * @param remainingAmount 剩余金额
     * @param remainingCount 剩余个数
     * @param deadline 过期时间戳
     * @param password 红包口令（哈希值）
     * @param status 红包状态
     * @param claimers 已领取用户列表
     */
    struct RedPacketInfo {
        address creator;
        PacketType packetType;
        uint256 totalAmount;
        uint256 totalCount;
        uint256 remainingAmount;
        uint256 remainingCount;
        uint256 deadline;
        bytes32 password;
        Status status;
        address[] claimers;
    }

    /**
     * @notice 收款信息结构体
     * @param creator 收款发起者
     * @param collectionType 收款类型（AA/众筹）
     * @param targetAmount 目标金额（AA模式下为单人金额，众筹模式下为总目标）
     * @param targetCount 目标人数（仅AA模式）
     * @param currentAmount 当前已收金额
     * @param currentCount 当前参与人数
     * @param deadline 过期时间戳
     * @param password 收款口令（哈希值）
     * @param status 收款状态
     * @param contributors 参与者列表
     */
    struct CollectionInfo {
        address creator;
        CollectionType collectionType;
        uint256 targetAmount;
        uint256 targetCount;
        uint256 currentAmount;
        uint256 currentCount;
        uint256 deadline;
        bytes32 password;
        Status status;
        address[] contributors;
    }

    // ============ 状态变量 ============

    // 红包ID计数器
    uint256 private redPacketCounter;

    // 收款ID计数器
    uint256 private collectionCounter;

    // 红包ID => 红包信息
    mapping(uint256 => RedPacketInfo) public redPackets;

    // 收款ID => 收款信息
    mapping(uint256 => CollectionInfo) public collections;

    // 红包ID => 用户地址 => 领取金额
    mapping(uint256 => mapping(address => uint256)) public redPacketClaims;

    // 收款ID => 用户地址 => 支付金额
    mapping(uint256 => mapping(address => uint256)) public collectionPayments;

    // 用户地址 => 发送的红包ID列表
    mapping(address => uint256[]) public userSentRedPackets;

    // 用户地址 => 领取的红包ID列表
    mapping(address => uint256[]) public userClaimedRedPackets;

    // 用户地址 => 发起的收款ID列表
    mapping(address => uint256[]) public userCreatedCollections;

    // 用户地址 => 参与的收款ID列表
    mapping(address => uint256[]) public userPaidCollections;

    // ============ 事件定义 ============

    /**
     * @notice 创建红包事件
     * @param packetId 红包ID
     * @param creator 创建者地址
     * @param packetType 红包类型
     * @param totalAmount 总金额
     * @param totalCount 总个数
     * @param deadline 过期时间
     */
    event RedPacketCreated(
        uint256 indexed packetId,
        address indexed creator,
        PacketType packetType,
        uint256 totalAmount,
        uint256 totalCount,
        uint256 deadline
    );

    /**
     * @notice 领取红包事件
     * @param packetId 红包ID
     * @param claimer 领取者地址
     * @param amount 领取金额
     */
    event RedPacketClaimed(
        uint256 indexed packetId,
        address indexed claimer,
        uint256 amount
    );

    /**
     * @notice 红包退款事件
     * @param packetId 红包ID
     * @param creator 创建者地址
     * @param refundAmount 退款金额
     */
    event RedPacketRefunded(
        uint256 indexed packetId,
        address indexed creator,
        uint256 refundAmount
    );

    /**
     * @notice 创建收款事件
     * @param collectionId 收款ID
     * @param creator 创建者地址
     * @param collectionType 收款类型
     * @param targetAmount 目标金额
     * @param deadline 过期时间
     */
    event CollectionCreated(
        uint256 indexed collectionId,
        address indexed creator,
        CollectionType collectionType,
        uint256 targetAmount,
        uint256 deadline
    );

    /**
     * @notice 参与收款事件
     * @param collectionId 收款ID
     * @param contributor 参与者地址
     * @param amount 支付金额
     */
    event CollectionPaid(
        uint256 indexed collectionId,
        address indexed contributor,
        uint256 amount
    );

    /**
     * @notice 收款完成事件
     * @param collectionId 收款ID
     * @param creator 创建者地址
     * @param totalAmount 总金额
     */
    event CollectionCompleted(
        uint256 indexed collectionId,
        address indexed creator,
        uint256 totalAmount
    );

    /**
     * @notice 收款退款事件
     * @param collectionId 收款ID
     * @param contributor 参与者地址
     * @param refundAmount 退款金额
     */
    event CollectionRefunded(
        uint256 indexed collectionId,
        address indexed contributor,
        uint256 refundAmount
    );

    // ============ 修饰符 ============

    /**
     * @notice 检查红包是否存在
     */
    modifier redPacketExists(uint256 _packetId) {
        require(_packetId < redPacketCounter, "Red packet does not exist");
        _;
    }

    /**
     * @notice 检查收款是否存在
     */
    modifier collectionExists(uint256 _collectionId) {
        require(_collectionId < collectionCounter, "Collection does not exist");
        _;
    }

    // ============ 红包相关函数 ============

    /**
     * @notice 创建红包
     * @param _packetType 红包类型（0=等额, 1=随机）
     * @param _totalCount 红包个数（最少1个）
     * @param _duration 有效时长（分钟）
     * @param _password 红包口令（明文）
     * @return packetId 红包ID
     */
    function createRedPacket(
        PacketType _packetType,
        uint256 _totalCount,
        uint256 _duration,
        string memory _password
    ) external payable returns (uint256) {
        require(msg.value > 0, "Amount must be greater than 0");
        require(_totalCount >= 1, "Count must be at least 1");
        require(_duration > 0, "Duration must be greater than 0");
        require(bytes(_password).length > 0, "Password cannot be empty");

        uint256 packetId = redPacketCounter++;
        uint256 deadline = block.timestamp + (_duration * 1 minutes);
        bytes32 passwordHash = keccak256(abi.encodePacked(_password));

        RedPacketInfo storage packet = redPackets[packetId];
        packet.creator = msg.sender;
        packet.packetType = _packetType;
        packet.totalAmount = msg.value;
        packet.totalCount = _totalCount;
        packet.remainingAmount = msg.value;
        packet.remainingCount = _totalCount;
        packet.deadline = deadline;
        packet.password = passwordHash;
        packet.status = Status.ACTIVE;

        userSentRedPackets[msg.sender].push(packetId);

        emit RedPacketCreated(
            packetId,
            msg.sender,
            _packetType,
            msg.value,
            _totalCount,
            deadline
        );

        return packetId;
    }

    /**
     * @notice 领取红包
     * @param _packetId 红包ID
     * @param _password 红包口令
     */
    function claimRedPacket(uint256 _packetId, string memory _password)
        external
        redPacketExists(_packetId)
    {
        RedPacketInfo storage packet = redPackets[_packetId];

        // 验证红包状态
        require(packet.status == Status.ACTIVE, "Red packet is not active");
        require(block.timestamp <= packet.deadline, "Red packet has expired");
        require(packet.remainingCount > 0, "No red packets remaining");
        require(redPacketClaims[_packetId][msg.sender] == 0, "Already claimed");

        // 验证口令
        bytes32 passwordHash = keccak256(abi.encodePacked(_password));
        require(passwordHash == packet.password, "Invalid password");

        // 计算领取金额
        uint256 claimAmount;
        if (packet.packetType == PacketType.EQUAL) {
            // 等额红包：平均分配
            claimAmount = packet.totalAmount / packet.totalCount;
        } else {
            // 随机红包：使用随机算法
            claimAmount = _getRandomAmount(
                _packetId,
                packet.remainingAmount,
                packet.remainingCount
            );
        }

        // 更新状态
        packet.remainingAmount -= claimAmount;
        packet.remainingCount -= 1;
        redPacketClaims[_packetId][msg.sender] = claimAmount;
        packet.claimers.push(msg.sender);
        userClaimedRedPackets[msg.sender].push(_packetId);

        // 如果领完了，标记为完成
        if (packet.remainingCount == 0) {
            packet.status = Status.COMPLETED;
        }

        // 转账
        (bool success, ) = payable(msg.sender).call{value: claimAmount}("");
        require(success, "Transfer failed");

        emit RedPacketClaimed(_packetId, msg.sender, claimAmount);
    }

    /**
     * @notice 红包过期退款
     * @param _packetId 红包ID
     */
    function refundExpiredRedPacket(uint256 _packetId)
        external
        redPacketExists(_packetId)
    {
        RedPacketInfo storage packet = redPackets[_packetId];

        require(packet.creator == msg.sender, "Only creator can refund");
        require(block.timestamp > packet.deadline, "Red packet not expired yet");
        require(packet.status == Status.ACTIVE, "Red packet already processed");
        require(packet.remainingAmount > 0, "No amount to refund");

        uint256 refundAmount = packet.remainingAmount;
        packet.remainingAmount = 0;
        packet.status = Status.EXPIRED;

        // 转账退款
        (bool success, ) = payable(msg.sender).call{value: refundAmount}("");
        require(success, "Refund failed");

        emit RedPacketRefunded(_packetId, msg.sender, refundAmount);
    }

    /**
     * @notice 获取随机金额（随机红包算法）
     * @param _packetId 红包ID
     * @param _remainingAmount 剩余金额
     * @param _remainingCount 剩余个数
     * @return amount 随机金额
     */
    function _getRandomAmount(
        uint256 _packetId,
        uint256 _remainingAmount,
        uint256 _remainingCount
    ) private view returns (uint256) {
        if (_remainingCount == 1) {
            return _remainingAmount;
        }

        // 生成伪随机数
        uint256 randomSeed = uint256(
            keccak256(
                abi.encodePacked(
                    block.timestamp,
                    block.prevrandao,
                    msg.sender,
                    _packetId,
                    _remainingCount
                )
            )
        );

        // 计算随机金额：范围是 [1, (剩余金额 / 剩余个数) * 2]
        uint256 maxAmount = (_remainingAmount / _remainingCount) * 2;
        uint256 amount = (randomSeed % maxAmount) + 1;

        // 确保至少留1 wei给后面的人
        if (amount >= _remainingAmount) {
            amount = _remainingAmount - (_remainingCount - 1);
        }

        return amount;
    }

    // ============ 收款相关函数 ============

    /**
     * @notice 创建收款
     * @param _collectionType 收款类型（0=AA, 1=众筹）
     * @param _targetAmount AA模式下为单人金额，众筹模式下为总目标金额
     * @param _targetCount 目标人数（仅AA模式有效）
     * @param _duration 有效时长（分钟）
     * @param _password 收款口令
     * @return collectionId 收款ID
     */
    function createCollection(
        CollectionType _collectionType,
        uint256 _targetAmount,
        uint256 _targetCount,
        uint256 _duration,
        string memory _password
    ) external returns (uint256) {
        require(_targetAmount > 0, "Target amount must be greater than 0");
        require(_duration > 0, "Duration must be greater than 0");
        require(bytes(_password).length > 0, "Password cannot be empty");

        if (_collectionType == CollectionType.AA) {
            require(_targetCount > 0, "Target count must be greater than 0 for AA");
        }

        uint256 collectionId = collectionCounter++;
        uint256 deadline = block.timestamp + (_duration * 1 minutes);
        bytes32 passwordHash = keccak256(abi.encodePacked(_password));

        CollectionInfo storage collection = collections[collectionId];
        collection.creator = msg.sender;
        collection.collectionType = _collectionType;
        collection.targetAmount = _targetAmount;
        collection.targetCount = _targetCount;
        collection.currentAmount = 0;
        collection.currentCount = 0;
        collection.deadline = deadline;
        collection.password = passwordHash;
        collection.status = Status.ACTIVE;

        userCreatedCollections[msg.sender].push(collectionId);

        emit CollectionCreated(
            collectionId,
            msg.sender,
            _collectionType,
            _targetAmount,
            deadline
        );

        return collectionId;
    }

    /**
     * @notice 参与收款
     * @param _collectionId 收款ID
     * @param _password 收款口令
     */
    function payCollection(uint256 _collectionId, string memory _password)
        external
        payable
        collectionExists(_collectionId)
    {
        CollectionInfo storage collection = collections[_collectionId];

        // 验证状态
        require(collection.status == Status.ACTIVE, "Collection is not active");
        require(block.timestamp <= collection.deadline, "Collection has expired");
        require(collectionPayments[_collectionId][msg.sender] == 0, "Already paid");
        require(msg.value > 0, "Payment must be greater than 0");

        // 验证口令
        bytes32 passwordHash = keccak256(abi.encodePacked(_password));
        require(passwordHash == collection.password, "Invalid password");

        // AA模式验证金额
        if (collection.collectionType == CollectionType.AA) {
            require(msg.value == collection.targetAmount, "Must pay exact AA amount");
            require(collection.currentCount < collection.targetCount, "AA collection full");
        }

        // 更新状态
        collectionPayments[_collectionId][msg.sender] = msg.value;
        collection.contributors.push(msg.sender);
        collection.currentAmount += msg.value;
        collection.currentCount += 1;
        userPaidCollections[msg.sender].push(_collectionId);

        emit CollectionPaid(_collectionId, msg.sender, msg.value);

        // 检查是否完成
        bool isCompleted = false;
        if (collection.collectionType == CollectionType.AA) {
            // AA模式：达到目标人数即完成
            if (collection.currentCount >= collection.targetCount) {
                isCompleted = true;
            }
        } else {
            // 众筹模式：达到目标金额即完成
            if (collection.currentAmount >= collection.targetAmount) {
                isCompleted = true;
            }
        }

        if (isCompleted) {
            collection.status = Status.COMPLETED;
            _settleCollection(_collectionId);
        }
    }

    /**
     * @notice 结算收款（转给创建者）
     * @param _collectionId 收款ID
     */
    function _settleCollection(uint256 _collectionId) private {
        CollectionInfo storage collection = collections[_collectionId];

        uint256 totalAmount = collection.currentAmount;

        // 转账给创建者
        (bool success, ) = payable(collection.creator).call{value: totalAmount}("");
        require(success, "Settlement transfer failed");

        emit CollectionCompleted(_collectionId, collection.creator, totalAmount);
    }

    /**
     * @notice 处理过期的收款
     * @param _collectionId 收款ID
     */
    function handleExpiredCollection(uint256 _collectionId)
        external
        collectionExists(_collectionId)
    {
        CollectionInfo storage collection = collections[_collectionId];

        require(block.timestamp > collection.deadline, "Collection not expired yet");
        require(collection.status == Status.ACTIVE, "Collection already processed");

        collection.status = Status.EXPIRED;

        if (collection.collectionType == CollectionType.AA) {
            // AA模式：未收满不退回，直接给创建者
            if (collection.currentAmount > 0) {
                uint256 totalAmount = collection.currentAmount;
                (bool success, ) = payable(collection.creator).call{value: totalAmount}("");
                require(success, "Transfer to creator failed");

                emit CollectionCompleted(_collectionId, collection.creator, totalAmount);
            }
        } else {
            // 众筹模式：未收满则退回给所有参与者
            if (collection.currentAmount < collection.targetAmount) {
                for (uint256 i = 0; i < collection.contributors.length; i++) {
                    address contributor = collection.contributors[i];
                    uint256 refundAmount = collectionPayments[_collectionId][contributor];

                    if (refundAmount > 0) {
                        collectionPayments[_collectionId][contributor] = 0;
                        (bool success, ) = payable(contributor).call{value: refundAmount}("");
                        require(success, "Refund failed");

                        emit CollectionRefunded(_collectionId, contributor, refundAmount);
                    }
                }
                collection.currentAmount = 0;
            } else {
                // 已达目标，转给创建者
                uint256 totalAmount = collection.currentAmount;
                (bool success, ) = payable(collection.creator).call{value: totalAmount}("");
                require(success, "Transfer to creator failed");

                emit CollectionCompleted(_collectionId, collection.creator, totalAmount);
            }
        }
    }

    // ============ 查询函数 ============

    /**
     * @notice 获取红包详细信息
     * @param _packetId 红包ID
     */
    function getRedPacketInfo(uint256 _packetId)
        external
        view
        redPacketExists(_packetId)
        returns (
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
    {
        RedPacketInfo storage packet = redPackets[_packetId];
        return (
            packet.creator,
            packet.packetType,
            packet.totalAmount,
            packet.totalCount,
            packet.remainingAmount,
            packet.remainingCount,
            packet.deadline,
            packet.status,
            packet.claimers
        );
    }

    /**
     * @notice 获取收款详细信息
     * @param _collectionId 收款ID
     */
    function getCollectionInfo(uint256 _collectionId)
        external
        view
        collectionExists(_collectionId)
        returns (
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
    {
        CollectionInfo storage collection = collections[_collectionId];
        return (
            collection.creator,
            collection.collectionType,
            collection.targetAmount,
            collection.targetCount,
            collection.currentAmount,
            collection.currentCount,
            collection.deadline,
            collection.status,
            collection.contributors
        );
    }

    /**
     * @notice 获取用户发送的红包列表
     * @param _user 用户地址
     */
    function getUserSentRedPackets(address _user)
        external
        view
        returns (uint256[] memory)
    {
        return userSentRedPackets[_user];
    }

    /**
     * @notice 获取用户领取的红包列表
     * @param _user 用户地址
     */
    function getUserClaimedRedPackets(address _user)
        external
        view
        returns (uint256[] memory)
    {
        return userClaimedRedPackets[_user];
    }

    /**
     * @notice 获取用户发起的收款列表
     * @param _user 用户地址
     */
    function getUserCreatedCollections(address _user)
        external
        view
        returns (uint256[] memory)
    {
        return userCreatedCollections[_user];
    }

    /**
     * @notice 获取用户参与的收款列表
     * @param _user 用户地址
     */
    function getUserPaidCollections(address _user)
        external
        view
        returns (uint256[] memory)
    {
        return userPaidCollections[_user];
    }

    /**
     * @notice 获取红包总数
     */
    function getRedPacketCount() external view returns (uint256) {
        return redPacketCounter;
    }

    /**
     * @notice 获取收款总数
     */
    function getCollectionCount() external view returns (uint256) {
        return collectionCounter;
    }
}
