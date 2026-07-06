const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PhilaNumis MVP - fluxo integrado", function () {
  let core, vault, redemption, quest, usdc;
  let admin, buyer;
  const TOKEN_ID = 1;
  const TOTAL_FRACTIONS = 1000n;

  beforeEach(async function () {
    [admin, buyer] = await ethers.getSigners();

    // Mock USDC simples (ERC20 padrão de teste)
    const MockUSDC = await ethers.getContractFactory("MockERC20");
    usdc = await MockUSDC.deploy("Mock USDC", "mUSDC", 6);
    await usdc.waitForDeployment();
    await usdc.mint(buyer.address, ethers.parseUnits("1000000", 6));

    const Core = await ethers.getContractFactory("PhilaNumisCore");
    core = await Core.deploy(admin.address);
    await core.waitForDeployment();

    const Vault = await ethers.getContractFactory("LiquidityVault");
    vault = await Vault.deploy(admin.address, await usdc.getAddress(), await core.getAddress(), admin.address);
    await vault.waitForDeployment();

    const Redemption = await ethers.getContractFactory("RedemptionVault");
    redemption = await Redemption.deploy(admin.address, await core.getAddress());
    await redemption.waitForDeployment();

    const Quest = await ethers.getContractFactory("QuestEngine");
    quest = await Quest.deploy(admin.address, await core.getAddress());
    await quest.waitForDeployment();

    const MINTER_ROLE = await core.MINTER_ROLE();
    await core.grantRole(MINTER_ROLE, await vault.getAddress());
    await core.grantRole(MINTER_ROLE, await redemption.getAddress());

    await core.createAsset("ipfs://laudo-moeda-1845", TOTAL_FRACTIONS);
    await vault.initCurve(TOKEN_ID, ethers.parseUnits("0.001", 6), ethers.parseUnits("1", 6), 200);
  });

  it("compra frações via bonding curve e reflete no supply", async function () {
    const [, totalCost] = await vault.quoteBuy(TOKEN_ID, 100n);
    await usdc.connect(buyer).approve(await vault.getAddress(), totalCost);
    await vault.connect(buyer).buy(TOKEN_ID, 100n, totalCost);

    expect(await core.balanceOf(buyer.address, TOKEN_ID)).to.equal(100n);
  });

  it("resgate físico exige 100% das frações", async function () {
    const [, totalCost] = await vault.quoteBuy(TOKEN_ID, TOTAL_FRACTIONS);
    await usdc.connect(buyer).approve(await vault.getAddress(), totalCost);
    await vault.connect(buyer).buy(TOKEN_ID, TOTAL_FRACTIONS, totalCost);

    const hash = ethers.keccak256(ethers.toUtf8Bytes("endereco-secreto-do-comprador"));
    await expect(redemption.connect(buyer).requestRedemption(TOKEN_ID, hash)).to.not.be.reverted;

    await expect(redemption.connect(admin).confirmRedemption(TOKEN_ID, hash))
      .to.emit(redemption, "RedemptionConfirmed");
  });

  it("rejeita resgate sem 100% das frações", async function () {
    const [, totalCost] = await vault.quoteBuy(TOKEN_ID, 500n);
    await usdc.connect(buyer).approve(await vault.getAddress(), totalCost);
    await vault.connect(buyer).buy(TOKEN_ID, 500n, totalCost);

    const hash = ethers.keccak256(ethers.toUtf8Bytes("qualquer"));
    await expect(redemption.connect(buyer).requestRedemption(TOKEN_ID, hash))
      .to.be.revertedWith("precisa deter 100% das fracoes");
  });
});
