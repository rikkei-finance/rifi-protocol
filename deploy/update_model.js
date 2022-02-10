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
const deployProgress = `${__dirname}/networks/${network}/model_progress.json`;

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
    JumpRateModel,
    LegacyJumpRateModel,
    RBep20Delegator,
    RBinance,
  ] = await Promise.all([
    ethers.getContractFactory("JumpRateModel"),
    ethers.getContractFactory("LegacyJumpRateModel"),
    ethers.getContractFactory("RBep20Delegate"),
    ethers.getContractFactory("RBep20Delegator"),
    ethers.getContractFactory("RBinance"),
  ]);

  const deployJumpRateModel = async (params) => {
    const {
      baseRatePerYear,
      lowerBaseRatePerYear,
      multiplierPerYear,
      jumpMultiplierPerYear,
      kink_,
      lowerKink_,
    } = params;
    const model = await JumpRateModel.deploy(
      web3.utils.toWei(baseRatePerYear, "ether"),
      web3.utils.toWei(lowerBaseRatePerYear, "ether"),
      web3.utils.toWei(multiplierPerYear, "ether"),
      web3.utils.toWei(jumpMultiplierPerYear, "ether"),
      web3.utils.toWei(kink_, "ether"),
      web3.utils.toWei(lowerKink_, "ether"),
      governance
    );

    await model.deployed();

    try {
      await hre.run("verify:verify", {
        address: model.address,
        constructorArguments: [
          web3.utils.toWei(baseRatePerYear, "ether"),
          web3.utils.toWei(lowerBaseRatePerYear, "ether"),
          web3.utils.toWei(multiplierPerYear, "ether"),
          web3.utils.toWei(jumpMultiplierPerYear, "ether"),
          web3.utils.toWei(kink_, "ether"),
          web3.utils.toWei(lowerKink_, "ether"),
          governance,
        ],
      });
    } catch (e) {
      console.log(e);
    }

    return model;
  };

  const deployLegacyJumpRateModel = async (params) => {
    const {
      baseRatePerYear,
      lowerBaseRatePerYear,
      multiplierPerYear,
      jumpMultiplierPerYear,
      kink_,
      lowerKink_,
    } = params;
    const model = await LegacyJumpRateModel.deploy(
      web3.utils.toWei(baseRatePerYear, "ether"),
      web3.utils.toWei(lowerBaseRatePerYear, "ether"),
      web3.utils.toWei(multiplierPerYear, "ether"),
      web3.utils.toWei(jumpMultiplierPerYear, "ether"),
      web3.utils.toWei(kink_, "ether"),
      governance
    );

    await model.deployed();

    try {
      await hre.run("verify:verify", {
        address: model.address,
        constructorArguments: [
          web3.utils.toWei(baseRatePerYear, "ether"),
          web3.utils.toWei(lowerBaseRatePerYear, "ether"),
          web3.utils.toWei(multiplierPerYear, "ether"),
          web3.utils.toWei(jumpMultiplierPerYear, "ether"),
          web3.utils.toWei(kink_, "ether"),
          governance,
        ],
      });
    } catch (e) {
      console.log(e);
    }

    return model;
  };

  const modelDeploy = {
    JumpRateModel: deployJumpRateModel,
    LegacyJumpRateModel: deployLegacyJumpRateModel,
  };

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

  try {
    if (config.rNative) {
      const {
        rNative: {
          symbol,
          interestRateModel: { address, model, params },
        },
      } = config;

      await runWithProgressCheck("rNative", async () => {
        let modelAddress = address;
        if (!modelAddress) {
          const interestRateModel = await modelDeploy[model](params);
          console.log(
            `rNative InterestRateModel address at: ${explorer}/address/${interestRateModel.address}`
          );
          modelAddress = interestRateModel.address;
          config.rNative.interestRateModel.address = modelAddress;
        }

        await runWithProgressCheck("rBinance._setInterestRateModel", async () => {
          const rBinance = RBinance.attach(addresses[symbol]);
          const transaction = await rBinance._setInterestRateModel(modelAddress);
          console.log(
            `rBinance._setInterestRateModel transaction: ${explorer}/tx/${transaction.hash}`
          );
        });
      });

      await saveAddresses();
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
          interestRateModel: { address, model, params },
        } = token;
        console.log(`Deploying ${symbol} (${name})`);

        let modelAddress = address;
        if (!modelAddress) {
          console.log("Creating InterestRateModel");
          const interestRateModel = await modelDeploy[model](params);
          console.log(
            `${symbol} InterestRateModel address at: ${explorer}/address/${interestRateModel.address}`
          );
          modelAddress = interestRateModel.address;
          config.rTokens[symbol].interestRateModel.address = modelAddress;
        }

        await runWithProgressCheck(`${symbol}._setInterestRateModel`, async () => {
          const rBep20Delegator = RBep20Delegator.attach(addresses[symbol]);
          const transaction = await rBep20Delegator._setInterestRateModel(modelAddress);
          console.log(
            `${symbol}._setInterestRateModel transaction: ${explorer}/tx/${transaction.hash}`
          );
        });

        await saveAddresses();
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
