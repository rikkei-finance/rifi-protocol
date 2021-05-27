const Unitroller = artifacts.require("Unitroller");
const Maximillion = artifacts.require("Maximillion");
const Cointroller = artifacts.require("Cointroller");
const JumpRateModel = artifacts.require("JumpRateModel");
const RBep20Delegate = artifacts.require("RBep20Delegate");
const RBep20Delegator = artifacts.require("RBep20Delegator");
const SimplePriceOracle = artifacts.require("SimplePriceOracle");
const RBinance = artifacts.require("RBinance");
const FaucetToken = artifacts.require("FaucetToken");
const fs = require('fs');

const addressOutput = 'test/test-address.json';
const deployConfig = 'test/test-config.json';
const chainlinkOracle = 'test/test-chainlink.json';
const faucetInitialAmount = 10 ** 7;

contract('Rifi Test', function (accounts) {
  console.log(accounts[0]);
  describe('Test common flow', async function () {
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

    const deployJumpRateModel = async (params) => {
      const {
        baseRatePerYear,
        lowerBaseRatePerYear,
        multiplierPerYear,
        jumpMultiplierPerYear,
        kink_,
        lowerKink_
      } = params;
      return JumpRateModel.new(
        web3.utils.toWei(baseRatePerYear, "ether"),
        web3.utils.toWei(lowerBaseRatePerYear, "ether"),
        web3.utils.toWei(multiplierPerYear, "ether"),
        web3.utils.toWei(jumpMultiplierPerYear, "ether"),
        web3.utils.toWei(kink_, "ether"),
        web3.utils.toWei(lowerKink_, "ether"),
        governance,
        { from: governance });
    };

    const deployFaucetToken = async (params) => {
      const { symbol, decimals } = params;
      const name = `Rifi Test ${symbol}`;
      return FaucetToken.new(faucetInitialAmount, name, decimals, symbol, { from: governance });
    };

    const saveAddresses = async () => (fs.promises.writeFile(addressOutput, JSON.stringify(addresses, null, 2)));

    beforeEach(async () => {
      console.log("Prepairing...");
      assert.equal(fs.existsSync(deployConfig), true, `Configuration file not found: ${deployConfig}`);
      assert.equal(fs.existsSync(chainlinkOracle), true, `Configuration file not found: ${chainlinkOracle}`);

      if (fs.existsSync(addressOutput)) {
        const data = fs.readFileSync(addressOutput);
        Object.assign(addresses, JSON.parse(data.toString()));
      }

      const configData = fs.readFileSync(deployConfig);
      Object.assign(config, JSON.parse(configData.toString()));

      const chainlinkData = fs.readFileSync(chainlinkOracle);
      Object.assign(chainlink, JSON.parse(chainlinkData.toString()));

      console.log(chainlink);
      console.log(config);
      console.log(addresses);

      console.log("Deploy");

      if (!addresses.Cointroller) {
        let unitroller = await Unitroller.new({ from: governance });
        console.log(`Unitroller address at: https://testnet.bscscan.com/address/${unitroller.address}`);

        let cointroller = await Cointroller.new({ from: governance });
        console.log(`Cointroller address at: https://testnet.bscscan.com/address/${cointroller.address}`);

        let transaction = await unitroller._setPendingImplementation(cointroller.address, { from: governance });
        console.log(`unitroller._setPendingImplementation transaction: https://testnet.bscscan.com/tx/${transaction.tx}`);

        transaction = await cointroller._become(unitroller.address, { from: governance });
        console.log(`cointroller._become transaction: https://testnet.bscscan.com/tx/${transaction.tx}`);

        addresses.Cointroller = unitroller.address;

        unitroller = await Cointroller.at(addresses.Cointroller);

        const priceOracle = await SimplePriceOracle.new({ from: governance });
        console.log(`PriceOracle address at: https://testnet.bscscan.com/address/${priceOracle.address}`);
        addresses.PriceFeed = priceOracle.address;

        transaction = await unitroller._setPriceOracle(priceOracle.address, { from: governance });
        console.log(`Unitroller._setPriceOracle transaction: https://testnet.bscscan.com/tx/${transaction.tx}`);

        transaction = await unitroller._setCloseFactor(web3.utils.toWei(config.closeFactor, "ether"), { from: governance });
        console.log(`Unitroller._setCloseFactor transaction: https://testnet.bscscan.com/tx/${transaction.tx}`);

        transaction = await unitroller._setLiquidationIncentive(web3.utils.toWei(config.liquidationIncentive, "ether"), { from: governance });
        console.log(`Unitroller._setLiquidationIncentive transaction: https://testnet.bscscan.com/tx/${transaction.tx}`);

        await saveAddresses();
      } else {
        console.log("Cointroller exists.");
      }

      const priceOracle = await SimplePriceOracle.at(addresses.PriceFeed);
      const unitroller = await Cointroller.at(addresses.Cointroller);
      if (!addresses.rBNB) {
        const { rBNB: { name, symbol, decimals, underlying, initialExchangeRateMantissa, interestRateModel: { address, params } } } = config;
        let modelAddress = address;
        if (!modelAddress) {
          const interestRateModel = await deployJumpRateModel(params);
          console.log("rBNB InterestRateModel address at: https://testnet.bscscan.com/address/" + interestRateModel.address);
          modelAddress = interestRateModel.address;
        }

        const rBinance = await RBinance.new(addresses.Cointroller, modelAddress, web3.utils.toWei(initialExchangeRateMantissa, "ether"), name, symbol, decimals, governance, { from: governance });
        console.log("rBNB address at: https://testnet.bscscan.com/address/" + rBinance.address);

        addresses.rBNB = rBinance.address;

        let transaction = await unitroller._supportMarket(addresses.rBNB, { from: governance });
        console.log(`rBNB Unitroller._supportMarket transaction: https://testnet.bscscan.com/tx/${transaction.tx}`);

        transaction = await priceOracle.setOracleData(addresses.rBNB, chainlink[underlying.symbol].address, { from: governance });
        console.log(`rBNB priceOracle.setOracleData transaction: https://testnet.bscscan.com/tx/${transaction.tx}`);

        transaction = await unitroller._setCollateralFactor(addresses.rBNB, web3.utils.toWei(config.rBNB.collateralFactor, "ether"), { from: governance });
        console.log(`rBNB Unitroller._setCollateralFactor transaction: https://testnet.bscscan.com/tx/${transaction.tx}`);

        await saveAddresses();
      } else {
        console.log("rBNB exists.");
      }

      if (!addresses.rBep20Delegate) {
        const rBep20Delegate = await RBep20Delegate.new({ from: governance });
        console.log("RBep20Delegate address at: https://testnet.bscscan.com/address/" + rBep20Delegate.address);
        addresses.rBep20Delegate = rBep20Delegate.address;
        await saveAddresses();
      }

      const tokenDecimals = {
        rBNB: parseInt(config.rBNB.decimals),
        BNB: 18,
      };
      const { rTokens = {} } = config;
      const tokens = Object.entries(rTokens);

      const tokensList = ['rBNB'];
      const tokenUnderlying = ['BNB'];
      if (tokens.length > 0) {
        for (let [, token] of tokens) {
          const { name, symbol, decimals, underlying, initialExchangeRateMantissa, collateralFactor, interestRateModel: { address, params } } = token;
          if (!addresses[symbol]) {
            console.log(`Deploying ${symbol} (${name})`);
            let modelAddress = address;
            if (!modelAddress) {
              const interestRateModel = await deployJumpRateModel(params);
              console.log(`${symbol} InterestRateModel address at: https://testnet.bscscan.com/address/${interestRateModel.address}`);
              modelAddress = interestRateModel.address;
            }

            let underlyingAddress = underlying.address || addresses[underlying.symbol];
            if (!underlyingAddress) {
              const faucetToken = await deployFaucetToken(underlying);
              console.log(`${underlying.symbol} address at: https://testnet.bscscan.com/address/${faucetToken.address}`);
              underlyingAddress = faucetToken.address;
            }

            addresses[underlying.symbol] = underlyingAddress;
            await saveAddresses();

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
              { from: governance });
            console.log(`${symbol} address at: https://testnet.bscscan.com/address/${rBep20Delegator.address}`);
            addresses[symbol] = rBep20Delegator.address;

            let transaction = await unitroller._supportMarket(addresses[symbol], { from: governance });
            console.log(`${symbol} Unitroller._supportMarket transaction: https://testnet.bscscan.com/tx/${transaction.tx}`);

            transaction = await priceOracle.setOracleData(addresses[symbol], chainlink[underlying.symbol].address, { from: governance });
            console.log(`${symbol} priceOracle.setOracleData transaction: https://testnet.bscscan.com/tx/${transaction.tx}`);

            transaction = await unitroller._setCollateralFactor(addresses[symbol], web3.utils.toWei(collateralFactor, "ether"), { from: governance });
            console.log(`${symbol} Unitroller._setCollateralFactor transaction: https://testnet.bscscan.com/tx/${transaction.tx}`);

            await saveAddresses();
          } else {
            console.log(`${symbol} exists.`);
          }

          tokenDecimals[symbol] = parseInt(decimals);
          tokenDecimals[underlying.symbol] = parseInt(underlying.decimals);

          tokensList.push(symbol);
          tokenUnderlying.push(underlying.symbol);
        }
      }

      if (!addresses.Maximillion) {
        const maximillion = await Maximillion.new(addresses.rBNB, { from: governance });
        console.log(`Maximillion address at: https://testnet.bscscan.com/address/${maximillion.address}`);
        addresses.Maximillion = maximillion.address;
      }

      console.log(tokenDecimals);
      console.log(tokensList);
      console.log(tokenUnderlying);
      await saveAddresses();
    });

    it("Common flow", async function () {
      //     transaction = await rBinance.mint({from: governance, value: web3.utils.toWei("0.5", 'ether')});
      //     console.log("19. Deposit from governance to RBNB transaction: https://testnet.bscscan.com/tx/" + transaction.tx);
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
      //     console.log("20. Transfer BUSD from governance to account1 transaction: https://testnet.bscscan.com/tx/" + transaction.tx);

      //     transaction = await bEP20Token.approve(rBep20Delegator.address, web3.utils.toWei("100000", "ether"), {from: accounts[1]});
      //     console.log("21. Approve BUSD from account1 to rBUSD  transaction: https://testnet.bscscan.com/tx/" + transaction.tx);

      //     transaction = await rBep20Delegator.mint(web3.utils.toWei("100", "ether"), {from: accounts[1]});
      //     console.log("22. Deposit from account1 to rBUSD transaction: https://testnet.bscscan.com/tx/" + transaction.tx);
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
      //     console.log("23. Redeem 50  from account1 to rBUSD transaction: https://testnet.bscscan.com/tx/" + transaction.tx);
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
      //     console.log("24. Enable collateral transaction: https://testnet.bscscan.com/tx/" + transaction.tx);

      //     transaction = await rBep20Delegator.borrow(web3.utils.toWei("10", "ether"), {from: governance});
      //     console.log("25. Borrow from governance to rBUSD transaction: https://testnet.bscscan.com/tx/" + transaction.tx);
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
      //     console.log("26. Approve BUSD from governance to rBUSD  transaction: https://testnet.bscscan.com/tx/" + transaction.tx);

      //     transaction = await rBep20Delegator.repayBorrow(web3.utils.toWei("10", "ether"), {from: governance});
      //     console.log("27. Repay borrow from governance to rBUSD transaction: https://testnet.bscscan.com/tx/" + transaction.tx);
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
      //     console.log("28. Enable collateral transaction: https://testnet.bscscan.com/tx/" + transaction.tx);

      //     transaction = await rBinance.borrow(web3.utils.toWei("0.001", "ether"), {from: accounts[1]});
      //     console.log("29. Borrow ether from account1 transaction: https://testnet.bscscan.com/tx/" + transaction.tx);

      //     transaction = await maximillion.repayBehalf(accounts[1], {from: accounts[1], value:web3.utils.toWei("0.002",'ether')});
      //     console.log("30. Repay max BNB transaction: https://testnet.bscscan.com/tx/" + transaction.tx);



    }).timeout(40000000000)
  })
})
