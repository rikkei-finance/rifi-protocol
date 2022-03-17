const {
  etherUnsigned,
  etherMantissa,
  etherExp,
} = require('./Utils/Ethereum');

const {
  makeCointroller,
  makeRToken,
  preApprove,
  preSupply,
  quickRedeem,
} = require('./Utils/Rifi');

async function rifiBalance(cointroller, user) {
  return etherUnsigned(await call(cointroller.rifi, 'balanceOf', [user]))
}

async function rifiAccrued(cointroller, user) {
  return etherUnsigned(await call(cointroller, 'rifiAccrued', [user]));
}

async function fastForwardPatch(patch, cointroller, blocks) {
  if (patch == 'unitroller') {
    return await send(cointroller, 'harnessFastForward', [blocks]);
  } else {
    return await send(cointroller, 'fastForward', [blocks]);
  }
}

const fs = require('fs');
const util = require('util');
const diffStringsUnified = require('jest-diff').default;


async function preRedeem(
  rToken,
  redeemer,
  redeemTokens,
  redeemAmount,
  exchangeRate
) {
  await preSupply(rToken, redeemer, redeemTokens);
  await send(rToken.underlying, 'harnessSetBalance', [
    rToken._address,
    redeemAmount
  ]);
}

const sortOpcodes = (opcodesMap) => {
  return Object.values(opcodesMap)
    .map(elem => [elem.fee, elem.name])
    .sort((a, b) => b[0] - a[0]);
};

const getGasCostFile = name => {
  try {
    const jsonString = fs.readFileSync(name);
    return JSON.parse(jsonString);
  } catch (err) {
    console.log(err);
    return {};
  }
};

const recordGasCost = (totalFee, key, filename, opcodes = {}) => {
  let fileObj = getGasCostFile(filename);
  const newCost = {fee: totalFee, opcodes: opcodes};
  console.log(diffStringsUnified(fileObj[key], newCost));
  fileObj[key] = newCost;
  fs.writeFileSync(filename, JSON.stringify(fileObj, null, ' '), 'utf-8');
};

async function mint(rToken, minter, mintAmount, exchangeRate) {
  expect(await preApprove(rToken, minter, mintAmount, {})).toSucceed();
  return send(rToken, 'mint', [mintAmount], { from: minter });
}

async function claimRifi(cointroller, holder) {
  return send(cointroller, 'claimRifi', [holder], { from: holder });
}

/// GAS PROFILER: saves a digest of the gas prices of common RToken operations
/// transiently fails, not sure why

