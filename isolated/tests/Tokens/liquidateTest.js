const {
  etherGasCost,
  etherUnsigned,
  UInt256Max
} = require('../Utils/Ethereum');

const {
  makeRToken,
  fastForward,
  setBalance,
  getBalances,
  adjustBalances,
  pretendBorrow,
  preApprove
} = require('../Utils/Rifi');

const repayAmount = etherUnsigned(10e2);
const seizeAmount = repayAmount;
const seizeTokens = seizeAmount.multipliedBy(4); // forced

async function preLiquidate(rToken, liquidator, borrower, repayAmount, rTokenCollateral) {
  // setup for success in liquidating
  await send(rToken.cointroller, 'setLiquidateBorrowAllowed', [true]);
  await send(rToken.cointroller, 'setLiquidateBorrowVerify', [true]);
  await send(rToken.cointroller, 'setRepayBorrowAllowed', [true]);
  await send(rToken.cointroller, 'setRepayBorrowVerify', [true]);
  await send(rToken.cointroller, 'setSeizeAllowed', [true]);
  await send(rToken.cointroller, 'setSeizeVerify', [true]);
  await send(rToken.cointroller, 'setFailCalculateSeizeTokens', [false]);
  await send(rToken.underlying, 'harnessSetFailTransferFromAddress', [liquidator, false]);
  await send(rToken.interestRateModel, 'setFailBorrowRate', [false]);
  await send(rTokenCollateral.interestRateModel, 'setFailBorrowRate', [false]);
  await send(rTokenCollateral.cointroller, 'setCalculatedSeizeTokens', [seizeTokens]);
  await setBalance(rTokenCollateral, liquidator, 0);
  await setBalance(rTokenCollateral, borrower, seizeTokens);
  await pretendBorrow(rTokenCollateral, borrower, 0, 1, 0);
  await pretendBorrow(rToken, borrower, 1, 1, repayAmount);
  await preApprove(rToken, liquidator, repayAmount);
}

async function liquidateFresh(rToken, liquidator, borrower, repayAmount, rTokenCollateral) {
  return send(rToken, 'harnessLiquidateBorrowFresh', [liquidator, borrower, repayAmount, rTokenCollateral._address]);
}

async function liquidate(rToken, liquidator, borrower, repayAmount, rTokenCollateral) {
  // make sure to have a block delta so we accrue interest
  await fastForward(rToken, 1);
  await fastForward(rTokenCollateral, 1);
  return send(rToken, 'liquidateBorrow', [borrower, repayAmount, rTokenCollateral._address], {from: liquidator});
}

async function seize(rToken, liquidator, borrower, seizeAmount) {
  return send(rToken, 'seize', [liquidator, borrower, seizeAmount]);
}

