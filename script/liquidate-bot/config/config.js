require('dotenv').config();

const chainIDs = process.env.CHAIN_IDS.split(',');

const env = {
  privateKey: process.env.SENDER_PRIVATEKEY,
};
chainIDs.forEach(chainId => {
  env[chainId] = {
    rpcEndpoint: process.env[`RPC_ENDPOINT_${chainId}`],
    bot_liquidate_address: process.env[`LIQUIDATE_ADDRESS_${chainId}`],
    rifi_lens_address: process.env[`RIFI_LENS_ADDRESS_${chainId}`],
  }
})

module.exports = { env }