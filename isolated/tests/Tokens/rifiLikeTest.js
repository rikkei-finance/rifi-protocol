const {
  makeRToken,
} = require('../Utils/Rifi');


describe('RRifiLikeDelegate', function () {
  describe("_delegateRifiLikeTo", () => {
    it("does not delegate if not the admin", async () => {
      const [root, a1] = saddle.accounts;
      const rToken = await makeRToken({kind: 'rrifi'});
      await expect(send(rToken, '_delegateRifiLikeTo', [a1], {from: a1})).rejects.toRevert('revert only the admin may set the rifi-like delegate');
    });

    it("delegates successfully if the admin", async () => {
      const [root, a1] = saddle.accounts, amount = 1;
      const rRIFI = await makeRToken({kind: 'rrifi'}), RIFI = rRIFI.underlying;
      const tx1 = await send(rRIFI, '_delegateRifiLikeTo', [a1]);
      const tx2 = await send(RIFI, 'transfer', [rRIFI._address, amount]);
      await expect(await call(RIFI, 'getCurrentVotes', [a1])).toEqualNumber(amount);
    });
  });
});