const HDWalletProvider = require("@truffle/hdwallet-provider");

const fs = require("fs");
const mnemonic = fs.readFileSync(".secret").toString().trim();
const infuraProject = "598f149bca12438caeb720bdd9aadb09";

module.exports = {
  /**
   * Networks define how you connect to your ethereum client and let you set the
   * defaults web3 uses to send transactions. If you don't specify one truffle
   * will spin up a development blockchains for you on port 9545 when you
   * run `develop` or `test`. You can ask a truffle command to use a specific
   * network from the command line, e.g
   *
   * $ truffle test --network <network-name>
   */

  // contracts_directory: "./tests/contracts",

  plugins: [
    'truffle-plugin-verify'
  ],

  api_keys: {
    bscscan: 'U7Y36B8XAWNBZSHXCM3XVDSFGGZU29U5EQ',
    etherscan: 'MFE96AD3W6EC6PPAV27ASFUT2E82FV3RUN'
  },

  networks: {
    bsc_mainnet: {
      provider: () =>
        // new HDWalletProvider(mnemonic, `https://bsc-dataseed.binance.org/`),
        new HDWalletProvider(mnemonic, `wss://bsc-ws-node.nariox.org:443`),
      network_id: 56,
      confirmations: 2,
      timeoutBlocks: 200000000,
      skipDryRun: true,
      production: true,
    },
    bsc_testnet: {
      provider: () =>
        new HDWalletProvider(
          mnemonic,
          `wss://data-seed-prebsc-2-s2.binance.org:8545`
        ),
      network_id: 97,
      confirmations: 2,
      timeoutBlocks: 200000000,
      skipDryRun: true,
    },
    eth_mainnet: {
      provider: () =>
        new HDWalletProvider(mnemonic, `wss://mainnet.infura.io/ws/v3/${infuraProject}`),
      network_id: 1,
      confirmations: 2,
      gasPrice: 50000000000,    // 50 gwei
      timeoutBlocks: 200000000,
      skipDryRun: true,
    },
    ropsten: {
      provider: () =>
        new HDWalletProvider(
          mnemonic,
          `wss://ropsten.infura.io/ws/v3/${infuraProject}`
        ),
      network_id: 3, // Ropsten's id
      gas: 7000000, // Ropsten has a lower block limit than mainnet
      confirmations: 2, // # of confs to wait between deployments. (default: 0)
      timeoutBlocks: 200000000, // # of blocks before a deployment times out  (minimum/default: 50)
      skipDryRun: true, // Skip dry run before migrations? (default: false for public nets )
    },
    rinkeby: {
      provider: () =>
        new HDWalletProvider(
          mnemonic,
          `wss://rinkeby.infura.io/ws/v3/${infuraProject}`
        ),
      network_id: 4, // Rinkeby's id
      gas: 7000000, // Rinkeby has a lower block limit than mainnet
      confirmations: 2, // # of confs to wait between deployments. (default: 0)
      timeoutBlocks: 200000000, // # of blocks before a deployment times out  (minimum/default: 50)
      skipDryRun: true, // Skip dry run before migrations? (default: false for public nets )
    },
    kovan: {
      provider: () =>
        new HDWalletProvider(
          mnemonic,
          `wss://kovan.infura.io/ws/v3/${infuraProject}`
        ),
      network_id: 42, // Kovan's id
      gas: 7000000, // Kovan has a lower block limit than mainnet
      confirmations: 2, // # of confs to wait between deployments. (default: 0)
      timeoutBlocks: 200000000, // # of blocks before a deployment times out  (minimum/default: 50)
      skipDryRun: true, // Skip dry run before migrations? (default: false for public nets )
    },
  },

  mocha: {
    timeout: 86400000
  },

  // Configure your compilers
  compilers: {
    solc: {
      version: "0.5.16", // Fetch exact version from solc-bin (default: truffle's version)
      // docker: true,        // Use "0.5.1" you've installed locally with docker (default: false)
      settings: {
        // See the solidity docs for advice about optimization and evmVersion
        optimizer: {
          enabled: true,
          runs: 200,
        },
        // evmVersion: "byzantium"
      },
    },
  },
};
