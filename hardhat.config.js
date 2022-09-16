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
  MOONBEAM_API_KEY,
  HARDHAT_NETWORK,
  POLYGONSCAN_API_KEY,
  ALCHEMY_PROJECT_ID
} = process.env;

const API_KEYS = {
  bsc_mainnet: BSC_API_KEY,
  bsc_testnet: BSC_API_KEY,
  eth_mainnet: ETHER_API_KEY,
  ropsten: ETHER_API_KEY,
  rinkeby: ETHER_API_KEY,
  kovan: ETHER_API_KEY,
  goerli: ETHER_API_KEY,
  moonbase: MOONBEAM_API_KEY,
  mumbai: POLYGONSCAN_API_KEY
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
        version: "0.8.10",
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
    apiKey: {
      mainnet: ETHER_API_KEY,
      ropsten: ETHER_API_KEY,
      rinkeby: ETHER_API_KEY,
      goerli: ETHER_API_KEY,
      kovan: ETHER_API_KEY,
      // binance smart chain
      bsc: BSC_API_KEY,
      bscTestnet: BSC_API_KEY,
      // // huobi eco chain
      // heco: "YOUR_HECOINFO_API_KEY",
      // hecoTestnet: "YOUR_HECOINFO_API_KEY",

      // // fantom mainnet
      // opera: "YOUR_FTMSCAN_API_KEY",
      // ftmTestnet: "YOUR_FTMSCAN_API_KEY",

      // // optimism
      // optimisticEthereum: "YOUR_OPTIMISTIC_ETHERSCAN_API_KEY",
      // optimisticKovan: "YOUR_OPTIMISTIC_ETHERSCAN_API_KEY",

      // // polygon
      // polygon: "YOUR_POLYGONSCAN_API_KEY",
      polygonMumbai: POLYGONSCAN_API_KEY,
    
      // // arbitrum
      // arbitrumOne: "YOUR_ARBISCAN_API_KEY",
      // arbitrumTestnet: "YOUR_ARBISCAN_API_KEY",

      // // avalanche
      // avalanche: "YOUR_SNOWTRACE_API_KEY",
      // avalancheFujiTestnet: "YOUR_SNOWTRACE_API_KEY",

      // moonbeam
      moonbeam: MOONBEAM_API_KEY,
      // moonriver: "YOUR_MOONRIVER_MOONSCAN_API_KEY",
      moonbaseAlpha: MOONBEAM_API_KEY,

      // // harmony
      // harmony: "YOUR_HARMONY_API_KEY",
      // harmonyTest: "YOUR_HARMONY_API_KEY",
      // // xdai and sokol don't need an API key, but you still need
      // // to specify one; any string placeholder will work
      // xdai: "api-key",
      // sokol: "api-key",
      // aurora: "api-key",
      // auroraTestnet: "api-key",
    },
  },
  networks: {
    localhost: {
      // url: `wss://data-seed-prebsc-2-s2.binance.org:8545`,
      url: "http://127.0.0.1:7545",
      accounts: [`0x${LOCAL_KEY}`],
      network_id: 5777,
    },
    bsc_mainnet: {
      url: `https://bsc-dataseed.binance.org/`,
      // url: `wss://bsc-ws-node.nariox.org:443`,
      accounts: [`0x${MAINNET_KEY}`],
      network_id: 56,
      confirmations: 2,
      timeoutBlocks: 200000000,
      skipDryRun: true,
      production: true,
    },
    bsc_testnet: {
      url: `https://data-seed-prebsc-2-s2.binance.org:8545`,
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
    goerli: {
      url: `https://goerli.infura.io/v3/${INFURA_PROJECT_ID}`,
      accounts: [`0x${TESTNET_KEY}`],
      network_id: 5, // Goerli's id
      gas: 7000000, // Goerli has a lower block limit than mainnet
      confirmations: 2, // # of confs to wait between deployments. (default: 0)
      timeoutBlocks: 200000000, // # of blocks before a deployment times out  (minimum/default: 50)
      skipDryRun: true, // Skip dry run before migrations? (default: false for public nets )
    },
    moonbase: {
      url: `https://rpc.testnet.moonbeam.network`,
      accounts: [`0x${TESTNET_KEY}`],
      network_id: 1287, // Moonbase's id
      gas: 7000000, // Moonbase has a lower block limit than mainnet
      confirmations: 2, // # of confs to wait between deployments. (default: 0)
      timeoutBlocks: 200000000, // # of blocks before a deployment times out  (minimum/default: 50)
      skipDryRun: true, // Skip dry run before migrations? (default: false for public nets )
    },
    shibuya: {
      url: `https://evm.shibuya.astar.network`,
      accounts: [`0x${TESTNET_KEY}`],
      network_id: 81, // Moonbase's id
      gas: 7000000, // Kovan has a lower block limit than mainnet
      confirmations: 2, // # of confs to wait between deployments. (default: 0)
      timeoutBlocks: 200000000, // # of blocks before a deployment times out  (minimum/default: 50)
      skipDryRun: true, // Skip dry run before migrations? (default: false for public nets )
    },
    mumbai: {
      url: `https://polygon-mumbai.g.alchemy.com/v2/${ALCHEMY_PROJECT_ID}`,
      accounts: [`0x${TESTNET_KEY}`],
      network_id: 80001, // Mumbai's id
      gas: 7000000, // Mumbai has a lower block limit than mainnet
      confirmations: 2, // # of confs to wait between deployments. (default: 0)
      timeoutBlocks: 200000000, // # of blocks before a deployment times out  (minimum/default: 50)
      skipDryRun: true, // Skip dry run before migrations? (default: false for public nets )
    }
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