describe('Gas report', () => {
  let root, minter, redeemer, accounts, rToken;
  const exchangeRate = 50e3;
  const preMintAmount = etherUnsigned(30e4);
  const mintAmount = etherUnsigned(10e4);
  const mintTokens = mintAmount.div(exchangeRate);
  const redeemTokens = etherUnsigned(10e3);
  const redeemAmount = redeemTokens.multipliedBy(exchangeRate);
  const filename = './gasCosts.json';

  describe('RToken', () => {
    beforeEach(async () => {
      [root, minter, redeemer, ...accounts] = saddle.accounts;
      rToken = await makeRToken({
        cointrollerOpts: { kind: 'bool'},
        interestRateModelOpts: { kind: 'white-paper'},
        exchangeRate
      });
    });

    it('first mint', async () => {
      await send(rToken, 'harnessSetAccrualBlockNumber', [40]);
      await send(rToken, 'harnessSetBlockNumber', [41]);

      const trxReceipt = await mint(rToken, minter, mintAmount, exchangeRate);
      recordGasCost(trxReceipt.gasUsed, 'first mint', filename);
    });

    it('second mint', async () => {
      await mint(rToken, minter, mintAmount, exchangeRate);

      await send(rToken, 'harnessSetAccrualBlockNumber', [40]);
      await send(rToken, 'harnessSetBlockNumber', [41]);

      const mint2Receipt = await mint(rToken, minter, mintAmount, exchangeRate);
      expect(Object.keys(mint2Receipt.events)).toEqual(['AccrueInterest', 'Transfer', 'Mint']);

      console.log(mint2Receipt.gasUsed);
      const opcodeCount = {};

      await saddle.trace(mint2Receipt, {
        execLog: log => {
          if (log.lastLog != undefined) {
            const key = `${log.op} @ ${log.gasCost}`;
            opcodeCount[key] = (opcodeCount[key] || 0) + 1;
          }
        }
      });

      recordGasCost(mint2Receipt.gasUsed, 'second mint', filename, opcodeCount);
    });

    it('second mint, no interest accrued', async () => {
      await mint(rToken, minter, mintAmount, exchangeRate);

      await send(rToken, 'harnessSetAccrualBlockNumber', [40]);
      await send(rToken, 'harnessSetBlockNumber', [40]);

      const mint2Receipt = await mint(rToken, minter, mintAmount, exchangeRate);
      expect(Object.keys(mint2Receipt.events)).toEqual(['Transfer', 'Mint']);
      recordGasCost(mint2Receipt.gasUsed, 'second mint, no interest accrued', filename);

      // console.log("NO ACCRUED");
      // const opcodeCount = {};
      // await saddle.trace(mint2Receipt, {
      //   execLog: log => {
      //     opcodeCount[log.op] = (opcodeCount[log.op] || 0) + 1;
      //   }
      // });
      // console.log(getOpcodeDigest(opcodeCount));
    });

    it('redeem', async () => {
      await preRedeem(rToken, redeemer, redeemTokens, redeemAmount, exchangeRate);
      const trxReceipt = await quickRedeem(rToken, redeemer, redeemTokens);
      recordGasCost(trxReceipt.gasUsed, 'redeem', filename);
    });

    it.skip('print mint opcode list', async () => {
      await preMint(rToken, minter, mintAmount, mintTokens, exchangeRate);
      const trxReceipt = await quickMint(rToken, minter, mintAmount);
      const opcodeCount = {};
      await saddle.trace(trxReceipt, {
        execLog: log => {
          opcodeCount[log.op] = (opcodeCount[log.op] || 0) + 1;
        }
      });
      console.log(getOpcodeDigest(opcodeCount));
    });
  });

  describe.each([
    ['unitroller-g6'],
    ['unitroller']
  ])('Rifi claims %s', (patch) => {
    beforeEach(async () => {
      [root, minter, redeemer, ...accounts] = saddle.accounts;
      cointroller = await makeCointroller({ kind: patch });
      let interestRateModelOpts = {borrowRate: 0.000001};
      rToken = await makeRToken({cointroller, supportMarket: true, underlyingPrice: 2, interestRateModelOpts});
      if (patch == 'unitroller') {
        await send(cointroller, '_setRifiSpeed', [rToken._address, etherExp(0.05)]);
      } else {
        await send(cointroller, '_addRifiMarkets', [[rToken].map(c => c._address)]);
        await send(cointroller, 'setRifiSpeed', [rToken._address, etherExp(0.05)]);
      }
      await send(cointroller.rifi, 'transfer', [cointroller._address, etherUnsigned(50e18)], {from: root});
    });

    it(`${patch} second mint with rifi accrued`, async () => {
      await mint(rToken, minter, mintAmount, exchangeRate);

      await fastForwardPatch(patch, cointroller, 10);

      console.log('Rifi balance before mint', (await rifiBalance(cointroller, minter)).toString());
      console.log('Rifi accrued before mint', (await rifiAccrued(cointroller, minter)).toString());
      const mint2Receipt = await mint(rToken, minter, mintAmount, exchangeRate);
      console.log('Rifi balance after mint', (await rifiBalance(cointroller, minter)).toString());
      console.log('Rifi accrued after mint', (await rifiAccrued(cointroller, minter)).toString());
      recordGasCost(mint2Receipt.gasUsed, `${patch} second mint with rifi accrued`, filename);
    });

    it(`${patch} claim rifi`, async () => {
      await mint(rToken, minter, mintAmount, exchangeRate);

      await fastForwardPatch(patch, cointroller, 10);

      console.log('Rifi balance before claim', (await rifiBalance(cointroller, minter)).toString());
      console.log('Rifi accrued before claim', (await rifiAccrued(cointroller, minter)).toString());
      const claimReceipt = await claimRifi(cointroller, minter);
      console.log('Rifi balance after claim', (await rifiBalance(cointroller, minter)).toString());
      console.log('Rifi accrued after claim', (await rifiAccrued(cointroller, minter)).toString());
      recordGasCost(claimReceipt.gasUsed, `${patch} claim rifi`, filename);
    });
  });
});
