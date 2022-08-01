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

const explorers = {
  bsc_mainnet: "https://bscscan.com",
  eth_mainnet: "https://etherscan.io",
  bsc_testnet: "https://testnet.bscscan.com",
  ropsten: "https://ropsten.etherscan.io",
  rinkeby: "https://rinkeby.etherscan.io",
  kovan: "https://kovan.etherscan.io",
  shibuya: "https://blockscout.com/shibuya/",
  astar: "https://blockscout.com/astar/",
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
    RErc20Delegate,
    RErc20Delegator,
    DIAPriceOracle,
    RAstar,
    RifiLens,
  ] = await Promise.all([
    ethers.getContractFactory("Unitroller"),
    ethers.getContractFactory("Maximillion"),
    ethers.getContractFactory("Cointroller"),
    ethers.getContractFactory("JumpRateModelV2"),
    ethers.getContractFactory("RErc20Delegate"),
    ethers.getContractFactory("RErc20Delegator"),
    ethers.getContractFactory("DIAPriceOracle"),
    ethers.getContractFactory("RAstar"),
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
    }).catch(e => console.log(e.message));

    return model;
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

  console.log("Deployer account:", accounts[0].address);
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

    await runWithProgressCheck("unitroller.initialize", async () => {
      const transaction = await unitroller.initialize(config.RIFI);
      console.log(`unitroller.initialize transaction: ${explorer}/tx/${transaction.tx}`);
    });

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

        const rNative = await RAstar.deploy(
          addresses.Cointroller,
          modelAddress,
          web3.utils.toWei(initialExchangeRateMantissa, "ether"),
          name,
          symbol,
          decimals,
          governance
        );
        await rNative.deployed();

        console.log(`rAstar address at: ${explorer}/address/${rNative.address}`);

        addresses[symbol] = rNative.address;

        await hre
          .run("verify:verify", {
            address: rNative.address,
            constructorArguments: [
              addresses.Cointroller,
              modelAddress,
              web3.utils.toWei(initialExchangeRateMantissa, "ether"),
              name,
              symbol,
              decimals,
              governance,
            ],
          })
          .catch((err) => console.log(err.message));
      });

      await runWithProgressCheck("rNative: unitroller._supportMarket", async () => {
        let transaction = await unitroller._supportMarket(addresses[symbol]);
        console.log(
          `rAstar Unitroller._supportMarket transaction: ${explorer}/tx/${transaction.tx}`
        );
      });

      await runWithProgressCheck("rNative: priceOracle.setOracleData", async () => {
        transaction = await priceOracle.setOracleData(
          addresses[symbol],
          dia[underlying.symbol].pair
        );
        console.log(
          `rAstar priceOracle.setOracleData transaction: ${explorer}/tx/${transaction.tx}`
        );
      });

      await runWithProgressCheck("rNative: unitroller._setCollateralFactor", async () => {
        transaction = await unitroller._setCollateralFactor(
          addresses[symbol],
          web3.utils.toWei(config.rNative.collateralFactor, "ether")
        );
        console.log(
          `rAstar Unitroller._setCollateralFactor transaction: ${explorer}/tx/${transaction.tx}`
        );
      });

      await runWithProgressCheck("rNative: unitroller._setRifiSpeeds", async () => {
        transaction = await unitroller._setRifiSpeeds(
          [addresses[symbol]],
          [web3.utils.toWei(config.rNative.rifiSupplySpeed, "ether")],
          [web3.utils.toWei(config.rNative.rifiBorrowSpeed, "ether")]
        );
        console.log(
          `rAstar Unitroller._setRifiSpeeds transaction: ${explorer}/tx/${transaction.tx}`
        );
      });

      tokenDecimals[symbol] = parseInt(decimals);
      tokenDecimals[underlying.symbol] = parseInt(underlying.decimals);
      tokensList.push(symbol);
      tokenUnderlying.push(underlying.symbol);

      await saveAddresses();
    } else {
      console.log("rAstar is not configured.");
    }

    if (!addresses.rErc20Delegate) {
      console.log("Creating RErc20Delegate");
      const rErc20Delegate = await RErc20Delegate.deploy();
      await rErc20Delegate.deployed();
      console.log(`RErc20Delegate address at: ${explorer}/address/${rErc20Delegate.address}`);
      addresses.rErc20Delegate = rErc20Delegate.address;
      await saveAddresses();
      await hre
        .run("verify:verify", { address: rErc20Delegate.address })
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
          rifiSupplySpeed,
          rifiBorrowSpeed,
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
          if (!underlyingDecimals) {
            throw new Error(`undefined decimals of ${underlying.symbol}`);
          }
          if (!underlyingAddress) {
            throw new Error(`undefined address of ${underlying.symbol}`);
          }

          addresses[underlying.symbol] = underlyingAddress;
          await saveAddresses();

          console.log("Creating RErc20Delegator");
          const rErc20Delegator = await RErc20Delegator.deploy(
            underlyingAddress,
            addresses.Cointroller,
            modelAddress,
            ethers.utils.parseUnits(initialExchangeRateMantissa, underlyingDecimals),
            name,
            symbol,
            decimals,
            governance,
            addresses.rErc20Delegate,
            "0x"
          );
          await rErc20Delegator.deployed();
          console.log(`${symbol} address at: ${explorer}/address/${rErc20Delegator.address}`);
          addresses[symbol] = rErc20Delegator.address;

          await hre
            .run("verify:verify", {
              address: rErc20Delegator.address,
              constructorArguments: [
                underlyingAddress,
                addresses.Cointroller,
                modelAddress,
                ethers.utils.parseUnits(initialExchangeRateMantissa, underlyingDecimals),
                name,
                symbol,
                decimals,
                governance,
                addresses.rErc20Delegate,
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
            [web3.utils.toWei(rifiSupplySpeed, "ether")],
            [web3.utils.toWei(rifiBorrowSpeed, "ether")]
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
