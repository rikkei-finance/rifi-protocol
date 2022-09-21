
const { getListRToken, getRNative } = require("../rToken");
const { numberToString, round } = require('../helpers');
const RifiLensService = require('../rifiLensService');
const BotLiquidateService = require('../botLiquidateService');
const Web3Service = require("../web3Service");
const LogService = require('../log');

const ratioLiquidate = 25 / 100;
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
    if (this.web3Service.chainId === 56 | this.web3Service.chainId === 97) {
      return underlyingValue * underlyingPrice / 10 ** 36
    } else {
      return underlyingValue * underlyingPrice / 10 ** 26
    }
  }

  getValueFromUSD(usd, rTokenPrice) {
    const { underlyingPrice } = rTokenPrice;
    if (this.web3Service.chainId === 56 | this.web3Service.chainId === 97) {
      return usd * 10 ** 35 / underlyingPrice;
    } else {
      return usd * 10 ** 26 / underlyingPrice
    }
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
  
  calculateRepayAmount(borrowToken, collateralToken, rTokensPrice, rTokensMetadata) {
    const priceBorrowToken = rTokensPrice.find(rTokenPrice => rTokenPrice.rToken === borrowToken.rToken);
    const priceCollateralToken = rTokensPrice.find(rTokenPrice => rTokenPrice.rToken === collateralToken.rToken);
    const collateralMetadata = rTokensMetadata.find(rTokenMetadata => rTokenMetadata.rToken === collateralToken.rToken);
  
    const collateralReserves = collateralMetadata.totalReserves;
    const maxCollateral = Math.min(Number(collateralReserves), Number(collateralToken.balanceOfUnderlying));
    const maxRepayUSD = this.getUSDValue(borrowToken.borrowBalanceCurrent, priceBorrowToken) * ratioLiquidate;
    const collateralUSD = this.getUSDValue(maxCollateral, priceCollateralToken) * ratioBonusPrice;
    let repayAmount = round(
      numberToString(
        this.getValueFromUSD(Math.min(maxRepayUSD, collateralUSD), priceBorrowToken)
      )
    );
    return {
      repayAmount,
      repayUSD: this.getUSDValue(repayAmount, priceBorrowToken)
    };
  }

  async checkFeeTransaction(borrowToken, borrower, repayAmount, collateralToken, repayUSD) {
    const feeTransaction = await this.botLiquidateService.estimateFeeForLiquidate(
      borrowToken.rToken,
      borrower,
      repayAmount,
      collateralToken.rToken
    );
    if (!feeTransaction) return false;
    const rNativePrice = rTokenPrices.find(rTokenPrice => rTokenPrice.rToken === getRNative(chainId));
    if (!rNativePrice) {
      LogService.log("Cannot find rNative to calculate fee");
      return false;
    }
    const feeUSD = this.getUSDValue(feeTransaction, rNativePrice);
    if (repayUSD * (1 - ratioBonusPrice) <= feeUSD) {
      LogService.log(`Fee transaction is too high ($${feeUSD})`);
      return false;
    }
    return true;
  }

  async checkBorrower(borrower) {
    try {
      // Fetch data
      const chainId = this.web3Service.chainId;
      const rTokens = getListRToken(chainId);
      const [rTokenBalances, rTokenPrices, rTokensMetadata] = await Promise.all([
        this.rifiLenService.getRTokenBalancesAll(rTokens, borrower),
        this.rifiLenService.getRTokenUnderlyingPriceAll(rTokens),
        this.rifiLenService.getRTokenMetadataAll(rTokens),
      ]);

      // Find borrow token or collateral token to liquidate
      const collateralTokens = this.getCollateralTokens(rTokenBalances);
      const borrowTokens = this.getBorrowTokens(rTokenBalances);
      const borrowToken = this.getBorrowTokenToLiquidate(borrowTokens, rTokenPrices);
      const collateralToken = this.getCollateralTokenToLiquidate(collateralTokens, rTokenPrices);
      if (!borrowToken || !collateralToken) {
        LogService.log("Cannot find borrow token or collateral token to liquidate");
        return  null;
      };

      // Calculate repay amount to liquidate
      const { repayAmount, repayUSD } = this.calculateRepayAmount(borrowToken, collateralToken, rTokenPrices, rTokensMetadata);
      if (!(await this.checkFeeTransaction(borrowToken, borrower, repayAmount, collateralToken, repayUSD))) {
        return null;
      }

      // Execute liquidate
      const transaction = await this.botLiquidateService.liquidateBorrow(
        borrowToken.rToken,
        borrower,
        repayAmount,
        collateralToken.rToken
      );
      return transaction
    } catch(error) {
      LogService.log(error)
      return null
    }
  }
}

module.exports = Checker;
