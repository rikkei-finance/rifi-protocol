
const { getListRToken } = require("../rToken");
const { numberToString, round } = require('../helpers');
const RifiLensService = require('../rifiLensService');
const BotLiquidateService = require('../botLiquidateService');
const Web3Service = require("../web3Service");

const ratioLiquidate = 35 / 100;
const ratioBonusPrice = 92 / 100;

class Checker {
  rifiLenService;
  botLiquidateService;
  web3Service;
  /**
   * 
   * @param {Web3Service} web3Service 
   */
  constructor(web3Service) {
    this.web3Service = web3Service;
    this.rifiLenService = new RifiLensService(web3Service);
    this.botLiquidateService = new BotLiquidateService(web3Service);
  }

  getUSDValue(underlyingValue, rTokenPrice) {
    const { underlyingPrice } = rTokenPrice;
    return underlyingValue * underlyingPrice / 10 ** 26
  }
  
  getCollateralTokens(rTokenBalances) {
    const tokens = [];
    for (let i = 0; i < rTokenBalances.length; ++i) {
      const rTokenBalance = rTokenBalances[i];
      if (Number(rTokenBalance.balanceOf) > 0) {
        const {rToken, balanceOf, borrowBalanceCurrent, balanceOfUnderlying} = rTokenBalance;
        tokens.push({rToken, balanceOf, borrowBalanceCurrent, balanceOfUnderlying});
      }
    }
    return tokens;
  }
  
  getBorrowTokens(rTokenBalances) {
    const tokens = [];
    for (let i = 0; i < rTokenBalances.length; ++i) {
      const rTokenBalance = rTokenBalances[i];
      if (Number(rTokenBalance.borrowBalanceCurrent) > 0) {
        const {rToken, balanceOf, borrowBalanceCurrent, balanceOfUnderlying} = rTokenBalance;
        tokens.push({rToken, balanceOf, borrowBalanceCurrent, balanceOfUnderlying});
      }
    }
    return tokens;
  }
  
  getBorrowTokenToLiquidate(borrowTokens, rTokenPrices) {
    let maxBorrowToken = null;
    let maxBorrow = 0;
    borrowTokens.forEach(borrowToken => {
      const rTokenPrice = rTokenPrices.find(rTokenPrice => rTokenPrice.rToken === borrowToken.rToken);
      if (!rTokenPrice) return;
      const borrow = this.getUSDValue(Number(borrowToken.borrowBalanceCurrent), rTokenPrice);
      if (borrow > maxBorrow) {
        maxBorrow = borrow;
        maxBorrowToken = borrowToken;
      }
    });
    return maxBorrowToken;
  }
  
  getCollateralTokenToLiquidate(collateralTokens, rTokenPrices) {
    let maxCollateralToken = null;
    let maxCollateral = 0;
    
    collateralTokens.forEach(collateralToken => {
      const rTokenPrice = rTokenPrices.find(rTokenPrice => rTokenPrice.rToken === collateralToken.rToken);
      if (!rTokenPrice) return;
      const collateral = this.getUSDValue(Number(collateralToken.balanceOfUnderlying), rTokenPrice);
      if (collateral > maxCollateral) {
        maxCollateral = collateral;
        maxCollateralToken = collateralToken;
      }
    });
    return maxCollateralToken;
  }
  
  calculateRepayAmount(borrowToken, collateralToken, rTokenPrices) {
    const priceBorrowToken = rTokenPrices.find(rTokenPrice => rTokenPrice.rToken === borrowToken.rToken);
    const priceCollateralToken = rTokenPrices.find(rTokenPrice => rTokenPrice.rToken === collateralToken.rToken)
  
    const maxRepayUSD = borrowToken.borrowBalanceCurrent * ratioLiquidate;
    const collateralUSD = Number(collateralToken.balanceOfUnderlying) * priceCollateralToken.underlyingPrice / 1e18;
    let repayAmount = round(
      numberToString(
        Math.min(maxRepayUSD, collateralUSD) * 0.1 / priceBorrowToken.underlyingPrice * ratioBonusPrice * 1e18
      )
    );
    return repayAmount;
  }
  
  async checkBorrower(borrower) {
    try {
      const chainId = this.web3Service.chainId;
      const rTokens = getListRToken(chainId);
      const [rTokenBalances, rTokenPrices] = await Promise.all([
        this.rifiLenService.getRTokenBalancesAll(rTokens, borrower),
        this.rifiLenService.getRTokenUnderlyingPriceAll(rTokens)
      ]);
      const collateralTokens = this.getCollateralTokens(rTokenBalances);
      const borrowTokens = this.getBorrowTokens(rTokenBalances);
      const borrowToken = this.getBorrowTokenToLiquidate(borrowTokens, rTokenPrices);
      const collateralToken = this.getCollateralTokenToLiquidate(collateralTokens, rTokenPrices);
      const repayAmount = this.calculateRepayAmount(borrowToken, collateralToken, rTokenPrices);
      const transaction = await this.botLiquidateService.liquidateBorrow(
        borrowToken.rToken,
        borrower,
        repayAmount,
        collateralToken.rToken
      );
      return transaction
    } catch(error) {
      console.log(error)
      return null
    }
  }
}

module.exports = Checker;
