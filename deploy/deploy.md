# RIFI Protocol

- Development environment setup (recommended):
    - Repository: [https://github.com/rikkei-finance/rifi-protocol](https://github.com/rikkei-finance/rifi-protocol)
    - OS: Ubuntu (or any other linux system)
    - Editor: Visual Studio Code - [https://code.visualstudio.com/](https://code.visualstudio.com/) with extensions:
        - Remote Development
            - Open project folder
            - Run command (Ctrl + Shift + P): `Remote-container: Reopen in Container`
            - After VSCode finishes environment building & setting up. Run `yarn install` to install dependencies.
        - Solidity
        - ESLint
    - Docker - [https://docs.docker.com/engine/install/ubuntu/](https://docs.docker.com/engine/install/ubuntu/)
- Token deploy configuration: `deploy/networks/<network_dir>/config.json`
    - RIFI: address of RIFI token that will be used by Protocol on the specified network (Ex: BSC mainnet)
    - rNative: Configurations for native token of the network. Ex: BNB on BSC, ETH on Ethereum.
    - rTokens: configurations of other non-native tokens.

```json
{
  "RIFI": "0xe17fbdf671f3cce0f354cacbd27e03f4245a3ffe",
  "rNative": {
    "name": "Rifi BNB",
    "symbol": "rBNB",
    "decimals": 8,
    "underlying": {
      "symbol": "BNB",  // <Required> Underlying token's symbol.
      "decimals": 18,  // <Required> Decimals number of underlying token
      "address": ""  // Address of underlying token. Must be empty for native token
    },
    "interestRateModel": {
      "address": "0x191778cDf53d9312A1deD358291B989ddf027d59",   // If it's empty, new model contract will be deployed and it's address will be updated to this field.
      "model": "JumpRateModel",   // Current script only support JumpRateModel.
      "params": {   // Parameters for Interest rate model
        "baseRatePerYear": "0.02",
        "lowerBaseRatePerYear": "0.01",
        "multiplierPerYear": "0.04",
        "jumpMultiplierPerYear": "1.09",
        "kink_": "0.8",
        "lowerKink_": "0.4"
      }
    },
    "initialExchangeRateMantissa": "200000000",
    "collateralFactor": "0.7",
    "reserveFactor": "0.1",
    "rifiSpeed": "0.04"
  },
  "rTokens": {
    "rBUSD": {
      "name": "Rifi BUSD",
      "symbol": "rBUSD",
      "decimals": 8,
      "underlying": {
        "symbol": "BUSD",
        "decimals": 18,
        "address": "0xe9e7cea3dedca5984780bafc599bd69add087d56"
      },
      "interestRateModel": {
        "address": "0xF6f827A6f62556c9bee77611BA754bcaDab9f141",
        "model": "JumpRateModel",
        "params": {
          "baseRatePerYear": "0.02",
          "lowerBaseRatePerYear": "0.01",
          "multiplierPerYear": "0.04",
          "jumpMultiplierPerYear": "1.09",
          "kink_": "0.8",
          "lowerKink_": "0.4"
        }
      },
      "initialExchangeRateMantissa": "200000000",
      "collateralFactor": "0.8",
      "reserveFactor": "0.1",
      "rifiSpeed": "0.08"
    }
  }
}
```

- Hardhat config file: `hardhat.config.js`
    - To add new network, after adding network config to `networks` part, also specify API_KEY (from block scanner/explorer) for that network too.

```jsx
const API_KEYS = {
  bsc_mainnet: BSC_API_KEY,
  bsc_testnet: BSC_API_KEY,
  eth_mainnet: ETHER_API_KEY,
  ropsten: ETHER_API_KEY,
  rinkeby: ETHER_API_KEY,
  kovan: ETHER_API_KEY,
};
```

- Price feed sources for PriceOracle: `deploy/networks/<network_dir>/chainlink.json` (currently we only support networks and tokens that are available on Chainlink
- Deployment progress: `deploy/networks/<network_dir>/progress.json`
    - For continuing deployment progress if it’s broken/interrupted (manual break, network failure ...)
    - For running 1 or some specific steps again (update token params).
    - If a step does not exist in the file or set to `false`, it will be re-run

    ```json
    {
      "Unitroller": true,
      "Cointroller": true,
      "unitroller._setPendingImplementation": true,
      "cointroller._become": true,
      "SimplePriceOracle": true,
      "unitroller._setPriceOracle": true,
      "unitroller._setCloseFactor": true,
      "unitroller._setLiquidationIncentive": true,
      "RifiLens": true,
      "unitroller.initialize": true,
      "rNative": true,
      "rNative: verify": true,
      "rNative: unitroller._supportMarket": true,
      "rNative: priceOracle.setOracleData": true,
      "rNative: unitroller._setCollateralFactor": true,
      "rNative: rToken._setReserveFactor": true,
      "rNative: unitroller._setRifiSpeed": true,
      "Maximillion": true,
      "Maximillion:verify": true
    }
    ```

- Environment variables: `.env`
    - These variables will be used in `hardhat.config.js`

```bash
MAINNET_KEY=<deployment_account_private_key_for_mainnet>
TESTNET_KEY=<deployment_account_private_key_for_testnet>
LOCAL_KEY=<deployment_account_private_key_for_locallhost>
INFURA_PROJECT_ID=598f149bca12438xxxxxxxxx
ETHER_API_KEY=MFE96xxxxxxxxxxxxxxxxxxxx
BSC_API_KEY=U7Yxxxxxxxxxxxxxxxxxxxxx
```

- Run deployment script:
    - Example for BSC mainnet (any of below works)
        - `yarn run deploy:bsc_mainnet`
        - `HARDHAT_NETWORK=bsc_mainnet hardhat run deploy/lending.js`