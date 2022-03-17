const {
  etherUnsigned,
  etherMantissa,
  UInt256Max
} = require('../Utils/Ethereum');

const {
  makeRToken,
  balanceOf,
  fastForward,
  setBalance,
  getBalances,
  adjustBalances,
  preApprove,
  quickMint,
  preSupply,
  quickRedeem,
  quickRedeemUnderlying
} = require('../Utils/Rifi');

const exchangeRate = 50e3;
const mintAmount = etherUnsigned(10e4);
const mintTokens = mintAmount.dividedBy(exchangeRate);
const redeemTokens = etherUnsigned(10e3);
const redeemAmount = redeemTokens.multipliedBy(exchangeRate);

async function preMint(rToken, minter, mintAmount, mintTokens, exchangeRate) {
  await preApprove(rToken, minter, mintAmount);
  await send(rToken.cointroller, 'setMintAllowed', [true]);
  await send(rToken.cointroller, 'setMintVerify', [true]);
  await send(rToken.interestRateModel, 'setFailBorrowRate', [false]);
  await send(rToken.underlying, 'harnessSetFailTransferFromAddress', [minter, false]);
  await send(rToken, 'harnessSetBalance', [minter, 0]);
  await send(rToken, 'harnessSetExchangeRate', [etherMantissa(exchangeRate)]);
}

async function mintFresh(rToken, minter, mintAmount) {
  return send(rToken, 'harnessMintFresh', [minter, mintAmount]);
}

async function preRedeem(rToken, redeemer, redeemTokens, redeemAmount, exchangeRate) {
  await preSupply(rToken, redeemer, redeemTokens);
  await send(rToken.cointroller, 'setRedeemAllowed', [true]);
  await send(rToken.cointroller, 'setRedeemVerify', [true]);
  await send(rToken.interestRateModel, 'setFailBorrowRate', [false]);
  await send(rToken.underlying, 'harnessSetBalance', [rToken._address, redeemAmount]);
  await send(rToken.underlying, 'harnessSetBalance', [redeemer, 0]);
  await send(rToken.underlying, 'harnessSetFailTransferToAddress', [redeemer, false]);
  await send(rToken, 'harnessSetExchangeRate', [etherMantissa(exchangeRate)]);
}

async function redeemFreshTokens(rToken, redeemer, redeemTokens, redeemAmount) {
  return send(rToken, 'harnessRedeemFresh', [redeemer, redeemTokens, 0]);
}

async function redeemFreshAmount(rToken, redeemer, redeemTokens, redeemAmount) {
  return send(rToken, 'harnessRedeemFresh', [redeemer, 0, redeemAmount]);
}

