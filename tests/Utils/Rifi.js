"use strict";

const { dfn } = require('./JS');
const {
  encodeParameters,
  etherBalance,
  etherMantissa,
  etherUnsigned,
  mergeInterface
} = require('./Ethereum');
const BigNumber = require('bignumber.js');

async function makeCointroller(opts = {}) {
  const {
    root = saddle.account,
    kind = 'unitroller'
  } = opts || {};

  if (kind == 'bool') {
    return await deploy('BoolCointroller');
  }

  if (kind == 'false-marker') {
    return await deploy('FalseMarkerMethodCointroller');
  }

  if (kind == 'v1-no-proxy') {
    const cointroller = await deploy('CointrollerHarness');
    const priceOracle = opts.priceOracle || await makePriceOracle(opts.priceOracleOpts);
    const closeFactor = etherMantissa(dfn(opts.closeFactor, .051));

    await send(cointroller, '_setCloseFactor', [closeFactor]);
    await send(cointroller, '_setPriceOracle', [priceOracle._address]);

    return Object.assign(cointroller, { priceOracle });
  }

  if (kind == 'unitroller-g2') {
    const unitroller = opts.unitroller || await deploy('Unitroller');
    const cointroller = await deploy('CointrollerScenarioG2');
    const priceOracle = opts.priceOracle || await makePriceOracle(opts.priceOracleOpts);
    const closeFactor = etherMantissa(dfn(opts.closeFactor, .051));
    const maxAssets = etherUnsigned(dfn(opts.maxAssets, 10));
    const liquidationIncentive = etherMantissa(1);

    await send(unitroller, '_setPendingImplementation', [cointroller._address]);
    await send(cointroller, '_become', [unitroller._address]);
    mergeInterface(unitroller, cointroller);
    await send(unitroller, '_setLiquidationIncentive', [liquidationIncentive]);
    await send(unitroller, '_setCloseFactor', [closeFactor]);
    await send(unitroller, '_setMaxAssets', [maxAssets]);
    await send(unitroller, '_setPriceOracle', [priceOracle._address]);

    return Object.assign(unitroller, { priceOracle });
  }

  if (kind == 'unitroller-g3') {
    const unitroller = opts.unitroller || await deploy('Unitroller');
    const cointroller = await deploy('CointrollerScenarioG3');
    const priceOracle = opts.priceOracle || await makePriceOracle(opts.priceOracleOpts);
    const closeFactor = etherMantissa(dfn(opts.closeFactor, .051));
    const maxAssets = etherUnsigned(dfn(opts.maxAssets, 10));
    const liquidationIncentive = etherMantissa(1);
    const rifiRate = etherUnsigned(dfn(opts.rifiRate, 1e18));
    const rifiMarkets = opts.rifiMarkets || [];
    const otherMarkets = opts.otherMarkets || [];

    await send(unitroller, '_setPendingImplementation', [cointroller._address]);
    await send(cointroller, '_become', [unitroller._address, rifiRate, rifiMarkets, otherMarkets]);
    mergeInterface(unitroller, cointroller);
    await send(unitroller, '_setLiquidationIncentive', [liquidationIncentive]);
    await send(unitroller, '_setCloseFactor', [closeFactor]);
    await send(unitroller, '_setMaxAssets', [maxAssets]);
    await send(unitroller, '_setPriceOracle', [priceOracle._address]);

    return Object.assign(unitroller, { priceOracle });
  }

  if (kind == 'unitroller-g6') {
    const unitroller = opts.unitroller || await deploy('Unitroller');
    const cointroller = await deploy('CointrollerScenarioG6');
    const priceOracle = opts.priceOracle || await makePriceOracle(opts.priceOracleOpts);
    const closeFactor = etherMantissa(dfn(opts.closeFactor, .051));
    const liquidationIncentive = etherMantissa(1);
    const rifi = opts.rifi || await deploy('Rifi', [opts.rifiOwner || root]);
    const rifiRate = etherUnsigned(dfn(opts.rifiRate, 1e18));

    await send(unitroller, '_setPendingImplementation', [cointroller._address]);
    await send(cointroller, '_become', [unitroller._address]);
    mergeInterface(unitroller, cointroller);
    await send(unitroller, '_setLiquidationIncentive', [liquidationIncentive]);
    await send(unitroller, '_setCloseFactor', [closeFactor]);
    await send(unitroller, '_setPriceOracle', [priceOracle._address]);
    await send(unitroller, '_setRifiRate', [rifiRate]);
    await send(unitroller, 'setRifiAddress', [rifi._address]); // harness only

    return Object.assign(unitroller, { priceOracle, rifi });
  }

  if (kind == 'unitroller') {
    const unitroller = opts.unitroller || await deploy('Unitroller');
    const cointroller = await deploy('CointrollerHarness');
    const priceOracle = opts.priceOracle || await makePriceOracle(opts.priceOracleOpts);
    const closeFactor = etherMantissa(dfn(opts.closeFactor, .051));
    const liquidationIncentive = etherMantissa(1);
    const rifi = opts.rifi || await deploy('Rifi', [opts.rifiOwner || root]);
    const rifiRate = etherUnsigned(dfn(opts.rifiRate, 1e18));

    await send(unitroller, '_setPendingImplementation', [cointroller._address]);
    await send(cointroller, '_become', [unitroller._address]);
    mergeInterface(unitroller, cointroller);
    await send(unitroller, '_setLiquidationIncentive', [liquidationIncentive]);
    await send(unitroller, '_setCloseFactor', [closeFactor]);
    await send(unitroller, '_setPriceOracle', [priceOracle._address]);
    await send(unitroller, 'setRifiAddress', [rifi._address]); // harness only
    await send(unitroller, 'harnessSetRifiRate', [rifiRate]);

    return Object.assign(unitroller, { priceOracle, rifi });
  }
}

