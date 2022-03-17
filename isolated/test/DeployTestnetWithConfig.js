const fs = require("fs");
const argv = require("minimist")(process.argv.slice(2));

const { network } = argv;

const Unitroller = artifacts.require("Unitroller");
const Maximillion = artifacts.require("Maximillion");
const Cointroller = artifacts.require("Cointroller");
const JumpRateModel = artifacts.require("JumpRateModel");
const RBep20Delegate = artifacts.require("RBep20Delegate");
const RBep20Delegator = artifacts.require("RBep20Delegator");
const SimplePriceOracle = artifacts.require("SimplePriceOracle");
const RBinance = artifacts.require("RBinance");
const FaucetToken = artifacts.require("FaucetToken");
const RifiLens = artifacts.require("RifiLens");

const addressOutput = `test/networks/${network}/address.json`;
const deployConfig = `test/networks/${network}/config.json`;
const deployProgress = `test/networks/${network}/progress.json`;
const chainlinkOracle = `test/networks/${network}/chainlink.json`;
const faucetInitialAmount = 10 ** 7;

const explorers = {
  bsc_mainnet: "https://bscscan.com",
  eth_mainnet: "https://etherscan.io",
  bsc_testnet: "https://testnet.bscscan.com",
  rinkeby: "https://rinkeby.etherscan.io",
};

