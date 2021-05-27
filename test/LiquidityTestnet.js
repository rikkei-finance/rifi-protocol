const Unitroller = artifacts.require("Unitroller");
const Maximillion = artifacts.require("Maximillion");
const Cointroller = artifacts.require("Cointroller");
const WhitePaperInterestRateModel = artifacts.require("WhitePaperInterestRateModel");
const RBep20Delegate = artifacts.require("RBep20Delegate");
const RBep20Delegator = artifacts.require("RBep20Delegator");
const SimplePriceOracle = artifacts.require("SimplePriceOracle1");
const RBinance = artifacts.require("RBinance");
const BEP20Token = artifacts.require("BEP20Token");
const fs = require('fs').promises;

contract('Rifi Test', function (accounts) {
    console.log(accounts[0]);
    describe('Test common flow', function () {
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

        beforeEach(async () => {
            console.log("Deploy");
            unitroller = await Unitroller.new({from: governance});
            console.log("1. Unicontroller address at:  https://testnet.bscscan.com/address/" + unitroller.address);

            cointroller = await Cointroller.new({from: governance});
            console.log("2. Cointroller address at:  https://testnet.bscscan.com/address/" + cointroller.address);

            transaction = await unitroller._setPendingImplementation(cointroller.address, {from: governance});
            console.log("3. unitroller._setPendingImplementation transaction: https://testnet.bscscan.com/tx/" + transaction.tx);

            transaction = await cointroller._become(unitroller.address, {from: governance});
            console.log("4. cointroller._become transaction: https://testnet.bscscan.com/tx/" + transaction.tx);

            whitePaperInterestRateModel = await WhitePaperInterestRateModel.new(web3.utils.toWei("0.02", "ether"), web3.utils.toWei("0.1", "ether"), {from: governance});
            console.log("5. whitePaperInterestRateModel address at:  https://testnet.bscscan.com/address/" + whitePaperInterestRateModel.address);

            rBinance = await RBinance.new(unitroller.address, whitePaperInterestRateModel.address, web3.utils.toWei("200000000", "ether"), "Rifi BNB", "rBNB", "8", governance, {from: governance});
            console.log("6. RBinance address at:  https://testnet.bscscan.com/address/" + rBinance.address);

            rBep20Delegate = await RBep20Delegate.new({from: governance});
            console.log("7. RBep20Delegate address at:  https://testnet.bscscan.com/address/" + rBep20Delegate.address);

            bEP20Token = await BEP20Token.new({from: governance});
            console.log("8. BUSB address at:  https://testnet.bscscan.com/address/" + bEP20Token.address);

            rBep20Delegator = await RBep20Delegator.new(
                bEP20Token.address,
                unitroller.address,
                whitePaperInterestRateModel.address,
                web3.utils.toWei("200000000", "ether"),
                "Rifi BUSD",
                "rBUSD",
                8,
                governance,
                rBep20Delegate.address,
                "0x",
                {from: governance});
            console.log("9. RBep20Delegator address at:  https://testnet.bscscan.com/address/" + rBep20Delegator.address);

            simplePriceOracle = await SimplePriceOracle.new(rBep20Delegator.address, rBinance.address, "0x9331b55D9830EF609A2aBCfAc0FBCE050A52fdEa", "0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526", {from: governance});
            console.log("10. SimplePriceOracle address at:  https://testnet.bscscan.com/address/" + simplePriceOracle.address);

            unitroller = await Cointroller.at(unitroller.address);
            transaction = await unitroller._setPriceOracle(simplePriceOracle.address, {from: governance});
            console.log("11. Unitroller._setPriceOracle transaction: https://testnet.bscscan.com/tx/" + transaction.tx);

            transaction = await unitroller._supportMarket(rBinance.address, {from: governance});
            console.log("12. Unitroller._supportMarket rBinance transaction: https://testnet.bscscan.com/tx/" + transaction.tx);

            transaction = await unitroller._supportMarket(rBep20Delegator.address, {from: governance});
            console.log("13. Unitroller._supportMarket rBep20Delegator transaction: https://testnet.bscscan.com/tx/" + transaction.tx);

            transaction = await unitroller._setCloseFactor(web3.utils.toWei("0.25", "ether"), {from: governance});
            console.log("14. unitroller._setCloseFactor transaction: https://testnet.bscscan.com/tx/" + transaction.tx);

            transaction = await unitroller._setLiquidationIncentive(web3.utils.toWei("1.08", "ether"), {from: governance});
            console.log("15. unitroller._setLiquidationIncentive transaction: https://testnet.bscscan.com/tx/" + transaction.tx);

            transaction = await unitroller._setCollateralFactor(rBinance.address, web3.utils.toWei("0.6", "ether"), {from: governance});
            console.log("16. unitroller._setCollateralFactor transaction: https://testnet.bscscan.com/tx/" + transaction.tx);

            transaction = await unitroller._setCollateralFactor(rBep20Delegator.address, web3.utils.toWei("0.6", "ether"), {from: governance});
            console.log("17. unitroller._setCollateralFactor transaction: https://testnet.bscscan.com/tx/" + transaction.tx);

            maximillion = await Maximillion.new(rBinance.address, {from: governance});
            console.log("18. Maximillion address at:  https://testnet.bscscan.com/address/" + maximillion.address);

            await fs.writeFile('test/test-liquidate-address.json', JSON.stringify({
                "PriceFeed": simplePriceOracle.address,
                "Maximillion": simplePriceOracle.address,
                "Cointroller": unitroller.address,
                "rBNB": rBinance.address,
                "rBUSD": rBep20Delegator.address,
                "BUSD": bEP20Token.address,
            }));

        });

        it("Common flow", async function () {
            transaction = await rBinance.mint({from: governance, value: web3.utils.toWei("0.5", 'ether')});
            console.log("19. Deposit from governance to RBNB transaction: https://testnet.bscscan.com/tx/" + transaction.tx);
            let exchangeRateStored = await rBinance.exchangeRateStored();
            exchangeRateStored = parseInt(exchangeRateStored);
            transaction.receipt.rawLogs.forEach((item, index) => {
                //check is Transfer event
                if (item.topics[0] === "0x4c209b5fc8ad50758f13e2e1088ba56a560dff690a1c6fef26394f4c03821c4f") {
                    assert.equal(item.data.slice(2, 66).replace("000000000000000000000000", "0x"), governance.toLowerCase());
                    assert.equal(parseInt(item.data.slice(67, 130), 16), web3.utils.toWei("0.5", "ether"));
                    assert.equal(parseInt(item.data.slice(131, 194), 16), web3.utils.toWei("500000000000000000", "ether") / exchangeRateStored);
                }
                if (item.topics[0] === "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef") {
                    assert.equal(item.topics[1].replace("000000000000000000000000", ""), rBinance.address.toLowerCase());
                    assert.equal(item.topics[2].replace("000000000000000000000000", ""), governance.toLowerCase());
                    assert.equal(parseInt(item.data), web3.utils.toWei("500000000000000000", "ether") / exchangeRateStored);
                }
            })


            transaction = await bEP20Token.transfer(accounts[1], web3.utils.toWei("100", "ether"), {from: governance});
            console.log("20. Transfer BUSD from governance to account1 transaction: https://testnet.bscscan.com/tx/" + transaction.tx);

            transaction = await bEP20Token.approve(rBep20Delegator.address, web3.utils.toWei("100000", "ether"), {from: accounts[1]});
            console.log("21. Approve BUSD from account1 to rBUSD  transaction: https://testnet.bscscan.com/tx/" + transaction.tx);

            transaction = await rBep20Delegator.mint(web3.utils.toWei("100", "ether"), {from: accounts[1]});
            console.log("22. Deposit from account1 to rBUSD transaction: https://testnet.bscscan.com/tx/" + transaction.tx);
            exchangeRateStored = await rBep20Delegator.exchangeRateStored();
            exchangeRateStored = parseInt(exchangeRateStored);
            transaction.receipt.rawLogs.forEach((item, index) => {
                //check is Transfer event
                if (item.topics[0] === "0x4c209b5fc8ad50758f13e2e1088ba56a560dff690a1c6fef26394f4c03821c4f") {
                    assert.equal(item.data.slice(2, 66).replace("000000000000000000000000", "0x"), accounts[1].toLowerCase());
                    assert.equal(parseInt(item.data.slice(67, 130), 16), web3.utils.toWei("100", "ether"));
                    assert.equal(parseInt(item.data.slice(131, 194), 16), Math.ceil(web3.utils.toWei("100000000000000000000", "ether") / exchangeRateStored));
                }
                if (item.topics[0] === "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef") {
                    if (item.topics[1].replace("000000000000000000000000", "") === accounts[1]) {
                        assert.equal(item.topics[2].replace("000000000000000000000000", ""), rBep20Delegator.address.toLowerCase());
                        assert.equal(parseInt(item.data), web3.utils.toWei("100", "ether"));
                    }
                    if (item.topics[1].replace("000000000000000000000000", "") === rBep20Delegator.address.toLowerCase()) {
                        assert.equal(item.topics[2].replace("000000000000000000000000", ""), accounts[1].toLowerCase());
                        assert.equal(parseInt(item.data), Math.ceil(web3.utils.toWei("100000000000000000000", "ether") / exchangeRateStored));
                    }
                }
            })


            transaction = await rBep20Delegator.redeem(50000000000, {from: accounts[1]});
            console.log("23. Redeem 50  from account1 to rBUSD transaction: https://testnet.bscscan.com/tx/" + transaction.tx);
            exchangeRateStored = await rBep20Delegator.exchangeRateStored();
            exchangeRateStored = parseInt(exchangeRateStored);
            transaction.receipt.rawLogs.forEach((item, index) => {
                //check is Transfer event
                if (item.topics[0] === "0xe5b754fb1abb7f01b499791d0b820ae3b6af3424ac1c59768edb53f4ec31a929") {
                    assert.equal(item.data.slice(2, 66).replace("000000000000000000000000", "0x"), accounts[1].toLowerCase());
                    assert.equal(parseInt(item.data.slice(67, 130), 16), Math.ceil(50000000000 * exchangeRateStored / 10 ** 18));
                    assert.equal(parseInt(item.data.slice(131, 194), 16), 50000000000);
                }
                if (item.topics[0] === "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef") {
                    if (item.topics[1].replace("000000000000000000000000", "") === accounts[1].toLowerCase()) {
                        assert.equal(item.topics[2].replace("000000000000000000000000", ""), rBep20Delegator.address.toLowerCase());
                        assert.equal(parseInt(item.data), 50000000000);
                    }
                    if (item.topics[1].replace("000000000000000000000000", "") === rBep20Delegator.address.toLowerCase()) {
                        assert.equal(item.topics[2].replace("000000000000000000000000", ""), accounts[1].toLowerCase());
                        assert.equal(parseInt(item.data), Math.ceil(50000000000 * exchangeRateStored / 10 ** 18));
                    }
                }
            })


            transaction = await unitroller.enterMarkets([rBinance.address], {from: governance});
            console.log("24. Enable collateral transaction: https://testnet.bscscan.com/tx/" + transaction.tx);

            transaction = await rBep20Delegator.borrow(web3.utils.toWei("10", "ether"), {from: governance});
            console.log("25. Borrow from governance to rBUSD transaction: https://testnet.bscscan.com/tx/" + transaction.tx);
            exchangeRateStored = await rBep20Delegator.exchangeRateStored();
            exchangeRateStored = parseInt(exchangeRateStored);
            transaction.receipt.rawLogs.forEach((item, index) => {
                //check is Transfer event
                if (item.topics[0] === "0x13ed6866d4e1ee6da46f845c46d7e54120883d75c5ea9a2dacc1c4ca8984ab80") {
                    assert.equal(item.data.slice(2, 66).replace("000000000000000000000000", "0x"), governance.toLowerCase());
                    assert.equal(parseInt(item.data.slice(67, 130), 16), web3.utils.toWei("10", "ether"));
                    assert.equal(parseInt(item.data.slice(131, 194), 16), web3.utils.toWei("10", "ether"));
                    assert.equal(parseInt(item.data.slice(195, 258), 16), web3.utils.toWei("10", "ether"));
                }
                if (item.topics[0] === "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef") {
                    assert.equal(item.topics[1].replace("000000000000000000000000", ""), rBep20Delegator.address.toLowerCase());
                    assert.equal(item.topics[2].replace("000000000000000000000000", ""), governance.toLowerCase());
                    assert.equal(parseInt(item.data), web3.utils.toWei("10", "ether"));
                }
            })

            transaction = await simplePriceOracle.setPrice(rBep20Delegator.address, 6000 * 10 ** 8, {from: governance});
            console.log("26. SimplePriceOracle setPrice transaction: https://testnet.bscscan.com/tx/" + transaction.tx);

            transaction = await bEP20Token.transfer(accounts[2], web3.utils.toWei("100", "ether"), {from: governance});
            console.log("27. Transfer BUSD from governance to account1 transaction: https://testnet.bscscan.com/tx/" + transaction.tx);
            transaction = await bEP20Token.approve(rBep20Delegator.address, web3.utils.toWei("100000", "ether"), {from: accounts[2]});
            console.log("21. Approve BUSD from account1 to rBUSD  transaction: https://testnet.bscscan.com/tx/" + transaction.tx);
            transaction = await rBep20Delegator.liquidateBorrow(governance,web3.utils.toWei("0.2", "ether") , rBinance.address,{from: accounts[2]});
            console.log("28. LiquidateBorrow  transaction: https://testnet.bscscan.com/tx/" + transaction.tx);




        }).timeout(40000000000)
    })
})
