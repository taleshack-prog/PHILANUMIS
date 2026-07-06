const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PhilaNumis MVP - fluxo integrado", function () {
  let core, vault, redemption, quest, usdc;
  let admin, buyer;
  const TOKEN_ID = 1;
  const TOKEN_ID_2 = 2; // segundo item da mesma série, usado nos testes de tier/cashback
  const SERIES_ID = 1;
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
    redemption = await Redemption.deploy(admin.address, await core.getAddress(), await usdc.getAddress(), admin.address);
    await redemption.waitForDeployment();

    const Quest = await ethers.getContractFactory("QuestEngine");
    quest = await Quest.deploy(admin.address, await core.getAddress(), await vault.getAddress());
    await quest.waitForDeployment();

    const MINTER_ROLE = await core.MINTER_ROLE();
    await core.grantRole(MINTER_ROLE, await vault.getAddress());
    await core.grantRole(MINTER_ROLE, await redemption.getAddress());

    const QUEST_ENGINE_ROLE = await vault.QUEST_ENGINE_ROLE();
    await vault.grantRole(QUEST_ENGINE_ROLE, await quest.getAddress());

    await core.createAsset("ipfs://laudo-moeda-1845", TOTAL_FRACTIONS);
    await core.createAsset("ipfs://laudo-moeda-1846", TOTAL_FRACTIONS);
    const NO_CAP = 0n; // testes de fluxo geral não exercitam o teto regulatório
    await vault.initCurve(
      TOKEN_ID,
      ethers.parseUnits("0.001", 6),
      ethers.parseUnits("1", 6),
      await vault.DEFAULT_MINT_FEE_BPS(),
      await vault.DEFAULT_MARKETPLACE_FEE_BPS(),
      NO_CAP
    );
    await vault.initCurve(
      TOKEN_ID_2,
      ethers.parseUnits("0.001", 6),
      ethers.parseUnits("1", 6),
      await vault.DEFAULT_MINT_FEE_BPS(),
      await vault.DEFAULT_MARKETPLACE_FEE_BPS(),
      NO_CAP
    );
    await quest.registerSeries(SERIES_ID, "Imperio do Brasil 1845-1846", [TOKEN_ID, TOKEN_ID_2]);
    await usdc.connect(buyer).approve(await redemption.getAddress(), ethers.MaxUint256);
  });

  it("compra frações via bonding curve e reflete no supply", async function () {
    const [, totalCost] = await vault.quoteBuy(TOKEN_ID, 100n);
    await usdc.connect(buyer).approve(await vault.getAddress(), totalCost);
    await vault.connect(buyer).buy(TOKEN_ID, 100n, totalCost);

    expect(await core.balanceOf(buyer.address, TOKEN_ID)).to.equal(100n);
  });

  it("resgate físico exige 100% das frações e cobra fee de 1%", async function () {
    const [, totalCost] = await vault.quoteBuy(TOKEN_ID, TOTAL_FRACTIONS);
    await usdc.connect(buyer).approve(await vault.getAddress(), totalCost);
    await vault.connect(buyer).buy(TOKEN_ID, TOTAL_FRACTIONS, totalCost);

    const hash = ethers.keccak256(ethers.toUtf8Bytes("endereco-secreto-do-comprador"));
    const appraisalValue = ethers.parseUnits("25000", 6); // referência do laudo, em USDC
    const expectedFee = await redemption.quoteRedemptionFee(appraisalValue);

    const treasuryBalanceBefore = await usdc.balanceOf(admin.address);

    await expect(redemption.connect(buyer).requestRedemption(TOKEN_ID, hash, appraisalValue)).to.not.be.reverted;

    expect(await usdc.balanceOf(admin.address)).to.equal(treasuryBalanceBefore + expectedFee);

    await expect(redemption.connect(admin).confirmRedemption(TOKEN_ID, hash))
      .to.emit(redemption, "RedemptionConfirmed");
  });

  it("rejeita resgate sem 100% das frações", async function () {
    const [, totalCost] = await vault.quoteBuy(TOKEN_ID, 500n);
    await usdc.connect(buyer).approve(await vault.getAddress(), totalCost);
    await vault.connect(buyer).buy(TOKEN_ID, 500n, totalCost);

    const hash = ethers.keccak256(ethers.toUtf8Bytes("qualquer"));
    await expect(redemption.connect(buyer).requestRedemption(TOKEN_ID, hash, ethers.parseUnits("25000", 6)))
      .to.be.revertedWith("precisa deter 100% das fracoes");
  });

  it("tier 50% (Silver) concede 0.5% de desconto na marketplace fee", async function () {
    // Compra qualquer quantidade do primeiro item da série -> 1 de 2 itens = 50% de completude
    const [, totalCost] = await vault.quoteBuy(TOKEN_ID, 10n);
    await usdc.connect(buyer).approve(await vault.getAddress(), totalCost);
    await vault.connect(buyer).buy(TOKEN_ID, 10n, totalCost);

    expect(await quest.completionBps(SERIES_ID, buyer.address)).to.equal(5000n);

    await expect(quest.checkAndAwardBadges(SERIES_ID, buyer.address)).to.emit(quest, "BadgeAwarded");

    const discount = await vault.marketplaceFeeDiscountBps(buyer.address, TOKEN_ID);
    expect(discount).to.equal(await quest.SILVER_MARKETPLACE_DISCOUNT_BPS());

    // Confere que o desconto realmente reduz a fee cobrada na venda
    const [grossFull, netWithDiscount] = await vault.quoteSell(TOKEN_ID, 10n, buyer.address);
    const [, netWithoutDiscount] = await vault.quoteSell(TOKEN_ID, 10n, ethers.ZeroAddress);
    expect(netWithDiscount).to.be.gt(netWithoutDiscount);
    expect(grossFull).to.be.gte(netWithDiscount);
  });

  it("tier 100% (Imperial Curator) concede cashback de 3% do volume comprado, usado na próxima compra", async function () {
    // Compra os dois itens da série -> 100% de completude
    const [, cost1] = await vault.quoteBuy(TOKEN_ID, 10n);
    await usdc.connect(buyer).approve(await vault.getAddress(), cost1);
    await vault.connect(buyer).buy(TOKEN_ID, 10n, cost1);

    const [, cost2] = await vault.quoteBuy(TOKEN_ID_2, 10n);
    await usdc.connect(buyer).approve(await vault.getAddress(), cost2);
    await vault.connect(buyer).buy(TOKEN_ID_2, 10n, cost2);

    expect(await quest.completionBps(SERIES_ID, buyer.address)).to.equal(10_000n);

    await expect(quest.checkAndAwardBadges(SERIES_ID, buyer.address)).to.emit(quest, "BadgeAwarded");

    const expectedCashback = ((cost1 + cost2) * 300n) / 10_000n; // COMPLETION_CASHBACK_BPS = 3%
    expect(await vault.cashbackCredits(buyer.address)).to.equal(expectedCashback);

    // A próxima compra deve consumir o crédito automaticamente
    const [, nextTotalCost] = await vault.quoteBuy(TOKEN_ID, 5n);
    const usdcBalanceBefore = await usdc.balanceOf(buyer.address);
    await usdc.connect(buyer).approve(await vault.getAddress(), nextTotalCost);
    await vault.connect(buyer).buy(TOKEN_ID, 5n, nextTotalCost);
    const usdcBalanceAfter = await usdc.balanceOf(buyer.address);

    const amountActuallyPaid = usdcBalanceBefore - usdcBalanceAfter;
    expect(amountActuallyPaid).to.equal(nextTotalCost - expectedCashback);
  });

  it("teto de captação: permite a compra que cruza o teto, bloqueia a próxima", async function () {
    // Ativo separado só para este teste, com teto baixo pra ser fácil de cruzar
    const TOKEN_ID_CAPPED = 3;
    await core.createAsset("ipfs://laudo-moeda-limitada", TOTAL_FRACTIONS);

    const [, costFor900] = await vault.quoteBuy(TOKEN_ID_CAPPED, 900n);
    const cap = costFor900 / 2n; // teto propositalmente menor que o custo da primeira compra

    await vault.initCurve(
      TOKEN_ID_CAPPED,
      ethers.parseUnits("0.001", 6),
      ethers.parseUnits("1", 6),
      await vault.DEFAULT_MINT_FEE_BPS(),
      await vault.DEFAULT_MARKETPLACE_FEE_BPS(),
      cap
    );

    // Primeira compra cruza o teto, mas deve ser aceita (comportamento definido: conclui a compra
    // em andamento, só bloqueia as próximas)
    await usdc.connect(buyer).approve(await vault.getAddress(), costFor900);
    await expect(vault.connect(buyer).buy(TOKEN_ID_CAPPED, 900n, costFor900)).to.not.be.reverted;

    expect(await vault.totalRaised(TOKEN_ID_CAPPED)).to.be.gt(cap);

    // Segunda compra deve ser bloqueada, já que o teto já foi cruzado
    const [, smallCost] = await vault.quoteBuy(TOKEN_ID_CAPPED, 1n);
    await usdc.connect(buyer).approve(await vault.getAddress(), smallCost);
    await expect(vault.connect(buyer).buy(TOKEN_ID_CAPPED, 1n, smallCost))
      .to.be.revertedWith("teto de captacao atingido para este ativo");
  });
});
