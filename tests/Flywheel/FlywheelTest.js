const {
  makeCointroller,
  makeRToken,
  balanceOf,
  fastForward,
  pretendBorrow,
  quickMint
} = require('../Utils/Rifi');
const {
  etherExp,
  etherDouble,
  etherUnsigned,
  etherMantissa
} = require('../Utils/Ethereum');

const rifiRate = etherUnsigned(1e18);

async function rifiAccrued(cointroller, user) {
  return etherUnsigned(await call(cointroller, 'rifiAccrued', [user]));
}

async function rifiBalance(cointroller, user) {
  return etherUnsigned(await call(cointroller.rifi, 'balanceOf', [user]))
}

async function totalRifiAccrued(cointroller, user) {
  return (await rifiAccrued(cointroller, user)).plus(await rifiBalance(cointroller, user));
}

describe('Flywheel upgrade', () => {
  describe('becomes the cointroller', () => {
    it('adds the rifi markets', async () => {
      let root = saddle.accounts[0];
      let unitroller = await makeCointroller({kind: 'unitroller-g2'});
      let rifiMarkets = await Promise.all([1, 2, 3].map(async _ => {
        return makeRToken({cointroller: unitroller, supportMarket: true});
      }));
      rifiMarkets = rifiMarkets.map(c => c._address);
      unitroller = await makeCointroller({kind: 'unitroller-g3', unitroller, rifiMarkets});
      expect(await call(unitroller, 'getRifiMarkets')).toEqual(rifiMarkets);
    });

    it('adds the other markets', async () => {
      let root = saddle.accounts[0];
      let unitroller = await makeCointroller({kind: 'unitroller-g2'});
      let allMarkets = await Promise.all([1, 2, 3].map(async _ => {
        return makeRToken({cointroller: unitroller, supportMarket: true});
      }));
      allMarkets = allMarkets.map(c => c._address);
      unitroller = await makeCointroller({
        kind: 'unitroller-g3',
        unitroller,
        rifiMarkets: allMarkets.slice(0, 1),
        otherMarkets: allMarkets.slice(1)
      });
      expect(await call(unitroller, 'getAllMarkets')).toEqual(allMarkets);
      expect(await call(unitroller, 'getRifiMarkets')).toEqual(allMarkets.slice(0, 1));
    });

    it('_supportMarket() adds to all markets, and only once', async () => {
      let root = saddle.accounts[0];
      let unitroller = await makeCointroller({kind: 'unitroller-g3'});
      let allMarkets = [];
      for (let _ of Array(10)) {
        allMarkets.push(await makeRToken({cointroller: unitroller, supportMarket: true}));
      }
      expect(await call(unitroller, 'getAllMarkets')).toEqual(allMarkets.map(c => c._address));
      expect(
        makeCointroller({
          kind: 'unitroller-g3',
          unitroller,
          otherMarkets: [allMarkets[0]._address]
        })
      ).rejects.toRevert('revert market already added');
    });
  });
});

