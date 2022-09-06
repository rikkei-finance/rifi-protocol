const Web3Service = require('../web3Service');
const Checker = require('../main');

class Factory {
  static checkers = {};
  /**
   * 
   * @param { number } chainId 
   * @returns { Checker }
   */
  static create(chainId) {
    if (!Factory.checkers[chainId]) {
      const web3Service = new Web3Service(chainId);
      const checker = new Checker(web3Service);
      Factory.checkers[chainId] = checker;
      return checker;
    }
    return Factory.checkers[chainId];
  }
}

module.exports = Factory;