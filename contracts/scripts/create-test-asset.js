const hre = require("hardhat");

async function main() {
  const coreAddress = "0xb5A9b5111933f0D385BD8CA5c78EA100F49D0ad0";
  const vaultAddress = "0x0c37C60B0752FeDa700D6380577e96A64B5E68Eb";

  const core = await hre.ethers.getContractAt("PhilaNumisCore", coreAddress);
  const vault = await hre.ethers.getContractAt("LiquidityVault", vaultAddress);

  const totalFractions = 1000n;
  console.log("Criando ativo de teste...");
  const createTx = await core.createAsset("ipfs://laudo-moeda-teste-1889", totalFractions);
  await createTx.wait();

  const tokenId = await core.tokenCounter();
  console.log("Ativo criado com tokenId:", tokenId.toString());

  const m = hre.ethers.parseUnits("0.001", 6);
  const b = hre.ethers.parseUnits("1", 6);
  const mintFeeBps = await vault.DEFAULT_MINT_FEE_BPS();
  const marketplaceFeeBps = await vault.DEFAULT_MARKETPLACE_FEE_BPS();

  console.log("Inicializando bonding curve...");
  const curveTx = await vault.initCurve(tokenId, m, b, mintFeeBps, marketplaceFeeBps, 0n);
  await curveTx.wait();

  console.log("Pronto! Ativo", tokenId.toString(), "à venda via bonding curve.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
