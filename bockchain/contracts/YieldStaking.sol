// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {
    SafeERC20
} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {
    IERC20Metadata
} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {
    ReentrancyGuard
} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import "./AccessRoles.sol";

/**
 * @title YieldStaking - Fixed Version
 * @notice Time-locked staking contract with linear reward distribution
 */
contract YieldStaking is
    AccessControl,
    AccessRoles,
    ReentrancyGuard,
    Pausable
{
    using SafeERC20 for IERC20Metadata;

    IERC20Metadata public immutable stakeToken;
    IERC20Metadata public immutable rewardToken;

    // Package config bounds
    uint32 public constant MIN_APY = 100; // 1%
    uint32 public constant MAX_APY = 10_000; // 100%
    uint64 public constant MIN_LOCK_PERIOD = 1 days;
    uint64 public constant MAX_LOCK_PERIOD = 1460 days; // 4 years

    struct StakeInfo {
        uint128 balance; // principal
        uint128 rewardTotal; // total reward for full lock
        uint128 rewardClaimed; // already claimed reward
        uint64 lockPeriod; // snapshot lock period
        uint32 unlockTimestamp; // start + lockPeriod (uint32 safe until 2106)
        uint32 lastClaimTimestamp; // last claim time (uint32 safe until 2106)
    }

    struct PackageConfig {
        uint64 lockPeriod; // seconds
        uint32 apy; // basis points (10000 = 100%)
        bool enabled;
    }

    mapping(uint8 => PackageConfig) public packages;

    mapping(address => mapping(uint8 => uint32)) public userStakeCount;
    mapping(address => mapping(uint8 => mapping(uint32 => StakeInfo)))
        public userStakeHistory;

    mapping(address => uint256) public userTotalStakes;
    mapping(uint8 => uint256) public packageTotalStaked;

    uint256 public totalLocked;
    uint256 public totalRewardDebt;

    uint256 public minStakeAmount;
    uint256 public maxStakePerUser;
    uint256 public maxTotalStakedPerPackage;

    event Staked(
        address indexed user,
        uint8 indexed packageId,
        uint32 stakeId,
        uint256 amount,
        uint256 rewardTotal
    );

    event Claimed(
        address indexed user,
        uint8 indexed packageId,
        uint32 stakeId,
        uint256 amount
    );

    event Withdrawn(
        address indexed user,
        uint8 indexed packageId,
        uint32 stakeId,
        uint256 principal,
        uint256 reward
    );

    event EmergencyWithdrawn(
        address indexed user,
        uint8 indexed packageId,
        uint32 stakeId,
        uint256 principal,
        uint256 rewardPaid,
        uint256 rewardForfeited
    );

    event ExcessRewardWithdrawn(address indexed admin, uint256 amount);

    event PackageUpdated(
        uint8 indexed id,
        uint64 lockPeriod,
        uint32 apy,
        bool enabled
    );

    event MinStakeAmountUpdated(uint256 oldAmount, uint256 newAmount);
    event MaxStakePerUserUpdated(uint256 oldMax, uint256 newMax);
    event MaxTotalStakedPerPackageUpdated(uint256 oldMax, uint256 newMax);

    event ContractInitialized(
        address indexed stakeToken,
        address indexed rewardToken,
        uint256 minStakeAmount,
        address indexed admin,
        address operator
    );

    constructor(
        address admin,
        address operator,
        IERC20Metadata _stakeToken,
        IERC20Metadata _rewardToken
    ) {
        require(admin != address(0) && operator != address(0), "Invalid role");
        require(address(_stakeToken) != address(0), "Invalid stake token");
        require(address(_rewardToken) != address(0), "Invalid reward token");

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, admin);
        _grantRole(OPERATOR_ROLE, operator);
        _setRoleAdmin(OPERATOR_ROLE, ADMIN_ROLE);

        stakeToken = _stakeToken;
        rewardToken = _rewardToken;

        // Validate token decimals
        uint8 stakeDecimals = stakeToken.decimals();
        uint8 rewardDecimals = rewardToken.decimals();
        require(stakeDecimals <= 18, "Stake decimals > 18");
        require(rewardDecimals <= 18, "Reward decimals > 18");

        minStakeAmount = 100 * 10 ** stakeDecimals;

        // default packages with validated bounds
        packages[0] = PackageConfig(90 days, 2000, true);
        packages[1] = PackageConfig(180 days, 2500, true);
        packages[2] = PackageConfig(270 days, 3500, true);
        packages[3] = PackageConfig(360 days, 5000, true);

        emit ContractInitialized(
            address(_stakeToken),
            address(_rewardToken),
            minStakeAmount,
            admin,
            operator
        );
    }

    /* ========================= ADMIN FUNCTIONS ========================= */

    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    function setPackage(
        uint8 id,
        uint64 lockPeriod,
        uint32 apy,
        bool enabled
    ) external onlyRole(ADMIN_ROLE) {
        require(lockPeriod >= MIN_LOCK_PERIOD, "Lock period too short");
        require(lockPeriod <= MAX_LOCK_PERIOD, "Lock period too long");
        require(apy >= MIN_APY, "APY too low");
        require(apy <= MAX_APY, "APY too high");

        packages[id] = PackageConfig(lockPeriod, apy, enabled);
        emit PackageUpdated(id, lockPeriod, apy, enabled);
    }

    function setMinStakeAmount(
        uint256 newAmount
    ) external onlyRole(ADMIN_ROLE) {
        require(newAmount > 0, "Invalid amount");
        emit MinStakeAmountUpdated(minStakeAmount, newAmount);
        minStakeAmount = newAmount;
    }

    function setMaxStakePerUser(uint256 newMax) external onlyRole(ADMIN_ROLE) {
        emit MaxStakePerUserUpdated(maxStakePerUser, newMax);
        maxStakePerUser = newMax;
    }

    function setMaxTotalStakedPerPackage(
        uint256 newMax
    ) external onlyRole(ADMIN_ROLE) {
        emit MaxTotalStakedPerPackageUpdated(maxTotalStakedPerPackage, newMax);
        maxTotalStakedPerPackage = newMax;
    }

    /**
     * @notice Withdraw reward tokens not needed to pay future rewards
     */
    function withdrawExcessReward(
        uint256 amount
    ) external onlyRole(ADMIN_ROLE) {
        uint256 balance = rewardToken.balanceOf(address(this));

        if (address(stakeToken) == address(rewardToken)) {
            require(balance >= totalLocked + totalRewardDebt, "Insolvent");
            uint256 excess = balance - totalLocked - totalRewardDebt;
            require(amount <= excess, "Exceeds excess");
        } else {
            require(balance >= totalRewardDebt, "Insolvent");
            uint256 excess = balance - totalRewardDebt;
            require(amount <= excess, "Exceeds excess");
        }

        rewardToken.safeTransfer(msg.sender, amount);
        emit ExcessRewardWithdrawn(msg.sender, amount);
    }

    /**
     * @notice Stake tokens in a package
     */
    function stake(
        uint256 amount,
        uint8 packageId
    ) external nonReentrant whenNotPaused {
        PackageConfig memory pkg = packages[packageId];
        require(pkg.enabled && pkg.lockPeriod > 0, "Invalid package");
        require(amount >= minStakeAmount, "Below minimum");
        require(amount <= type(uint128).max, "Amount too large");

        if (maxStakePerUser > 0) {
            require(
                userTotalStakes[msg.sender] + amount <= maxStakePerUser,
                "User cap"
            );
        }

        if (maxTotalStakedPerPackage > 0) {
            require(
                packageTotalStaked[packageId] + amount <=
                    maxTotalStakedPerPackage,
                "Package cap"
            );
        }

        require(
            userStakeCount[msg.sender][packageId] < type(uint32).max,
            "StakeId overflow"
        );

        uint256 rewardTotal = Math.mulDiv(
            amount * pkg.apy,
            pkg.lockPeriod,
            365 days * 10_000
        );

        require(rewardTotal <= type(uint128).max, "Reward too large");

        uint256 newTotalRewardDebt = totalRewardDebt + rewardTotal;
        uint256 rewardBalance = rewardToken.balanceOf(address(this));

        if (address(stakeToken) == address(rewardToken)) {
            uint256 requiredBalance = totalLocked + amount + newTotalRewardDebt;
            require(
                rewardBalance >= requiredBalance,
                "Insufficient reward liquidity"
            );
        } else {
            require(
                rewardBalance >= newTotalRewardDebt,
                "Insufficient reward liquidity"
            );
        }

        uint256 balanceBefore = stakeToken.balanceOf(address(this));
        stakeToken.safeTransferFrom(msg.sender, address(this), amount);
        uint256 balanceAfter = stakeToken.balanceOf(address(this));
        uint256 received = balanceAfter - balanceBefore;
        require(received == amount, "Fee-on-transfer not supported");

        totalRewardDebt = newTotalRewardDebt;
        totalLocked += amount;
        userTotalStakes[msg.sender] += amount;
        packageTotalStaked[packageId] += amount;

        uint32 stakeId = userStakeCount[msg.sender][packageId];

        userStakeHistory[msg.sender][packageId][stakeId] = StakeInfo({
            balance: uint128(amount),
            rewardTotal: uint128(rewardTotal),
            rewardClaimed: 0,
            lockPeriod: pkg.lockPeriod,
            unlockTimestamp: uint32(block.timestamp + pkg.lockPeriod),
            lastClaimTimestamp: uint32(block.timestamp)
        });

        userStakeCount[msg.sender][packageId]++;

        emit Staked(msg.sender, packageId, stakeId, amount, rewardTotal);
    }

    /**
     * @notice Claim accumulated rewards
     */
    function claim(
        uint8 packageId,
        uint32 stakeId
    ) external nonReentrant whenNotPaused {
        StakeInfo storage s = userStakeHistory[msg.sender][packageId][stakeId];
        require(s.balance > 0, "No stake");

        uint256 claimUntil = Math.min(block.timestamp, s.unlockTimestamp);
        require(claimUntil > s.lastClaimTimestamp, "Nothing to claim");

        uint256 elapsed = claimUntil - s.lastClaimTimestamp;
        uint256 claimable = (uint256(s.rewardTotal) * elapsed) / s.lockPeriod;
        uint256 remaining = s.rewardTotal - s.rewardClaimed;
        if (claimable > remaining) {
            claimable = remaining;
        }

        require(claimable > 0, "Nothing to claim");

        s.rewardClaimed += uint128(claimable);
        s.lastClaimTimestamp = uint32(claimUntil);
        totalRewardDebt -= claimable;

        rewardToken.safeTransfer(msg.sender, claimable);

        emit Claimed(msg.sender, packageId, stakeId, claimable);
    }

    /**
     * @notice Withdraw principal and remaining rewards after unlock
     */
    function withdraw(
        uint8 packageId,
        uint32 stakeId
    ) external nonReentrant whenNotPaused {
        StakeInfo storage s = userStakeHistory[msg.sender][packageId][stakeId];
        require(s.balance > 0, "No stake");
        require(block.timestamp >= s.unlockTimestamp, "Locked");

        uint256 principal = s.balance;
        uint256 remainingReward = s.rewardTotal - s.rewardClaimed;

        totalRewardDebt -= remainingReward;
        totalLocked -= principal;
        userTotalStakes[msg.sender] -= principal;
        packageTotalStaked[packageId] -= principal;

        delete userStakeHistory[msg.sender][packageId][stakeId];

        stakeToken.safeTransfer(msg.sender, principal);
        if (remainingReward > 0) {
            rewardToken.safeTransfer(msg.sender, remainingReward);
        }

        emit Withdrawn(
            msg.sender,
            packageId,
            stakeId,
            principal,
            remainingReward
        );
    }

    /**
     * @notice Emergency withdraw when contract is paused
     */
    function emergencyWithdraw(
        uint8 packageId,
        uint32 stakeId
    ) external nonReentrant {
        require(paused(), "Not paused");

        StakeInfo storage s = userStakeHistory[msg.sender][packageId][stakeId];
        require(s.balance > 0, "No stake");

        // Calculate rewards earned up to current time (even if not unlocked)
        uint256 claimUntil = Math.min(block.timestamp, s.unlockTimestamp);
        uint256 elapsed = claimUntil > s.lastClaimTimestamp
            ? claimUntil - s.lastClaimTimestamp
            : 0;

        uint256 additionalReward = (uint256(s.rewardTotal) * elapsed) /
            s.lockPeriod;
        uint256 remaining = s.rewardTotal - s.rewardClaimed;
        if (additionalReward > remaining) {
            additionalReward = remaining;
        }

        uint256 totalRewardPaid = s.rewardClaimed + additionalReward;
        uint256 rewardForfeited = s.rewardTotal - totalRewardPaid;

        // Calculate values before state changes
        uint256 principal = s.balance;

        totalRewardDebt -= (s.rewardTotal - s.rewardClaimed);
        totalLocked -= principal;
        userTotalStakes[msg.sender] -= principal;
        packageTotalStaked[packageId] -= principal;

        delete userStakeHistory[msg.sender][packageId][stakeId];

        // Transfer tokens
        stakeToken.safeTransfer(msg.sender, principal);
        if (totalRewardPaid > 0) {
            rewardToken.safeTransfer(msg.sender, totalRewardPaid);
        }

        emit EmergencyWithdrawn(
            msg.sender,
            packageId,
            stakeId,
            principal,
            totalRewardPaid,
            rewardForfeited
        );
    }

    function getClaimableRewardsForStake(
        address user,
        uint8 packageId,
        uint32 stakeId
    ) public view returns (uint256) {
        StakeInfo memory s = userStakeHistory[user][packageId][stakeId];
        if (s.balance == 0) return 0;

        uint256 claimUntil = Math.min(block.timestamp, s.unlockTimestamp);
        if (claimUntil <= s.lastClaimTimestamp) return 0;

        uint256 elapsed = claimUntil - s.lastClaimTimestamp;

        uint256 reward = (uint256(s.rewardTotal) * elapsed) / s.lockPeriod;

        uint256 remaining = s.rewardTotal - s.rewardClaimed;
        return reward > remaining ? remaining : reward;
    }

    function getStakeCount(
        address user,
        uint8 packageId
    ) external view returns (uint32) {
        return userStakeCount[user][packageId];
    }

    /**
     * @notice Check if a stake is active (exists and has balance)
     */
    function isStakeActive(
        address user,
        uint8 packageId,
        uint32 stakeId
    ) external view returns (bool) {
        return userStakeHistory[user][packageId][stakeId].balance > 0;
    }

    /**
     * @notice Get detailed stake information
     */
    function getStakeInfo(
        address user,
        uint8 packageId,
        uint32 stakeId
    )
        external
        view
        returns (
            uint256 principal,
            uint256 rewardTotal,
            uint256 rewardClaimed,
            uint256 claimable,
            uint256 unlockTime,
            bool isUnlocked
        )
    {
        StakeInfo memory s = userStakeHistory[user][packageId][stakeId];

        principal = s.balance;
        rewardTotal = s.rewardTotal;
        rewardClaimed = s.rewardClaimed;
        claimable = getClaimableRewardsForStake(user, packageId, stakeId);
        unlockTime = s.unlockTimestamp;
        isUnlocked = block.timestamp >= s.unlockTimestamp;
    }
}
