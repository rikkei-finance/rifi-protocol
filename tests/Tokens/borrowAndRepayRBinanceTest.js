const {
  etherGasCost,
  etherUnsigned,
  etherMantissa,
  UInt256Max
} = require('../Utils/Ethereum');

const {
  makeRToken,
  balanceOf,
  borrowSnapshot,
  totalBorrows,
  fastForward,
  setBalance,
  preApprove,
  pretendBorrow,
  setEtherBalance,
  getBalances,
  adjustBalances
} = require('../Utils/Rifi');

const BigNumber = require('bignumber.js');

const borrowAmount = etherUnsigned(10e3);
const repayAmount = etherUnsigned(10e2);

async function preBorrow(rToken, borrower, borrowAmount) {
  await send(rToken.cointroller, 'setBorrowAllowed', [true]);
  await send(rToken.cointroller, 'setBorrowVerify', [true]);
  await send(rToken.interestRateModel, 'setFailBorrowRate', [false]);
  await send(rToken, 'harnessSetFailTransferToAddress', [borrower, false]);
  await send(rToken, 'harnessSetAccountBorrows', [borrower, 0, 0]);
  await send(rToken, 'harnessSetTotalBorrows', [0]);
  await setEtherBalance(rToken, borrowAmount);
}

async function borrowFresh(rToken, borrower, borrowAmount) {
  return send(rToken, 'harnessBorrowFresh', [borrower, borrowAmount], {from: borrower});
}

async function borrow(rToken, borrower, borrowAmount, opts = {}) {
  await send(rToken, 'harnessFastForward', [1]);
  return send(rToken, 'borrow', [borrowAmount], {from: borrower});
}

async function preRepay(rToken, benefactor, borrower, repayAmount) {
  // setup either benefactor OR borrower for success in repaying
  await send(rToken.cointroller, 'setRepayBorrowAllowed', [true]);
  await send(rToken.cointroller, 'setRepayBorrowVerify', [true]);
  await send(rToken.interestRateModel, 'setFailBorrowRate', [false]);
  await pretendBorrow(rToken, borrower, 1, 1, repayAmount);
}

async function repayBorrowFresh(rToken, payer, borrower, repayAmount) {
  return send(rToken, 'harnessRepayBorrowFresh', [payer, borrower, repayAmount], {from: payer, value: repayAmount});
}

async function repayBorrow(rToken, borrower, repayAmount) {
  await send(rToken, 'harnessFastForward', [1]);
  return send(rToken, 'repayBorrow', [], {from: borrower, value: repayAmount});
}

async function repayBorrowBehalf(rToken, payer, borrower, repayAmount) {
  await send(rToken, 'harnessFastForward', [1]);
  return send(rToken, 'repayBorrowBehalf', [borrower], {from: payer, value: repayAmount});
}

