const RifiVault = artifacts.require('./RifiVault');
const Token = artifacts.require("./Token")
const FaucetToken = artifacts.require("./FaucetContract")
const {expectRevert} = require('openzeppelin-test-helpers');
let rewardTokenAddress = "0x9AD563929F05bd294D39F26e07b6cbc807B338C3";
let tokenFaucet = "0xDa93a15635853eC602f7cE29aAd11e009BDaB8BC";
let token1Address = "0x7b856655b06B840C6E47BDBCA4e6D2457BB8C43D";
let token2Address = "0xF7A972622FD1081c5920dfBf8aABe973c0501748";


contract('RifiVault', function (accounts) {
    describe('Test Reward Pool ', function () {
        let governance = accounts[0];
        let account = accounts[1];
        let otherAccount = accounts[2];
        console.log("governance:", governance)
        let transaction;
        let rifiVault;
        let faucetContract;
        let token1;
        let token2;
        let blockNumber = [];
        let rewardTemp;
        it("Test", async function () {
            rifiVault = await RifiVault.new(rewardTokenAddress, 100, {from: governance});
            console.log("0. rifiVault address: https://testnet.bscscan.com/address/" + rifiVault.address)

            transaction = await rifiVault.add(100, token1Address, true, {from: governance});
            console.log("1. add first pool transaction: https://testnet.bscscan.com/tx/" + transaction.tx)

            faucetContract = await FaucetToken.at(tokenFaucet)
            token1 = await Token.at(token1Address)
            token2 = await Token.at(token2Address)

            transaction = await faucetContract.faucet(rewardTokenAddress, rifiVault.address, {from: governance})
            console.log("2. faucet orai to vault transaction: https://testnet.bscscan.com/tx/" + transaction.tx)

            transaction = await faucetContract.faucet(token1Address, account, {from: account})
            console.log("3. token1 faucet to account transaction: https://testnet.bscscan.com/tx/" + transaction.tx)

            transaction = await token1.approve(rifiVault.address, web3.utils.toWei("10000", "ether"), {from: account})
            console.log("4. token1 approve transaction: https://testnet.bscscan.com/tx/" + transaction.tx)

            transaction = await rifiVault.deposit(0, 10, {from: account})
            console.log("5. Account deposit pool 0 first transaction: https://testnet.bscscan.com/tx/" + transaction.tx, transaction.receipt.blockNumber)
            blockNumber.push(transaction.receipt.blockNumber)

            transaction = await rifiVault.deposit(0, 10, {from: account})
            console.log("6. Account deposit pool 0  second transaction: https://testnet.bscscan.com/tx/" + transaction.tx, transaction.receipt.blockNumber)
            blockNumber.push(transaction.receipt.blockNumber)
            transaction.receipt.rawLogs.forEach((item, index) => {
                //check is Transfer event
                if (item.topics[0] === "0xc73a785b824c849156b46b4c6a3391db5f86f6ec4bdd83f1625696d046f33c4e") {
                    rewardTemp = parseInt(item.data.slice(2, 66),16)
                }
            })

            assert.equal((blockNumber[blockNumber.length - 1] - blockNumber[blockNumber.length - 2]) * 100, rewardTemp, "actual reward temp: " + rewardTemp);
            rewardTemp = 0;

            transaction = await rifiVault.withdraw(0, 10, {from: account})
            console.log("7. Account withdraw pool 0 transaction: https://testnet.bscscan.com/tx/" + transaction.tx, transaction.receipt.blockNumber)
            blockNumber.push(transaction.receipt.blockNumber)
            transaction.receipt.rawLogs.forEach((item, index) => {
                //check is Transfer event
                if (item.topics[0] === "0xc73a785b824c849156b46b4c6a3391db5f86f6ec4bdd83f1625696d046f33c4e") {
                    rewardTemp = parseInt(item.data.slice(2, 66),16)
                }
            })
            assert.equal((blockNumber[blockNumber.length - 1] - blockNumber[blockNumber.length - 2]) * 100, rewardTemp, "actual reward temp: " + rewardTemp);
            rewardTemp = 0;


            transaction = await faucetContract.faucet(token1Address, otherAccount, {from: otherAccount})
            console.log("8. token1 faucet to otherAccount transaction: https://testnet.bscscan.com/tx/" + transaction.tx)

            transaction = await token1.approve(rifiVault.address, web3.utils.toWei("10000", "ether"), {from: otherAccount})
            console.log("9. token1 approve transaction: https://testnet.bscscan.com/tx/" + transaction.tx)

            transaction = await rifiVault.deposit(0, 30, {from: otherAccount})
            console.log("10. otherAccount deposit pool 0 first transaction: https://testnet.bscscan.com/tx/" + transaction.tx, transaction.receipt.blockNumber)
            blockNumber.push(transaction.receipt.blockNumber)

            transaction = await rifiVault.deposit(0, 10, {from: otherAccount})
            console.log("11. otherAccount deposit pool 0 second transaction: https://testnet.bscscan.com/tx/" + transaction.tx, transaction.receipt.blockNumber)
            blockNumber.push(transaction.receipt.blockNumber)

            transaction.receipt.rawLogs.forEach((item, index) => {
                //check is Transfer event
                if (item.topics[0] === "0xc73a785b824c849156b46b4c6a3391db5f86f6ec4bdd83f1625696d046f33c4e") {
                    rewardTemp = parseInt(item.data.slice(2, 66),16)
                }
            })
            assert.equal((blockNumber[blockNumber.length - 1] - blockNumber[blockNumber.length - 2]) * 100 * 3 / 4, rewardTemp, "actual reward temp: " + rewardTemp);
            rewardTemp = 0;


            transaction = await rifiVault.withdraw(0, 10, {from: otherAccount})
            console.log("12. otherAccount withdraw pool 0 transaction: https://testnet.bscscan.com/tx/" + transaction.tx, transaction.receipt.blockNumber)
            blockNumber.push(transaction.receipt.blockNumber)
            transaction.receipt.rawLogs.forEach((item, index) => {
                //check is Transfer event
                if (item.topics[0] === "0xc73a785b824c849156b46b4c6a3391db5f86f6ec4bdd83f1625696d046f33c4e") {
                    rewardTemp = parseInt(item.data.slice(2, 66),16)
                }
            })
            assert.equal((blockNumber[blockNumber.length - 1] - blockNumber[blockNumber.length - 2]) * 100 * 4 / 5, rewardTemp, "actual reward temp: " + rewardTemp);
            rewardTemp = 0;

            transaction = await rifiVault.add(100, token2Address, true, {from: governance});
            console.log("13. add second pool transaction: https://testnet.bscscan.com/tx/" + transaction.tx, transaction.receipt.blockNumber)
            blockNumber.push(transaction.receipt.blockNumber)

            transaction = await rifiVault.deposit(0, 10, {from: otherAccount})
            console.log("14. otherAccount deposit pool 0 third transaction: https://testnet.bscscan.com/tx/" + transaction.tx, transaction.receipt.blockNumber)
            blockNumber.push(transaction.receipt.blockNumber)
            transaction.receipt.rawLogs.forEach((item, index) => {
                //check is Transfer event
                if (item.topics[0] === "0xc73a785b824c849156b46b4c6a3391db5f86f6ec4bdd83f1625696d046f33c4e") {
                    rewardTemp = parseInt(item.data.slice(2, 66),16)
                }
            })
            assert.equal(Math.floor((blockNumber[blockNumber.length - 1] - blockNumber[blockNumber.length - 2]) * 50 * 3 / 4 +
                (blockNumber[blockNumber.length - 2] - blockNumber[blockNumber.length - 3]) * 100 * 3 / 4),
                rewardTemp, "actual reward temp: " + rewardTemp);
            rewardTemp = 0;

            transaction = await faucetContract.faucet(token2Address, account, {from: account})
            console.log("15. token2 faucet to account transaction: https://testnet.bscscan.com/tx/" + transaction.tx)

            transaction = await token2.approve(rifiVault.address, web3.utils.toWei("10000", "ether"), {from: account})
            console.log("16. token2 approve transaction: https://testnet.bscscan.com/tx/" + transaction.tx)

            transaction = await rifiVault.deposit(1, 10, {from: account})
            console.log("17. Account deposit pool 1 first transaction: https://testnet.bscscan.com/tx/" + transaction.tx, transaction.receipt.blockNumber)
            blockNumber.push(transaction.receipt.blockNumber)

            transaction = await rifiVault.set(1, 300, true, {from: governance})
            console.log("18. set alloc pool 1 transaction: https://testnet.bscscan.com/tx/" + transaction.tx, transaction.receipt.blockNumber)
            blockNumber.push(transaction.receipt.blockNumber)

            transaction = await rifiVault.deposit(1, 10, {from: account})
            console.log("19. Account deposit pool 1 second transaction: https://testnet.bscscan.com/tx/" + transaction.tx, transaction.receipt.blockNumber)
            blockNumber.push(transaction.receipt.blockNumber)

            transaction.receipt.rawLogs.forEach((item, index) => {
                //check is Transfer event
                if (item.topics[0] === "0xc73a785b824c849156b46b4c6a3391db5f86f6ec4bdd83f1625696d046f33c4e") {
                    rewardTemp = parseInt(item.data.slice(2, 66),16)
                }
            })
            assert.equal((blockNumber[blockNumber.length - 1] - blockNumber[blockNumber.length - 2]) * 100 * 3 / 4 +
                (blockNumber[blockNumber.length - 2] - blockNumber[blockNumber.length - 3]) * 100 / 2,
                rewardTemp, "actual reward temp: " + rewardTemp);


            transaction = await rifiVault.setRewardPerBlock(200, true, {from: governance})
            console.log("20. setOraiRewardPerBlock first transaction: https://testnet.bscscan.com/tx/" + transaction.tx, transaction.receipt.blockNumber)
            blockNumber.push(transaction.receipt.blockNumber)

            transaction = await rifiVault.deposit(1, 10, {from: account})
            console.log("21. Account deposit pool 1 third transaction: https://testnet.bscscan.com/tx/" + transaction.tx, transaction.receipt.blockNumber)
            blockNumber.push(transaction.receipt.blockNumber)

            transaction.receipt.rawLogs.forEach((item, index) => {
                //check is Transfer event
                if (item.topics[0] === "0xc73a785b824c849156b46b4c6a3391db5f86f6ec4bdd83f1625696d046f33c4e") {
                    rewardTemp = parseInt(item.data.slice(2, 66),16)
                }
            })
            assert.equal((blockNumber[blockNumber.length - 1] - blockNumber[blockNumber.length - 2]) * 200 * 3 / 4 +
                (blockNumber[blockNumber.length - 2] - blockNumber[blockNumber.length - 3]) * 100 * 3 / 4,
                rewardTemp, "actual reward temp: " + rewardTemp);


            transaction = await rifiVault.harvest(rewardTokenAddress, 10, governance, {from: governance});
            console.log("22. harvestOrai transaction: https://testnet.bscscan.com/tx/" + transaction.tx)
            transaction = await rifiVault.harvest(token2Address, 10, governance, {from: governance});
            console.log("23. harvestOrai transaction: https://testnet.bscscan.com/tx/" + transaction.tx)

            transaction = await rifiVault.claim(1, 10, {from: account})
            console.log("24. claim transaction: https://testnet.bscscan.com/tx/" + transaction.tx, transaction.receipt.blockNumber)
            // blockNumber.push(transaction.receipt.blockNumber)
            //
            // transaction.receipt.rawLogs.forEach((item, index) => {
            //     //check is Transfer event
            //     if (item.topics[0] === "0xc73a785b824c849156b46b4c6a3391db5f86f6ec4bdd83f1625696d046f33c4e") {
            //         rewardTemp = parseInt(item.data.slice(2, 66),16)
            //     }
            // })
            // assert.equal((blockNumber[blockNumber.length - 1] - blockNumber[blockNumber.length - 2]) * 200 * 3 / 4,
            //     rewardTemp, "actual reward temp: " + rewardTemp);

            transaction = await rifiVault.claimMax(1, {from: account})
            console.log("25. claim max transaction: https://testnet.bscscan.com/tx/" + transaction.tx, transaction.receipt.blockNumber)
            // blockNumber.push(transaction.receipt.blockNumber)
            //
            // transaction.receipt.rawLogs.forEach((item, index) => {
            //     //check is Transfer event
            //     if (item.topics[0] === "0xc73a785b824c849156b46b4c6a3391db5f86f6ec4bdd83f1625696d046f33c4e") {
            //         rewardTemp = parseInt(item.data.slice(2, 66),16)
            //     }
            // })
            // assert.equal((blockNumber[blockNumber.length - 1] - blockNumber[blockNumber.length - 2]) * 200 * 3 / 4,
            //     rewardTemp, "actual reward temp: " + rewardTemp);
            console.log("End testing")
        }).timeout(40000000000)

    });
});
