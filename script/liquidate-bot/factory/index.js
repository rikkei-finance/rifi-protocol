const Web3Service = require('../web3Service');
const Checker = require('../main');
const { env } = require("../config/config");

class Factory {
  static checkers = {};
  /**
   * 
   * @param { number } chainId 
   * @returns { Checker }
   */
  static create(chainId) {
    if (!Factory.checkChainIdSupported(chainId)) return null;
    if (!Factory.checkers[chainId]) {
      const web3Service = new Web3Service(chainId);
      const checker = new Checker(web3Service);
      Factory.checkers[chainId] = checker;
      return checker;
    }
    return Factory.checkers[chainId];
  }

  static checkChainIdSupported(chainId) {
    const config = env[chainId];
    return !!config;
  }
}

module.exports = Factory;