describe('RBinance', function () {
  let rToken, root, borrower, benefactor, accounts;
  beforeEach(async () => {
    [root, borrower, benefactor, ...accounts] = saddle.accounts;
    rToken = await makeRToken({kind: 'rbinance', cointrollerOpts: {kind: 'bool'}});
  });

  describe('borrowFresh', () => {
    beforeEach(async () => await preBorrow(rToken, borrower, borrowAmount));

    it("fails if cointroller tells it to", async () => {
      await send(rToken.cointroller, 'setBorrowAllowed', [false]);
      expect(await borrowFresh(rToken, borrower, borrowAmount)).toHaveTrollReject('BORROW_COINTROLLER_REJECTION');
    });

    it("proceeds if cointroller tells it to", async () => {
      await expect(await borrowFresh(rToken, borrower, borrowAmount)).toSucceed();
    });

    it("fails if market not fresh", async () => {
      await fastForward(rToken);
      expect(await borrowFresh(rToken, borrower, borrowAmount)).toHaveTokenFailure('MARKET_NOT_FRESH', 'BORROW_FRESHNESS_CHECK');
    });

    it("continues if fresh", async () => {
      await expect(await send(rToken, 'accrueInterest')).toSucceed();
      await expect(await borrowFresh(rToken, borrower, borrowAmount)).toSucceed();
    });

    it("fails if protocol has less than borrowAmount of underlying", async () => {
      expect(await borrowFresh(rToken, borrower, borrowAmount.plus(1))).toHaveTokenFailure('TOKEN_INSUFFICIENT_CASH', 'BORROW_CASH_NOT_AVAILABLE');
    });

    it("fails if borrowBalanceStored fails (due to non-zero stored principal with zero account index)", async () => {
      await pretendBorrow(rToken, borrower, 0, 3e18, 5e18);
      expect(await borrowFresh(rToken, borrower, borrowAmount)).toHaveTokenFailure('MATH_ERROR', 'BORROW_ACCUMULATED_BALANCE_CALCULATION_FAILED');
    });

    it("fails if calculating account new total borrow balance overflows", async () => {
      await pretendBorrow(rToken, borrower, 1e-18, 1e-18, UInt256Max());
      expect(await borrowFresh(rToken, borrower, borrowAmount)).toHaveTokenFailure('MATH_ERROR', 'BORROW_NEW_ACCOUNT_BORROW_BALANCE_CALCULATION_FAILED');
    });

    it("fails if calculation of new total borrow balance overflows", async () => {
      await send(rToken, 'harnessSetTotalBorrows', [UInt256Max()]);
      expect(await borrowFresh(rToken, borrower, borrowAmount)).toHaveTokenFailure('MATH_ERROR', 'BORROW_NEW_TOTAL_BALANCE_CALCULATION_FAILED');
    });

    it("reverts if transfer out fails", async () => {
      await send(rToken, 'harnessSetFailTransferToAddress', [borrower, true]);
      await expect(borrowFresh(rToken, borrower, borrowAmount)).rejects.toRevert("revert TOKEN_TRANSFER_OUT_FAILED");
    });

    xit("reverts if borrowVerify fails", async() => {
      await send(rToken.cointroller, 'setBorrowVerify', [false]);
      await expect(borrowFresh(rToken, borrower, borrowAmount)).rejects.toRevert("revert borrowVerify rejected borrow");
    });

    it("transfers the underlying cash, tokens, and emits Borrow event", async () => {
      const beforeBalances = await getBalances([rToken], [borrower]);
      const beforeProtocolBorrows = await totalBorrows(rToken);
      const result = await borrowFresh(rToken, borrower, borrowAmount);
      const afterBalances = await getBalances([rToken], [borrower]);
      expect(result).toSucceed();
      expect(afterBalances).toEqual(await adjustBalances(beforeBalances, [
        [rToken, 'eth', -borrowAmount],
        [rToken, 'borrows', borrowAmount],
        [rToken, borrower, 'eth', borrowAmount.minus(await etherGasCost(result))],
        [rToken, borrower, 'borrows', borrowAmount]
      ]));
      expect(result).toHaveLog('Borrow', {
        borrower: borrower,
        borrowAmount: borrowAmount.toString(),
        accountBorrows: borrowAmount.toString(),
        totalBorrows: beforeProtocolBorrows.plus(borrowAmount).toString()
      });
    });

    it("stores new borrow principal and interest index", async () => {
      const beforeProtocolBorrows = await totalBorrows(rToken);
      await pretendBorrow(rToken, borrower, 0, 3, 0);
      await borrowFresh(rToken, borrower, borrowAmount);
      const borrowSnap = await borrowSnapshot(rToken, borrower);
      expect(borrowSnap.principal).toEqualNumber(borrowAmount);
      expect(borrowSnap.interestIndex).toEqualNumber(etherMantissa(3));
      expect(await totalBorrows(rToken)).toEqualNumber(beforeProtocolBorrows.plus(borrowAmount));
    });
  });

  describe('borrow', () => {
    beforeEach(async () => await preBorrow(rToken, borrower, borrowAmount));

    it("emits a borrow failure if interest accrual fails", async () => {
      await send(rToken.interestRateModel, 'setFailBorrowRate', [true]);
      await send(rToken, 'harnessFastForward', [1]);
      await expect(borrow(rToken, borrower, borrowAmount)).rejects.toRevert("revert INTEREST_RATE_MODEL_ERROR");
    });

    it("returns error from borrowFresh without emitting any extra logs", async () => {
      expect(await borrow(rToken, borrower, borrowAmount.plus(1))).toHaveTokenFailure('TOKEN_INSUFFICIENT_CASH', 'BORROW_CASH_NOT_AVAILABLE');
    });

    it("returns success from borrowFresh and transfers the correct amount", async () => {
      const beforeBalances = await getBalances([rToken], [borrower]);
      await fastForward(rToken);
      const result = await borrow(rToken, borrower, borrowAmount);
      const afterBalances = await getBalances([rToken], [borrower]);
      expect(result).toSucceed();
      expect(afterBalances).toEqual(await adjustBalances(beforeBalances, [
        [rToken, 'eth', -borrowAmount],
        [rToken, 'borrows', borrowAmount],
        [rToken, borrower, 'eth', borrowAmount.minus(await etherGasCost(result))],
        [rToken, borrower, 'borrows', borrowAmount]
      ]));
    });
  });

  describe('repayBorrowFresh', () => {
    [true, false].forEach(async (benefactorPaying) => {
      let payer;
      const label = benefactorPaying ? "benefactor paying" : "borrower paying";
      describe(label, () => {
        beforeEach(async () => {
          payer = benefactorPaying ? benefactor : borrower;

          await preRepay(rToken, payer, borrower, repayAmount);
        });

        it("fails if repay is not allowed", async () => {
          await send(rToken.cointroller, 'setRepayBorrowAllowed', [false]);
          expect(await repayBorrowFresh(rToken, payer, borrower, repayAmount)).toHaveTrollReject('REPAY_BORROW_COINTROLLER_REJECTION', 'MATH_ERROR');
        });

        it("fails if block number ≠ current block number", async () => {
          await fastForward(rToken);
          expect(await repayBorrowFresh(rToken, payer, borrower, repayAmount)).toHaveTokenFailure('MARKET_NOT_FRESH', 'REPAY_BORROW_FRESHNESS_CHECK');
        });

        it("returns an error if calculating account new account borrow balance fails", async () => {
          await pretendBorrow(rToken, borrower, 1, 1, 1);
          await expect(repayBorrowFresh(rToken, payer, borrower, repayAmount)).rejects.toRevert('revert REPAY_BORROW_NEW_ACCOUNT_BORROW_BALANCE_CALCULATION_FAILED');
        });

        it("returns an error if calculation of new total borrow balance fails", async () => {
          await send(rToken, 'harnessSetTotalBorrows', [1]);
          await expect(repayBorrowFresh(rToken, payer, borrower, repayAmount)).rejects.toRevert('revert REPAY_BORROW_NEW_TOTAL_BALANCE_CALCULATION_FAILED');
        });

        it("reverts if checkTransferIn fails", async () => {
          await expect(
            send(rToken, 'harnessRepayBorrowFresh', [payer, borrower, repayAmount], {from: root, value: repayAmount})
          ).rejects.toRevert("revert sender mismatch");
          await expect(
            send(rToken, 'harnessRepayBorrowFresh', [payer, borrower, repayAmount], {from: payer, value: 1})
          ).rejects.toRevert("revert value mismatch");
        });

        xit("reverts if repayBorrowVerify fails", async() => {
          await send(rToken.cointroller, 'setRepayBorrowVerify', [false]);
          await expect(repayBorrowFresh(rToken, payer, borrower, repayAmount)).rejects.toRevert("revert repayBorrowVerify rejected repayBorrow");
        });

        it("transfers the underlying cash, and emits RepayBorrow event", async () => {
          const beforeBalances = await getBalances([rToken], [borrower]);
          const result = await repayBorrowFresh(rToken, payer, borrower, repayAmount);
          const afterBalances = await getBalances([rToken], [borrower]);
          expect(result).toSucceed();
          if (borrower == payer) {
            expect(afterBalances).toEqual(await adjustBalances(beforeBalances, [
              [rToken, 'eth', repayAmount],
              [rToken, 'borrows', -repayAmount],
              [rToken, borrower, 'borrows', -repayAmount],
              [rToken, borrower, 'eth', -repayAmount.plus(await etherGasCost(result))]
            ]));
          } else {
            expect(afterBalances).toEqual(await adjustBalances(beforeBalances, [
              [rToken, 'eth', repayAmount],
              [rToken, 'borrows', -repayAmount],
              [rToken, borrower, 'borrows', -repayAmount],
            ]));
          }
          expect(result).toHaveLog('RepayBorrow', {
            payer: payer,
            borrower: borrower,
            repayAmount: repayAmount.toString(),
            accountBorrows: "0",
            totalBorrows: "0"
          });
        });

        it("stores new borrow principal and interest index", async () => {
          const beforeProtocolBorrows = await totalBorrows(rToken);
          const beforeAccountBorrowSnap = await borrowSnapshot(rToken, borrower);
          expect(await repayBorrowFresh(rToken, payer, borrower, repayAmount)).toSucceed();
          const afterAccountBorrows = await borrowSnapshot(rToken, borrower);
          expect(afterAccountBorrows.principal).toEqualNumber(beforeAccountBorrowSnap.principal.minus(repayAmount));
          expect(afterAccountBorrows.interestIndex).toEqualNumber(etherMantissa(1));
          expect(await totalBorrows(rToken)).toEqualNumber(beforeProtocolBorrows.minus(repayAmount));
        });
      });
    });
  });

  describe('repayBorrow', () => {
    beforeEach(async () => {
      await preRepay(rToken, borrower, borrower, repayAmount);
    });

    it("reverts if interest accrual fails", async () => {
      await send(rToken.interestRateModel, 'setFailBorrowRate', [true]);
      await expect(repayBorrow(rToken, borrower, repayAmount)).rejects.toRevert("revert INTEREST_RATE_MODEL_ERROR");
    });

    it("reverts when repay borrow fresh fails", async () => {
      await send(rToken.cointroller, 'setRepayBorrowAllowed', [false]);
      await expect(repayBorrow(rToken, borrower, repayAmount)).rejects.toRevertWithError('COINTROLLER_REJECTION', "revert repayBorrow failed");
    });

    it("returns success from repayBorrowFresh and repays the right amount", async () => {
      await fastForward(rToken);
      const beforeAccountBorrowSnap = await borrowSnapshot(rToken, borrower);
      expect(await repayBorrow(rToken, borrower, repayAmount)).toSucceed();
      const afterAccountBorrowSnap = await borrowSnapshot(rToken, borrower);
      expect(afterAccountBorrowSnap.principal).toEqualNumber(beforeAccountBorrowSnap.principal.minus(repayAmount));
    });

    it("reverts if overpaying", async () => {
      const beforeAccountBorrowSnap = await borrowSnapshot(rToken, borrower);
      let tooMuch = new BigNumber(beforeAccountBorrowSnap.principal).plus(1);
      await expect(repayBorrow(rToken, borrower, tooMuch)).rejects.toRevert("revert REPAY_BORROW_NEW_ACCOUNT_BORROW_BALANCE_CALCULATION_FAILED");
      // await assert.toRevertWithError(repayBorrow(rToken, borrower, tooMuch), 'MATH_ERROR', "revert repayBorrow failed");
    });
  });

  describe('repayBorrowBehalf', () => {
    let payer;

    beforeEach(async () => {
      payer = benefactor;
      await preRepay(rToken, payer, borrower, repayAmount);
    });

    it("reverts if interest accrual fails", async () => {
      await send(rToken.interestRateModel, 'setFailBorrowRate', [true]);
      await expect(repayBorrowBehalf(rToken, payer, borrower, repayAmount)).rejects.toRevert("revert INTEREST_RATE_MODEL_ERROR");
    });

    it("reverts from within repay borrow fresh", async () => {
      await send(rToken.cointroller, 'setRepayBorrowAllowed', [false]);
      await expect(repayBorrowBehalf(rToken, payer, borrower, repayAmount)).rejects.toRevertWithError('COINTROLLER_REJECTION', "revert repayBorrowBehalf failed");
    });

    it("returns success from repayBorrowFresh and repays the right amount", async () => {
      await fastForward(rToken);
      const beforeAccountBorrowSnap = await borrowSnapshot(rToken, borrower);
      expect(await repayBorrowBehalf(rToken, payer, borrower, repayAmount)).toSucceed();
      const afterAccountBorrowSnap = await borrowSnapshot(rToken, borrower);
      expect(afterAccountBorrowSnap.principal).toEqualNumber(beforeAccountBorrowSnap.principal.minus(repayAmount));
    });
  });
});
