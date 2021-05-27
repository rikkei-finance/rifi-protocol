const HDWalletProvider = require('@truffle/hdwallet-provider');

const fs = require('fs');
const mnemonic = fs.readFileSync('.secret').toString().trim();

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

    networks: {
        testnet: {
            provider: () => new HDWalletProvider(mnemonic, `https://data-seed-prebsc-2-s2.binance.org:8545`),
            network_id: 97,
            confirmations: 2,
            timeoutBlocks: 200000000,
            skipDryRun: true
        },
        mainnet: {
            provider: () => new HDWalletProvider(mnemonic, `https://bsc-dataseed.binance.org/`),
            network_id: 56,
            confirmations: 2,
            timeoutBlocks: 200000000,
            skipDryRun: true
        },
        // kovan: {
        //     provider: () => new HDWalletProvider(mnemonic, `https://kovan.infura.io/v3/8d62942fd62641a7ab758673105b6df3`),
        //     network_id: 42,       // Ropsten's id
        //     gas: 7000000,        // Ropsten has a lower block limit than mainnet
        //     confirmations: 2,    // # of confs to wait between deployments. (default: 0)
        //     timeoutBlocks: 200000000,  // # of blocks before a deployment times out  (minimum/default: 50)
        //     skipDryRun: true,     // Skip dry run before migrations? (default: false for public nets )
        // },
    },

    mocha: {
        // timeout: 100000
    },

    // Configure your compilers
    compilers: {
        solc: {
            version: '0.5.16',    // Fetch exact version from solc-bin (default: truffle's version)
            // docker: true,        // Use "0.5.1" you've installed locally with docker (default: false)
            settings: {          // See the solidity docs for advice about optimization and evmVersion
                optimizer: {
                    enabled: true,
                    runs: 200,
                },
                // evmVersion: "byzantium"
            },
        },
    },
    plugins: [
        "truffle-plugin-verify"
    ],
    api_keys: {
        etherscan: "CM6AMMHE4FA4YIQVW7BBTHRGDDARP3VSEJ"
    }

};
