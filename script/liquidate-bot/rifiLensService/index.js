const { rifi_lens_address } = require("../config/config");
const rifi_lens_abi = require('../abis/rifilens.json');
const { createContract } = require('../web3Service');
const rifiLensContract = createContract(rifi_lens_abi, rifi_lens_address);

async function getRTokenMetadataAll(rTokensAddress) {
  const { rTokens } = await rifiLensContract.methods.rTokenMetadataAll(rTokensAddress).call();
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

async function getRTokenBalancesAll(rTokensAddress, user) {
  const rTokens = await rifiLensContract.methods.rTokenBalancesAll(rTokensAddress, user).call();
  const result = [];
  for (let i = 0; i < rTokens.length; ++i) {
    const data = rTokens[i];
    const {rToken, balanceOf, borrowBalanceCurrent, balanceOfUnderlying, tokenBalance, tokenAllowance} = data;
    result.push({rToken, balanceOf, borrowBalanceCurrent, balanceOfUnderlying, tokenBalance, tokenAllowance});
  }
  return result;
}

async function getRTokenUnderlyingPriceAll(rTokensAddress) {
  const rTokens = await rifiLensContract.methods.rTokenUnderlyingPriceAll(rTokensAddress).call();
  const result = [];
  for (let i = 0; i < rTokens.length; ++i) {
    const data = rTokens[i];
    const {rToken, underlyingPrice} = data;
    result.push({rToken, underlyingPrice});
  }
  return result;
}

module.exports = { getRTokenMetadataAll, getRTokenBalancesAll, getRTokenUnderlyingPriceAll };