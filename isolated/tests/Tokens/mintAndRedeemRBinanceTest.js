const {
  etherGasCost,
  etherMantissa,
  etherUnsigned,
  sendFallback
} = require('../Utils/Ethereum');

const {
  makeRToken,
  balanceOf,
  fastForward,
  setBalance,
  setEtherBalance,
  getBalances,
  adjustBalances,
} = require('../Utils/Rifi');

const exchangeRate = 5;
const mintAmount = etherUnsigned(1e5);
const mintTokens = mintAmount.dividedBy(exchangeRate);
const redeemTokens = etherUnsigned(10e3);
const redeemAmount = redeemTokens.multipliedBy(exchangeRate);

async function preMint(rToken, minter, mintAmount, mintTokens, exchangeRate) {
  await send(rToken.cointroller, 'setMintAllowed', [true]);
  await send(rToken.cointroller, 'setMintVerify', [true]);
  await send(rToken.interestRateModel, 'setFailBorrowRate', [false]);
  await send(rToken, 'harnessSetExchangeRate', [etherMantissa(exchangeRate)]);
}

async function mintExplicit(rToken, minter, mintAmount) {
  return send(rToken, 'mint', [], {from: minter, value: mintAmount});
}

async function mintFallback(rToken, minter, mintAmount) {
  return sendFallback(rToken, {from: minter, value: mintAmount});
}

async function preRedeem(rToken, redeemer, redeemTokens, redeemAmount, exchangeRate) {
  await send(rToken.cointroller, 'setRedeemAllowed', [true]);
  await send(rToken.cointroller, 'setRedeemVerify', [true]);
  await send(rToken.interestRateModel, 'setFailBorrowRate', [false]);
  await send(rToken, 'harnessSetExchangeRate', [etherMantissa(exchangeRate)]);
  await setEtherBalance(rToken, redeemAmount);
  await send(rToken, 'harnessSetTotalSupply', [redeemTokens]);
  await setBalance(rToken, redeemer, redeemTokens);
}

async function redeemRTokens(rToken, redeemer, redeemTokens, redeemAmount) {
  return send(rToken, 'redeem', [redeemTokens], {from: redeemer});
}

async function redeemUnderlying(rToken, redeemer, redeemTokens, redeemAmount) {
  return send(rToken, 'redeemUnderlying', [redeemAmount], {from: redeemer});
}

describe('RBinance', () => {
  let root, minter, redeemer, accounts;
  let rToken;

  beforeEach(async () => {
    [root, minter, redeemer, ...accounts] = saddle.accounts;
    rToken = await makeRToken({kind: 'rbinance', cointrollerOpts: {kind: 'bool'}});
    await fastForward(rToken, 1);
  });

  [mintExplicit, mintFallback].forEach((mint) => {
    describe(mint.name, () => {
      beforeEach(async () => {
        await preMint(rToken, minter, mintAmount, mintTokens, exchangeRate);
      });

      it("reverts if interest accrual fails", async () => {
        await send(rToken.interestRateModel, 'setFailBorrowRate', [true]);
        await expect(mint(rToken, minter, mintAmount)).rejects.toRevert("revert INTEREST_RATE_MODEL_ERROR");
      });

      it("returns success from mintFresh and mints the correct number of tokens", async () => {
        const beforeBalances = await getBalances([rToken], [minter]);
        const receipt = await mint(rToken, minter, mintAmount);
        const afterBalances = await getBalances([rToken], [minter]);
        expect(receipt).toSucceed();
        expect(mintTokens).not.toEqualNumber(0);
        expect(afterBalances).toEqual(await adjustBalances(beforeBalances, [
          [rToken, 'eth', mintAmount],
          [rToken, 'tokens', mintTokens],
          [rToken, minter, 'eth', -mintAmount.plus(await etherGasCost(receipt))],
          [rToken, minter, 'tokens', mintTokens]
        ]));
      });
    });
  });

  [redeemRTokens, redeemUnderlying].forEach((redeem) => {
    describe(redeem.name, () => {
      beforeEach(async () => {
        await preRedeem(rToken, redeemer, redeemTokens, redeemAmount, exchangeRate);
      });

      it("emits a redeem failure if interest accrual fails", async () => {
        await send(rToken.interestRateModel, 'setFailBorrowRate', [true]);
        await expect(redeem(rToken, redeemer, redeemTokens, redeemAmount)).rejects.toRevert("revert INTEREST_RATE_MODEL_ERROR");
      });

      it("returns error from redeemFresh without emitting any extra logs", async () => {
        expect(await redeem(rToken, redeemer, redeemTokens.multipliedBy(5), redeemAmount.multipliedBy(5))).toHaveTokenFailure('MATH_ERROR', 'REDEEM_NEW_TOTAL_SUPPLY_CALCULATION_FAILED');
      });

      it("returns success from redeemFresh and redeems the correct amount", async () => {
        await fastForward(rToken);
        const beforeBalances = await getBalances([rToken], [redeemer]);
        const receipt = await redeem(rToken, redeemer, redeemTokens, redeemAmount);
        expect(receipt).toTokenSucceed();
        const afterBalances = await getBalances([rToken], [redeemer]);
        expect(redeemTokens).not.toEqualNumber(0);
        expect(afterBalances).toEqual(await adjustBalances(beforeBalances, [
          [rToken, 'eth', -redeemAmount],
          [rToken, 'tokens', -redeemTokens],
          [rToken, redeemer, 'eth', redeemAmount.minus(await etherGasCost(receipt))],
          [rToken, redeemer, 'tokens', -redeemTokens]
        ]));
      });
    });
  });
});
