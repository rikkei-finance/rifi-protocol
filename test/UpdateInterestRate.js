const fs = require("fs");
const argv = require("minimist")(process.argv.slice(2));

const { network } = argv;

const JumpRateModel = artifacts.require("JumpRateModel");
const RBep20Delegator = artifacts.require("RBep20Delegator");

const deployConfig = `test/networks/${network}/config.json`;

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

    const config = {};

    const explorer = explorers[network];

    beforeEach(async () => {
      console.log("Prepairing...");
      assert.equal(
        fs.existsSync(deployConfig),
        true,
        `Configuration file not found: ${deployConfig}`
      );

      const configData = fs.readFileSync(deployConfig);
      Object.assign(config, JSON.parse(configData.toString()));

      console.log(config);

      console.log("Deploy");

      try {
        if (config.rNative) {
          const {
            rNative: {
              interestRateModel: {
                address: modelAddress,
                params: {
                  baseRatePerYear,
                  lowerBaseRatePerYear,
                  multiplierPerYear,
                  jumpMultiplierPerYear,
                  kink_,
                  lowerKink_,
                },
              },
            },
          } = config;

          if (modelAddress) {
            const interestRateModel = await JumpRateModel.at(modelAddress);
            const transaction = await interestRateModel.updateJumpRateModel(
              web3.utils.toWei(baseRatePerYear, "ether"),
              web3.utils.toWei(lowerBaseRatePerYear, "ether"),
              web3.utils.toWei(multiplierPerYear, "ether"),
              web3.utils.toWei(jumpMultiplierPerYear, "ether"),
              web3.utils.toWei(kink_, "ether"),
              web3.utils.toWei(lowerKink_, "ether")
            );
            console.log(
              `rNative interestRateModel.updateJumpRateModel: ${explorer}/address/${transaction.tx}`
            );
          }
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
              interestRateModel: {
                address: modelAddress,
                params: {
                  baseRatePerYear,
                  lowerBaseRatePerYear,
                  multiplierPerYear,
                  jumpMultiplierPerYear,
                  kink_,
                  lowerKink_,
                },
              },
            } = token;
            console.log(`Updating ${symbol} (${name})`);

            if (modelAddress) {
              const interestRateModel = await JumpRateModel.at(modelAddress);
              const transaction = await interestRateModel.updateJumpRateModel(
                web3.utils.toWei(baseRatePerYear, "ether"),
                web3.utils.toWei(lowerBaseRatePerYear, "ether"),
                web3.utils.toWei(multiplierPerYear, "ether"),
                web3.utils.toWei(jumpMultiplierPerYear, "ether"),
                web3.utils.toWei(kink_, "ether"),
                web3.utils.toWei(lowerKink_, "ether")
              );
              console.log(
                `${symbol} interestRateModel.updateJumpRateModel: ${explorer}/address/${transaction.tx}`
              );
            } else {
              console.log(`${symbol} is not configured.`);
            }
          }
        }
      } catch (e) {
        console.log(e);
      }
    });

    it("Common flow", async function () {}).timeout(40000000000);
  });
});
