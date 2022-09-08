const { env } = require("../config/config");
const bot_liquidate_abi = require('../abis/bot-liquidate.json');
const { number2Hex, round } = require('../helpers');
const Web3Service = require('../web3Service');

class BotLiquidateService {
  botLiquidateContract;
  web3Service;
  sender = "";
  gasBuffer = 1.2;
  /**
   * 
   * @param {Web3Service} web3Service 
   */
  constructor(web3Service) {
    this.web3Service = web3Service;
    const config = env[web3Service.chainId];
    this.botLiquidateContract = web3Service.createContract(bot_liquidate_abi, config.bot_liquidate_address);
    this.sender = web3Service.privateKeyToAddress(env.privateKey);
  }
  async liquidateBorrow(
    rToken, borrower, repayAmount, rTokenCollateral
  ) {
    const data = this.botLiquidateContract.methods.liquidateBorrow(
      rToken, borrower, repayAmount, rTokenCollateral
    ).encodeABI();
  
    const [gasPrice, nonce, gasLimit] = await Promise.all([
      this.web3Service.getGasPrice(),
      this.web3Service.getNonce(this.sender),
      this.web3Service.estimateGas({to: this.botLiquidateContract.options.address,data})
    ]);
    
    const txParams = {
      nonce,
      gasPrice: number2Hex(Number(gasPrice)),
      gasLimit: number2Hex(Math.round(Number(gasLimit) * this.gasBuffer)),
      to: this.botLiquidateContract.options.address,
      value: '0x00',
      data,
    }
    const signed = this.web3Service.signTransaction(txParams, this.web3Service.chainId, env.privateKey);
    return this.web3Service.sendTransaction('0x' + signed);
  }
}



module.exports = BotLiquidateService;