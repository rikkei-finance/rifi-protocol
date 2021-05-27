const {
  etherUnsigned,
  etherMantissa,
  UInt256Max
} = require('../Utils/Ethereum');

const {
  makeRToken,
  setBorrowRate,
  pretendBorrow
} = require('../Utils/Rifi');

describe('RToken', function () {
  let root, admin, accounts;
  beforeEach(async () => {
    [root, admin, ...accounts] = saddle.accounts;
  });

  describe('constructor', () => {
    it("fails when non bep-20 underlying", async () => {
      await expect(makeRToken({ underlying: { _address: root } })).rejects.toRevert("revert");
    });

    it("fails when 0 initial exchange rate", async () => {
      await expect(makeRToken({ exchangeRate: 0 })).rejects.toRevert("revert initial exchange rate must be greater than zero.");
    });

    it("succeeds with bep-20 underlying and non-zero exchange rate", async () => {
      const rToken = await makeRToken();
      expect(await call(rToken, 'underlying')).toEqual(rToken.underlying._address);
      expect(await call(rToken, 'admin')).toEqual(root);
    });

    it("succeeds when setting admin to contructor argument", async () => {
      const rToken = await makeRToken({ admin: admin });
      expect(await call(rToken, 'admin')).toEqual(admin);
    });
  });

  describe('name, symbol, decimals', () => {
    let rToken;

    beforeEach(async () => {
      rToken = await makeRToken({ name: "RToken Foo", symbol: "rFOO", decimals: 10 });
    });

    it('should return correct name', async () => {
      expect(await call(rToken, 'name')).toEqual("RToken Foo");
    });

    it('should return correct symbol', async () => {
      expect(await call(rToken, 'symbol')).toEqual("rFOO");
    });

    it('should return correct decimals', async () => {
      expect(await call(rToken, 'decimals')).toEqualNumber(10);
    });
  });

  describe('balanceOfUnderlying', () => {
    it("has an underlying balance", async () => {
      const rToken = await makeRToken({ supportMarket: true, exchangeRate: 2 });
      await send(rToken, 'harnessSetBalance', [root, 100]);
      expect(await call(rToken, 'balanceOfUnderlying', [root])).toEqualNumber(200);
    });
  });

  describe('borrowRatePerBlock', () => {
    it("has a borrow rate", async () => {
      const rToken = await makeRToken({ supportMarket: true, interestRateModelOpts: { kind: 'jump-rate', baseRate: .05, multiplier: 0.45, kink: 0.95, jump: 5 } });
      const perBlock = await call(rToken, 'borrowRatePerBlock');
      expect(Math.abs(perBlock * 2102400 - 5e16)).toBeLessThanOrEqual(1e8);
    });
  });

  describe('supplyRatePerBlock', () => {
    it("returns 0 if there's no supply", async () => {
      const rToken = await makeRToken({ supportMarket: true, interestRateModelOpts: { kind: 'jump-rate', baseRate: .05, multiplier: 0.45, kink: 0.95, jump: 5 } });
      const perBlock = await call(rToken, 'supplyRatePerBlock');
      await expect(perBlock).toEqualNumber(0);
    });

    it("has a supply rate", async () => {
      const baseRate = 0.05;
      const multiplier = 0.45;
      const kink = 0.95;
      const jump = 5 * multiplier;
      const rToken = await makeRToken({ supportMarket: true, interestRateModelOpts: { kind: 'jump-rate', baseRate, multiplier, kink, jump } });
      await send(rToken, 'harnessSetReserveFactorFresh', [etherMantissa(.01)]);
      await send(rToken, 'harnessExchangeRateDetails', [1, 1, 0]);
      await send(rToken, 'harnessSetExchangeRate', [etherMantissa(1)]);
      // Full utilization (Over the kink so jump is included), 1% reserves
      const borrowRate = baseRate + multiplier * kink + jump * .05;
      const expectedSuplyRate = borrowRate * .99;

      const perBlock = await call(rToken, 'supplyRatePerBlock');
      expect(Math.abs(perBlock * 2102400 - expectedSuplyRate * 1e18)).toBeLessThanOrEqual(1e8);
    });
  });

  describe("borrowBalanceCurrent", () => {
    let borrower;
    let rToken;

    beforeEach(async () => {
      borrower = accounts[0];
      rToken = await makeRToken();
    });

    beforeEach(async () => {
      await setBorrowRate(rToken, .001)
      await send(rToken.interestRateModel, 'setFailBorrowRate', [false]);
    });

    it("reverts if interest accrual fails", async () => {
      await send(rToken.interestRateModel, 'setFailBorrowRate', [true]);
      // make sure we accrue interest
      await send(rToken, 'harnessFastForward', [1]);
      await expect(send(rToken, 'borrowBalanceCurrent', [borrower])).rejects.toRevert("revert INTEREST_RATE_MODEL_ERROR");
    });

    it("returns successful result from borrowBalanceStored with no interest", async () => {
      await setBorrowRate(rToken, 0);
      await pretendBorrow(rToken, borrower, 1, 1, 5e18);
      expect(await call(rToken, 'borrowBalanceCurrent', [borrower])).toEqualNumber(5e18)
    });

    it("returns successful result from borrowBalanceCurrent with no interest", async () => {
      await setBorrowRate(rToken, 0);
      await pretendBorrow(rToken, borrower, 1, 3, 5e18);
      expect(await send(rToken, 'harnessFastForward', [5])).toSucceed();
      expect(await call(rToken, 'borrowBalanceCurrent', [borrower])).toEqualNumber(5e18 * 3)
    });
  });

  describe("borrowBalanceStored", () => {
    let borrower;
    let rToken;

    beforeEach(async () => {
      borrower = accounts[0];
      rToken = await makeRToken({ cointrollerOpts: { kind: 'bool' } });
    });

    it("returns 0 for account with no borrows", async () => {
      expect(await call(rToken, 'borrowBalanceStored', [borrower])).toEqualNumber(0)
    });

    it("returns stored principal when account and market indexes are the same", async () => {
      await pretendBorrow(rToken, borrower, 1, 1, 5e18);
      expect(await call(rToken, 'borrowBalanceStored', [borrower])).toEqualNumber(5e18);
    });

    it("returns calculated balance when market index is higher than account index", async () => {
      await pretendBorrow(rToken, borrower, 1, 3, 5e18);
      expect(await call(rToken, 'borrowBalanceStored', [borrower])).toEqualNumber(5e18 * 3);
    });

    it("has undefined behavior when market index is lower than account index", async () => {
      // The market index < account index should NEVER happen, so we don't test this case
    });

    it("reverts on overflow of principal", async () => {
      await pretendBorrow(rToken, borrower, 1, 3, UInt256Max());
      await expect(call(rToken, 'borrowBalanceStored', [borrower])).rejects.toRevert("revert borrowBalanceStored: borrowBalanceStoredInternal failed");
    });

    it("reverts on non-zero stored principal with zero account index", async () => {
      await pretendBorrow(rToken, borrower, 0, 3, 5);
      await expect(call(rToken, 'borrowBalanceStored', [borrower])).rejects.toRevert("revert borrowBalanceStored: borrowBalanceStoredInternal failed");
    });
  });

  describe('exchangeRateStored', () => {
    let rToken, exchangeRate = 2;

    beforeEach(async () => {
      rToken = await makeRToken({ exchangeRate });
    });

    it("returns initial exchange rate with zero rTokenSupply", async () => {
      const result = await call(rToken, 'exchangeRateStored');
      expect(result).toEqualNumber(etherMantissa(exchangeRate));
    });

    it("calculates with single rTokenSupply and single total borrow", async () => {
      const rTokenSupply = 1, totalBorrows = 1, totalReserves = 0;
      await send(rToken, 'harnessExchangeRateDetails', [rTokenSupply, totalBorrows, totalReserves]);
      const result = await call(rToken, 'exchangeRateStored');
      expect(result).toEqualNumber(etherMantissa(1));
    });

    it("calculates with rTokenSupply and total borrows", async () => {
      const rTokenSupply = 100e18, totalBorrows = 10e18, totalReserves = 0;
      await send(rToken, 'harnessExchangeRateDetails', [rTokenSupply, totalBorrows, totalReserves].map(etherUnsigned));
      const result = await call(rToken, 'exchangeRateStored');
      expect(result).toEqualNumber(etherMantissa(.1));
    });

    it("calculates with cash and rTokenSupply", async () => {
      const rTokenSupply = 5e18, totalBorrows = 0, totalReserves = 0;
      expect(
        await send(rToken.underlying, 'transfer', [rToken._address, etherMantissa(500)])
      ).toSucceed();
      await send(rToken, 'harnessExchangeRateDetails', [rTokenSupply, totalBorrows, totalReserves].map(etherUnsigned));
      const result = await call(rToken, 'exchangeRateStored');
      expect(result).toEqualNumber(etherMantissa(100));
    });

    it("calculates with cash, borrows, reserves and rTokenSupply", async () => {
      const rTokenSupply = 500e18, totalBorrows = 500e18, totalReserves = 5e18;
      expect(
        await send(rToken.underlying, 'transfer', [rToken._address, etherMantissa(500)])
      ).toSucceed();
      await send(rToken, 'harnessExchangeRateDetails', [rTokenSupply, totalBorrows, totalReserves].map(etherUnsigned));
      const result = await call(rToken, 'exchangeRateStored');
      expect(result).toEqualNumber(etherMantissa(1.99));
    });
  });

  describe('getCash', () => {
    it("gets the cash", async () => {
      const rToken = await makeRToken();
      const result = await call(rToken, 'getCash');
      expect(result).toEqualNumber(0);
    });
  });
});
