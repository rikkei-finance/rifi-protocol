const { bot_liquidate_address, privateKey, sender } = require("../config/config");
const bot_liquidate_abi = require('../abis/bot-liquidate.json');
const { number2Hex } = require('../helpers');
const { getChainID, estimateGas, getGasPrice, getNonce, sendTransaction, signTransaction, createContract } = require('../web3Service');
const botLiquidateContract = createContract(bot_liquidate_abi, bot_liquidate_address);

async function liquidateBorrow(
  rToken, borrower, repayAmount, rTokenCollateral
) {
  const data = botLiquidateContract.methods.liquidateBorrow(
    rToken, borrower, repayAmount, rTokenCollateral
  ).encodeABI();

  const [chainId, gasPrice, nonce, gasLimit] = await Promise.all([
    getChainID(),
    getGasPrice(),
    getNonce(sender),
    estimateGas({to: botLiquidateContract.options.address,data})
  ]);
  
  const txParams = {
    nonce,
    gasPrice: number2Hex(Number(gasPrice)),
    gasLimit: number2Hex(Number(gasLimit)),
    to: botLiquidateContract.options.address,
    value: '0x00',
    data,
  }
  const signed = signTransaction(txParams, chainId, privateKey);
  return sendTransaction('0x' + signed);
}

module.exports = { liquidateBorrow };