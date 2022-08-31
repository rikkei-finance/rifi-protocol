const fs = require("fs");
const hre = require("hardhat");
const {
  ethers,
  hardhatArguments: { network },
} = hre;

// console.log(hre.hardhatArguments);
// console.log(hre.config);

const addressOutput = `${__dirname}/networks/${network}/address.json`;
const deployConfig = `${__dirname}/networks/${network}/config.json`;
const deployProgress = `${__dirname}/networks/${network}/progress.json`;

const explorers = {
  bsc_mainnet: "https://bscscan.com",
  eth_mainnet: "https://etherscan.io",
  bsc_testnet: "https://testnet.bscscan.com",
  ropsten: "https://ropsten.etherscan.io",
  rinkeby: "https://rinkeby.etherscan.io",
  kovan: "https://kovan.etherscan.io",
  astar: "https://blockscout.com/astar",
};

async function main() {
  const accounts = await ethers.getSigners();

  const addresses = {};
  const config = {};
  const progress = {};

  const explorer = explorers[network];

  const [
    Liquidate
  ] = await Promise.all([
    ethers.getContractFactory("Liquidate"),
  ]);

  const saveAddresses = async () => {
    await fs.promises.writeFile(addressOutput, JSON.stringify(addresses, null, 2));
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

  const progressData = fs.readFileSync(deployProgress);
  Object.assign(progress, JSON.parse(progressData.toString()));

  console.log("Deploying...");
  try {
    let liquidate;
    await runWithProgressCheck("Liquidate", async () => {
      const { WASTR, exchange, lendingPoolProvider } = config;
      const rASTR = addresses.rASTR;
      liquidate = await Liquidate.deploy(lendingPoolProvider, exchange, WASTR, rASTR);
      await liquidate.deployed();
      console.log(`Liquidate address at: ${explorer}/address/${liquidate.address}`);
      addresses.Liquidate = liquidate.address;
    });

    if (!liquidate && !addresses.Liquidate) {
      throw Error("Failed on deploying Liquidate");
    }

    if (!liquidate) {
      liquidate = Liquidate.attach(addresses.Liquidate);
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
