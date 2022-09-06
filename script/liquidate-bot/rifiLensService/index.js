const { env } = require("../config/config");
const rifi_lens_abi = require("../abis/rifilens.json");
const Web3Service = require("../web3Service");

class RifiLenService {
  rifiLensContract;
  web3Service;
  /**
   * 
   * @param {Web3Service} web3Service 
   */
  constructor(web3Service) {
    this.web3Service = web3Service;
    const config = env[web3Service.chainId];
    this.rifiLensContract = web3Service.createContract(rifi_lens_abi, config.rifi_lens_address);
  }
  
async getRTokenMetadataAll(rTokensAddress) {
  const { rTokens } = await this.rifiLensContract.methods.rTokenMetadataAll(rTokensAddress).call();
  const result = [];
  for (let i = 0; i < rTokens.length; ++i) {
    const data = rTokens[i];
    const {
      rToken, exchangeRateCurrent, supplyRatePerBlock, borrowRatePerBlock, 
      reserveFactorMantissa, totalBorrows, totalReserves, totalSupply, totalCash,
      isListed, collateralFactorMantissa, underlyingAssetAddress, rTokenDecimals, underlyingDecimals
    } = data;
    result.push({
      rToken, exchangeRateCurrent, supplyRatePerBlock, borrowRatePerBlock, 
      reserveFactorMantissa, totalBorrows, totalReserves, totalSupply, totalCash,
      isListed, collateralFactorMantissa, underlyingAssetAddress, rTokenDecimals, underlyingDecimals
    })
  }
  return result;
}

async getRTokenBalancesAll(rTokensAddress, user) {
  const rTokens = await this.rifiLensContract.methods.rTokenBalancesAll(rTokensAddress, user).call();
  const result = [];
  for (let i = 0; i < rTokens.length; ++i) {
    const data = rTokens[i];
    const {rToken, balanceOf, borrowBalanceCurrent, balanceOfUnderlying, tokenBalance, tokenAllowance} = data;
    result.push({rToken, balanceOf, borrowBalanceCurrent, balanceOfUnderlying, tokenBalance, tokenAllowance});
  }
  return result;
}

async getRTokenUnderlyingPriceAll(rTokensAddress) {
  const rTokens = await this.rifiLensContract.methods.rTokenUnderlyingPriceAll(rTokensAddress).call();
  const result = [];
  for (let i = 0; i < rTokens.length; ++i) {
    const data = rTokens[i];
    const {rToken, underlyingPrice} = data;
    result.push({rToken, underlyingPrice});
  }
  return result;
}
}


module.exports = RifiLenService;