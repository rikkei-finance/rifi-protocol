const {makeRToken} = require('../Utils/Rifi');

describe('RToken', function () {
  let root, accounts;
  beforeEach(async () => {
    [root, ...accounts] = saddle.accounts;
  });

  describe('transfer', () => {
    it("cannot transfer from a zero balance", async () => {
      const rToken = await makeRToken({supportMarket: true});
      expect(await call(rToken, 'balanceOf', [root])).toEqualNumber(0);
      expect(await send(rToken, 'transfer', [accounts[0], 100])).toHaveTokenFailure('MATH_ERROR', 'TRANSFER_NOT_ENOUGH');
    });

    it("transfers 50 tokens", async () => {
      const rToken = await makeRToken({supportMarket: true});
      await send(rToken, 'harnessSetBalance', [root, 100]);
      expect(await call(rToken, 'balanceOf', [root])).toEqualNumber(100);
      await send(rToken, 'transfer', [accounts[0], 50]);
      expect(await call(rToken, 'balanceOf', [root])).toEqualNumber(50);
      expect(await call(rToken, 'balanceOf', [accounts[0]])).toEqualNumber(50);
    });

    it("doesn't transfer when src == dst", async () => {
      const rToken = await makeRToken({supportMarket: true});
      await send(rToken, 'harnessSetBalance', [root, 100]);
      expect(await call(rToken, 'balanceOf', [root])).toEqualNumber(100);
      expect(await send(rToken, 'transfer', [root, 50])).toHaveTokenFailure('BAD_INPUT', 'TRANSFER_NOT_ALLOWED');
    });

    it("rejects transfer when not allowed and reverts if not verified", async () => {
      const rToken = await makeRToken({cointrollerOpts: {kind: 'bool'}});
      await send(rToken, 'harnessSetBalance', [root, 100]);
      expect(await call(rToken, 'balanceOf', [root])).toEqualNumber(100);

      await send(rToken.cointroller, 'setTransferAllowed', [false])
      expect(await send(rToken, 'transfer', [root, 50])).toHaveTrollReject('TRANSFER_COINTROLLER_REJECTION');

      await send(rToken.cointroller, 'setTransferAllowed', [true])
      await send(rToken.cointroller, 'setTransferVerify', [false])
      // no longer support verifyTransfer on rToken end
      // await expect(send(rToken, 'transfer', [accounts[0], 50])).rejects.toRevert("revert transferVerify rejected transfer");
    });
  });
});