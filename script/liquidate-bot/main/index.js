
const { rTokens } = require("../listRToken");
const { numberToString, round } = require('../helpers');
const { getRTokenBalancesAll, getRTokenMetadataAll, getRTokenUnderlyingPriceAll } = require('../rifiLensService');
const { liquidateBorrow } = require('../botLiquidateService');

const ratioLiquidate = 35 / 100;
const ratioMaximumBorrow = 60 / 100;
const ratioBonusPrice = 92 / 100;

function calculationTotalBorrowedAndCollateral(rTokenBalances, rTokenPrices, rTokensMetadata) {
  let borrowed = 0;
  let collateral = 0;
  rTokenBalances.forEach(rTokenBalance => {
    const {rToken, borrowBalanceCurrent, balanceOfUnderlying} = rTokenBalance;
    const rTokenPrice = rTokenPrices.find(rTokenPrice => rTokenPrice.rToken === rToken);
    const metadata = rTokensMetadata.find(metadata => metadata.rToken === rToken);
    if (!rTokenPrice || !metadata) return;
    borrowed += Number(borrowBalanceCurrent) * rTokenPrice.underlyingPrice / 1e18;
    collateral += Number(balanceOfUnderlying) * rTokenPrice.underlyingPrice / 1e18;
  });
  return { borrowed, collateral};
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
    const borrow = Number(borrowToken.borrowBalanceCurrent) * rTokenPrice.underlyingPrice / 1e18;
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
    const collateral = Number(collateralToken.balanceOfUnderlying) * rTokenPrice.underlyingPrice / 1e18;
    if (collateral > maxCollateral) {
      maxCollateral = collateral;
      maxCollateralToken = collateralToken;
    }
  });
  return maxCollateralToken;
}

function calculateRepayAmount(borrowToken, collateralToken, rTokenPrices) {  
  const priceBorrowToken = rTokenPrices.find(rTokenPrice => rTokenPrice.rToken === borrowToken.rToken);
  const priceCollateralToken = rTokenPrices.find(rTokenPrice => rTokenPrice.rToken === collateralToken.rToken);

  const maxRepayUSD = borrowToken.borrowBalanceCurrent * ratioLiquidate;
  const collateralUSD = Number(collateralToken.balanceOfUnderlying) * priceCollateralToken.underlyingPrice / 1e18;
  let repayAmount = round(numberToString(Math.min(maxRepayUSD, collateralUSD) / priceBorrowToken.underlyingPrice * ratioBonusPrice * 1e18));
  return repayAmount;
}

async function checkBorrower(borrower) {
  const [rTokensMetadata, rTokenBalances, rTokenPrices] = await Promise.all([
    getRTokenMetadataAll(rTokens),
    getRTokenBalancesAll(rTokens, borrower),
    getRTokenUnderlyingPriceAll(rTokens)
  ]);
  const { borrowed, collateral } = calculationTotalBorrowedAndCollateral(rTokenBalances, rTokenPrices, rTokensMetadata);
  if (borrowed > collateral * ratioMaximumBorrow) {
    const collateralTokens = getCollateralTokens(rTokenBalances);
    const borrowTokens = getBorrowTokens(rTokenBalances);
    const borrowToken = getBorrowTokenToLiquidate(borrowTokens, rTokenPrices);
    const collateralToken = getCollateralTokenToLiquidate(collateralTokens, rTokenPrices);
    const repayAmount = calculateRepayAmount(borrowToken, collateralToken, rTokenPrices);
    if (Number(repayAmount) < 10000000000) return null;
    const transaction = await liquidateBorrow(
      borrowToken.rToken,
      borrower,
      repayAmount,
      collateralToken.rToken
    );
    return transaction
  } else {
    return null
  }
}

module.exports = { checkBorrower };
