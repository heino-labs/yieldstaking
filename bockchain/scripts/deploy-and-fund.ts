import { network } from "hardhat";
const { ethers } = await network.connect();
import * as dotenv from "dotenv";

dotenv.config();

/** Admin (owner MockUSDT / Aureus, ADMIN_ROLE staking) */
const ADMIN = "0xbCFA78C21c901ba2466093DD4bF288090FdB0845";

const USERS = [
    "0xeEf28E4C0db920aB5b21ba256fD02F46f7Ed2993", // User1
    "0x47efaC5f4f21e798DE3171B0bf35b5D08636ACA6", // User2
    "0x506cd8Ac772Ceeecc43B2fAD6C9c6528214c0667", // User3
] as const;

/** USDT (6 decimals) mint vào YieldStaking */
const DEFAULT_USDT_TO_STAKING = "5000000";

/** AUR (18 decimals) chuyển cho mỗi user để stake. */
const DEFAULT_AUR_PER_USER = "100000";

async function main() {
    const operator =
        process.env.TN_OPERATOR_ADDRESS?.trim() || ADMIN;

    const usdtToStakingStr =
        process.env.FUND_USDT_TO_STAKING?.trim() || DEFAULT_USDT_TO_STAKING;
    const aurPerUserStr =
        process.env.FUND_AUR_PER_USER?.trim() || DEFAULT_AUR_PER_USER;

    const [deployer] = await ethers.getSigners();
    if (deployer.address.toLowerCase() !== ADMIN.toLowerCase()) {
        throw new Error(
            `PRIVATE_KEY phải là ví Admin (${ADMIN}). Hiện deployer: ${deployer.address}`,
        );
    }

    console.log("🚀 Deploy + fund (Sepolia)\n");
    console.log("Deployer/Admin:", deployer.address);
    console.log("Operator       :", operator);

    // ---------------- MockUSDT ----------------
    const MockUSDT = await ethers.getContractFactory("MockUSDT");
    const usdt = await MockUSDT.deploy(ADMIN);
    await usdt.waitForDeployment();
    const usdtAddr = await usdt.getAddress();

    // ---------------- Aureus ----------------
    const Aureus = await ethers.getContractFactory("Aureus");
    const aureus = await Aureus.deploy(ADMIN);
    await aureus.waitForDeployment();
    const aureusAddr = await aureus.getAddress();

    // ---------------- YieldStaking ----------------
    const YieldStaking = await ethers.getContractFactory("YieldStaking");
    const staking = await YieldStaking.deploy(
        ADMIN,
        operator,
        aureusAddr,
        usdtAddr,
    );
    await staking.waitForDeployment();
    const stakingAddr = await staking.getAddress();

    console.log("\n=== Địa chỉ contract ===");
    console.log("MockUSDT     :", usdtAddr);
    console.log("Aureus       :", aureusAddr);
    console.log("YieldStaking :", stakingAddr);

    const usdtForPool = ethers.parseUnits(usdtToStakingStr, 6);
    const aurPerUser = ethers.parseEther(aurPerUserStr);

    const usdtConn = usdt.connect(deployer);
    const aureusConn = aureus.connect(deployer);

    console.log("\n=== Nạp USDT vào staking (reward pool) ===");
    console.log(`Mint ${usdtToStakingStr} USDT → ${stakingAddr}`);
    await (
        await usdtConn.getFunction("mint")(stakingAddr, usdtForPool)
    ).wait();

    console.log("\n=== Chuyển AUR cho User1–3 (điều kiện stake) ===");
    for (let i = 0; i < USERS.length; i++) {
        const u = USERS[i];
        console.log(`User${i + 1} ${u} ← ${aurPerUserStr} AUR`);
        await (
            await aureusConn.getFunction("transfer")(u, aurPerUser)
        ).wait();
    }

    const adminAurBal = await aureusConn.getFunction("balanceOf")(ADMIN);
    console.log("\n=== Số dư Admin (AUR còn lại) ===");
    console.log(ethers.formatEther(adminAurBal), "AUR");

    console.log("\n--- Copy vào .env backend / frontend ---");
    console.log(`YIELD_STAKING_ADDRESS=${stakingAddr}`);
    console.log(`USDT_ADDRESS=${usdtAddr}`);
    console.log(`AUREUS_ADDRESS=${aureusAddr}`);

    console.log("\n✅ Xong. Nhớ verify contract và cập nhật DB seed.");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