async function makeRToken(opts = {}) {
  const {
    root = saddle.account,
    kind = 'rbep20'
  } = opts || {};

  const cointroller = opts.cointroller || await makeCointroller(opts.cointrollerOpts);
  const interestRateModel = opts.interestRateModel || await makeInterestRateModel(opts.interestRateModelOpts);
  const exchangeRate = etherMantissa(dfn(opts.exchangeRate, 1));
  const decimals = etherUnsigned(dfn(opts.decimals, 8));
  const symbol = opts.symbol || (kind === 'rbinance' ? 'rETH' : 'rOMG');
  const name = opts.name || `RToken ${symbol}`;
  const admin = opts.admin || root;

  let rToken, underlying;
  let cDelegator, cDelegatee, cDaiMaker;

  switch (kind) {
    case 'rbinance':
      rToken = await deploy('RBinanceHarness',
        [
          cointroller._address,
          interestRateModel._address,
          exchangeRate,
          name,
          symbol,
          decimals,
          admin
        ])
      break;

    case 'cdai':
      cDaiMaker  = await deploy('RDaiDelegateMakerHarness');
      underlying = cDaiMaker;
      cDelegatee = await deploy('RDaiDelegateHarness');
      cDelegator = await deploy('RBep20Delegator',
        [
          underlying._address,
          cointroller._address,
          interestRateModel._address,
          exchangeRate,
          name,
          symbol,
          decimals,
          admin,
          cDelegatee._address,
          encodeParameters(['address', 'address'], [cDaiMaker._address, cDaiMaker._address])
        ]
      );
      rToken = await saddle.getContractAt('RDaiDelegateHarness', cDelegator._address);
      break;

    case 'rrifi':
      underlying = await deploy('Rifi', [opts.rifiHolder || root]);
      cDelegatee = await deploy('RRifiLikeDelegate');
      cDelegator = await deploy('RBep20Delegator',
        [
          underlying._address,
          cointroller._address,
          interestRateModel._address,
          exchangeRate,
          name,
          symbol,
          decimals,
          admin,
          cDelegatee._address,
          "0x0"
        ]
      );
      rToken = await saddle.getContractAt('RRifiLikeDelegate', cDelegator._address);
      break;

    case 'rbep20':
    default:
      underlying = opts.underlying || await makeToken(opts.underlyingOpts);
      cDelegatee = await deploy('RBep20DelegateHarness');
      cDelegator = await deploy('RBep20Delegator',
        [
          underlying._address,
          cointroller._address,
          interestRateModel._address,
          exchangeRate,
          name,
          symbol,
          decimals,
          admin,
          cDelegatee._address,
          "0x0"
        ]
      );
      rToken = await saddle.getContractAt('RBep20DelegateHarness', cDelegator._address);
      break;
  }

  if (opts.supportMarket) {
    await send(cointroller, '_supportMarket', [rToken._address]);
  }

  if (opts.addRifiMarket) {
    await send(cointroller, '_addRifiMarket', [rToken._address]);
  }

  if (opts.underlyingPrice) {
    const price = etherMantissa(opts.underlyingPrice);
    await send(cointroller.priceOracle, 'setUnderlyingPrice', [rToken._address, price]);
  }

  if (opts.collateralFactor) {
    const factor = etherMantissa(opts.collateralFactor);
    expect(await send(cointroller, '_setCollateralFactor', [rToken._address, factor])).toSucceed();
  }

  return Object.assign(rToken, { name, symbol, underlying, cointroller, interestRateModel });
}

