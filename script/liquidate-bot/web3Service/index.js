const { rpcEndpoint } = require("../config/config");
const Web3 = require('web3');
const TransactionFactory = require('@ethereumjs/tx').TransactionFactory;
const Common = require('@ethereumjs/common').default;

const web3 = new Web3(rpcEndpoint);

async function getChainID() {
  return await web3.eth.getChainId();
}

async function getGasPrice() {
  return await web3.eth.getGasPrice()
}

async function getNonce(account) {
  const nonce = await web3.eth.getTransactionCount(account, "pending");
  return nonce;
}

async function estimateGas(tx) {
  return await web3.eth.estimateGas(tx)
}

function createContract(abi, address) {
  return new web3.eth.Contract(abi, address);
}

function signTransaction(txParams, chainId, privKey) {
  const common = Common.custom({ name: 'BNB', networkId: chainId, chainId: chainId });
  const tx = TransactionFactory.fromTxData(txParams, { common })

  const privateKey = Buffer.from(privKey,'hex');
  const signedTx = tx.sign(privateKey)
  const serializedTx = signedTx.serialize()
  return serializedTx.toString("hex");
}

function sendTransaction(txHex) {
  return web3.eth.sendSignedTransaction(txHex);
}

module.exports = {
  getChainID, getGasPrice, getNonce, estimateGas, createContract, signTransaction, sendTransaction
};