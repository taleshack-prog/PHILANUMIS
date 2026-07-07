const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying com a conta:", deployer.address);

  // Endereço do USDC nativo na Base (mainnet). Para Base Sepolia, use o USDC de teste.
  const USDC_BASE_MAINNET = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
  const usdcAddress = hre.network.name === "base" ? USDC_BASE_MAINNET : process.env.TEST_USDC_ADDRESS;

  if (!usdcAddress) {
    throw new Error("Defina TEST_USDC_ADDRESS no .env para redes de teste, ou faça deploy de um mock ERC20 primeiro.");
  }

  // 1. Core
  const Core = await hre.ethers.getContractFactory("PhilaNumisCore");
  const core = await Core.deploy(deployer.address);
  await core.waitForDeployment();
  console.log("PhilaNumisCore:", await core.getAddress());

  // 2. LiquidityVault
  const treasury = process.env.TREASURY_ADDRESS || deployer.address;
  const Vault = await hre.ethers.getContractFactory("LiquidityVault");
  const vault = await Vault.deploy(deployer.address, usdcAddress, await core.getAddress(), treasury);
  await vault.waitForDeployment();
  console.log("LiquidityVault:", await vault.getAddress());

  // 3. FixedPriceSale
  const FixedSale = await hre.ethers.getContractFactory("FixedPriceSale");
  const fixedSale = await FixedSale.deploy(deployer.address, usdcAddress, await core.getAddress(), treasury);
  await fixedSale.waitForDeployment();
  console.log("FixedPriceSale:", await fixedSale.getAddress());

  // 4. RedemptionVault
  const Redemption = await hre.ethers.getContractFactory("RedemptionVault");
  const redemption = await Redemption.deploy(deployer.address, await core.getAddress(), usdcAddress, treasury);
  await redemption.waitForDeployment();
  console.log("RedemptionVault:", await redemption.getAddress());

  // 5. CustodyOracle
  const Oracle = await hre.ethers.getContractFactory("CustodyOracle");
  const oracle = await Oracle.deploy(deployer.address);
  await oracle.waitForDeployment();
  console.log("CustodyOracle:", await oracle.getAddress());

  // 6. QuestEngine
  const Quest = await hre.ethers.getContractFactory("QuestEngine");
  const quest = await Quest.deploy(deployer.address, await core.getAddress(), await vault.getAddress());
  await quest.waitForDeployment();
  console.log("QuestEngine:", await quest.getAddress());

  // --- Wiring de roles ---
  const MINTER_ROLE = await core.MINTER_ROLE();
  const ORACLE_ROLE = await core.ORACLE_ROLE();
  const QUEST_ENGINE_ROLE = await vault.QUEST_ENGINE_ROLE();

  await (await core.grantRole(MINTER_ROLE, await vault.getAddress())).wait();
  await (await core.grantRole(MINTER_ROLE, await fixedSale.getAddress())).wait();
  await (await core.grantRole(MINTER_ROLE, await redemption.getAddress())).wait();
  await (await vault.grantRole(QUEST_ENGINE_ROLE, await quest.getAddress())).wait();
  console.log("MINTER_ROLE concedido a LiquidityVault, FixedPriceSale e RedemptionVault.");
  console.log("QUEST_ENGINE_ROLE concedido a QuestEngine no LiquidityVault.");

  // ORACLE_ROLE do Core precisa ir para o RedemptionVault — é ele quem chama markAsRedeemed()
  // dentro de confirmRedemption(), depois que o custodiante confirma o hash de envio.
  // Também concedida ao deployer para permitir attestações manuais/testes emergenciais.
  await (await core.grantRole(ORACLE_ROLE, await redemption.getAddress())).wait();
  await (await core.grantRole(ORACLE_ROLE, deployer.address)).wait();

  console.log("\nDeploy completo. Endereços:");
  console.log({
    core: await core.getAddress(),
    vault: await vault.getAddress(),
    fixedSale: await fixedSale.getAddress(),
    redemption: await redemption.getAddress(),
    oracle: await oracle.getAddress(),
    quest: await quest.getAddress(),
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