describe('RToken', function () {
  let root, liquidator, borrower, accounts;
  let rToken, rTokenCollateral;

  beforeEach(async () => {
    [root, liquidator, borrower, ...accounts] = saddle.accounts;
    rToken = await makeRToken({cointrollerOpts: {kind: 'bool'}});
    rTokenCollateral = await makeRToken({cointroller: rToken.cointroller});
  });

  beforeEach(async () => {
    await preLiquidate(rToken, liquidator, borrower, repayAmount, rTokenCollateral);
  });

  describe('liquidateBorrowFresh', () => {
    it("fails if cointroller tells it to", async () => {
      await send(rToken.cointroller, 'setLiquidateBorrowAllowed', [false]);
      expect(
        await liquidateFresh(rToken, liquidator, borrower, repayAmount, rTokenCollateral)
      ).toHaveTrollReject('LIQUIDATE_COINTROLLER_REJECTION', 'MATH_ERROR');
    });

    it("proceeds if cointroller tells it to", async () => {
      expect(
        await liquidateFresh(rToken, liquidator, borrower, repayAmount, rTokenCollateral)
      ).toSucceed();
    });

    it("fails if market not fresh", async () => {
      await fastForward(rToken);
      expect(
        await liquidateFresh(rToken, liquidator, borrower, repayAmount, rTokenCollateral)
      ).toHaveTokenFailure('MARKET_NOT_FRESH', 'LIQUIDATE_FRESHNESS_CHECK');
    });

    it("fails if collateral market not fresh", async () => {
      await fastForward(rToken);
      await fastForward(rTokenCollateral);
      await send(rToken, 'accrueInterest');
      expect(
        await liquidateFresh(rToken, liquidator, borrower, repayAmount, rTokenCollateral)
      ).toHaveTokenFailure('MARKET_NOT_FRESH', 'LIQUIDATE_COLLATERAL_FRESHNESS_CHECK');
    });

    it("fails if borrower is equal to liquidator", async () => {
      expect(
        await liquidateFresh(rToken, borrower, borrower, repayAmount, rTokenCollateral)
      ).toHaveTokenFailure('INVALID_ACCOUNT_PAIR', 'LIQUIDATE_LIQUIDATOR_IS_BORROWER');
    });

    it("fails if repayAmount = 0", async () => {
      expect(await liquidateFresh(rToken, liquidator, borrower, 0, rTokenCollateral)).toHaveTokenFailure('INVALID_CLOSE_AMOUNT_REQUESTED', 'LIQUIDATE_CLOSE_AMOUNT_IS_ZERO');
    });

    it("fails if calculating seize tokens fails and does not adjust balances", async () => {
      const beforeBalances = await getBalances([rToken, rTokenCollateral], [liquidator, borrower]);
      await send(rToken.cointroller, 'setFailCalculateSeizeTokens', [true]);
      await expect(
        liquidateFresh(rToken, liquidator, borrower, repayAmount, rTokenCollateral)
      ).rejects.toRevert('revert LIQUIDATE_COINTROLLER_CALCULATE_AMOUNT_SEIZE_FAILED');
      const afterBalances = await getBalances([rToken, rTokenCollateral], [liquidator, borrower]);
      expect(afterBalances).toEqual(beforeBalances);
    });

    it("fails if repay fails", async () => {
      await send(rToken.cointroller, 'setRepayBorrowAllowed', [false]);
      expect(
        await liquidateFresh(rToken, liquidator, borrower, repayAmount, rTokenCollateral)
      ).toHaveTrollReject('LIQUIDATE_REPAY_BORROW_FRESH_FAILED');
    });

    it("reverts if seize fails", async () => {
      await send(rToken.cointroller, 'setSeizeAllowed', [false]);
      await expect(
        liquidateFresh(rToken, liquidator, borrower, repayAmount, rTokenCollateral)
      ).rejects.toRevert("revert token seizure failed");
    });

    xit("reverts if liquidateBorrowVerify fails", async() => {
      await send(rToken.cointroller, 'setLiquidateBorrowVerify', [false]);
      await expect(
        liquidateFresh(rToken, liquidator, borrower, repayAmount, rTokenCollateral)
      ).rejects.toRevert("revert liquidateBorrowVerify rejected liquidateBorrow");
    });

    it("transfers the cash, borrows, tokens, and emits Transfer, LiquidateBorrow events", async () => {
      const beforeBalances = await getBalances([rToken, rTokenCollateral], [liquidator, borrower]);
      const result = await liquidateFresh(rToken, liquidator, borrower, repayAmount, rTokenCollateral);
      const afterBalances = await getBalances([rToken, rTokenCollateral], [liquidator, borrower]);
      expect(result).toSucceed();
      expect(result).toHaveLog('LiquidateBorrow', {
        liquidator: liquidator,
        borrower: borrower,
        repayAmount: repayAmount.toString(),
        rTokenCollateral: rTokenCollateral._address,
        seizeTokens: seizeTokens.toString()
      });
      expect(result).toHaveLog(['Transfer', 0], {
        from: liquidator,
        to: rToken._address,
        amount: repayAmount.toString()
      });
      expect(result).toHaveLog(['Transfer', 1], {
        from: borrower,
        to: liquidator,
        amount: seizeTokens.toString()
      });
      expect(afterBalances).toEqual(await adjustBalances(beforeBalances, [
        [rToken, 'cash', repayAmount],
        [rToken, 'borrows', -repayAmount],
        [rToken, liquidator, 'cash', -repayAmount],
        [rTokenCollateral, liquidator, 'tokens', seizeTokens],
        [rToken, borrower, 'borrows', -repayAmount],
        [rTokenCollateral, borrower, 'tokens', -seizeTokens]
      ]));
    });
  });

  describe('liquidateBorrow', () => {
    it("emits a liquidation failure if borrowed asset interest accrual fails", async () => {
      await send(rToken.interestRateModel, 'setFailBorrowRate', [true]);
      await expect(liquidate(rToken, liquidator, borrower, repayAmount, rTokenCollateral)).rejects.toRevert("revert INTEREST_RATE_MODEL_ERROR");
    });

    it("emits a liquidation failure if collateral asset interest accrual fails", async () => {
      await send(rTokenCollateral.interestRateModel, 'setFailBorrowRate', [true]);
      await expect(liquidate(rToken, liquidator, borrower, repayAmount, rTokenCollateral)).rejects.toRevert("revert INTEREST_RATE_MODEL_ERROR");
    });

    it("returns error from liquidateBorrowFresh without emitting any extra logs", async () => {
      expect(await liquidate(rToken, liquidator, borrower, 0, rTokenCollateral)).toHaveTokenFailure('INVALID_CLOSE_AMOUNT_REQUESTED', 'LIQUIDATE_CLOSE_AMOUNT_IS_ZERO');
    });

    it("returns success from liquidateBorrowFresh and transfers the correct amounts", async () => {
      const beforeBalances = await getBalances([rToken, rTokenCollateral], [liquidator, borrower]);
      const result = await liquidate(rToken, liquidator, borrower, repayAmount, rTokenCollateral);
      const gasCost = await etherGasCost(result);
      const afterBalances = await getBalances([rToken, rTokenCollateral], [liquidator, borrower]);
      expect(result).toSucceed();
      expect(afterBalances).toEqual(await adjustBalances(beforeBalances, [
        [rToken, 'cash', repayAmount],
        [rToken, 'borrows', -repayAmount],
        [rToken, liquidator, 'eth', -gasCost],
        [rToken, liquidator, 'cash', -repayAmount],
        [rTokenCollateral, liquidator, 'eth', -gasCost],
        [rTokenCollateral, liquidator, 'tokens', seizeTokens],
        [rToken, borrower, 'borrows', -repayAmount],
        [rTokenCollateral, borrower, 'tokens', -seizeTokens]
      ]));
    });
  });

  describe('seize', () => {
    // XXX verify callers are properly checked

    it("fails if seize is not allowed", async () => {
      await send(rToken.cointroller, 'setSeizeAllowed', [false]);
      expect(await seize(rTokenCollateral, liquidator, borrower, seizeTokens)).toHaveTrollReject('LIQUIDATE_SEIZE_COINTROLLER_REJECTION', 'MATH_ERROR');
    });

    it("fails if rTokenBalances[borrower] < amount", async () => {
      await setBalance(rTokenCollateral, borrower, 1);
      expect(await seize(rTokenCollateral, liquidator, borrower, seizeTokens)).toHaveTokenMathFailure('LIQUIDATE_SEIZE_BALANCE_DECREMENT_FAILED', 'INTEGER_UNDERFLOW');
    });

    it("fails if rTokenBalances[liquidator] overflows", async () => {
      await setBalance(rTokenCollateral, liquidator, UInt256Max());
      expect(await seize(rTokenCollateral, liquidator, borrower, seizeTokens)).toHaveTokenMathFailure('LIQUIDATE_SEIZE_BALANCE_INCREMENT_FAILED', 'INTEGER_OVERFLOW');
    });

    it("succeeds, updates balances, and emits Transfer event", async () => {
      const beforeBalances = await getBalances([rTokenCollateral], [liquidator, borrower]);
      const result = await seize(rTokenCollateral, liquidator, borrower, seizeTokens);
      const afterBalances = await getBalances([rTokenCollateral], [liquidator, borrower]);
      expect(result).toSucceed();
      expect(result).toHaveLog('Transfer', {
        from: borrower,
        to: liquidator,
        amount: seizeTokens.toString()
      });
      expect(afterBalances).toEqual(await adjustBalances(beforeBalances, [
        [rTokenCollateral, liquidator, 'tokens', seizeTokens],
        [rTokenCollateral, borrower, 'tokens', -seizeTokens]
      ]));
    });
  });
});
