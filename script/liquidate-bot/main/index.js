
const { rTokens } = require("../listRToken");
const { numberToString, round } = require('../helpers');
const { getRTokenBalancesAll, getRTokenMetadataAll, getRTokenUnderlyingPriceAll } = require('../rifiLensService');
const { liquidateBorrow } = require('../botLiquidateService');

const ratioLiquidate = 35 / 100;
const ratioBonusPrice = 92 / 100;

function getUSDValue(underlyingValue, rTokenPrice) {
  const { underlyingPrice } = rTokenPrice;
  return underlyingValue * underlyingPrice / 10 ** 26
}

function getCollateralTokens(rTokenBalances) {
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

function getBorrowTokens(rTokenBalances) {
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

function getBorrowTokenToLiquidate(borrowTokens, rTokenPrices) {
  let maxBorrowToken = null;
  let maxBorrow = 0;
  borrowTokens.forEach(borrowToken => {
    const rTokenPrice = rTokenPrices.find(rTokenPrice => rTokenPrice.rToken === borrowToken.rToken);
    if (!rTokenPrice) return;
    const borrow = getUSDValue(Number(borrowToken.borrowBalanceCurrent), rTokenPrice);
    if (borrow > maxBorrow) {
      maxBorrow = borrow;
      maxBorrowToken = borrowToken;
    }
  });
  return maxBorrowToken;
}

function getCollateralTokenToLiquidate(collateralTokens, rTokenPrices) {
  let maxCollateralToken = null;
  let maxCollateral = 0;
  
  collateralTokens.forEach(collateralToken => {
    const rTokenPrice = rTokenPrices.find(rTokenPrice => rTokenPrice.rToken === collateralToken.rToken);
    if (!rTokenPrice) return;
    const collateral = getUSDValue(Number(collateralToken.balanceOfUnderlying), rTokenPrice);
    if (collateral > maxCollateral) {
      maxCollateral = collateral;
      maxCollateralToken = collateralToken;
    }
  });
  return maxCollateralToken;
}

function calculateRepayAmount(borrowToken, collateralToken, rTokenPrices) {
  const priceBorrowToken = rTokenPrices.find(rTokenPrice => rTokenPrice.rToken === borrowToken.rToken);
  const priceCollateralToken = rTokenPrices.find(rTokenPrice => rTokenPrice.rToken === collateralToken.rToken)

  const maxRepayUSD = borrowToken.borrowBalanceCurrent * ratioLiquidate;
  const collateralUSD = Number(collateralToken.balanceOfUnderlying) * priceCollateralToken.underlyingPrice / 1e18;
  let repayAmount = round(
    numberToString(
      Math.min(maxRepayUSD, collateralUSD) / priceBorrowToken.underlyingPrice * ratioBonusPrice * 1e18
    )
  );
  return repayAmount;
}

async function checkBorrower(borrower) {
  try {
    const [rTokenBalances, rTokenPrices] = await Promise.all([
      getRTokenBalancesAll(rTokens, borrower),
      getRTokenUnderlyingPriceAll(rTokens)
    ]);
    const collateralTokens = getCollateralTokens(rTokenBalances);
    const borrowTokens = getBorrowTokens(rTokenBalances);
    const borrowToken = getBorrowTokenToLiquidate(borrowTokens, rTokenPrices);
    const collateralToken = getCollateralTokenToLiquidate(collateralTokens, rTokenPrices);
    const repayAmount = calculateRepayAmount(borrowToken, collateralToken, rTokenPrices);
    const transaction = await liquidateBorrow(
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

module.exports = { checkBorrower };
