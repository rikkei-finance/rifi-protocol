let { loadAddress, loadConf } = require('./support/tokenConfig');

function printUsage() {
  console.log(`
usage: npx saddle script token:match address {tokenConfig}

This checks to see if the deployed byte-code matches this version of the Rifi Protocol.

example:

npx saddle -n rinkeby script token:match 0x19B674715cD20626415C738400FDd0d32D6809B6 '{
  "underlying": "0x577D296678535e4903D59A4C929B718e1D575e0A",
  "cointroller": "$Cointroller",
  "interestRateModel": "$Base200bps_Slope3000bps",
  "initialExchangeRateMantissa": "2.0e18",
  "name": "Rifi Kyber Network Crystal",
  "symbol": "rKNC",
  "decimals": "8",
  "admin": "$Timelock"
}'
  `);
}

(async function() {
  if (args.length !== 2) {
    return printUsage();
  }

  let address = loadAddress(args[0], addresses);
  let conf = loadConf(args[1], addresses);
  if (!conf) {
    return printUsage();
  }

  console.log(`Matching rToken at ${address} with ${JSON.stringify(conf)}`);

  let deployArgs = [conf.underlying, conf.cointroller, conf.interestRateModel, conf.initialExchangeRateMantissa.toString(), conf.name, conf.symbol, conf.decimals, conf.admin];

  await saddle.match(address, 'RBep20Immutable', deployArgs);

  return {
    ...conf,
    address
  };
})();
