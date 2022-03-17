const {
  address,
  encodeParameters,
} = require('../Utils/Ethereum');
const {
  makeCointroller,
  makeRToken,
} = require('../Utils/Rifi');

function cullTuple(tuple) {
  return Object.keys(tuple).reduce((acc, key) => {
    if (Number.isNaN(Number(key))) {
      return {
        ...acc,
        [key]: tuple[key]
      };
    } else {
      return acc;
    }
  }, {});
}

describe('RifiLens', () => {
  let rifiLens;
  let acct;

  beforeEach(async () => {
    rifiLens = await deploy('RifiLens');
    acct = accounts[0];
  });

  describe('rTokenMetadata', () => {
    it('is correct for a rBep20', async () => {
      let rBep20 = await makeRToken();
      expect(
        cullTuple(await call(rifiLens, 'rTokenMetadata', [rBep20._address]))
      ).toEqual(
        {
          rToken: rBep20._address,
          exchangeRateCurrent: "1000000000000000000",
          supplyRatePerBlock: "0",
          borrowRatePerBlock: "0",
          reserveFactorMantissa: "0",
          totalBorrows: "0",
          totalReserves: "0",
          totalSupply: "0",
          totalCash: "0",
          isListed:false,
          collateralFactorMantissa: "0",
          underlyingAssetAddress: await call(rBep20, 'underlying', []),
          rTokenDecimals: "8",
          underlyingDecimals: "18"
        }
      );
    });

    it('is correct for cEth', async () => {
      let cEth = await makeRToken({kind: 'rbinance'});
      expect(
        cullTuple(await call(rifiLens, 'rTokenMetadata', [cEth._address]))
      ).toEqual({
        borrowRatePerBlock: "0",
        rToken: cEth._address,
        rTokenDecimals: "8",
        collateralFactorMantissa: "0",
        exchangeRateCurrent: "1000000000000000000",
        isListed: false,
        reserveFactorMantissa: "0",
        supplyRatePerBlock: "0",
        totalBorrows: "0",
        totalCash: "0",
        totalReserves: "0",
        totalSupply: "0",
        underlyingAssetAddress: "0x0000000000000000000000000000000000000000",
        underlyingDecimals: "18",
      });
    });
  });

  describe('rTokenMetadataAll', () => {
    it('is correct for a rBep20 and rBinance', async () => {
      let rBep20 = await makeRToken();
      let cEth = await makeRToken({kind: 'rbinance'});
      expect(
        (await call(rifiLens, 'rTokenMetadataAll', [[rBep20._address, cEth._address]])).map(cullTuple)
      ).toEqual([
        {
          rToken: rBep20._address,
          exchangeRateCurrent: "1000000000000000000",
          supplyRatePerBlock: "0",
          borrowRatePerBlock: "0",
          reserveFactorMantissa: "0",
          totalBorrows: "0",
          totalReserves: "0",
          totalSupply: "0",
          totalCash: "0",
          isListed:false,
          collateralFactorMantissa: "0",
          underlyingAssetAddress: await call(rBep20, 'underlying', []),
          rTokenDecimals: "8",
          underlyingDecimals: "18"
        },
        {
          borrowRatePerBlock: "0",
          rToken: cEth._address,
          rTokenDecimals: "8",
          collateralFactorMantissa: "0",
          exchangeRateCurrent: "1000000000000000000",
          isListed: false,
          reserveFactorMantissa: "0",
          supplyRatePerBlock: "0",
          totalBorrows: "0",
          totalCash: "0",
          totalReserves: "0",
          totalSupply: "0",
          underlyingAssetAddress: "0x0000000000000000000000000000000000000000",
          underlyingDecimals: "18",
        }
      ]);
    });
  });

  describe('rTokenBalances', () => {
    it('is correct for rBEP20', async () => {
      let rBep20 = await makeRToken();
      expect(
        cullTuple(await call(rifiLens, 'rTokenBalances', [rBep20._address, acct]))
      ).toEqual(
        {
          balanceOf: "0",
          balanceOfUnderlying: "0",
          borrowBalanceCurrent: "0",
          rToken: rBep20._address,
          tokenAllowance: "0",
          tokenBalance: "10000000000000000000000000",
        }
      );
    });

    it('is correct for rETH', async () => {
      let cEth = await makeRToken({kind: 'rbinance'});
      let ethBalance = await web3.eth.getBalance(acct);
      expect(
        cullTuple(await call(rifiLens, 'rTokenBalances', [cEth._address, acct], {gasPrice: '0'}))
      ).toEqual(
        {
          balanceOf: "0",
          balanceOfUnderlying: "0",
          borrowBalanceCurrent: "0",
          rToken: cEth._address,
          tokenAllowance: ethBalance,
          tokenBalance: ethBalance,
        }
      );
    });
  });

  describe('rTokenBalancesAll', () => {
    it('is correct for cEth and rBep20', async () => {
      let rBep20 = await makeRToken();
      let cEth = await makeRToken({kind: 'rbinance'});
      let ethBalance = await web3.eth.getBalance(acct);

      expect(
        (await call(rifiLens, 'rTokenBalancesAll', [[rBep20._address, cEth._address], acct], {gasPrice: '0'})).map(cullTuple)
      ).toEqual([
        {
          balanceOf: "0",
          balanceOfUnderlying: "0",
          borrowBalanceCurrent: "0",
          rToken: rBep20._address,
          tokenAllowance: "0",
          tokenBalance: "10000000000000000000000000",
        },
        {
          balanceOf: "0",
          balanceOfUnderlying: "0",
          borrowBalanceCurrent: "0",
          rToken: cEth._address,
          tokenAllowance: ethBalance,
          tokenBalance: ethBalance,
        }
      ]);
    })
  });

  describe('rTokenUnderlyingPrice', () => {
    it('gets correct price for rBep20', async () => {
      let rBep20 = await makeRToken();
      expect(
        cullTuple(await call(rifiLens, 'rTokenUnderlyingPrice', [rBep20._address]))
      ).toEqual(
        {
          rToken: rBep20._address,
          underlyingPrice: "0",
        }
      );
    });

    it('gets correct price for cEth', async () => {
      let cEth = await makeRToken({kind: 'rbinance'});
      expect(
        cullTuple(await call(rifiLens, 'rTokenUnderlyingPrice', [cEth._address]))
      ).toEqual(
        {
          rToken: cEth._address,
          underlyingPrice: "1000000000000000000",
        }
      );
    });
  });

  describe('rTokenUnderlyingPriceAll', () => {
    it('gets correct price for both', async () => {
      let rBep20 = await makeRToken();
      let cEth = await makeRToken({kind: 'rbinance'});
      expect(
        (await call(rifiLens, 'rTokenUnderlyingPriceAll', [[rBep20._address, cEth._address]])).map(cullTuple)
      ).toEqual([
        {
          rToken: rBep20._address,
          underlyingPrice: "0",
        },
        {
          rToken: cEth._address,
          underlyingPrice: "1000000000000000000",
        }
      ]);
    });
  });

  describe('getAccountLimits', () => {
    it('gets correct values', async () => {
      let cointroller = await makeCointroller();

      expect(
        cullTuple(await call(rifiLens, 'getAccountLimits', [cointroller._address, acct]))
      ).toEqual({
        liquidity: "0",
        markets: [],
        shortfall: "0"
      });
    });
  });

  describe('governance', () => {
    let rifi, gov;
    let targets, values, signatures, callDatas;
    let proposalBlock, proposalId;

    beforeEach(async () => {
      rifi = await deploy('Rifi', [acct]);
      gov = await deploy('GovernorAlpha', [address(0), rifi._address, address(0)]);
      targets = [acct];
      values = ["0"];
      signatures = ["getBalanceOf(address)"];
      callDatas = [encodeParameters(['address'], [acct])];
      await send(rifi, 'delegate', [acct]);
      await send(gov, 'propose', [targets, values, signatures, callDatas, "do nothing"]);
      proposalBlock = +(await web3.eth.getBlockNumber());
      proposalId = await call(gov, 'latestProposalIds', [acct]);
    });

    describe('getGovReceipts', () => {
      it('gets correct values', async () => {
        expect(
          (await call(rifiLens, 'getGovReceipts', [gov._address, acct, [proposalId]])).map(cullTuple)
        ).toEqual([
          {
            hasVoted: false,
            proposalId: proposalId,
            support: false,
            votes: "0",
          }
        ]);
      })
    });

    describe('getGovProposals', () => {
      it('gets correct values', async () => {
        expect(
          (await call(rifiLens, 'getGovProposals', [gov._address, [proposalId]])).map(cullTuple)
        ).toEqual([
          {
            againstVotes: "0",
            calldatas: callDatas,
            canceled: false,
            endBlock: (Number(proposalBlock) + 17281).toString(),
            eta: "0",
            executed: false,
            forVotes: "0",
            proposalId: proposalId,
            proposer: acct,
            signatures: signatures,
            startBlock: (Number(proposalBlock) + 1).toString(),
            targets: targets
          }
        ]);
      })
    });
  });

  describe('rifi', () => {
    let rifi, currentBlock;

    beforeEach(async () => {
      currentBlock = +(await web3.eth.getBlockNumber());
      rifi = await deploy('Rifi', [acct]);
    });

    describe('getRifiBalanceMetadata', () => {
      it('gets correct values', async () => {
        expect(
          cullTuple(await call(rifiLens, 'getRifiBalanceMetadata', [rifi._address, acct]))
        ).toEqual({
          balance: "10000000000000000000000000",
          delegate: "0x0000000000000000000000000000000000000000",
          votes: "0",
        });
      });
    });

    describe('getRifiBalanceMetadataExt', () => {
      it('gets correct values', async () => {
        let cointroller = await makeCointroller();
        await send(cointroller, 'setRifiAccrued', [acct, 5]); // harness only

        expect(
          cullTuple(await call(rifiLens, 'getRifiBalanceMetadataExt', [rifi._address, cointroller._address, acct]))
        ).toEqual({
          balance: "10000000000000000000000000",
          delegate: "0x0000000000000000000000000000000000000000",
          votes: "0",
          allocated: "5"
        });
      });
    });

    describe('getRifiVotes', () => {
      it('gets correct values', async () => {
        expect(
          (await call(rifiLens, 'getRifiVotes', [rifi._address, acct, [currentBlock, currentBlock - 1]])).map(cullTuple)
        ).toEqual([
          {
            blockNumber: currentBlock.toString(),
            votes: "0",
          },
          {
            blockNumber: (Number(currentBlock) - 1).toString(),
            votes: "0",
          }
        ]);
      });

      it('reverts on future value', async () => {
        await expect(
          call(rifiLens, 'getRifiVotes', [rifi._address, acct, [currentBlock + 1]])
        ).rejects.toRevert('revert Rifi::getPriorVotes: not yet determined')
      });
    });
  });
});
