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
const chainlinkOracle = `${__dirname}/networks/${network}/chainlink.json`;
const faucetInitialAmount = 10 ** 7;

const explorers = {
  bsc_mainnet: "https://bscscan.com",
  eth_mainnet: "https://etherscan.io",
  bsc_testnet: "https://testnet.bscscan.com",
  ropsten: "https://ropsten.etherscan.io",
  rinkeby: "https://rinkeby.etherscan.io",
  kovan: "https://kovan.etherscan.io",
  mumbai: "https://mumbai.polygonscan.com"
};

async function main() {
  const [owner] = await hre.ethers.getSigners();


  const addresses = {};
  const config = {};
  const chainlink = {};
  const progress = {};

  const explorer = explorers[network];

  const [Unitroller, Cointroller, RBep20Delegate, RBep20Delegator, RBinance, Timelock] = await Promise.all([
    ethers.getContractFactory("Unitroller"),
    ethers.getContractFactory("CointrollerV1_1"),
    ethers.getContractFactory("RBep20Delegate"),
    ethers.getContractFactory("RBep20Delegator"),
    ethers.getContractFactory("RBinance"),
    ethers.getContractFactory("Timelock"),
  ]);

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

  const chainlinkData = fs.readFileSync(chainlinkOracle);
  Object.assign(chainlink, JSON.parse(chainlinkData.toString()));

  console.log(chainlink);
  console.log(config);
  console.log(addresses);

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

  let unitroller, cointroller;
  await runWithProgressCheck("Cointroller", async () => {
    cointroller = await Cointroller.deploy();
    await cointroller.deployed();
    console.log(`Cointroller address at: ${explorer}/address/${cointroller.address}`);
    addresses.CointrollerImpl = cointroller.address;
    await hre.run("verify:verify", { address: cointroller.address }).catch(err => console.log(err.message));
  });


  if (!unitroller && !addresses.Cointroller) {
    throw Error("Failed on deploying Unitroller");
  }

  if (!unitroller) {
    unitroller = Unitroller.attach(addresses.Cointroller);
  }

  if (!cointroller && !addresses.CointrollerImpl) {
    throw Error("Failed on deploying Cointroller implementation");
  }

  if (!cointroller) {
    cointroller = Cointroller.attach(addresses.CointrollerImpl);
  }

  await runWithProgressCheck("unitroller._setPendingImplementation", async () => {
    const transaction = await unitroller._setPendingImplementation(cointroller.address);
    console.log(
      `unitroller._setPendingImplementation transaction: ${explorer}/tx/${transaction.tx}`
    );
  });

  await runWithProgressCheck("cointroller._become", async () => {
    const transaction = await cointroller._become(unitroller.address);
    console.log(`cointroller._become transaction: ${explorer}/tx/${transaction.tx}`);
  });

  unitroller = Cointroller.attach(addresses.Cointroller);

  await runWithProgressCheck("unitroller.initialize", async () => {
    const timelock = await Timelock.deploy(owner.address, 2);
    await timelock.deployed();
    console.log(`timelock address at: ${explorers.bsc_testnet}/address/${timelock.address}`);
    await hre.run("verify:verify", {
      address: timelock.address,
      constructorArguments: [owner.address, 2],
    }).catch(err => console.log(err.message));
    const transaction = await unitroller.initializeV1_1(timelock.address);
    console.log(`unitroller.initialize transaction: ${explorer}/tx/${transaction.tx}`);
  });

  if (!addresses.rBep20Delegate) {
    console.log("Creating RBep20Delegate");
    const rBep20Delegate = await RBep20Delegate.deploy();
    await rBep20Delegate.deployed();
    console.log(`RBep20Delegate address at: ${explorer}/address/${rBep20Delegate.address}`);
    addresses.rBep20Delegate = rBep20Delegate.address;
    await saveAddresses();
    await hre.run("verify:verify", { address: rBep20Delegate.address }).catch(err => console.log(err.message));
  }

  const { rTokens = {} } = config;
  const tokens = Object.entries(rTokens);

  if (tokens.length > 0) {
    for (let [, token] of tokens) {
      const {
        name,
        symbol,
        decimals,
        underlying,
        initialExchangeRateMantissa,
        collateralFactor,
        rifiSpeed,
        interestRateModel: { address, params },
      } = token;
      console.log(`Upgrading ${symbol} (${name})`);

      await runWithProgressCheck(symbol, async () => {
        console.log("Getintg RBep20Delegator");
        const rBep20Delegator = await RBep20Delegator.attach(addresses[symbol]);
        await rBep20Delegator._setImplementation(addresses.rBep20Delegate, false, "0x");
      });
    }
  }

  // if (config.rNative) {
  //   const {
  //     rNative: {
  //       name,
  //       symbol,
  //       decimals,
  //       underlying,
  //       initialExchangeRateMantissa,
  //       interestRateModel: { address, params },
  //     },
  //   } = config;

  //   await runWithProgressCheck("rNative", async () => {
  //     let modelAddress = address;
  //     if (!modelAddress) {
  //       const interestRateModel = await deployJumpRateModel(params);
  //       console.log(
  //         `rNative InterestRateModel address at: ${explorer}/address/${interestRateModel.address}`
  //       );
  //       modelAddress = interestRateModel.address;
  //       config.rNative.interestRateModel.address = modelAddress;
  //     }

  //     const rBinance = await RBinance.deploy(
  //       addresses.Cointroller,
  //       modelAddress,
  //       web3.utils.toWei(initialExchangeRateMantissa, "ether"),
  //       name,
  //       symbol,
  //       decimals,
  //       governance
  //     );
  //     await rBinance.deployed();

  //     console.log(`rNative address at: ${explorer}/address/${rBinance.address}`);

  //     addresses[symbol] = rBinance.address;

  //     await hre.run("verify:verify", {
  //       address: rBinance.address,
  //       constructorArguments: [
  //         addresses.Cointroller,
  //         modelAddress,
  //         web3.utils.toWei(initialExchangeRateMantissa, "ether"),
  //         name,
  //         symbol,
  //         decimals,
  //         governance,
  //       ],
  //     }).catch(err => console.log(err.message));
  //   });

  // }

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });