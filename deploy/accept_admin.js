const fs = require("fs");
const hre = require("hardhat");
const {
  ethers,
  hardhatArguments: { network },
} = hre;

console.log(hre.hardhatArguments);
// console.log(hre.config);

const addressOutput = `${__dirname}/networks/${network}/address.json`;
const deployConfig = `${__dirname}/networks/${network}/config.json`;
const deployProgress = `${__dirname}/networks/${network}/admin_progress.json`;

const waitTime = 60;
const delay = (n) => new Promise(r => setTimeout(r, n * 1000));

const explorers = {
  bsc_mainnet: "https://bscscan.com",
  eth_mainnet: "https://etherscan.io",
  bsc_testnet: "https://testnet.bscscan.com",
  ropsten: "https://ropsten.etherscan.io",
  rinkeby: "https://rinkeby.etherscan.io",
  kovan: "https://kovan.etherscan.io",
};

async function main() {
  const accounts = await hre.ethers.getSigners();

  const [{ address: governance }] = accounts;

  const addresses = {};
  const config = {};
  const progress = {};

  const explorer = explorers[network];

  const [
    Unitroller,
    SimplePriceOracle,
    RBep20Delegator,
    RBinance,
  ] = await Promise.all([
    ethers.getContractFactory("Unitroller"),
    ethers.getContractFactory("SimplePriceOracle"),
    ethers.getContractFactory("RBep20Delegator"),
    ethers.getContractFactory("RBinance"),
  ]);

  const saveAddresses = async () => {
    await fs.promises.writeFile(deployProgress, JSON.stringify(progress, null, 2));
    await fs.promises.writeFile(deployConfig, JSON.stringify(config, null, 2));
  };

  const runWithProgressCheck = async (tag, func) => {
    if (progress[tag]) {
      console.log(`Skipping '${tag}'.`);
      return;
    }
    console.log(`Running: ${tag}`);
    try {
      if (func.constructor.name === "AsyncFunction") {
        await func();
      } else {
        func();
      }
    } catch (e) {
      throw e;
    }

    progress[tag] = true;
    await saveAddresses();
  };

  console.log("Prepairing...");
  if (fs.existsSync(addressOutput)) {
    const data = fs.readFileSync(addressOutput);
    Object.assign(addresses, JSON.parse(data.toString()));
  }

  const configData = fs.readFileSync(deployConfig);
  Object.assign(config, JSON.parse(configData.toString()));

  if (!config.RIFI) {
    throw new Error("RIFI address is required!");
  }

  const progressData = fs.readFileSync(deployProgress);
  Object.assign(progress, JSON.parse(progressData.toString()));

  console.log(config);
  console.log(addresses);

  console.log("Deploying...");

  const unitroller = Unitroller.attach(addresses.Cointroller);

  await runWithProgressCheck(`Unitroller._acceptAdmin`, async () => {
    const transaction = await unitroller._acceptAdmin();
    console.log(
      `Unitroller._acceptAdmin transaction: ${explorer}/tx/${transaction.hash}`
    );
  });

  const priceFeed = SimplePriceOracle.attach(addresses.PriceFeed);

  await runWithProgressCheck(`PriceFeed._acceptAdmin`, async () => {
    const transaction = await priceFeed._acceptAdmin();
    console.log(
      `PriceFeed._acceptAdmin transaction: ${explorer}/tx/${transaction.hash}`
    );
  });

  try {
    if (config.rNative) {
      const {
        rNative: { symbol },
      } = config;

      await runWithProgressCheck("rNative._acceptAdmin", async () => {
        const rBinance = RBinance.attach(addresses[symbol]);
        const transaction = await rBinance._acceptAdmin();
        console.log(
          `rNative._acceptAdmin transaction: ${explorer}/tx/${transaction.hash}`
        );
      });
    } else {
      console.log("rNative is not configured.");
    }

    const { rTokens = {} } = config;
    const tokens = Object.entries(rTokens);

    if (tokens.length > 0) {
      for (let [, token] of tokens) {
        const {
          name,
          symbol,
        } = token;
        console.log(`Changing admin ${symbol} (${name})`);

        await runWithProgressCheck(`${symbol}._acceptAdmin`, async () => {
          const rBep20Delegator = RBep20Delegator.attach(addresses[symbol]);
          const transaction = await rBep20Delegator._acceptAdmin();
          console.log(
            `${symbol}._acceptAdmin transaction: ${explorer}/tx/${transaction.hash}`
          );
        });
      }
    }
  } catch (e) {
    console.log(e);
    await saveAddresses();
  }

  await saveAddresses();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