async function makeInterestRateModel(opts = {}) {
  const {
    root = saddle.account,
    kind = 'harnessed'
  } = opts || {};

  if (kind == 'harnessed') {
    const borrowRate = etherMantissa(dfn(opts.borrowRate, 0));
    return await deploy('InterestRateModelHarness', [borrowRate]);
  }

  if (kind == 'false-marker') {
    const borrowRate = etherMantissa(dfn(opts.borrowRate, 0));
    return await deploy('FalseMarkerMethodInterestRateModel', [borrowRate]);
  }

  if (kind == 'white-paper') {
    const baseRate = etherMantissa(dfn(opts.baseRate, 0));
    const multiplier = etherMantissa(dfn(opts.multiplier, 1e-18));
    return await deploy('WhitePaperInterestRateModel', [baseRate, multiplier]);
  }

  if (kind == 'jump-rate') {
    const baseRate = etherMantissa(dfn(opts.baseRate, 0));
    const multiplier = etherMantissa(dfn(opts.multiplier, 1e-18));
    const jump = etherMantissa(dfn(opts.jump, 0));
    const kink = etherMantissa(dfn(opts.kink, 0));
    return await deploy('JumpRateModel', [baseRate, multiplier, jump, kink]);
  }
}

async function makePriceOracle(opts = {}) {
  const {
    root = saddle.account,
    kind = 'simple'
  } = opts || {};

  if (kind == 'simple') {
    return await deploy('SimplePriceOracle');
  }
}

async function makeToken(opts = {}) {
  const {
    root = saddle.account,
    kind = 'bep20'
  } = opts || {};

  if (kind == 'bep20') {
    const quantity = etherUnsigned(dfn(opts.quantity, 1e25));
    const decimals = etherUnsigned(dfn(opts.decimals, 18));
    const symbol = opts.symbol || 'OMG';
    const name = opts.name || `Bep20 ${symbol}`;
    return await deploy('BEP20Harness', [quantity, name, decimals, symbol]);
  }
}

async function balanceOf(token, account) {
  return etherUnsigned(await call(token, 'balanceOf', [account]));
}

async function totalSupply(token) {
  return etherUnsigned(await call(token, 'totalSupply'));
}

async function borrowSnapshot(rToken, account) {
  const { principal, interestIndex } = await call(rToken, 'harnessAccountBorrows', [account]);
  return { principal: etherUnsigned(principal), interestIndex: etherUnsigned(interestIndex) };
}

async function totalBorrows(rToken) {
  return etherUnsigned(await call(rToken, 'totalBorrows'));
}

async function totalReserves(rToken) {
  return etherUnsigned(await call(rToken, 'totalReserves'));
}

async function enterMarkets(rTokens, from) {
  return await send(rTokens[0].cointroller, 'enterMarkets', [rTokens.map(c => c._address)], { from });
}

async function fastForward(rToken, blocks = 5) {
  return await send(rToken, 'harnessFastForward', [blocks]);
}

async function setBalance(rToken, account, balance) {
  return await send(rToken, 'harnessSetBalance', [account, balance]);
}

async function setEtherBalance(rBinance, balance) {
  const current = await etherBalance(rBinance._address);
  const root = saddle.account;
  expect(await send(rBinance, 'harnessDoTransferOut', [root, current])).toSucceed();
  expect(await send(rBinance, 'harnessDoTransferIn', [root, balance], { value: balance })).toSucceed();
}

async function getBalances(rTokens, accounts) {
  const balances = {};
  for (let rToken of rTokens) {
    const cBalances = balances[rToken._address] = {};
    for (let account of accounts) {
      cBalances[account] = {
        eth: await etherBalance(account),
        cash: rToken.underlying && await balanceOf(rToken.underlying, account),
        tokens: await balanceOf(rToken, account),
        borrows: (await borrowSnapshot(rToken, account)).principal
      };
    }
    cBalances[rToken._address] = {
      eth: await etherBalance(rToken._address),
      cash: rToken.underlying && await balanceOf(rToken.underlying, rToken._address),
      tokens: await totalSupply(rToken),
      borrows: await totalBorrows(rToken),
      reserves: await totalReserves(rToken)
    };
  }
  return balances;
}

