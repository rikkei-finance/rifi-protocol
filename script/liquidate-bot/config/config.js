require('dotenv').config();

module.exports = {
  rpcEndpoint: process.env.RPC_ENDPOINT,
  bot_liquidate_address: process.env.LIQUIDATE_ADDRESS,
  rifi_lens_address: process.env.RIFI_LENS_ADDRESS,
  privateKey: process.env.SENDER_PRIVATEKEY,
}