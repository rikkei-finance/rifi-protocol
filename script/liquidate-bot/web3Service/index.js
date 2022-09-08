const { env } = require("../config/config");
const Web3 = require('web3');
const TransactionFactory = require('@ethereumjs/tx').TransactionFactory;
const Common = require('@ethereumjs/common').default;

class Web3Service {
  web3 = new Web3();
  chainId = "";
  constructor(chainId) {
    console.log("Cretae web3 service with chainId", chainId);
    this.chainId = chainId;
    const config = env[chainId];
    this.web3 = new Web3(config.rpcEndpoint);
  }

  async getGasPrice() {
    let gasPrice = await this.web3.eth.getGasPrice();
    if (Number(gasPrice) < 10000000000) {
      gasPrice = '10000000000';
    }
    return gasPrice
  }

  async getNonce(account) {
    const nonce = await this.web3.eth.getTransactionCount(account, "pending");
    return nonce;
  }

  async estimateGas(tx) {
    return await this.web3.eth.estimateGas(tx)
  }

  createContract(abi, address) {
    return new this.web3.eth.Contract(abi, address);
  }

  signTransaction(txParams, chainId, privKey) {
    const common = Common.custom({ name: 'BNB', networkId: chainId, chainId: chainId });
    const tx = TransactionFactory.fromTxData(txParams, { common })

    const privateKey = Buffer.from(privKey,'hex');
    const signedTx = tx.sign(privateKey)
    const serializedTx = signedTx.serialize()
    return serializedTx.toString("hex");
  }

  sendTransaction(txHex) {
    return this.web3.eth.sendSignedTransaction(txHex);
  }

  privateKeyToAddress(privateKey) {
    if (privateKey[1] != 'x') {
      privateKey = '0x' + privateKey
    }
    const { address } = this.web3.eth.accounts.privateKeyToAccount(privateKey);
    return address;
  }
}

module.exports = Web3Service