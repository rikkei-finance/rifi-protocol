const Unitroller = artifacts.require("Unitroller");
const Cointroller = artifacts.require("Cointroller");
const WhitePaperInterestRateModel = artifacts.require("WhitePaperInterestRateModel");
const RBep20Delegate = artifacts.require("RBep20Delegate");
const RBep20Delegator = artifacts.require("RBep20Delegator");
const SimplePriceOracle = artifacts.require("SimplePriceOracle");
const RBinance = artifacts.require("RBinance");
const BEP20Token = artifacts.require("BEP20Token");
const fs = require('fs').promises;

contract('Rifi Deploy', function (accounts) {
    console.log(accounts[0]);
    describe('Deploy mainnet', function () {
        let governance = accounts[0];
        let unitroller;
        let cointroller;
        let whitePaperInterestRateModel;
        let rBep20Delegate;
        let rBep20Delegator;
        let simplePriceOracle;
        let bEP20Token;
        let rBinance;
        let transaction;
      
        it("Deploy", async function () {
            console.log("Deploy");
            unitroller = await Unitroller.new({from: governance});
            console.log("1. Unicontroller address at:  https://bscscan.com/address/" + unitroller.address);

            cointroller = await Cointroller.new({from: governance});
            console.log("2. Cointroller address at:  https://bscscan.com/address/" + cointroller.address);
            transaction = await unitroller._setPendingImplementation(cointroller.address, {from: governance});
            console.log("3. unitroller._setPendingImplementation transaction: https://bscscan.com/tx/" + transaction.tx);

            transaction = await cointroller._become(unitroller.address, {from: governance});
            console.log("4. cointroller._become transaction: https://bscscan.com/tx/" + transaction.tx);

            whitePaperInterestRateModel = await WhitePaperInterestRateModel.new(40, 120, {from: governance});
            console.log("5. whitePaperInterestRateModel address at:  https://bscscan.com/address/" + whitePaperInterestRateModel.address);

            rBinance = await RBinance.new(unitroller.address, whitePaperInterestRateModel.address, web3.utils.toWei("200000000", "ether"), "Rifi BNB", "rBNB", "8", governance, {from: governance});
            console.log("6. RBinance address at:  https://bscscan.com/address/" + rBinance.address);

            rBep20Delegate = await RBep20Delegate.new({from: governance});
            console.log("7. RBep20Delegate address at:  https://bscscan.com/address/" + rBep20Delegate.address);

            rBep20Delegator = await RBep20Delegator.new(
                "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56",
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
            console.log("8. RBep20Delegator address at:  https://bscscan.com/address/" + rBep20Delegator.address);

            simplePriceOracle = await SimplePriceOracle.new(rBep20Delegator.address, rBinance.address, "0xcBb98864Ef56E9042e7d2efef76141f15731B82f", "0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE", {from: governance});
            console.log("9. SimplePriceOracle address at:  https://bscscan.com/address/" + simplePriceOracle.address);

            unitroller = await Cointroller.at(unitroller.address);
            transaction = await unitroller._setPriceOracle(simplePriceOracle.address, {from: governance});
            console.log("10. Unitroller._setPriceOracle transaction: https://bscscan.com/tx/" + transaction.tx);

            transaction = await unitroller._supportMarket(rBinance.address, {from: governance});
            console.log("11. Unitroller._supportMarket rBinance transaction: https://bscscan.com/tx/" + transaction.tx);

            transaction = await unitroller._supportMarket(rBep20Delegator.address, {from: governance});
            console.log("12. Unitroller._supportMarket rBep20Delegator transaction: https://bscscan.com/tx/" + transaction.tx);

            transaction = await unitroller._setCloseFactor(web3.utils.toWei("0.25", "ether"), {from: governance});
            console.log("13. unitroller._setCloseFactor transaction: https://bscscan.com/tx/" + transaction.tx);

            transaction = await unitroller._setLiquidationIncentive(web3.utils.toWei("1.08", "ether"), {from: governance});
            console.log("14. unitroller._setLiquidationIncentive transaction: https://bscscan.com/tx/" + transaction.tx);

            transaction = await unitroller._setCollateralFactor(rBinance.address, web3.utils.toWei("0.6", "ether"), {from: governance});
            console.log("15. unitroller._setCollateralFactor transaction: https://bscscan.com/tx/" + transaction.tx);

            transaction = await unitroller._setCollateralFactor(rBep20Delegator.address, web3.utils.toWei("0.6", "ether"), {from: governance});
            console.log("16. unitroller._setCollateralFactor transaction: https://bscscan.com/tx/" + transaction.tx);

            await fs.writeFile('address.json', JSON.stringify({
                "PriceFeed": simplePriceOracle.address,
                "Cointroller": unitroller.address,
                "rBNB": rBinance.address,
                "rBUSD": rBep20Delegator.address,
                "BUSD": "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56",
            }));
        }).timeout(40000000000)
    })
})