async function adjustBalances(balances, deltas) {
  for (let delta of deltas) {
    let rToken, account, key, diff;
    if (delta.length == 4) {
      ([rToken, account, key, diff] = delta);
    } else {
      ([rToken, key, diff] = delta);
      account = rToken._address;
    }

    balances[rToken._address][account][key] = new BigNumber(balances[rToken._address][account][key]).plus(diff);
  }
  return balances;
}


async function preApprove(rToken, from, amount, opts = {}) {
  if (dfn(opts.faucet, true)) {
    expect(await send(rToken.underlying, 'harnessSetBalance', [from, amount], { from })).toSucceed();
  }

  return send(rToken.underlying, 'approve', [rToken._address, amount], { from });
}

async function quickMint(rToken, minter, mintAmount, opts = {}) {
  // make sure to accrue interest
  await fastForward(rToken, 1);

  if (dfn(opts.approve, true)) {
    expect(await preApprove(rToken, minter, mintAmount, opts)).toSucceed();
  }
  if (dfn(opts.exchangeRate)) {
    expect(await send(rToken, 'harnessSetExchangeRate', [etherMantissa(opts.exchangeRate)])).toSucceed();
  }
  return send(rToken, 'mint', [mintAmount], { from: minter });
}


async function preSupply(rToken, account, tokens, opts = {}) {
  if (dfn(opts.total, true)) {
    expect(await send(rToken, 'harnessSetTotalSupply', [tokens])).toSucceed();
  }
  return send(rToken, 'harnessSetBalance', [account, tokens]);
}

async function quickRedeem(rToken, redeemer, redeemTokens, opts = {}) {
  await fastForward(rToken, 1);

  if (dfn(opts.supply, true)) {
    expect(await preSupply(rToken, redeemer, redeemTokens, opts)).toSucceed();
  }
  if (dfn(opts.exchangeRate)) {
    expect(await send(rToken, 'harnessSetExchangeRate', [etherMantissa(opts.exchangeRate)])).toSucceed();
  }
  return send(rToken, 'redeem', [redeemTokens], { from: redeemer });
}

async function quickRedeemUnderlying(rToken, redeemer, redeemAmount, opts = {}) {
  await fastForward(rToken, 1);

  if (dfn(opts.exchangeRate)) {
    expect(await send(rToken, 'harnessSetExchangeRate', [etherMantissa(opts.exchangeRate)])).toSucceed();
  }
  return send(rToken, 'redeemUnderlying', [redeemAmount], { from: redeemer });
}

async function setOraclePrice(rToken, price) {
  return send(rToken.cointroller.priceOracle, 'setUnderlyingPrice', [rToken._address, etherMantissa(price)]);
}

async function setBorrowRate(rToken, rate) {
  return send(rToken.interestRateModel, 'setBorrowRate', [etherMantissa(rate)]);
}

async function getBorrowRate(interestRateModel, cash, borrows, reserves) {
  return call(interestRateModel, 'getBorrowRate', [cash, borrows, reserves].map(etherUnsigned));
}

async function getSupplyRate(interestRateModel, cash, borrows, reserves, reserveFactor) {
  return call(interestRateModel, 'getSupplyRate', [cash, borrows, reserves, reserveFactor].map(etherUnsigned));
}

async function pretendBorrow(rToken, borrower, accountIndex, marketIndex, principalRaw, blockNumber = 2e7) {
  await send(rToken, 'harnessSetTotalBorrows', [etherUnsigned(principalRaw)]);
  await send(rToken, 'harnessSetAccountBorrows', [borrower, etherUnsigned(principalRaw), etherMantissa(accountIndex)]);
  await send(rToken, 'harnessSetBorrowIndex', [etherMantissa(marketIndex)]);
  await send(rToken, 'harnessSetAccrualBlockNumber', [etherUnsigned(blockNumber)]);
  await send(rToken, 'harnessSetBlockNumber', [etherUnsigned(blockNumber)]);
}

module.exports = {
  makeCointroller,
  makeRToken,
  makeInterestRateModel,
  makePriceOracle,
  makeToken,

  balanceOf,
  totalSupply,
  borrowSnapshot,
  totalBorrows,
  totalReserves,
  enterMarkets,
  fastForward,
  setBalance,
  setEtherBalance,
  getBalances,
  adjustBalances,

  preApprove,
  quickMint,

  preSupply,
  quickRedeem,
  quickRedeemUnderlying,

  setOraclePrice,
  setBorrowRate,
  getBorrowRate,
  getSupplyRate,
  pretendBorrow
};
