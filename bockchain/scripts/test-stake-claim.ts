import { network } from "hardhat";
const { ethers } = await network.connect();
import * as dotenv from "dotenv";

dotenv.config();

const DEFAULT_YIELD_STAKING = "0x13C1bB261eBE0bc80C7CD208E72D2F14DB26a7B8";

const DEFAULT_PACKAGE_ID = 1;

const DEFAULT_STAKE_AMOUNT_AUR = "1000";

const STAKING_ABI = [
    "function stake(uint256 amount, uint8 packageId)",
    "function claim(uint8 packageId, uint32 stakeId)",
    "function userStakeCount(address,uint8) view returns (uint32)",
    "function userStakeHistory(address,uint8,uint32) view returns (uint128 balance, uint128 rewardTotal, uint128 rewardClaimed, uint64 lockPeriod, uint32 unlockTimestamp, uint32 lastClaimTimestamp)",
    "function packages(uint8) view returns (uint64 lockPeriod, uint32 apy, bool enabled)",
    "function minStakeAmount() view returns (uint256)",
    "function stakeToken() view returns (address)",
    "function rewardToken() view returns (address)",
    "function paused() view returns (bool)",
] as const;

const ERC20_ABI = [
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function balanceOf(address) view returns (uint256)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
] as const;

function formatDuration(seconds: bigint): string {
    const s = Number(seconds);
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    return `${d}d ${h}h`;
}

async function main() {
    const pk = process.env.PRIVATE_KEY?.trim();
    if (!pk) {
        throw new Error(
            "Thiếu USER_PRIVATE_KEY — dùng private key của một trong User1–3 (đã nhận AUR). Không dùng PRIVATE_KEY của Admin trừ khi bạn tự fund.",
        );
    }

    const stakingAddr =
        process.env.YIELD_STAKING_ADDRESS?.trim() || DEFAULT_YIELD_STAKING;
    const packageId = Number.parseInt(
        process.env.STAKING_PACKAGE_ID?.trim() ?? String(DEFAULT_PACKAGE_ID),
        10,
    );
    if (!Number.isFinite(packageId) || packageId < 0 || packageId > 255) {
        throw new Error("STAKING_PACKAGE_ID không hợp lệ (0–255)");
    }

    const stakeAmountStr =
        process.env.STAKE_AMOUNT_AUR?.trim() || DEFAULT_STAKE_AMOUNT_AUR;
    const stakeAmount = ethers.parseEther(stakeAmountStr);

    const [rpcSigner] = await ethers.getSigners();
    const provider = rpcSigner.provider;
    if (!provider) {
        throw new Error("Không lấy được provider từ mạng Hardhat");
    }

    const user = new ethers.Wallet(pk, provider);
    const net = await provider.getNetwork();
    console.log("ChainId       :", net.chainId.toString());
    console.log("Staker address:", user.address);
    console.log("YieldStaking  :", stakingAddr);
    console.log("packageId     :", packageId, "(gói 1 = index 1 trong contract)");

    const staking = new ethers.Contract(stakingAddr, STAKING_ABI, user);
    const paused = await staking.paused();
    if (paused) {
        throw new Error("Contract đang paused — không stake được.");
    }

    const stakeTokenAddr: string = await staking.stakeToken();
    const rewardTokenAddr: string = await staking.rewardToken();
    const rewardToken = new ethers.Contract(rewardTokenAddr, ERC20_ABI, user);
    const rewardDec = await rewardToken.decimals();
    const minStake = await staking.minStakeAmount();
    const pkg = await staking.packages(packageId);

    if (!pkg.enabled || pkg.lockPeriod === 0n) {
        throw new Error(`Gói ${packageId} không hợp lệ hoặc tắt.`);
    }

    if (stakeAmount < minStake) {
        throw new Error(
            `Số stake ${stakeAmountStr} AUR < minStakeAmount ${ethers.formatEther(minStake)}`,
        );
    }

    const aur = new ethers.Contract(stakeTokenAddr, ERC20_ABI, user);
    const stakeSym = await aur.symbol();
    console.log("\n--- Cấu hình gói ---");
    console.log("Stake token   :", stakeSym, stakeTokenAddr);
    console.log("Reward token  :", rewardTokenAddr);
    console.log("Lock period   :", formatDuration(pkg.lockPeriod), `(${pkg.lockPeriod}s)`);
    console.log("APY (bps)     :", pkg.apy.toString(), `(~${Number(pkg.apy) / 100}%)`);
    console.log("minStake      :", ethers.formatEther(minStake), stakeSym);
    console.log("Stake amount  :", stakeAmountStr, stakeSym);

    const balBefore = await aur.balanceOf(user.address);
    console.log("\nSố dư AUR trước:", ethers.formatEther(balBefore), stakeSym);
    if (balBefore < stakeAmount) {
        throw new Error("Không đủ AUR để stake.");
    }

    const allowance = await aur.allowance(user.address, stakingAddr);
    if (allowance < stakeAmount) {
        console.log("\n→ approve YieldStaking...");
        await (await aur.approve(stakingAddr, ethers.MaxUint256)).wait();
    }

    console.log("\n→ stake()...");
    const stakeTx = await staking.stake(stakeAmount, packageId);
    const stakeRc = await stakeTx.wait();
    console.log("Tx            :", stakeRc?.hash);

    const countAfter = await staking.userStakeCount(user.address, packageId);
    const stakeId = Number(countAfter) - 1;
    if (stakeId < 0) {
        throw new Error("userStakeCount không khớp sau stake");
    }

    const info = await staking.userStakeHistory(user.address, packageId, stakeId);

    console.log("\n=== Thông tin stake (vị trí vừa tạo) ===");
    console.log("stakeId       :", stakeId);
    console.log("balance (principal) :", ethers.formatEther(info.balance), stakeSym);
    console.log(
        "rewardTotal (reward) :",
        ethers.formatUnits(info.rewardTotal, rewardDec),
    );
    console.log(
        "rewardClaimed        :",
        ethers.formatUnits(info.rewardClaimed, rewardDec),
    );
    console.log("unlockTimestamp     :", info.unlockTimestamp.toString(), `(${new Date(Number(info.unlockTimestamp) * 1000).toISOString()})`);

    console.log("\n→ Thử claim() (thường fail ngay sau stake vì chưa có thời gian tích lũy)...");
    try {
        const claimTx = await staking.claim(packageId, stakeId);
        const claimRc = await claimTx.wait();
        console.log("Claim tx        :", claimRc?.hash);
        const infoAfter = await staking.userStakeHistory(
            user.address,
            packageId,
            stakeId,
        );
        console.log(
            "rewardClaimed sau :",
            ethers.formatUnits(infoAfter.rewardClaimed, rewardDec),
        );
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.log("Claim không chạy được (dự kiến trên Sepolia):", msg);
        console.log(
            "Gợi ý: đợi vài block/giây rồi gọi lại claim, hoặc dùng script chỉ claim sau.",
        );
    }

    const balAfter = await aur.balanceOf(user.address);
    console.log("\nSố dư AUR sau stake:", ethers.formatEther(balAfter), stakeSym);
    console.log("\n✅ Xong test stake + thử claim.");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
