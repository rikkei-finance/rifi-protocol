require("dotenv").config();
require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-web3");
require("@nomiclabs/hardhat-etherscan");

const {
  INFURA_PROJECT_ID,
  LOCAL_KEY,
  MAINNET_KEY,
  TESTNET_KEY,
  ETHER_API_KEY,
  BSC_API_KEY,
  HARDHAT_NETWORK,
} = process.env;

const API_KEYS = {
  bsc_mainnet: BSC_API_KEY,
  bsc_testnet: BSC_API_KEY,
  eth_mainnet: ETHER_API_KEY,
  ropsten: ETHER_API_KEY,
  rinkeby: ETHER_API_KEY,
  kovan: ETHER_API_KEY,
};

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.5.16",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.8.9",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  etherscan: {
    apiKey: API_KEYS[HARDHAT_NETWORK],
  },
  networks: {
    localhost: {
      // url: `wss://data-seed-prebsc-2-s2.binance.org:8545`,
      accounts: [`0x${LOCAL_KEY}`],
    },
    bsc_mainnet: {
      // url: `https://bsc-dataseed.binance.org/`,
      url: `https://bsc-dataseed1.defibit.io/`,
      // url: `https://bsc-dataseed1.ninicoin.io/`,
      accounts: [`0x${MAINNET_KEY}`],
      network_id: 56,
      confirmations: 2,
      timeoutBlocks: 200000000,
      skipDryRun: true,
      production: true,
    },
    bsc_testnet: {
      url: `https://data-seed-prebsc-2-s3.binance.org:8545`,
      accounts: [`0x${TESTNET_KEY}`],
      network_id: 97,
      confirmations: 2,
      timeoutBlocks: 200000000,
      skipDryRun: true,
    },
    eth_mainnet: {
      url: `https://mainnet.infura.io/v3/${INFURA_PROJECT_ID}`,
      accounts: [`0x${MAINNET_KEY}`],
      network_id: 1,
      confirmations: 2,
      gasPrice: 50000000000, // 50 gwei
      timeoutBlocks: 200000000,
      skipDryRun: true,
    },
    ropsten: {
      url: `https://ropsten.infura.io/v3/${INFURA_PROJECT_ID}`,
      accounts: [`0x${TESTNET_KEY}`],
      network_id: 3, // Ropsten's id
      gas: 7000000, // Ropsten has a lower block limit than mainnet
      confirmations: 2, // # of confs to wait between deployments. (default: 0)
      timeoutBlocks: 200000000, // # of blocks before a deployment times out  (minimum/default: 50)
      skipDryRun: true, // Skip dry run before migrations? (default: false for public nets )
    },
    rinkeby: {
      url: `https://rinkeby.infura.io/v3/${INFURA_PROJECT_ID}`,
      accounts: [`0x${TESTNET_KEY}`],
      network_id: 4, // Rinkeby's id
      gas: 7000000, // Rinkeby has a lower block limit than mainnet
      confirmations: 2, // # of confs to wait between deployments. (default: 0)
      timeoutBlocks: 200000000, // # of blocks before a deployment times out  (minimum/default: 50)
      skipDryRun: true, // Skip dry run before migrations? (default: false for public nets )
    },
    kovan: {
      url: `https://kovan.infura.io/v3/${INFURA_PROJECT_ID}`,
      accounts: [`0x${TESTNET_KEY}`],
      network_id: 42, // Kovan's id
      gas: 7000000, // Kovan has a lower block limit than mainnet
      confirmations: 2, // # of confs to wait between deployments. (default: 0)
      timeoutBlocks: 200000000, // # of blocks before a deployment times out  (minimum/default: 50)
      skipDryRun: true, // Skip dry run before migrations? (default: false for public nets )
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  mocha: {
    timeout: 86400000,
  },
};