contract("Rifi Test", function (accounts) {
  console.log(accounts[0]);
  describe("Test common flow", async function () {
    let governance = accounts[0];
    let unitroller;
    let cointroller;
    let whitePaperInterestRateModel;
    let rBep20Delegate;
    let rBep20Delegator;
    let simplePriceOracle;
    let bEP20Token;
    let maximillion;
    let rBinance;
    let transaction;

    const addresses = {};
    const config = {};
    const chainlink = {};
    const progress = {};

    const explorer = explorers[network];

    const deployJumpRateModel = async (params) => {
      const {
        baseRatePerYear,
        lowerBaseRatePerYear,
        multiplierPerYear,
        jumpMultiplierPerYear,
        kink_,
        lowerKink_,
      } = params;
      return JumpRateModel.new(
        web3.utils.toWei(baseRatePerYear, "ether"),
        web3.utils.toWei(lowerBaseRatePerYear, "ether"),
        web3.utils.toWei(multiplierPerYear, "ether"),
        web3.utils.toWei(jumpMultiplierPerYear, "ether"),
        web3.utils.toWei(kink_, "ether"),
        web3.utils.toWei(lowerKink_, "ether"),
        governance,
        { from: governance }
      );
    };

    const deployFaucetToken = async (params) => {
      const { symbol, decimals } = params;
      const name = `Rifi Test ${symbol}`;
      return FaucetToken.new(faucetInitialAmount, name, decimals, symbol, {
        from: governance,
      });
    };

    const saveAddresses = async () => {
      await fs.promises.writeFile(
        addressOutput,
        JSON.stringify(addresses, null, 2)
      );
      await fs.promises.writeFile(
        deployProgress,
        JSON.stringify(progress, null, 2)
      );
      await fs.promises.writeFile(
        deployConfig,
        JSON.stringify(config, null, 2)
      );
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

    beforeEach(async () => {
      console.log("Prepairing...");
      assert.equal(
        fs.existsSync(deployConfig),
        true,
        `Configuration file not found: ${deployConfig}`
      );
      assert.equal(
        fs.existsSync(chainlinkOracle),
        true,
        `Configuration file not found: ${chainlinkOracle}`
      );

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
        let unitroller;
        let cointroller;
        await runWithProgressCheck("Unitroller", async () => {
          unitroller = await Unitroller.new({ from: governance });
          console.log(
            `Unitroller address at: ${explorer}/address/${unitroller.address}`
          );
          addresses.Cointroller = unitroller.address;
        });

        await runWithProgressCheck("Cointroller", async () => {
          cointroller = await Cointroller.new({ from: governance });
          console.log(
            `Cointroller address at: ${explorer}/address/${cointroller.address}`
          );
          addresses.CointrollerImpl = cointroller.address;
        });

        if (!unitroller && !addresses.Cointroller) {
          throw Error("Failed on deploying Unitroller");
        }

        if (!unitroller) {
          unitroller = await Unitroller.at(addresses.Cointroller);
        }

        if (!cointroller && !addresses.CointrollerImpl) {
          throw Error("Failed on deploying Cointroller implementation");
        }

        if (!cointroller) {
          cointroller = await Cointroller.at(addresses.CointrollerImpl);
        }

        await runWithProgressCheck(
          "unitroller._setPendingImplementation",
          async () => {
            const transaction = await unitroller._setPendingImplementation(
              cointroller.address,
              { from: governance }
            );
            console.log(
              `unitroller._setPendingImplementation transaction: ${explorer}/tx/${transaction.tx}`
            );
          }
        );

        await runWithProgressCheck("cointroller._become", async () => {
          const transaction = await cointroller._become(unitroller.address, {
            from: governance,
          });
          console.log(
            `cointroller._become transaction: ${explorer}/tx/${transaction.tx}`
          );
        });

        unitroller = await Cointroller.at(addresses.Cointroller);

        await runWithProgressCheck("unitroller.initialize", async () => {
          const transaction = await unitroller.initialize(config.RIFI, {
            from: governance,
          });
          console.log(
            `unitroller.initialize transaction: ${explorer}/tx/${transaction.tx}`
          );
        });

        await runWithProgressCheck("SimplePriceOracle", async () => {
          const priceOracle = await SimplePriceOracle.new({ from: governance });
          console.log(
            `PriceOracle address at: ${explorer}/address/${priceOracle.address}`
          );
          addresses.PriceFeed = priceOracle.address;
        });

        const priceOracle = await SimplePriceOracle.at(addresses.PriceFeed);

        await runWithProgressCheck("unitroller._setPriceOracle", async () => {
          const transaction = await unitroller._setPriceOracle(
            priceOracle.address,
            {
              from: governance,
            }
          );
          console.log(
            `Unitroller._setPriceOracle transaction: ${explorer}/tx/${transaction.tx}`
          );
        });

        await runWithProgressCheck("unitroller._setCloseFactor", async () => {
          const transaction = await unitroller._setCloseFactor(
            web3.utils.toWei(config.closeFactor, "ether"),
            { from: governance }
          );
          console.log(
            `Unitroller._setCloseFactor transaction: ${explorer}/tx/${transaction.tx}`
          );
        });

        await runWithProgressCheck(
          "unitroller._setLiquidationIncentive",
          async () => {
            const transaction = await unitroller._setLiquidationIncentive(
              web3.utils.toWei(config.liquidationIncentive, "ether"),
              { from: governance }
            );
            console.log(
              `Unitroller._setLiquidationIncentive transaction: ${explorer}/tx/${transaction.tx}`
            );
          }
        );

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
                "rNative InterestRateModel address at: ${explorer}/address/" +
                  interestRateModel.address
              );
              modelAddress = interestRateModel.address;
              config.rNative.interestRateModel.address = modelAddress;
            }

            const rBinance = await RBinance.new(
              addresses.Cointroller,
              modelAddress,
              web3.utils.toWei(initialExchangeRateMantissa, "ether"),
              name,
              symbol,
              decimals,
              governance,
              { from: governance }
            );
            console.log(
              "rNative address at: ${explorer}/address/" + rBinance.address
            );

            addresses[symbol] = rBinance.address;
          });

          await runWithProgressCheck(
            "rNative: unitroller._supportMarket",
            async () => {
              let transaction = await unitroller._supportMarket(
                addresses[symbol],
                {
                  from: governance,
                }
              );
              console.log(
                `rNative Unitroller._supportMarket transaction: ${explorer}/tx/${transaction.tx}`
              );
            }
          );

          await runWithProgressCheck(
            "rNative: priceOracle.setOracleData",
            async () => {
              transaction = await priceOracle.setOracleData(
                addresses[symbol],
                chainlink[underlying.symbol].address,
                { from: governance }
              );
              console.log(
                `rBNB priceOracle.setOracleData transaction: ${explorer}/tx/${transaction.tx}`
              );
            }
          );

          await runWithProgressCheck(
            "rNative: unitroller._setCollateralFactor",
            async () => {
              transaction = await unitroller._setCollateralFactor(
                addresses[symbol],
                web3.utils.toWei(config.rNative.collateralFactor, "ether"),
                { from: governance }
              );
              console.log(
                `rNative Unitroller._setCollateralFactor transaction: ${explorer}/tx/${transaction.tx}`
              );
            }
          );

          await runWithProgressCheck(
            "rNative: unitroller._setRifiSpeed",
            async () => {
              transaction = await unitroller._setRifiSpeed(
                addresses[symbol],
                web3.utils.toWei(config.rNative.rifiSpeed, "ether"),
                { from: governance }
              );
              console.log(
                `rBNB Unitroller._setRifiSpeed transaction: ${explorer}/tx/${transaction.tx}`
              );
            }
          );

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
          const rBep20Delegate = await RBep20Delegate.new({ from: governance });
          console.log(
            `RBep20Delegate address at: ${explorer}/address/${rBep20Delegate.address}`
          );
          addresses.rBep20Delegate = rBep20Delegate.address;
          await saveAddresses();
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

              let underlyingAddress =
                underlying.address || addresses[underlying.symbol];
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
              const rBep20Delegator = await RBep20Delegator.new(
                underlyingAddress,
                addresses.Cointroller,
                modelAddress,
                web3.utils.toWei(initialExchangeRateMantissa, "ether"),
                name,
                symbol,
                decimals,
                governance,
                addresses.rBep20Delegate,
                "0x",
                { from: governance }
              );
              console.log(
                `${symbol} address at: ${explorer}/address/${rBep20Delegator.address}`
              );
              addresses[symbol] = rBep20Delegator.address;
            });

            await runWithProgressCheck(
              `${symbol}: unitroller._supportMarket`,
              async () => {
                const transaction = await unitroller._supportMarket(
                  addresses[symbol],
                  { from: governance }
                );
                console.log(
                  `${symbol} Unitroller._supportMarket transaction: ${explorer}/tx/${transaction.tx}`
                );
              }
            );

            await runWithProgressCheck(
              `${symbol}: priceOracle.setOracleData`,
              async () => {
                const transaction = await priceOracle.setOracleData(
                  addresses[symbol],
                  chainlink[underlying.symbol].address,
                  { from: governance }
                );
                console.log(
                  `${symbol} priceOracle.setOracleData transaction: ${explorer}/tx/${transaction.tx}`
                );
              }
            );

            await runWithProgressCheck(
              `${symbol}: unitroller._setCollateralFactor`,
              async () => {
                const transaction = await unitroller._setCollateralFactor(
                  addresses[symbol],
                  web3.utils.toWei(collateralFactor, "ether"),
                  { from: governance }
                );
                console.log(
                  `${symbol} Unitroller._setCollateralFactor transaction: ${explorer}/tx/${transaction.tx}`
                );
              }
            );

            await runWithProgressCheck(
              `${symbol}: unitroller._setRifiSpeed`,
              async () => {
                transaction = await unitroller._setRifiSpeed(
                  addresses[symbol],
                  web3.utils.toWei(rifiSpeed, "ether"),
                  { from: governance }
                );
                console.log(
                  `${symbol} Unitroller._setRifiSpeed transaction: ${explorer}/tx/${transaction.tx}`
                );
              }
            );

            await saveAddresses();

            tokenDecimals[symbol] = parseInt(decimals);
            tokenDecimals[underlying.symbol] = parseInt(underlying.decimals);

            tokensList.push(symbol);
            tokenUnderlying.push(underlying.symbol);
          }
        }

        await runWithProgressCheck("RifiLens", async () => {
          const lens = await RifiLens.new({ from: governance });
          console.log(
            `RifiLens address at: ${explorer}/address/${lens.address}`
          );
          addresses.RifiLens = lens.address;
        });

        if (!addresses.Maximillion && config.rNative) {
          const maximillion = await Maximillion.new(
            addresses[config.rNative.symbol],
            { from: governance }
          );
          console.log(
            `Maximillion address at: ${explorer}/address/${maximillion.address}`
          );
          addresses.Maximillion = maximillion.address;
        }
      } catch (e) {
        console.log(e);
        await saveAddresses();
      }

      console.log(tokenDecimals);
      console.log(tokensList);
      console.log(tokenUnderlying);
      await saveAddresses();
    });

    it("Common flow", async function () {
      //     transaction = await rBinance.mint({from: governance, value: web3.utils.toWei("0.5", 'ether')});
      //     console.log("19. Deposit from governance to RBNB transaction: ${explorer}/tx/" + transaction.tx);
      //     let exchangeRateStored = await rBinance.exchangeRateStored();
      //     exchangeRateStored = parseInt(exchangeRateStored);
      //     transaction.receipt.rawLogs.forEach((item, index) => {
      //         //check is Transfer event
      //         if (item.topics[0] === "0x4c209b5fc8ad50758f13e2e1088ba56a560dff690a1c6fef26394f4c03821c4f") {
      //             assert.equal(item.data.slice(2, 66).replace("000000000000000000000000", "0x"), governance.toLowerCase());
      //             assert.equal(parseInt(item.data.slice(67, 130), 16), web3.utils.toWei("0.5", "ether"));
      //             assert.equal(parseInt(item.data.slice(131, 194), 16), web3.utils.toWei("500000000000000000", "ether") / exchangeRateStored);
      //         }
      //         if (item.topics[0] === "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef") {
      //             assert.equal(item.topics[1].replace("000000000000000000000000", ""), rBinance.address.toLowerCase());
      //             assert.equal(item.topics[2].replace("000000000000000000000000", ""), governance.toLowerCase());
      //             assert.equal(parseInt(item.data), web3.utils.toWei("500000000000000000", "ether") / exchangeRateStored);
      //         }
      //     })
      //     transaction = await bEP20Token.transfer(accounts[1], web3.utils.toWei("100", "ether"), {from: governance});
      //     console.log("20. Transfer BUSD from governance to account1 transaction: ${explorer}/tx/" + transaction.tx);
      //     transaction = await bEP20Token.approve(rBep20Delegator.address, web3.utils.toWei("100000", "ether"), {from: accounts[1]});
      //     console.log("21. Approve BUSD from account1 to rBUSD  transaction: ${explorer}/tx/" + transaction.tx);
      //     transaction = await rBep20Delegator.mint(web3.utils.toWei("100", "ether"), {from: accounts[1]});
      //     console.log("22. Deposit from account1 to rBUSD transaction: ${explorer}/tx/" + transaction.tx);
      //     exchangeRateStored = await rBep20Delegator.exchangeRateStored();
      //     exchangeRateStored = parseInt(exchangeRateStored);
      //     transaction.receipt.rawLogs.forEach((item, index) => {
      //         //check is Transfer event
      //         if (item.topics[0] === "0x4c209b5fc8ad50758f13e2e1088ba56a560dff690a1c6fef26394f4c03821c4f") {
      //             assert.equal(item.data.slice(2, 66).replace("000000000000000000000000", "0x"), accounts[1].toLowerCase());
      //             assert.equal(parseInt(item.data.slice(67, 130), 16), web3.utils.toWei("100", "ether"));
      //             assert.equal(parseInt(item.data.slice(131, 194), 16), Math.ceil(web3.utils.toWei("100000000000000000000", "ether") / exchangeRateStored));
      //         }
      //         if (item.topics[0] === "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef") {
      //             if (item.topics[1].replace("000000000000000000000000", "") === accounts[1]) {
      //                 assert.equal(item.topics[2].replace("000000000000000000000000", ""), rBep20Delegator.address.toLowerCase());
      //                 assert.equal(parseInt(item.data), web3.utils.toWei("100", "ether"));
      //             }
      //             if (item.topics[1].replace("000000000000000000000000", "") === rBep20Delegator.address.toLowerCase()) {
      //                 assert.equal(item.topics[2].replace("000000000000000000000000", ""), accounts[1].toLowerCase());
      //                 assert.equal(parseInt(item.data), Math.ceil(web3.utils.toWei("100000000000000000000", "ether") / exchangeRateStored));
      //             }
      //         }
      //     })
      //     transaction = await rBep20Delegator.redeem(5000000000, {from: accounts[1]});
      //     console.log("23. Redeem 50  from account1 to rBUSD transaction: ${explorer}/tx/" + transaction.tx);
      //     exchangeRateStored = await rBep20Delegator.exchangeRateStored();
      //     exchangeRateStored = parseInt(exchangeRateStored);
      //     transaction.receipt.rawLogs.forEach((item, index) => {
      //         //check is Transfer event
      //         if (item.topics[0] === "0xe5b754fb1abb7f01b499791d0b820ae3b6af3424ac1c59768edb53f4ec31a929") {
      //             assert.equal(item.data.slice(2, 66).replace("000000000000000000000000", "0x"), accounts[1].toLowerCase());
      //             assert.equal(parseInt(item.data.slice(67, 130), 16), Math.ceil(5000000000 * exchangeRateStored / 10 ** 18));
      //             assert.equal(parseInt(item.data.slice(131, 194), 16), 5000000000);
      //         }
      //         if (item.topics[0] === "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef") {
      //             if (item.topics[1].replace("000000000000000000000000", "") === accounts[1].toLowerCase()) {
      //                 assert.equal(item.topics[2].replace("000000000000000000000000", ""), rBep20Delegator.address.toLowerCase());
      //                 assert.equal(parseInt(item.data), 5000000000);
      //             }
      //             if (item.topics[1].replace("000000000000000000000000", "") === rBep20Delegator.address.toLowerCase()) {
      //                 assert.equal(item.topics[2].replace("000000000000000000000000", ""), accounts[1].toLowerCase());
      //                 assert.equal(parseInt(item.data), Math.ceil(5000000000 * exchangeRateStored / 10 ** 18));
      //             }
      //         }
      //     })
      //     transaction = await unitroller.enterMarkets([rBinance.address], {from: governance});
      //     console.log("24. Enable collateral transaction: ${explorer}/tx/" + transaction.tx);
      //     transaction = await rBep20Delegator.borrow(web3.utils.toWei("10", "ether"), {from: governance});
      //     console.log("25. Borrow from governance to rBUSD transaction: ${explorer}/tx/" + transaction.tx);
      //     exchangeRateStored = await rBep20Delegator.exchangeRateStored();
      //     exchangeRateStored = parseInt(exchangeRateStored);
      //     transaction.receipt.rawLogs.forEach((item, index) => {
      //         //check is Transfer event
      //         if (item.topics[0] === "0x13ed6866d4e1ee6da46f845c46d7e54120883d75c5ea9a2dacc1c4ca8984ab80") {
      //             assert.equal(item.data.slice(2, 66).replace("000000000000000000000000", "0x"), governance.toLowerCase());
      //             assert.equal(parseInt(item.data.slice(67, 130), 16), web3.utils.toWei("10", "ether"));
      //             assert.equal(parseInt(item.data.slice(131, 194), 16), web3.utils.toWei("10", "ether"));
      //             assert.equal(parseInt(item.data.slice(195, 258), 16), web3.utils.toWei("10", "ether"));
      //         }
      //         if (item.topics[0] === "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef") {
      //             assert.equal(item.topics[1].replace("000000000000000000000000", ""), rBep20Delegator.address.toLowerCase());
      //             assert.equal(item.topics[2].replace("000000000000000000000000", ""), governance.toLowerCase());
      //             assert.equal(parseInt(item.data), web3.utils.toWei("10", "ether"));
      //         }
      //     })
      //     transaction = await bEP20Token.approve(rBep20Delegator.address, web3.utils.toWei("100000", "ether"), {from: governance});
      //     console.log("26. Approve BUSD from governance to rBUSD  transaction: ${explorer}/tx/" + transaction.tx);
      //     transaction = await rBep20Delegator.repayBorrow(web3.utils.toWei("10", "ether"), {from: governance});
      //     console.log("27. Repay borrow from governance to rBUSD transaction: ${explorer}/tx/" + transaction.tx);
      //     exchangeRateStored = await rBep20Delegator.exchangeRateStored();
      //     exchangeRateStored = parseInt(exchangeRateStored);
      //     transaction.receipt.rawLogs.forEach((item, index) => {
      //         //check is Transfer event
      //         if (item.topics[0] === "0x1a2a22cb034d26d1854bdc6666a5b91fe25efbbb5dcad3b0355478d6f5c362a1") {
      //             assert.equal(item.data.slice(2, 66).replace("000000000000000000000000", "0x"), governance.toLowerCase());
      //             assert.equal(item.data.slice(67, 130).replace("00000000000000000000000", "0x"), governance.toLowerCase());
      //             assert.equal(parseInt(item.data.slice(131, 194), 16), web3.utils.toWei("10", "ether"));
      //         }
      //         if (item.topics[0] === "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef") {
      //             assert.equal(item.topics[1].replace("000000000000000000000000", ""), governance.toLowerCase());
      //             assert.equal(item.topics[2].replace("000000000000000000000000", ""), rBep20Delegator.address.toLowerCase());
      //             assert.equal(parseInt(item.data), web3.utils.toWei("10", "ether"));
      //         }
      //     })
      //     transaction = await unitroller.enterMarkets([rBep20Delegator.address], {from: accounts[1]});
      //     console.log("28. Enable collateral transaction: ${explorer}/tx/" + transaction.tx);
      //     transaction = await rBinance.borrow(web3.utils.toWei("0.001", "ether"), {from: accounts[1]});
      //     console.log("29. Borrow ether from account1 transaction: ${explorer}/tx/" + transaction.tx);
      //     transaction = await maximillion.repayBehalf(accounts[1], {from: accounts[1], value:web3.utils.toWei("0.002",'ether')});
      //     console.log("30. Repay max BNB transaction: ${explorer}/tx/" + transaction.tx);
    }).timeout(40000000000);
  });
});