describe('Flywheel', () => {
  let root, a1, a2, a3, accounts;
  let cointroller, rLOW, rREP, rZRX, rEVIL;
  beforeEach(async () => {
    let interestRateModelOpts = {borrowRate: 0.000001};
    [root, a1, a2, a3, ...accounts] = saddle.accounts;
    cointroller = await makeCointroller();
    rLOW = await makeRToken({cointroller, supportMarket: true, underlyingPrice: 1, interestRateModelOpts});
    rREP = await makeRToken({cointroller, supportMarket: true, underlyingPrice: 2, interestRateModelOpts});
    rZRX = await makeRToken({cointroller, supportMarket: true, underlyingPrice: 3, interestRateModelOpts});
    rEVIL = await makeRToken({cointroller, supportMarket: false, underlyingPrice: 3, interestRateModelOpts});
  });

  describe('_grantRifi()', () => {
    beforeEach(async () => {
      await send(cointroller.rifi, 'transfer', [cointroller._address, etherUnsigned(50e18)], {from: root});
    });

    it('should award rifi if called by admin', async () => {
      const tx = await send(cointroller, '_grantRifi', [a1, 100]);
      expect(tx).toHaveLog('RifiGranted', {
        recipient: a1,
        amount: 100
      });
    });

    it('should revert if not called by admin', async () => {
      await expect(
        send(cointroller, '_grantRifi', [a1, 100], {from: a1})
      ).rejects.toRevert('revert only admin can grant rifi');
    });

    it('should revert if insufficient rifi', async () => {
      await expect(
        send(cointroller, '_grantRifi', [a1, etherUnsigned(1e20)])
      ).rejects.toRevert('revert insufficient rifi for grant');
    });
  });

  describe('getRifiMarkets()', () => {
    it('should return the rifi markets', async () => {
      for (let mkt of [rLOW, rREP, rZRX]) {
        await send(cointroller, '_setRifiSpeed', [mkt._address, etherExp(0.5)]);
      }
      expect(await call(cointroller, 'getRifiMarkets')).toEqual(
        [rLOW, rREP, rZRX].map((c) => c._address)
      );
    });
  });

  describe('_setRifiSpeed()', () => {
    it('should update market index when calling setRifiSpeed', async () => {
      const mkt = rREP;
      await send(cointroller, 'setBlockNumber', [0]);
      await send(mkt, 'harnessSetTotalSupply', [etherUnsigned(10e18)]);

      await send(cointroller, '_setRifiSpeed', [mkt._address, etherExp(0.5)]);
      await fastForward(cointroller, 20);
      await send(cointroller, '_setRifiSpeed', [mkt._address, etherExp(1)]);

      const {index, block} = await call(cointroller, 'rifiSupplyState', [mkt._address]);
      expect(index).toEqualNumber(2e36);
      expect(block).toEqualNumber(20);
    });

    it('should correctly drop a rifi market if called by admin', async () => {
      for (let mkt of [rLOW, rREP, rZRX]) {
        await send(cointroller, '_setRifiSpeed', [mkt._address, etherExp(0.5)]);
      }
      const tx = await send(cointroller, '_setRifiSpeed', [rLOW._address, 0]);
      expect(await call(cointroller, 'getRifiMarkets')).toEqual(
        [rREP, rZRX].map((c) => c._address)
      );
      expect(tx).toHaveLog('RifiSpeedUpdated', {
        rToken: rLOW._address,
        newSpeed: 0
      });
    });

    it('should correctly drop a rifi market from middle of array', async () => {
      for (let mkt of [rLOW, rREP, rZRX]) {
        await send(cointroller, '_setRifiSpeed', [mkt._address, etherExp(0.5)]);
      }
      await send(cointroller, '_setRifiSpeed', [rREP._address, 0]);
      expect(await call(cointroller, 'getRifiMarkets')).toEqual(
        [rLOW, rZRX].map((c) => c._address)
      );
    });

    it('should not drop a rifi market unless called by admin', async () => {
      for (let mkt of [rLOW, rREP, rZRX]) {
        await send(cointroller, '_setRifiSpeed', [mkt._address, etherExp(0.5)]);
      }
      await expect(
        send(cointroller, '_setRifiSpeed', [rLOW._address, 0], {from: a1})
      ).rejects.toRevert('revert only admin can set rifi speed');
    });

    it('should not add non-listed markets', async () => {
      const rBAT = await makeRToken({ cointroller, supportMarket: false });
      await expect(
        send(cointroller, 'harnessAddRifiMarkets', [[rBAT._address]])
      ).rejects.toRevert('revert rifi market is not listed');

      const markets = await call(cointroller, 'getRifiMarkets');
      expect(markets).toEqual([]);
    });
  });

  describe('updateRifiBorrowIndex()', () => {
    it('should calculate rifi borrower index correctly', async () => {
      const mkt = rREP;
      await send(cointroller, '_setRifiSpeed', [mkt._address, etherExp(0.5)]);
      await send(cointroller, 'setBlockNumber', [100]);
      await send(mkt, 'harnessSetTotalBorrows', [etherUnsigned(11e18)]);
      await send(cointroller, 'harnessUpdateRifiBorrowIndex', [
        mkt._address,
        etherExp(1.1),
      ]);
      /*
        100 blocks, 10e18 origin total borrows, 0.5e18 borrowSpeed

        borrowAmt   = totalBorrows * 1e18 / borrowIdx
                    = 11e18 * 1e18 / 1.1e18 = 10e18
        rifiAccrued = deltaBlocks * borrowSpeed
                    = 100 * 0.5e18 = 50e18
        newIndex   += 1e36 + rifiAccrued * 1e36 / borrowAmt
                    = 1e36 + 50e18 * 1e36 / 10e18 = 6e36
      */

      const {index, block} = await call(cointroller, 'rifiBorrowState', [mkt._address]);
      expect(index).toEqualNumber(6e36);
      expect(block).toEqualNumber(100);
    });

    it('should not revert or update rifiBorrowState index if rToken not in RIFI markets', async () => {
      const mkt = await makeRToken({
        cointroller: cointroller,
        supportMarket: true,
        addRifiMarket: false,
      });
      await send(cointroller, 'setBlockNumber', [100]);
      await send(cointroller, 'harnessUpdateRifiBorrowIndex', [
        mkt._address,
        etherExp(1.1),
      ]);

      const {index, block} = await call(cointroller, 'rifiBorrowState', [mkt._address]);
      expect(index).toEqualNumber(0);
      expect(block).toEqualNumber(100);
      const speed = await call(cointroller, 'rifiSpeeds', [mkt._address]);
      expect(speed).toEqualNumber(0);
    });

    it('should not update index if no blocks passed since last accrual', async () => {
      const mkt = rREP;
      await send(cointroller, '_setRifiSpeed', [mkt._address, etherExp(0.5)]);
      await send(cointroller, 'harnessUpdateRifiBorrowIndex', [
        mkt._address,
        etherExp(1.1),
      ]);

      const {index, block} = await call(cointroller, 'rifiBorrowState', [mkt._address]);
      expect(index).toEqualNumber(1e36);
      expect(block).toEqualNumber(0);
    });

    it('should not update index if rifi speed is 0', async () => {
      const mkt = rREP;
      await send(cointroller, '_setRifiSpeed', [mkt._address, etherExp(0.5)]);
      await send(cointroller, 'setBlockNumber', [100]);
      await send(cointroller, '_setRifiSpeed', [mkt._address, etherExp(0)]);
      await send(cointroller, 'harnessUpdateRifiBorrowIndex', [
        mkt._address,
        etherExp(1.1),
      ]);

      const {index, block} = await call(cointroller, 'rifiBorrowState', [mkt._address]);
      expect(index).toEqualNumber(1e36);
      expect(block).toEqualNumber(100);
    });
  });

  describe('updateRifiSupplyIndex()', () => {
    it('should calculate rifi supplier index correctly', async () => {
      const mkt = rREP;
      await send(cointroller, '_setRifiSpeed', [mkt._address, etherExp(0.5)]);
      await send(cointroller, 'setBlockNumber', [100]);
      await send(mkt, 'harnessSetTotalSupply', [etherUnsigned(10e18)]);
      await send(cointroller, 'harnessUpdateRifiSupplyIndex', [mkt._address]);
      /*
        suppyTokens = 10e18
        rifiAccrued = deltaBlocks * supplySpeed
                    = 100 * 0.5e18 = 50e18
        newIndex   += rifiAccrued * 1e36 / supplyTokens
                    = 1e36 + 50e18 * 1e36 / 10e18 = 6e36
      */
      const {index, block} = await call(cointroller, 'rifiSupplyState', [mkt._address]);
      expect(index).toEqualNumber(6e36);
      expect(block).toEqualNumber(100);
    });

    it('should not update index on non-RIFI markets', async () => {
      const mkt = await makeRToken({
        cointroller: cointroller,
        supportMarket: true,
        addRifiMarket: false
      });
      await send(cointroller, 'setBlockNumber', [100]);
      await send(cointroller, 'harnessUpdateRifiSupplyIndex', [
        mkt._address
      ]);

      const {index, block} = await call(cointroller, 'rifiSupplyState', [mkt._address]);
      expect(index).toEqualNumber(0);
      expect(block).toEqualNumber(100);
      const speed = await call(cointroller, 'rifiSpeeds', [mkt._address]);
      expect(speed).toEqualNumber(0);
      // rtoken could have no rifi speed or rifi supplier state if not in rifi markets
      // this logic could also possibly be implemented in the allowed hook
    });

    it('should not update index if no blocks passed since last accrual', async () => {
      const mkt = rREP;
      await send(cointroller, 'setBlockNumber', [0]);
      await send(mkt, 'harnessSetTotalSupply', [etherUnsigned(10e18)]);
      await send(cointroller, '_setRifiSpeed', [mkt._address, etherExp(0.5)]);
      await send(cointroller, 'harnessUpdateRifiSupplyIndex', [mkt._address]);

      const {index, block} = await call(cointroller, 'rifiSupplyState', [mkt._address]);
      expect(index).toEqualNumber(1e36);
      expect(block).toEqualNumber(0);
    });

    it('should not matter if the index is updated multiple times', async () => {
      const rifiRemaining = rifiRate.multipliedBy(100)
      await send(cointroller, 'harnessAddRifiMarkets', [[rLOW._address]]);
      await send(cointroller.rifi, 'transfer', [cointroller._address, rifiRemaining], {from: root});
      await pretendBorrow(rLOW, a1, 1, 1, 100);
      await send(cointroller, 'harnessRefreshRifiSpeeds');

      await quickMint(rLOW, a2, etherUnsigned(10e18));
      await quickMint(rLOW, a3, etherUnsigned(15e18));

      const a2Accrued0 = await totalRifiAccrued(cointroller, a2);
      const a3Accrued0 = await totalRifiAccrued(cointroller, a3);
      const a2Balance0 = await balanceOf(rLOW, a2);
      const a3Balance0 = await balanceOf(rLOW, a3);

      await fastForward(cointroller, 20);

      const txT1 = await send(rLOW, 'transfer', [a2, a3Balance0.minus(a2Balance0)], {from: a3});

      const a2Accrued1 = await totalRifiAccrued(cointroller, a2);
      const a3Accrued1 = await totalRifiAccrued(cointroller, a3);
      const a2Balance1 = await balanceOf(rLOW, a2);
      const a3Balance1 = await balanceOf(rLOW, a3);

      await fastForward(cointroller, 10);
      await send(cointroller, 'harnessUpdateRifiSupplyIndex', [rLOW._address]);
      await fastForward(cointroller, 10);

      const txT2 = await send(rLOW, 'transfer', [a3, a2Balance1.minus(a3Balance1)], {from: a2});

      const a2Accrued2 = await totalRifiAccrued(cointroller, a2);
      const a3Accrued2 = await totalRifiAccrued(cointroller, a3);

      expect(a2Accrued0).toEqualNumber(0);
      expect(a3Accrued0).toEqualNumber(0);
      expect(a2Accrued1).not.toEqualNumber(0);
      expect(a3Accrued1).not.toEqualNumber(0);
      expect(a2Accrued1).toEqualNumber(a3Accrued2.minus(a3Accrued1));
      expect(a3Accrued1).toEqualNumber(a2Accrued2.minus(a2Accrued1));

      expect(txT1.gasUsed).toBeLessThan(200000);
      expect(txT1.gasUsed).toBeGreaterThan(140000);
      expect(txT2.gasUsed).toBeLessThan(150000);
      expect(txT2.gasUsed).toBeGreaterThan(100000);
    });
  });

  describe('distributeBorrowerRifi()', () => {

    it('should update borrow index checkpoint but not rifiAccrued for first time user', async () => {
      const mkt = rREP;
      await send(cointroller, "setRifiBorrowState", [mkt._address, etherDouble(6), 10]);
      await send(cointroller, "setRifiBorrowerIndex", [mkt._address, root, etherUnsigned(0)]);

      await send(cointroller, "harnessDistributeBorrowerRifi", [mkt._address, root, etherExp(1.1)]);
      expect(await call(cointroller, "rifiAccrued", [root])).toEqualNumber(0);
      expect(await call(cointroller, "rifiBorrowerIndex", [ mkt._address, root])).toEqualNumber(6e36);
    });

    it('should transfer rifi and update borrow index checkpoint correctly for repeat time user', async () => {
      const mkt = rREP;
      await send(cointroller.rifi, 'transfer', [cointroller._address, etherUnsigned(50e18)], {from: root});
      await send(mkt, "harnessSetAccountBorrows", [a1, etherUnsigned(5.5e18), etherExp(1)]);
      await send(cointroller, "setRifiBorrowState", [mkt._address, etherDouble(6), 10]);
      await send(cointroller, "setRifiBorrowerIndex", [mkt._address, a1, etherDouble(1)]);

      /*
      * 100 delta blocks, 10e18 origin total borrows, 0.5e18 borrowSpeed => 6e18 rifiBorrowIndex
      * this tests that an acct with half the total borrows over that time gets 25e18 RIFI
        borrowerAmount = borrowBalance * 1e18 / borrow idx
                       = 5.5e18 * 1e18 / 1.1e18 = 5e18
        deltaIndex     = marketStoredIndex - userStoredIndex
                       = 6e36 - 1e36 = 5e36
        borrowerAccrued= borrowerAmount * deltaIndex / 1e36
                       = 5e18 * 5e36 / 1e36 = 25e18
      */
      const tx = await send(cointroller, "harnessDistributeBorrowerRifi", [mkt._address, a1, etherUnsigned(1.1e18)]);
      expect(await rifiAccrued(cointroller, a1)).toEqualNumber(25e18);
      expect(await rifiBalance(cointroller, a1)).toEqualNumber(0);
      expect(tx).toHaveLog('DistributedBorrowerRifi', {
        rToken: mkt._address,
        borrower: a1,
        rifiDelta: etherUnsigned(25e18).toFixed(),
        rifiBorrowIndex: etherDouble(6).toFixed()
      });
    });

    it('should not transfer rifi automatically', async () => {
      const mkt = rREP;
      await send(cointroller.rifi, 'transfer', [cointroller._address, etherUnsigned(50e18)], {from: root});
      await send(mkt, "harnessSetAccountBorrows", [a1, etherUnsigned(5.5e17), etherExp(1)]);
      await send(cointroller, "setRifiBorrowState", [mkt._address, etherDouble(1.0019), 10]);
      await send(cointroller, "setRifiBorrowerIndex", [mkt._address, a1, etherDouble(1)]);
      /*
        borrowerAmount = borrowBalance * 1e18 / borrow idx
                       = 5.5e17 * 1e18 / 1.1e18 = 5e17
        deltaIndex     = marketStoredIndex - userStoredIndex
                       = 1.0019e36 - 1e36 = 0.0019e36
        borrowerAccrued= borrowerAmount * deltaIndex / 1e36
                       = 5e17 * 0.0019e36 / 1e36 = 0.00095e18
        0.00095e18 < rifiClaimThreshold of 0.001e18
      */
      await send(cointroller, "harnessDistributeBorrowerRifi", [mkt._address, a1, etherExp(1.1)]);
      expect(await rifiAccrued(cointroller, a1)).toEqualNumber(0.00095e18);
      expect(await rifiBalance(cointroller, a1)).toEqualNumber(0);
    });

    it('should not revert or distribute when called with non-RIFI market', async () => {
      const mkt = await makeRToken({
        cointroller: cointroller,
        supportMarket: true,
        addRifiMarket: false,
      });

      await send(cointroller, "harnessDistributeBorrowerRifi", [mkt._address, a1, etherExp(1.1)]);
      expect(await rifiAccrued(cointroller, a1)).toEqualNumber(0);
      expect(await rifiBalance(cointroller, a1)).toEqualNumber(0);
      expect(await call(cointroller, 'rifiBorrowerIndex', [mkt._address, a1])).toEqualNumber(0);
    });
  });

  describe('distributeSupplierRifi()', () => {
    it('should transfer rifi and update supply index correctly for first time user', async () => {
      const mkt = rREP;
      await send(cointroller.rifi, 'transfer', [cointroller._address, etherUnsigned(50e18)], {from: root});

      await send(mkt, "harnessSetBalance", [a1, etherUnsigned(5e18)]);
      await send(cointroller, "setRifiSupplyState", [mkt._address, etherDouble(6), 10]);
      /*
      * 100 delta blocks, 10e18 total supply, 0.5e18 supplySpeed => 6e18 rifiSupplyIndex
      * confirming an acct with half the total supply over that time gets 25e18 RIFI:
        supplierAmount  = 5e18
        deltaIndex      = marketStoredIndex - userStoredIndex
                        = 6e36 - 1e36 = 5e36
        suppliedAccrued+= supplierTokens * deltaIndex / 1e36
                        = 5e18 * 5e36 / 1e36 = 25e18
      */

      const tx = await send(cointroller, "harnessDistributeAllSupplierRifi", [mkt._address, a1]);
      expect(await rifiAccrued(cointroller, a1)).toEqualNumber(0);
      expect(await rifiBalance(cointroller, a1)).toEqualNumber(25e18);
      expect(tx).toHaveLog('DistributedSupplierRifi', {
        rToken: mkt._address,
        supplier: a1,
        rifiDelta: etherUnsigned(25e18).toFixed(),
        rifiSupplyIndex: etherDouble(6).toFixed()
      });
    });

    it('should update rifi accrued and supply index for repeat user', async () => {
      const mkt = rREP;
      await send(cointroller.rifi, 'transfer', [cointroller._address, etherUnsigned(50e18)], {from: root});

      await send(mkt, "harnessSetBalance", [a1, etherUnsigned(5e18)]);
      await send(cointroller, "setRifiSupplyState", [mkt._address, etherDouble(6), 10]);
      await send(cointroller, "setRifiSupplierIndex", [mkt._address, a1, etherDouble(2)])
      /*
        supplierAmount  = 5e18
        deltaIndex      = marketStoredIndex - userStoredIndex
                        = 6e36 - 2e36 = 4e36
        suppliedAccrued+= supplierTokens * deltaIndex / 1e36
                        = 5e18 * 4e36 / 1e36 = 20e18
      */

      await send(cointroller, "harnessDistributeAllSupplierRifi", [mkt._address, a1]);
      expect(await rifiAccrued(cointroller, a1)).toEqualNumber(0);
      expect(await rifiBalance(cointroller, a1)).toEqualNumber(20e18);
    });

    it('should not transfer when rifiAccrued below threshold', async () => {
      const mkt = rREP;
      await send(cointroller.rifi, 'transfer', [cointroller._address, etherUnsigned(50e18)], {from: root});

      await send(mkt, "harnessSetBalance", [a1, etherUnsigned(5e17)]);
      await send(cointroller, "setRifiSupplyState", [mkt._address, etherDouble(1.0019), 10]);
      /*
        supplierAmount  = 5e17
        deltaIndex      = marketStoredIndex - userStoredIndex
                        = 1.0019e36 - 1e36 = 0.0019e36
        suppliedAccrued+= supplierTokens * deltaIndex / 1e36
                        = 5e17 * 0.0019e36 / 1e36 = 0.00095e18
      */

      await send(cointroller, "harnessDistributeSupplierRifi", [mkt._address, a1]);
      expect(await rifiAccrued(cointroller, a1)).toEqualNumber(0.00095e18);
      expect(await rifiBalance(cointroller, a1)).toEqualNumber(0);
    });

    it('should not revert or distribute when called with non-RIFI market', async () => {
      const mkt = await makeRToken({
        cointroller: cointroller,
        supportMarket: true,
        addRifiMarket: false,
      });

      await send(cointroller, "harnessDistributeSupplierRifi", [mkt._address, a1]);
      expect(await rifiAccrued(cointroller, a1)).toEqualNumber(0);
      expect(await rifiBalance(cointroller, a1)).toEqualNumber(0);
      expect(await call(cointroller, 'rifiBorrowerIndex', [mkt._address, a1])).toEqualNumber(0);
    });

  });

  describe('transferRifi', () => {
    it('should transfer rifi accrued when amount is above threshold', async () => {
      const rifiRemaining = 1000, a1AccruedPre = 100, threshold = 1;
      const rifiBalancePre = await rifiBalance(cointroller, a1);
      const tx0 = await send(cointroller.rifi, 'transfer', [cointroller._address, rifiRemaining], {from: root});
      const tx1 = await send(cointroller, 'setRifiAccrued', [a1, a1AccruedPre]);
      const tx2 = await send(cointroller, 'harnessTransferRifi', [a1, a1AccruedPre, threshold]);
      const a1AccruedPost = await rifiAccrued(cointroller, a1);
      const rifiBalancePost = await rifiBalance(cointroller, a1);
      expect(rifiBalancePre).toEqualNumber(0);
      expect(rifiBalancePost).toEqualNumber(a1AccruedPre);
    });

    it('should not transfer when rifi accrued is below threshold', async () => {
      const rifiRemaining = 1000, a1AccruedPre = 100, threshold = 101;
      const rifiBalancePre = await call(cointroller.rifi, 'balanceOf', [a1]);
      const tx0 = await send(cointroller.rifi, 'transfer', [cointroller._address, rifiRemaining], {from: root});
      const tx1 = await send(cointroller, 'setRifiAccrued', [a1, a1AccruedPre]);
      const tx2 = await send(cointroller, 'harnessTransferRifi', [a1, a1AccruedPre, threshold]);
      const a1AccruedPost = await rifiAccrued(cointroller, a1);
      const rifiBalancePost = await rifiBalance(cointroller, a1);
      expect(rifiBalancePre).toEqualNumber(0);
      expect(rifiBalancePost).toEqualNumber(0);
    });

    it('should not transfer rifi if rifi accrued is greater than rifi remaining', async () => {
      const rifiRemaining = 99, a1AccruedPre = 100, threshold = 1;
      const rifiBalancePre = await rifiBalance(cointroller, a1);
      const tx0 = await send(cointroller.rifi, 'transfer', [cointroller._address, rifiRemaining], {from: root});
      const tx1 = await send(cointroller, 'setRifiAccrued', [a1, a1AccruedPre]);
      const tx2 = await send(cointroller, 'harnessTransferRifi', [a1, a1AccruedPre, threshold]);
      const a1AccruedPost = await rifiAccrued(cointroller, a1);
      const rifiBalancePost = await rifiBalance(cointroller, a1);
      expect(rifiBalancePre).toEqualNumber(0);
      expect(rifiBalancePost).toEqualNumber(0);
    });
  });

  describe('claimRifi', () => {
    it('should accrue rifi and then transfer rifi accrued', async () => {
      const rifiRemaining = rifiRate.multipliedBy(100), mintAmount = etherUnsigned(12e18), deltaBlocks = 10;
      await send(cointroller.rifi, 'transfer', [cointroller._address, rifiRemaining], {from: root});
      await pretendBorrow(rLOW, a1, 1, 1, 100);
      await send(cointroller, '_setRifiSpeed', [rLOW._address, etherExp(0.5)]);
      await send(cointroller, 'harnessRefreshRifiSpeeds');
      const speed = await call(cointroller, 'rifiSpeeds', [rLOW._address]);
      const a2AccruedPre = await rifiAccrued(cointroller, a2);
      const rifiBalancePre = await rifiBalance(cointroller, a2);
      await quickMint(rLOW, a2, mintAmount);
      await fastForward(cointroller, deltaBlocks);
      const tx = await send(cointroller, 'claimRifi', [a2]);
      const a2AccruedPost = await rifiAccrued(cointroller, a2);
      const rifiBalancePost = await rifiBalance(cointroller, a2);
      expect(tx.gasUsed).toBeLessThan(400000);
      expect(speed).toEqualNumber(rifiRate);
      expect(a2AccruedPre).toEqualNumber(0);
      expect(a2AccruedPost).toEqualNumber(0);
      expect(rifiBalancePre).toEqualNumber(0);
      expect(rifiBalancePost).toEqualNumber(rifiRate.multipliedBy(deltaBlocks).minus(1)); // index is 8333...
    });

    it('should accrue rifi and then transfer rifi accrued in a single market', async () => {
      const rifiRemaining = rifiRate.multipliedBy(100), mintAmount = etherUnsigned(12e18), deltaBlocks = 10;
      await send(cointroller.rifi, 'transfer', [cointroller._address, rifiRemaining], {from: root});
      await pretendBorrow(rLOW, a1, 1, 1, 100);
      await send(cointroller, 'harnessAddRifiMarkets', [[rLOW._address]]);
      await send(cointroller, 'harnessRefreshRifiSpeeds');
      const speed = await call(cointroller, 'rifiSpeeds', [rLOW._address]);
      const a2AccruedPre = await rifiAccrued(cointroller, a2);
      const rifiBalancePre = await rifiBalance(cointroller, a2);
      await quickMint(rLOW, a2, mintAmount);
      await fastForward(cointroller, deltaBlocks);
      const tx = await send(cointroller, 'claimRifi', [a2, [rLOW._address]]);
      const a2AccruedPost = await rifiAccrued(cointroller, a2);
      const rifiBalancePost = await rifiBalance(cointroller, a2);
      expect(tx.gasUsed).toBeLessThan(170000);
      expect(speed).toEqualNumber(rifiRate);
      expect(a2AccruedPre).toEqualNumber(0);
      expect(a2AccruedPost).toEqualNumber(0);
      expect(rifiBalancePre).toEqualNumber(0);
      expect(rifiBalancePost).toEqualNumber(rifiRate.multipliedBy(deltaBlocks).minus(1)); // index is 8333...
    });

    it('should claim when rifi accrued is below threshold', async () => {
      const rifiRemaining = etherExp(1), accruedAmt = etherUnsigned(0.0009e18)
      await send(cointroller.rifi, 'transfer', [cointroller._address, rifiRemaining], {from: root});
      await send(cointroller, 'setRifiAccrued', [a1, accruedAmt]);
      await send(cointroller, 'claimRifi', [a1, [rLOW._address]]);
      expect(await rifiAccrued(cointroller, a1)).toEqualNumber(0);
      expect(await rifiBalance(cointroller, a1)).toEqualNumber(accruedAmt);
    });

    it('should revert when a market is not listed', async () => {
      const rNOT = await makeRToken({cointroller});
      await expect(
        send(cointroller, 'claimRifi', [a1, [rNOT._address]])
      ).rejects.toRevert('revert market must be listed');
    });
  });

  describe('claimRifi batch', () => {
    it('should revert when claiming rifi from non-listed market', async () => {
      const rifiRemaining = rifiRate.multipliedBy(100), deltaBlocks = 10, mintAmount = etherExp(10);
      await send(cointroller.rifi, 'transfer', [cointroller._address, rifiRemaining], {from: root});
      let [_, __, ...claimAccts] = saddle.accounts;

      for(let from of claimAccts) {
        expect(await send(rLOW.underlying, 'harnessSetBalance', [from, mintAmount], { from })).toSucceed();
        send(rLOW.underlying, 'approve', [rLOW._address, mintAmount], { from });
        send(rLOW, 'mint', [mintAmount], { from });
      }

      await pretendBorrow(rLOW, root, 1, 1, etherExp(10));
      await send(cointroller, 'harnessRefreshRifiSpeeds');

      await fastForward(cointroller, deltaBlocks);

      await expect(send(cointroller, 'claimRifi', [claimAccts, [rLOW._address, rEVIL._address], true, true])).rejects.toRevert('revert market must be listed');
    });

    it('should claim the expected amount when holders and rtokens arg is duplicated', async () => {
      const rifiRemaining = rifiRate.multipliedBy(100), deltaBlocks = 10, mintAmount = etherExp(10);
      await send(cointroller.rifi, 'transfer', [cointroller._address, rifiRemaining], {from: root});
      let [_, __, ...claimAccts] = saddle.accounts;
      for(let from of claimAccts) {
        expect(await send(rLOW.underlying, 'harnessSetBalance', [from, mintAmount], { from })).toSucceed();
        send(rLOW.underlying, 'approve', [rLOW._address, mintAmount], { from });
        send(rLOW, 'mint', [mintAmount], { from });
      }
      await pretendBorrow(rLOW, root, 1, 1, etherExp(10));
      await send(cointroller, 'harnessAddRifiMarkets', [[rLOW._address]]);
      await send(cointroller, 'harnessRefreshRifiSpeeds');

      await fastForward(cointroller, deltaBlocks);

      const tx = await send(cointroller, 'claimRifi', [[...claimAccts, ...claimAccts], [rLOW._address, rLOW._address], false, true]);
      // rifi distributed => 10e18
      for(let acct of claimAccts) {
        expect(await call(cointroller, 'rifiSupplierIndex', [rLOW._address, acct])).toEqualNumber(etherDouble(1.125));
        expect(await rifiBalance(cointroller, acct)).toEqualNumber(etherExp(1.25));
      }
    });

    it('claims rifi for multiple suppliers only', async () => {
      const rifiRemaining = rifiRate.multipliedBy(100), deltaBlocks = 10, mintAmount = etherExp(10);
      await send(cointroller.rifi, 'transfer', [cointroller._address, rifiRemaining], {from: root});
      let [_, __, ...claimAccts] = saddle.accounts;
      for(let from of claimAccts) {
        expect(await send(rLOW.underlying, 'harnessSetBalance', [from, mintAmount], { from })).toSucceed();
        send(rLOW.underlying, 'approve', [rLOW._address, mintAmount], { from });
        send(rLOW, 'mint', [mintAmount], { from });
      }
      await pretendBorrow(rLOW, root, 1, 1, etherExp(10));
      await send(cointroller, 'harnessAddRifiMarkets', [[rLOW._address]]);
      await send(cointroller, 'harnessRefreshRifiSpeeds');

      await fastForward(cointroller, deltaBlocks);

      const tx = await send(cointroller, 'claimRifi', [claimAccts, [rLOW._address], false, true]);
      // rifi distributed => 10e18
      for(let acct of claimAccts) {
        expect(await call(cointroller, 'rifiSupplierIndex', [rLOW._address, acct])).toEqualNumber(etherDouble(1.125));
        expect(await rifiBalance(cointroller, acct)).toEqualNumber(etherExp(1.25));
      }
    });

    it('claims rifi for multiple borrowers only, primes uninitiated', async () => {
      const rifiRemaining = rifiRate.multipliedBy(100), deltaBlocks = 10, mintAmount = etherExp(10), borrowAmt = etherExp(1), borrowIdx = etherExp(1)
      await send(cointroller.rifi, 'transfer', [cointroller._address, rifiRemaining], {from: root});
      let [_,__, ...claimAccts] = saddle.accounts;

      for(let acct of claimAccts) {
        await send(rLOW, 'harnessIncrementTotalBorrows', [borrowAmt]);
        await send(rLOW, 'harnessSetAccountBorrows', [acct, borrowAmt, borrowIdx]);
      }
      await send(cointroller, 'harnessAddRifiMarkets', [[rLOW._address]]);
      await send(cointroller, 'harnessRefreshRifiSpeeds');

      await send(cointroller, 'harnessFastForward', [10]);

      const tx = await send(cointroller, 'claimRifi', [claimAccts, [rLOW._address], true, false]);
      for(let acct of claimAccts) {
        expect(await call(cointroller, 'rifiBorrowerIndex', [rLOW._address, acct])).toEqualNumber(etherDouble(2.25));
        expect(await call(cointroller, 'rifiSupplierIndex', [rLOW._address, acct])).toEqualNumber(0);
      }
    });

    it('should revert when a market is not listed', async () => {
      const rNOT = await makeRToken({cointroller});
      await expect(
        send(cointroller, 'claimRifi', [[a1, a2], [rNOT._address], true, true])
      ).rejects.toRevert('revert market must be listed');
    });
  });

  describe('harnessRefreshRifiSpeeds', () => {
    it('should start out 0', async () => {
      await send(cointroller, 'harnessRefreshRifiSpeeds');
      const speed = await call(cointroller, 'rifiSpeeds', [rLOW._address]);
      expect(speed).toEqualNumber(0);
    });

    it('should get correct speeds with borrows', async () => {
      await pretendBorrow(rLOW, a1, 1, 1, 100);
      await send(cointroller, 'harnessAddRifiMarkets', [[rLOW._address]]);
      const tx = await send(cointroller, 'harnessRefreshRifiSpeeds');
      const speed = await call(cointroller, 'rifiSpeeds', [rLOW._address]);
      expect(speed).toEqualNumber(rifiRate);
      expect(tx).toHaveLog(['RifiSpeedUpdated', 0], {
        rToken: rLOW._address,
        newSpeed: speed
      });
    });

    it('should get correct speeds for 2 assets', async () => {
      await pretendBorrow(rLOW, a1, 1, 1, 100);
      await pretendBorrow(rZRX, a1, 1, 1, 100);
      await send(cointroller, 'harnessAddRifiMarkets', [[rLOW._address, rZRX._address]]);
      await send(cointroller, 'harnessRefreshRifiSpeeds');
      const speed1 = await call(cointroller, 'rifiSpeeds', [rLOW._address]);
      const speed2 = await call(cointroller, 'rifiSpeeds', [rREP._address]);
      const speed3 = await call(cointroller, 'rifiSpeeds', [rZRX._address]);
      expect(speed1).toEqualNumber(rifiRate.dividedBy(4));
      expect(speed2).toEqualNumber(0);
      expect(speed3).toEqualNumber(rifiRate.dividedBy(4).multipliedBy(3));
    });
  });

  describe('harnessAddRifiMarkets', () => {
    it('should correctly add a rifi market if called by admin', async () => {
      const rBAT = await makeRToken({cointroller, supportMarket: true});
      const tx1 = await send(cointroller, 'harnessAddRifiMarkets', [[rLOW._address, rREP._address, rZRX._address]]);
      const tx2 = await send(cointroller, 'harnessAddRifiMarkets', [[rBAT._address]]);
      const markets = await call(cointroller, 'getRifiMarkets');
      expect(markets).toEqual([rLOW, rREP, rZRX, rBAT].map((c) => c._address));
      expect(tx2).toHaveLog('RifiSpeedUpdated', {
        rToken: rBAT._address,
        newSpeed: 1
      });
    });

    it('should not write over a markets existing state', async () => {
      const mkt = rLOW._address;
      const bn0 = 10, bn1 = 20;
      const idx = etherUnsigned(1.5e36);

      await send(cointroller, "harnessAddRifiMarkets", [[mkt]]);
      await send(cointroller, "setRifiSupplyState", [mkt, idx, bn0]);
      await send(cointroller, "setRifiBorrowState", [mkt, idx, bn0]);
      await send(cointroller, "setBlockNumber", [bn1]);
      await send(cointroller, "_setRifiSpeed", [mkt, 0]);
      await send(cointroller, "harnessAddRifiMarkets", [[mkt]]);

      const supplyState = await call(cointroller, 'rifiSupplyState', [mkt]);
      expect(supplyState.block).toEqual(bn1.toString());
      expect(supplyState.index).toEqual(idx.toFixed());

      const borrowState = await call(cointroller, 'rifiBorrowState', [mkt]);
      expect(borrowState.block).toEqual(bn1.toString());
      expect(borrowState.index).toEqual(idx.toFixed());
    });
  });


  describe('updateContributorRewards', () => {
    it('should not fail when contributor rewards called on non-contributor', async () => {
      const tx1 = await send(cointroller, 'updateContributorRewards', [a1]);
    });

    it('should accrue rifi to contributors', async () => {
      const tx1 = await send(cointroller, '_setContributorRifiSpeed', [a1, 2000]);
      await fastForward(cointroller, 50);

      const a1Accrued = await rifiAccrued(cointroller, a1);
      expect(a1Accrued).toEqualNumber(0);

      const tx2 = await send(cointroller, 'updateContributorRewards', [a1], {from: a1});
      const a1Accrued2 = await rifiAccrued(cointroller, a1);
      expect(a1Accrued2).toEqualNumber(50 * 2000);
    });

    it('should accrue rifi with late set', async () => {
      await fastForward(cointroller, 1000);
      const tx1 = await send(cointroller, '_setContributorRifiSpeed', [a1, 2000]);
      await fastForward(cointroller, 50);

      const tx2 = await send(cointroller, 'updateContributorRewards', [a1], {from: a1});
      const a1Accrued2 = await rifiAccrued(cointroller, a1);
      expect(a1Accrued2).toEqualNumber(50 * 2000);
    });
  });

  describe('_setContributorRifiSpeed', () => {
    it('should revert if not called by admin', async () => {
      await expect(
        send(cointroller, '_setContributorRifiSpeed', [a1, 1000], {from: a1})
      ).rejects.toRevert('revert only admin can set rifi speed');
    });

    it('should start rifi stream if called by admin', async () => {
      const tx = await send(cointroller, '_setContributorRifiSpeed', [a1, 1000]);
      expect(tx).toHaveLog('ContributorRifiSpeedUpdated', {
        contributor: a1,
        newSpeed: 1000
      });
    });

    it('should reset rifi stream if set to 0', async () => {
      const tx1 = await send(cointroller, '_setContributorRifiSpeed', [a1, 2000]);
      await fastForward(cointroller, 50);

      const tx2 = await send(cointroller, '_setContributorRifiSpeed', [a1, 0]);
      await fastForward(cointroller, 50);

      const tx3 = await send(cointroller, 'updateContributorRewards', [a1], {from: a1});
      const a1Accrued = await rifiAccrued(cointroller, a1);
      expect(a1Accrued).toEqualNumber(50 * 2000);
    });
  });
});
