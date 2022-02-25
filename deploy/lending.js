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

  let transaction;

  const addresses = {};
  const config = {};
  const chainlink = {};
  const progress = {};

  const explorer = explorers[network];

  const [
    Unitroller,
    Maximillion,
    Cointroller,
    JumpRateModel,
    RBep20Delegate,
    RBep20Delegator,
    SimplePriceOracle,
    RBinance,
    FaucetToken,
    RifiLens,
  ] = await Promise.all([
    ethers.getContractFactory("Unitroller"),
    ethers.getContractFactory("Maximillion"),
    ethers.getContractFactory("Cointroller"),
    ethers.getContractFactory("JumpRateModel"),
    ethers.getContractFactory("RBep20Delegate"),
    ethers.getContractFactory("RBep20Delegator"),
    ethers.getContractFactory("SimplePriceOracle"),
    ethers.getContractFactory("RBinance"),
    ethers.getContractFactory("FaucetToken"),
    ethers.getContractFactory("RifiLens"),
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

    console.log(
      `deployJumpRateModel InterestRateModel address at: ${explorer}/address/${model.address}`
    );

    console.log(`Waiting for ${waitTime} seconds before verifying contract.`)
    await delay(waitTime);

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

  const deployFaucetToken = async (params) => {
    const { symbol, decimals } = params;
    const name = `Rifi Test ${symbol}`;
    const token = await FaucetToken.deploy(faucetInitialAmount, name, decimals, symbol);
    await token.deployed();
    await delay(waitTime);
    await hre.run("verify:verify", {
      address: token.address,
      constructorArguments: [faucetInitialAmount, name, decimals, symbol],
    });
    return token;
  };

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

  console.log("Deploying...");

  const tokenDecimals = {};
  const tokensList = [];
  const tokenUnderlying = [];

  try {

    // await hre.run("verify:verify", { address: '0x6e40AfcFbE950c7618bC53Bf9fe477b362cf3905' });


    let unitroller;
    let cointroller;
    await runWithProgressCheck("Unitroller", async () => {
      unitroller = await Unitroller.deploy();
      await unitroller.deployed();
      console.log(`Unitroller address at: ${explorer}/address/${unitroller.address}`);
      addresses.Cointroller = unitroller.address;

      await delay(waitTime);
      await hre.run("verify:verify", { address: unitroller.address });
    });

    await runWithProgressCheck("Cointroller", async () => {
      cointroller = await Cointroller.deploy();
      await cointroller.deployed();
      console.log(`Cointroller address at: ${explorer}/address/${cointroller.address}`);
      addresses.CointrollerImpl = cointroller.address;

      await delay(waitTime);
      await hre.run("verify:verify", { address: cointroller.address });
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
        `unitroller._setPendingImplementation transaction: ${explorer}/tx/${transaction.hash}`
      );
    });

    await runWithProgressCheck("cointroller._become", async () => {
      const transaction = await cointroller._become(unitroller.address);
      console.log(`cointroller._become transaction: ${explorer}/tx/${transaction.hash}`);
    });

    unitroller = Cointroller.attach(addresses.Cointroller);

    await runWithProgressCheck("unitroller.initialize", async () => {
      const transaction = await unitroller.initialize(config.RIFI);
      console.log(`unitroller.initialize transaction: ${explorer}/tx/${transaction.hash}`);
    });

    await runWithProgressCheck("SimplePriceOracle", async () => {
      const priceOracle = await SimplePriceOracle.deploy();
      await priceOracle.deployed();
      console.log(`PriceOracle address at: ${explorer}/address/${priceOracle.address}`);
      addresses.PriceFeed = priceOracle.address;
      await delay(waitTime);
      await hre.run("verify:verify", { address: priceOracle.address });
    });

    const priceOracle = SimplePriceOracle.attach(addresses.PriceFeed);

    await runWithProgressCheck("unitroller._setPriceOracle", async () => {
      const transaction = await unitroller._setPriceOracle(priceOracle.address);
      console.log(`Unitroller._setPriceOracle transaction: ${explorer}/tx/${transaction.hash}`);
    });

    await runWithProgressCheck("unitroller._setCloseFactor", async () => {
      const transaction = await unitroller._setCloseFactor(
        web3.utils.toWei(config.closeFactor, "ether")
      );
      console.log(`Unitroller._setCloseFactor transaction: ${explorer}/tx/${transaction.hash}`);
    });

    await runWithProgressCheck("unitroller._setLiquidationIncentive", async () => {
      const transaction = await unitroller._setLiquidationIncentive(
        web3.utils.toWei(config.liquidationIncentive, "ether")
      );
      console.log(
        `Unitroller._setLiquidationIncentive transaction: ${explorer}/tx/${transaction.hash}`
      );
    });

    await saveAddresses();

    if (config.rNative) {
      const {
        rNative: {
          name,
          symbol,
          decimals,
          underlying,
          initialExchangeRateMantissa,
          collateralFactor,
          reserveFactor,
          rifiSpeed,
          interestRateModel: { address, params },
        },
      } = config;

      await runWithProgressCheck("rNative", async () => {
        let modelAddress = address;
        if (!modelAddress) {
          const interestRateModel = await deployJumpRateModel(params);
          console.log(
            `rNative InterestRateModel address at: ${explorer}/address/${interestRateModel.address}`
          );
          modelAddress = interestRateModel.address;
          config.rNative.interestRateModel.address = modelAddress;
        }

        const rBinance = await RBinance.deploy(
          addresses.Cointroller,
          modelAddress,
          initialExchangeRateMantissa,
          name,
          symbol,
          decimals,
          governance,
        );
        for (let i = 0; i < 5; ++i) {
          await rBinance.deployed();
        }

        console.log(`rNative address at: ${explorer}/address/${rBinance.address}`);

        addresses[symbol] = rBinance.address;
      });

      await runWithProgressCheck("rNative: verify", async () => {
        await delay(waitTime);
        await hre.run("verify:verify", {
          address: addresses[symbol],
          constructorArguments: [
            addresses.Cointroller,
            config.rNative.interestRateModel.address,
            initialExchangeRateMantissa,
            name,
            symbol,
            decimals,
            governance,
          ],
        });
      });

      await runWithProgressCheck("rNative: unitroller._supportMarket", async () => {
        let transaction = await unitroller._supportMarket(addresses[symbol]);
        console.log(
          `rNative Unitroller._supportMarket transaction: ${explorer}/tx/${transaction.hash}`
        );
      });

      await runWithProgressCheck("rNative: priceOracle.setOracleData", async () => {
        transaction = await priceOracle.setOracleData(
          addresses[symbol],
          chainlink[underlying.symbol].address
        );
        await transaction.wait();
        console.log(`rBNB priceOracle.setOracleData transaction: ${explorer}/tx/${transaction.hash}`);
      });

      await runWithProgressCheck("rNative: unitroller._setCollateralFactor", async () => {
        transaction = await unitroller._setCollateralFactor(
          addresses[symbol],
          web3.utils.toWei(collateralFactor, "ether")
        );
        console.log(
          `rNative Unitroller._setCollateralFactor transaction: ${explorer}/tx/${transaction.hash}`
        );
      });

      await runWithProgressCheck("rNative: rToken._setReserveFactor", async () => {
        const rToken = RBinance.attach(addresses[symbol]);
        const transaction = await rToken._setReserveFactor(
          web3.utils.toWei(reserveFactor, "ether")
        );
        console.log(
          `rNative rToken._setReserveFactor transaction: ${explorer}/tx/${transaction.hash}`
        );
      });

      await runWithProgressCheck("rNative: unitroller._setRifiSpeed", async () => {
        transaction = await unitroller._setRifiSpeed(
          addresses[symbol],
          web3.utils.toWei(rifiSpeed, "ether")
        );
        console.log(`rBNB Unitroller._setRifiSpeed transaction: ${explorer}/tx/${transaction.hash}`);
      });

      tokenDecimals[symbol] = parseInt(decimals);
      tokenDecimals[underlying.symbol] = parseInt(underlying.decimals);
      tokensList.push(symbol);
      tokenUnderlying.push(underlying.symbol);

      await saveAddresses();
    } else {
      console.log("rNative is not configured.");
    }

    if (!addresses.rBep20Delegate) {
      console.log("Creating RBep20Delegate");
      const rBep20Delegate = await RBep20Delegate.deploy();
      await rBep20Delegate.deployed();
      console.log(`RBep20Delegate address at: ${explorer}/address/${rBep20Delegate.address}`);
      addresses.rBep20Delegate = rBep20Delegate.address;
      await saveAddresses();
      await delay(waitTime);
      await hre.run("verify:verify", { address: rBep20Delegate.address });
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
          reserveFactor,
          rifiSpeed,
          interestRateModel: { address, params },
        } = token;
        console.log(`Deploying ${symbol} (${name})`);

        await runWithProgressCheck(symbol, async () => {
          let modelAddress = address;
          if (!modelAddress) {
            console.log("Creating InterestRateModel");
            const interestRateModel = await deployJumpRateModel(params);
            console.log(
              `${symbol} InterestRateModel address at: ${explorer}/address/${interestRateModel.address}`
            );
            modelAddress = interestRateModel.address;
            config.rTokens[symbol].interestRateModel.address = modelAddress;
          }

          let underlyingAddress = underlying.address || addresses[underlying.symbol];
          if (!underlyingAddress) {
            const faucetToken = await deployFaucetToken(underlying);
            console.log(
              `${underlying.symbol} address at: ${explorer}/address/${faucetToken.address}`
            );
            underlyingAddress = faucetToken.address;
          }

          addresses[underlying.symbol] = underlyingAddress;
          await saveAddresses();

          console.log("Creating RBep20Delegator");
          const rBep20Delegator = await RBep20Delegator.deploy(
            underlyingAddress,
            addresses.Cointroller,
            modelAddress,
            initialExchangeRateMantissa,
            name,
            symbol,
            decimals,
            governance,
            addresses.rBep20Delegate,
            "0x"
          );

          await rBep20Delegator.deployed();

          console.log(`${symbol} address at: ${explorer}/address/${rBep20Delegator.address}`);
          addresses[symbol] = rBep20Delegator.address;
        });

        await runWithProgressCheck(`${symbol}: verify`, async () => {
          await delay(waitTime);
          try {
            await hre.run("verify:verify", {
              address: addresses[symbol],
              constructorArguments: [
                addresses[underlying.symbol],
                addresses.Cointroller,
                config.rTokens[symbol].interestRateModel.address,
                initialExchangeRateMantissa,
                name,
                symbol,
                decimals,
                governance,
                addresses.rBep20Delegate,
                "0x",
              ],
            });
          } catch (e) {
            console.log(e);
            console.log(JSON.stringify(e, null, 2));
          }
        });

        await runWithProgressCheck(`${symbol}: unitroller._supportMarket`, async () => {
          const transaction = await unitroller._supportMarket(addresses[symbol]);
          console.log(
            `${symbol} Unitroller._supportMarket transaction: ${explorer}/tx/${transaction.hash}`
          );
        });

        await runWithProgressCheck(`${symbol}: priceOracle.setOracleData`, async () => {
          const transaction = await priceOracle.setOracleData(
            addresses[symbol],
            chainlink[underlying.symbol].address
          );
          console.log(
            `${symbol} priceOracle.setOracleData transaction: ${explorer}/tx/${transaction.hash}`
          );
        });

        await runWithProgressCheck(`${symbol}: unitroller._setCollateralFactor`, async () => {
          const transaction = await unitroller._setCollateralFactor(
            addresses[symbol],
            web3.utils.toWei(collateralFactor, "ether")
          );
          console.log(
            `${symbol} Unitroller._setCollateralFactor transaction: ${explorer}/tx/${transaction.hash}`
          );
        });

        await runWithProgressCheck(`${symbol}: rToken._setReserveFactor`, async () => {
          const rToken = RBep20Delegator.attach(addresses[symbol]);
          const transaction = await rToken._setReserveFactor(
            web3.utils.toWei(reserveFactor, "ether")
          );
          console.log(
            `${symbol} rToken._setReserveFactor transaction: ${explorer}/tx/${transaction.hash}`
          );
        });

        await runWithProgressCheck(`${symbol}: unitroller._setRifiSpeed`, async () => {
          transaction = await unitroller._setRifiSpeed(
            addresses[symbol],
            web3.utils.toWei(rifiSpeed, "ether")
          );
          console.log(
            `${symbol} Unitroller._setRifiSpeed transaction: ${explorer}/tx/${transaction.hash}`
          );
        });

        await saveAddresses();

        tokenDecimals[symbol] = parseInt(decimals);
        tokenDecimals[underlying.symbol] = parseInt(underlying.decimals);

        tokensList.push(symbol);
        tokenUnderlying.push(underlying.symbol);
      }
    }

    await runWithProgressCheck("RifiLens", async () => {
      const lens = await RifiLens.deploy();
      await lens.deployed();
      console.log(`RifiLens address at: ${explorer}/address/${lens.address}`);
      addresses.RifiLens = lens.address;

      await delay(waitTime);

      await hre.run("verify:verify", { address: lens.address });
    });

    if (config.rNative) {
      await runWithProgressCheck("Maximillion", async () => {
        const maximillion = await Maximillion.deploy(addresses[config.rNative.symbol]);
        await maximillion.deployed();
        console.log(`Maximillion address at: ${explorer}/address/${maximillion.address}`);
        addresses.Maximillion = maximillion.address;

        await delay(waitTime);
      });

      await runWithProgressCheck("Maximillion:verify", async () => {
        await hre.run("verify:verify", {
          address: addresses.Maximillion,
          constructorArguments: [
            addresses[config.rNative.symbol],
          ],
        });
      });
    }
  } catch (e) {
    console.log(e);
    await saveAddresses();
  }

  console.log(tokenDecimals);
  console.log(tokensList);
  console.log(tokenUnderlying);
  await saveAddresses();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