describe('RToken', function () {
  let root, minter, redeemer, accounts;
  let rToken;
  beforeEach(async () => {
    [root, minter, redeemer, ...accounts] = saddle.accounts;
    rToken = await makeRToken({cointrollerOpts: {kind: 'bool'}, exchangeRate});
  });

  describe('mintFresh', () => {
    beforeEach(async () => {
      await preMint(rToken, minter, mintAmount, mintTokens, exchangeRate);
    });

    it("fails if cointroller tells it to", async () => {
      await send(rToken.cointroller, 'setMintAllowed', [false]);
      expect(await mintFresh(rToken, minter, mintAmount)).toHaveTrollReject('MINT_COINTROLLER_REJECTION', 'MATH_ERROR');
    });

    it("proceeds if cointroller tells it to", async () => {
      await expect(await mintFresh(rToken, minter, mintAmount)).toSucceed();
    });

    it("fails if not fresh", async () => {
      await fastForward(rToken);
      expect(await mintFresh(rToken, minter, mintAmount)).toHaveTokenFailure('MARKET_NOT_FRESH', 'MINT_FRESHNESS_CHECK');
    });

    it("continues if fresh", async () => {
      await expect(await send(rToken, 'accrueInterest')).toSucceed();
      expect(await mintFresh(rToken, minter, mintAmount)).toSucceed();
    });

    it("fails if insufficient approval", async () => {
      expect(
        await send(rToken.underlying, 'approve', [rToken._address, 1], {from: minter})
      ).toSucceed();
      await expect(mintFresh(rToken, minter, mintAmount)).rejects.toRevert('revert Insufficient allowance');
    });

    it("fails if insufficient balance", async() => {
      await setBalance(rToken.underlying, minter, 1);
      await expect(mintFresh(rToken, minter, mintAmount)).rejects.toRevert('revert Insufficient balance');
    });

    it("proceeds if sufficient approval and balance", async () =>{
      expect(await mintFresh(rToken, minter, mintAmount)).toSucceed();
    });

    it("fails if exchange calculation fails", async () => {
      expect(await send(rToken, 'harnessSetExchangeRate', [0])).toSucceed();
      await expect(mintFresh(rToken, minter, mintAmount)).rejects.toRevert('revert MINT_EXCHANGE_CALCULATION_FAILED');
    });

    it("fails if transferring in fails", async () => {
      await send(rToken.underlying, 'harnessSetFailTransferFromAddress', [minter, true]);
      await expect(mintFresh(rToken, minter, mintAmount)).rejects.toRevert('revert TOKEN_TRANSFER_IN_FAILED');
    });

    it("transfers the underlying cash, tokens, and emits Mint, Transfer events", async () => {
      const beforeBalances = await getBalances([rToken], [minter]);
      const result = await mintFresh(rToken, minter, mintAmount);
      const afterBalances = await getBalances([rToken], [minter]);
      expect(result).toSucceed();
      expect(result).toHaveLog('Mint', {
        minter,
        mintAmount: mintAmount.toString(),
        mintTokens: mintTokens.toString()
      });
      expect(result).toHaveLog(['Transfer', 1], {
        from: rToken._address,
        to: minter,
        amount: mintTokens.toString()
      });
      expect(afterBalances).toEqual(await adjustBalances(beforeBalances, [
        [rToken, minter, 'cash', -mintAmount],
        [rToken, minter, 'tokens', mintTokens],
        [rToken, 'cash', mintAmount],
        [rToken, 'tokens', mintTokens]
      ]));
    });
  });

  describe('mint', () => {
    beforeEach(async () => {
      await preMint(rToken, minter, mintAmount, mintTokens, exchangeRate);
    });

    it("emits a mint failure if interest accrual fails", async () => {
      await send(rToken.interestRateModel, 'setFailBorrowRate', [true]);
      await expect(quickMint(rToken, minter, mintAmount)).rejects.toRevert("revert INTEREST_RATE_MODEL_ERROR");
    });

    it("returns error from mintFresh without emitting any extra logs", async () => {
      await send(rToken.underlying, 'harnessSetBalance', [minter, 1]);
      await expect(mintFresh(rToken, minter, mintAmount)).rejects.toRevert('revert Insufficient balance');
    });

    it("returns success from mintFresh and mints the correct number of tokens", async () => {
      expect(await quickMint(rToken, minter, mintAmount)).toSucceed();
      expect(mintTokens).not.toEqualNumber(0);
      expect(await balanceOf(rToken, minter)).toEqualNumber(mintTokens);
    });

    it("emits an AccrueInterest event", async () => {
      expect(await quickMint(rToken, minter, mintAmount)).toHaveLog('AccrueInterest', {
        borrowIndex: "1000000000000000000",
        cashPrior: "0",
        interestAccumulated: "0",
        totalBorrows: "0",
      });
    });
  });

  [redeemFreshTokens, redeemFreshAmount].forEach((redeemFresh) => {
    describe(redeemFresh.name, () => {
      beforeEach(async () => {
        await preRedeem(rToken, redeemer, redeemTokens, redeemAmount, exchangeRate);
      });

      it("fails if cointroller tells it to", async () =>{
        await send(rToken.cointroller, 'setRedeemAllowed', [false]);
        expect(await redeemFresh(rToken, redeemer, redeemTokens, redeemAmount)).toHaveTrollReject('REDEEM_COINTROLLER_REJECTION');
      });

      it("fails if not fresh", async () => {
        await fastForward(rToken);
        expect(await redeemFresh(rToken, redeemer, redeemTokens, redeemAmount)).toHaveTokenFailure('MARKET_NOT_FRESH', 'REDEEM_FRESHNESS_CHECK');
      });

      it("continues if fresh", async () => {
        await expect(await send(rToken, 'accrueInterest')).toSucceed();
        expect(await redeemFresh(rToken, redeemer, redeemTokens, redeemAmount)).toSucceed();
      });

      it("fails if insufficient protocol cash to transfer out", async() => {
        await send(rToken.underlying, 'harnessSetBalance', [rToken._address, 1]);
        expect(await redeemFresh(rToken, redeemer, redeemTokens, redeemAmount)).toHaveTokenFailure('TOKEN_INSUFFICIENT_CASH', 'REDEEM_TRANSFER_OUT_NOT_POSSIBLE');
      });

      it("fails if exchange calculation fails", async () => {
        if (redeemFresh == redeemFreshTokens) {
          expect(await send(rToken, 'harnessSetExchangeRate', [UInt256Max()])).toSucceed();
          expect(await redeemFresh(rToken, redeemer, redeemTokens, redeemAmount)).toHaveTokenFailure('MATH_ERROR', 'REDEEM_EXCHANGE_TOKENS_CALCULATION_FAILED');
        } else {
          expect(await send(rToken, 'harnessSetExchangeRate', [0])).toSucceed();
          expect(await redeemFresh(rToken, redeemer, redeemTokens, redeemAmount)).toHaveTokenFailure('MATH_ERROR', 'REDEEM_EXCHANGE_AMOUNT_CALCULATION_FAILED');
        }
      });

      it("fails if transferring out fails", async () => {
        await send(rToken.underlying, 'harnessSetFailTransferToAddress', [redeemer, true]);
        await expect(redeemFresh(rToken, redeemer, redeemTokens, redeemAmount)).rejects.toRevert("revert TOKEN_TRANSFER_OUT_FAILED");
      });

      it("fails if total supply < redemption amount", async () => {
        await send(rToken, 'harnessExchangeRateDetails', [0, 0, 0]);
        expect(await redeemFresh(rToken, redeemer, redeemTokens, redeemAmount)).toHaveTokenFailure('MATH_ERROR', 'REDEEM_NEW_TOTAL_SUPPLY_CALCULATION_FAILED');
      });

      it("reverts if new account balance underflows", async () => {
        await send(rToken, 'harnessSetBalance', [redeemer, 0]);
        expect(await redeemFresh(rToken, redeemer, redeemTokens, redeemAmount)).toHaveTokenFailure('MATH_ERROR', 'REDEEM_NEW_ACCOUNT_BALANCE_CALCULATION_FAILED');
      });

      it("transfers the underlying cash, tokens, and emits Redeem, Transfer events", async () => {
        const beforeBalances = await getBalances([rToken], [redeemer]);
        const result = await redeemFresh(rToken, redeemer, redeemTokens, redeemAmount);
        const afterBalances = await getBalances([rToken], [redeemer]);
        expect(result).toSucceed();
        expect(result).toHaveLog('Redeem', {
          redeemer,
          redeemAmount: redeemAmount.toString(),
          redeemTokens: redeemTokens.toString()
        });
        expect(result).toHaveLog(['Transfer', 1], {
          from: redeemer,
          to: rToken._address,
          amount: redeemTokens.toString()
        });
        expect(afterBalances).toEqual(await adjustBalances(beforeBalances, [
          [rToken, redeemer, 'cash', redeemAmount],
          [rToken, redeemer, 'tokens', -redeemTokens],
          [rToken, 'cash', -redeemAmount],
          [rToken, 'tokens', -redeemTokens]
        ]));
      });
    });
  });

  describe('redeem', () => {
    beforeEach(async () => {
      await preRedeem(rToken, redeemer, redeemTokens, redeemAmount, exchangeRate);
    });

    it("emits a redeem failure if interest accrual fails", async () => {
      await send(rToken.interestRateModel, 'setFailBorrowRate', [true]);
      await expect(quickRedeem(rToken, redeemer, redeemTokens)).rejects.toRevert("revert INTEREST_RATE_MODEL_ERROR");
    });

    it("returns error from redeemFresh without emitting any extra logs", async () => {
      await setBalance(rToken.underlying, rToken._address, 0);
      expect(await quickRedeem(rToken, redeemer, redeemTokens, {exchangeRate})).toHaveTokenFailure('TOKEN_INSUFFICIENT_CASH', 'REDEEM_TRANSFER_OUT_NOT_POSSIBLE');
    });

    it("returns success from redeemFresh and redeems the right amount", async () => {
      expect(
        await send(rToken.underlying, 'harnessSetBalance', [rToken._address, redeemAmount])
      ).toSucceed();
      expect(await quickRedeem(rToken, redeemer, redeemTokens, {exchangeRate})).toSucceed();
      expect(redeemAmount).not.toEqualNumber(0);
      expect(await balanceOf(rToken.underlying, redeemer)).toEqualNumber(redeemAmount);
    });

    it("returns success from redeemFresh and redeems the right amount of underlying", async () => {
      expect(
        await send(rToken.underlying, 'harnessSetBalance', [rToken._address, redeemAmount])
      ).toSucceed();
      expect(
        await quickRedeemUnderlying(rToken, redeemer, redeemAmount, {exchangeRate})
      ).toSucceed();
      expect(redeemAmount).not.toEqualNumber(0);
      expect(await balanceOf(rToken.underlying, redeemer)).toEqualNumber(redeemAmount);
    });

    it("emits an AccrueInterest event", async () => {
      expect(await quickMint(rToken, minter, mintAmount)).toHaveLog('AccrueInterest', {
        borrowIndex: "1000000000000000000",
        cashPrior: "500000000",
        interestAccumulated: "0",
        totalBorrows: "0",
      });
    });
  });
});
