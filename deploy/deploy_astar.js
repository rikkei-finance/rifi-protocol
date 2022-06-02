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
const diaOracle = `${__dirname}/networks/${network}/dia.json`;
const faucetInitialAmount = 10 ** 7;

const explorers = {
  bsc_mainnet: "https://bscscan.com",
  eth_mainnet: "https://etherscan.io",
  bsc_testnet: "https://testnet.bscscan.com",
  ropsten: "https://ropsten.etherscan.io",
  rinkeby: "https://rinkeby.etherscan.io",
  kovan: "https://kovan.etherscan.io",
  moonbase: "https://moonbase.moonscan.io/",
  shibuya: "https://shibuya.subscan.io/",
};

async function main() {
  const accounts = await ethers.getSigners();

  const [{ address: governance }] = accounts;

  let transaction;

  const addresses = {};
  const config = {};
  const dia = {};
  const progress = {};

  const explorer = explorers[network];

  const [
    Unitroller,
    Maximillion,
    Cointroller,
    JumpRateModel,
    RBep20Delegate,
    RBep20Delegator,
    DIAPriceOracle,
    RAstar,
    FaucetToken,
    RifiLens,
    Timelock
  ] = await Promise.all([
    ethers.getContractFactory("Unitroller"),
    ethers.getContractFactory("Maximillion"),
    ethers.getContractFactory("Cointroller"),
    ethers.getContractFactory("JumpRateModelV2"),
    ethers.getContractFactory("RBep20Delegate"),
    ethers.getContractFactory("RBep20Delegator"),
    ethers.getContractFactory("DIAPriceOracle"),
    ethers.getContractFactory("RAstar"),
    ethers.getContractFactory("FaucetToken"),
    ethers.getContractFactory("RifiLens"),
    ethers.getContractFactory("Timelock"),
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
      // web3.utils.toWei(lowerBaseRatePerYear, "ether"),
      web3.utils.toWei(multiplierPerYear, "ether"),
      web3.utils.toWei(jumpMultiplierPerYear, "ether"),
      web3.utils.toWei(kink_, "ether"),
      // web3.utils.toWei(lowerKink_, "ether"),
      governance
    );

    await model.deployed();

    await hre.run("verify:verify", {
      address: model.address,
      constructorArguments: [
        web3.utils.toWei(baseRatePerYear, "ether"),
        // web3.utils.toWei(lowerBaseRatePerYear, "ether"),
        web3.utils.toWei(multiplierPerYear, "ether"),
        web3.utils.toWei(jumpMultiplierPerYear, "ether"),
        web3.utils.toWei(kink_, "ether"),
        // web3.utils.toWei(lowerKink_, "ether"),
        governance,
      ],
    }).catch(e => console.log(e.message));

    return model;
  };

  const deployFaucetToken = async (params) => {
    const { symbol, decimals } = params;
    const name = `Rifi Test ${symbol}`;
    const token = await FaucetToken.deploy(faucetInitialAmount, name, decimals, symbol);
    await token.deployed();
    await hre
      .run("verify:verify", {
        address: token.address,
        constructorArguments: [faucetInitialAmount, name, decimals, symbol],
      })
      .catch((e) => console.log(e.message));
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

  const diaData = fs.readFileSync(diaOracle);
  Object.assign(dia, JSON.parse(diaData.toString()));

  console.log(dia);
  console.log(config);
  console.log(addresses);

  console.log("Deploying...");

  const tokenDecimals = {};
  const tokensList = [];
  const tokenUnderlying = [];

  try {
    let unitroller;
    let cointroller;
    await runWithProgressCheck("Unitroller", async () => {
      unitroller = await Unitroller.deploy();
      await unitroller.deployed();
      console.log(`Unitroller address at: ${explorer}/address/${unitroller.address}`);
      addresses.Cointroller = unitroller.address;

      await hre
        .run("verify:verify", { address: unitroller.address })
        .catch((e) => console.log(e.message));
    });

    await runWithProgressCheck("Cointroller", async () => {
      cointroller = await Cointroller.deploy();
      await cointroller.deployed();
      console.log(`Cointroller address at: ${explorer}/address/${cointroller.address}`);
      addresses.CointrollerImpl = cointroller.address;
      await hre
        .run("verify:verify", { address: cointroller.address })
        .catch((e) => console.log(e.message));
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

    // await runWithProgressCheck("unitroller.initialize", async () => {
    //   const transaction = await unitroller.initialize(config.RIFI);
    //   console.log(`unitroller.initialize transaction: ${explorer}/tx/${transaction.tx}`);
    // });

    // await runWithProgressCheck("cointroller.initializeV1_1", async () => {
    //   const transaction = await unitroller.initializeV1_1(governance);
    //   console.log(`cointroller.initializeV1_1 transaction: ${explorer}/tx/${transaction.tx}`);
    // });

    await runWithProgressCheck("DIAPriceOracle", async () => {
      if (!config.DIA) throw new Error("can not found DIA");
      const priceOracle = await DIAPriceOracle.deploy(config.DIA);
      await priceOracle.deployed();
      console.log(`PriceOracle address at: ${explorer}/address/${priceOracle.address}`);
      addresses.PriceFeed = priceOracle.address;
      await hre
        .run("verify:verify", { address: priceOracle.address })
        .catch((e) => console.log(e.message));
    });

    const priceOracle = DIAPriceOracle.attach(addresses.PriceFeed);

    // await runWithProgressCheck("priceOracle.setOracle", async () => {
    //   if (!config.DIA) throw new Error("can not found DIA")
    //   const transaction = await priceOracle.setOracle(config.DIA);
    //   addresses.DIA = config.DIA;
    //   console.log(`priceOracle.setOracle transaction: ${explorer}/tx/${transaction.tx}`);
    // });

    await runWithProgressCheck("unitroller._setPriceOracle", async () => {
      const transaction = await unitroller._setPriceOracle(priceOracle.address);
      console.log(`Unitroller._setPriceOracle transaction: ${explorer}/tx/${transaction.tx}`);
    });

    await runWithProgressCheck("unitroller._setCloseFactor", async () => {
      const transaction = await unitroller._setCloseFactor(
        web3.utils.toWei(config.closeFactor, "ether")
      );
      console.log(`Unitroller._setCloseFactor transaction: ${explorer}/tx/${transaction.tx}`);
    });

    await runWithProgressCheck("unitroller._setLiquidationIncentive", async () => {
      const transaction = await unitroller._setLiquidationIncentive(
        web3.utils.toWei(config.liquidationIncentive, "ether")
      );
      console.log(
        `Unitroller._setLiquidationIncentive transaction: ${explorer}/tx/${transaction.tx}`
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

        const rAstar = await RAstar.deploy(
          addresses.Cointroller,
          modelAddress,
          web3.utils.toWei(initialExchangeRateMantissa, "ether"),
          name,
          symbol,
          decimals,
          governance
        );
        await rAstar.deployed();

        console.log(`rNative address at: ${explorer}/address/${rAstar.address}`);

        addresses[symbol] = rAstar.address;

        await hre.run("verify:verify", {
          address: rAstar.address,
          constructorArguments: [
            addresses.Cointroller,
            modelAddress,
            web3.utils.toWei(initialExchangeRateMantissa, "ether"),
            name,
            symbol,
            decimals,
            governance,
          ],
        }).catch(err => console.log(err.message));
      });

      await runWithProgressCheck("rNative: unitroller._supportMarket", async () => {
        let transaction = await unitroller._supportMarket(addresses[symbol]);
        console.log(
          `rNative Unitroller._supportMarket transaction: ${explorer}/tx/${transaction.tx}`
        );
      });

      await runWithProgressCheck("rNative: priceOracle.setOracleData", async () => {
        console.log(dia);
        console.log(underlying.symbol);
        transaction = await priceOracle.setOracleData(
          addresses[symbol],
          dia[underlying.symbol].pair
        );
        console.log(`rBNB priceOracle.setOracleData transaction: ${explorer}/tx/${transaction.tx}`);
      });

      await runWithProgressCheck("rNative: unitroller._setCollateralFactor", async () => {
        transaction = await unitroller._setCollateralFactor(
          addresses[symbol],
          web3.utils.toWei(config.rNative.collateralFactor, "ether")
        );
        console.log(
          `rNative Unitroller._setCollateralFactor transaction: ${explorer}/tx/${transaction.tx}`
        );
      });

      await runWithProgressCheck("rNative: unitroller._setRifiSpeeds", async () => {
        transaction = await unitroller._setRifiSpeeds(
          [addresses[symbol]],
          [web3.utils.toWei(config.rNative.rifiSpeed, "ether")],
          [web3.utils.toWei(config.rNative.rifiSpeed, "ether")]
        );
        console.log(`rBNB Unitroller._setRifiSpeeds transaction: ${explorer}/tx/${transaction.tx}`);
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
      await hre
        .run("verify:verify", { address: rBep20Delegate.address })
        .catch((e) => console.log(e.message));
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
          const underlyingDecimals = underlying.decimals;
          if (!underlyingDecimals){
            throw new Error(`undefined decimals of ${underlying.symbol}`)
          }
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
            ethers.utils.parseUnits(initialExchangeRateMantissa, underlyingDecimals),
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

          await hre
            .run("verify:verify", {
              address: rBep20Delegator.address,
              constructorArguments: [
                underlyingAddress,
                addresses.Cointroller,
                modelAddress,
                ethers.utils.parseUnits(initialExchangeRateMantissa, underlyingDecimals),
                name,
                symbol,
                decimals,
                governance,
                addresses.rBep20Delegate,
                "0x",
              ],
            })
            .catch((e) => console.log(e.message));
        });

        await runWithProgressCheck(`${symbol}: unitroller._supportMarket`, async () => {
          const transaction = await unitroller._supportMarket(addresses[symbol]);
          console.log(
            `${symbol} Unitroller._supportMarket transaction: ${explorer}/tx/${transaction.tx}`
          );
        });

        await runWithProgressCheck(`${symbol}: priceOracle.setOracleData`, async () => {
          const transaction = await priceOracle.setOracleData(
            addresses[symbol],
            dia[underlying.symbol].pair
          );
          console.log(
            `${symbol} priceOracle.setOracleData transaction: ${explorer}/tx/${transaction.tx}`
          );
        });

        await runWithProgressCheck(`${symbol}: unitroller._setCollateralFactor`, async () => {
          const transaction = await unitroller._setCollateralFactor(
            addresses[symbol],
            web3.utils.toWei(collateralFactor, "ether")
          );
          console.log(
            `${symbol} Unitroller._setCollateralFactor transaction: ${explorer}/tx/${transaction.tx}`
          );
        });

        await runWithProgressCheck(`${symbol}: unitroller._setRifiSpeeds`, async () => {
          transaction = await unitroller._setRifiSpeeds(
            [addresses[symbol]],
            [web3.utils.toWei(rifiSpeed, "ether")],
            [web3.utils.toWei(rifiSpeed, "ether")]
          );
          console.log(
            `${symbol} Unitroller._setRifiSpeeds transaction: ${explorer}/tx/${transaction.tx}`
          );
        });

        await saveAddresses();

        tokenDecimals[symbol] = parseInt(decimals);
        tokenDecimals[underlying.symbol] = parseInt(underlying.decimals);

        tokensList.push(symbol);
        tokenUnderlying.push(underlying.symbol);
      }
    }

    // await runWithProgressCheck("timelock", async () => {
    //   const timelock = await Timelock.deploy(governance, 2);
    //   await timelock.deployed();
    //   addresses.timelock = timelock.address;
    //   console.log(`Cointroller address at: ${explorer}/address/${timelock.address}`);
    // }); 

    // await runWithProgressCheck("cointroller._setTimelock", async () => {
    //   if (!addresses.timelock) throw new Error("timelock is not deployed yet");
    //   const timelock = await Timelock.attach(addresses.timelock);
    //   const transaction = await cointroller._setTimelock(timelock.address);
    //   console.log(`cointroller._setTimelock transaction: ${explorer}/tx/${transaction.tx}`);
    // });

    await runWithProgressCheck("RifiLens", async () => {
      const lens = await RifiLens.deploy();
      await lens.deployed();
      console.log(`RifiLens address at: ${explorer}/address/${lens.address}`);
      addresses.RifiLens = lens.address;
      await hre
        .run("verify:verify", { address: lens.address })
        .catch((e) => console.log(e.message));
    });

    if (!addresses.Maximillion && config.rNative) {
      const maximillion = await Maximillion.deploy(addresses[config.rNative.symbol]);
      await maximillion.deployed();
      console.log(`Maximillion address at: ${explorer}/address/${maximillion.address}`);
      addresses.Maximillion = maximillion.address;

      await hre
        .run("verify:verify", {
          address: maximillion.address,
          constructorArguments: [addresses[config.rNative.symbol]],
        })
        .catch((e) => console.log(e.message));
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
