const {
  makeCointroller,
  makeRToken
} = require('../Utils/Rifi');

describe('RToken', function () {
  let root, accounts;
  let rToken, oldCointroller, newCointroller;
  beforeEach(async () => {
    [root, ...accounts] = saddle.accounts;
    rToken = await makeRToken();
    oldCointroller = rToken.cointroller;
    newCointroller = await makeCointroller();
    expect(newCointroller._address).not.toEqual(oldCointroller._address);
  });

  describe('_setCointroller', () => {
    it("should fail if called by non-admin", async () => {
      expect(
        await send(rToken, '_setCointroller', [newCointroller._address], { from: accounts[0] })
      ).toHaveTokenFailure('UNAUTHORIZED', 'SET_COINTROLLER_OWNER_CHECK');
      expect(await call(rToken, 'cointroller')).toEqual(oldCointroller._address);
    });

    it("reverts if passed a contract that doesn't implement isCointroller", async () => {
      await expect(send(rToken, '_setCointroller', [rToken.underlying._address])).rejects.toRevert("revert");
      expect(await call(rToken, 'cointroller')).toEqual(oldCointroller._address);
    });

    it("reverts if passed a contract that implements isCointroller as false", async () => {
      // extremely unlikely to occur, of course, but let's be exhaustive
      const badCointroller = await makeCointroller({ kind: 'false-marker' });
      await expect(send(rToken, '_setCointroller', [badCointroller._address])).rejects.toRevert("revert marker method returned false");
      expect(await call(rToken, 'cointroller')).toEqual(oldCointroller._address);
    });

    it("updates cointroller and emits log on success", async () => {
      const result = await send(rToken, '_setCointroller', [newCointroller._address]);
      expect(result).toSucceed();
      expect(result).toHaveLog('NewCointroller', {
        oldCointroller: oldCointroller._address,
        newCointroller: newCointroller._address
      });
      expect(await call(rToken, 'cointroller')).toEqual(newCointroller._address);
    });
  });
});
