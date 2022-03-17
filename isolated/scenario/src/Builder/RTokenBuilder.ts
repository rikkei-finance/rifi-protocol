import { Event } from '../Event';
import { World } from '../World';
import { RBep20Delegator, RBep20DelegatorScenario } from '../Contract/RBep20Delegator';
import { RToken } from '../Contract/RToken';
import { Invokation, invoke } from '../Invokation';
import { getAddressV, getExpNumberV, getNumberV, getStringV } from '../CoreValue';
import { AddressV, NumberV, StringV } from '../Value';
import { Arg, Fetcher, getFetcherValue } from '../Command';
import { storeAndSaveContract } from '../Networks';
import { getContract, getTestContract } from '../Contract';

const RBep20Contract = getContract('RBep20Immutable');
const RBep20Delegator = getContract('RBep20Delegator');
const RBep20DelegatorScenario = getTestContract('RBep20DelegatorScenario');
const RBinanceContract = getContract('RBinance');
const RBep20ScenarioContract = getTestContract('RBep20Scenario');
const RBinanceScenarioContract = getTestContract('RBinanceScenario');
const CEvilContract = getTestContract('CEvil');

export interface TokenData {
  invokation: Invokation<RToken>;
  name: string;
  symbol: string;
  decimals?: number;
  underlying?: string;
  address?: string;
  contract: string;
  initial_exchange_rate_mantissa?: string;
  admin?: string;
}

export async function buildRToken(
  world: World,
  from: string,
  params: Event
): Promise<{ world: World; rToken: RToken; tokenData: TokenData }> {
  const fetchers = [
    new Fetcher<
      {
        symbol: StringV;
        name: StringV;
        decimals: NumberV;
        underlying: AddressV;
        cointroller: AddressV;
        interestRateModel: AddressV;
        initialExchangeRate: NumberV;
        admin: AddressV;
        implementation: AddressV;
        becomeImplementationData: StringV;
      },
      TokenData
    >(
    `
      #### RBep20Delegator

      * "RBep20Delegator symbol:<String> name:<String> underlying:<Address> cointroller:<Address> interestRateModel:<Address> initialExchangeRate:<Number> decimals:<Number> admin: <Address> implementation:<Address> becomeImplementationData:<String>" - The real deal RToken
        * E.g. "RToken Deploy RBep20Delegator rDAI \"Rifi DAI\" (Bep20 DAI Address) (Cointroller Address) (InterestRateModel Address) 1.0 8 Geoff (RToken RDaiDelegate Address) "0x0123434anyByTes314535q" "
    `,
      'RBep20Delegator',
      [
        new Arg('symbol', getStringV),
        new Arg('name', getStringV),
        new Arg('underlying', getAddressV),
        new Arg('cointroller', getAddressV),
        new Arg('interestRateModel', getAddressV),
        new Arg('initialExchangeRate', getExpNumberV),
        new Arg('decimals', getNumberV),
        new Arg('admin', getAddressV),
        new Arg('implementation', getAddressV),
        new Arg('becomeImplementationData', getStringV)
      ],
      async (
        world,
        {
          symbol,
          name,
          underlying,
          cointroller,
          interestRateModel,
          initialExchangeRate,
          decimals,
          admin,
          implementation,
          becomeImplementationData
        }
      ) => {
        return {
          invokation: await RBep20Delegator.deploy<RBep20Delegator>(world, from, [
            underlying.val,
            cointroller.val,
            interestRateModel.val,
            initialExchangeRate.val,
            name.val,
            symbol.val,
            decimals.val,
            admin.val,
            implementation.val,
            becomeImplementationData.val
          ]),
          name: name.val,
          symbol: symbol.val,
          decimals: decimals.toNumber(),
          underlying: underlying.val,
          contract: 'RBep20Delegator',
          initial_exchange_rate_mantissa: initialExchangeRate.encode().toString(),
          admin: admin.val
        };
      }
    ),

    new Fetcher<
      {
        symbol: StringV;
        name: StringV;
        decimals: NumberV;
        underlying: AddressV;
        cointroller: AddressV;
        interestRateModel: AddressV;
        initialExchangeRate: NumberV;
        admin: AddressV;
        implementation: AddressV;
        becomeImplementationData: StringV;
      },
      TokenData
    >(
    `
      #### RBep20DelegatorScenario

      * "RBep20DelegatorScenario symbol:<String> name:<String> underlying:<Address> cointroller:<Address> interestRateModel:<Address> initialExchangeRate:<Number> decimals:<Number> admin: <Address> implementation:<Address> becomeImplementationData:<String>" - A RToken Scenario for local testing
        * E.g. "RToken Deploy RBep20DelegatorScenario rDAI \"Rifi DAI\" (Bep20 DAI Address) (Cointroller Address) (InterestRateModel Address) 1.0 8 Geoff (RToken RDaiDelegate Address) "0x0123434anyByTes314535q" "
    `,
      'RBep20DelegatorScenario',
      [
        new Arg('symbol', getStringV),
        new Arg('name', getStringV),
        new Arg('underlying', getAddressV),
        new Arg('cointroller', getAddressV),
        new Arg('interestRateModel', getAddressV),
        new Arg('initialExchangeRate', getExpNumberV),
        new Arg('decimals', getNumberV),
        new Arg('admin', getAddressV),
        new Arg('implementation', getAddressV),
        new Arg('becomeImplementationData', getStringV)
      ],
      async (
        world,
        {
          symbol,
          name,
          underlying,
          cointroller,
          interestRateModel,
          initialExchangeRate,
          decimals,
          admin,
          implementation,
          becomeImplementationData
        }
      ) => {
        return {
          invokation: await RBep20DelegatorScenario.deploy<RBep20DelegatorScenario>(world, from, [
            underlying.val,
            cointroller.val,
            interestRateModel.val,
            initialExchangeRate.val,
            name.val,
            symbol.val,
            decimals.val,
            admin.val,
            implementation.val,
            becomeImplementationData.val
          ]),
          name: name.val,
          symbol: symbol.val,
          decimals: decimals.toNumber(),
          underlying: underlying.val,
          contract: 'RBep20DelegatorScenario',
          initial_exchange_rate_mantissa: initialExchangeRate.encode().toString(),
          admin: admin.val
        };
      }
    ),

    new Fetcher<{symbol: StringV, name: StringV, decimals: NumberV, underlying: AddressV, cointroller: AddressV, interestRateModel: AddressV, initialExchangeRate: NumberV, admin: AddressV}, TokenData>(`
        #### Scenario

        * "Scenario symbol:<String> name:<String> underlying:<Address> cointroller:<Address> interestRateModel:<Address> initialExchangeRate:<Number> decimals:<Number> admin: <Address>" - A RToken Scenario for local testing
          * E.g. "RToken Deploy Scenario rZRX \"Rifi ZRX\" (Bep20 ZRX Address) (Cointroller Address) (InterestRateModel Address) 1.0 8"
      `,
      "Scenario",
      [
        new Arg("symbol", getStringV),
        new Arg("name", getStringV),
        new Arg("underlying", getAddressV),
        new Arg("cointroller", getAddressV),
        new Arg("interestRateModel", getAddressV),
        new Arg("initialExchangeRate", getExpNumberV),
        new Arg("decimals", getNumberV),
        new Arg("admin", getAddressV)
      ],
      async (world, {symbol, name, underlying, cointroller, interestRateModel, initialExchangeRate, decimals, admin}) => {
        return {
          invokation: await RBep20ScenarioContract.deploy<RToken>(world, from, [underlying.val, cointroller.val, interestRateModel.val, initialExchangeRate.val, name.val, symbol.val, decimals.val, admin.val]),
          name: name.val,
          symbol: symbol.val,
          decimals: decimals.toNumber(),
          underlying: underlying.val,
          contract: 'RBep20Scenario',
          initial_exchange_rate_mantissa: initialExchangeRate.encode().toString(),
          admin: admin.val
        };
      }
    ),

    new Fetcher<{symbol: StringV, name: StringV, decimals: NumberV, admin: AddressV, cointroller: AddressV, interestRateModel: AddressV, initialExchangeRate: NumberV}, TokenData>(`
        #### RBinanceScenario

        * "RBinanceScenario symbol:<String> name:<String> cointroller:<Address> interestRateModel:<Address> initialExchangeRate:<Number> decimals:<Number> admin: <Address>" - A RToken Scenario for local testing
          * E.g. "RToken Deploy RBinanceScenario rETH \"Rifi Ether\" (Cointroller Address) (InterestRateModel Address) 1.0 8"
      `,
      "RBinanceScenario",
      [
        new Arg("symbol", getStringV),
        new Arg("name", getStringV),
        new Arg("cointroller", getAddressV),
        new Arg("interestRateModel", getAddressV),
        new Arg("initialExchangeRate", getExpNumberV),
        new Arg("decimals", getNumberV),
        new Arg("admin", getAddressV)
      ],
      async (world, {symbol, name, cointroller, interestRateModel, initialExchangeRate, decimals, admin}) => {
        return {
          invokation: await RBinanceScenarioContract.deploy<RToken>(world, from, [name.val, symbol.val, decimals.val, admin.val, cointroller.val, interestRateModel.val, initialExchangeRate.val]),
          name: name.val,
          symbol: symbol.val,
          decimals: decimals.toNumber(),
          underlying: "",
          contract: 'RBinanceScenario',
          initial_exchange_rate_mantissa: initialExchangeRate.encode().toString(),
          admin: admin.val
        };
      }
    ),

    new Fetcher<{symbol: StringV, name: StringV, decimals: NumberV, admin: AddressV, cointroller: AddressV, interestRateModel: AddressV, initialExchangeRate: NumberV}, TokenData>(`
        #### RBinance

        * "RBinance symbol:<String> name:<String> cointroller:<Address> interestRateModel:<Address> initialExchangeRate:<Number> decimals:<Number> admin: <Address>" - A RToken Scenario for local testing
          * E.g. "RToken Deploy RBinance rETH \"Rifi Ether\" (Cointroller Address) (InterestRateModel Address) 1.0 8"
      `,
      "RBinance",
      [
        new Arg("symbol", getStringV),
        new Arg("name", getStringV),
        new Arg("cointroller", getAddressV),
        new Arg("interestRateModel", getAddressV),
        new Arg("initialExchangeRate", getExpNumberV),
        new Arg("decimals", getNumberV),
        new Arg("admin", getAddressV)
      ],
      async (world, {symbol, name, cointroller, interestRateModel, initialExchangeRate, decimals, admin}) => {
        return {
          invokation: await RBinanceContract.deploy<RToken>(world, from, [cointroller.val, interestRateModel.val, initialExchangeRate.val, name.val, symbol.val, decimals.val, admin.val]),
          name: name.val,
          symbol: symbol.val,
          decimals: decimals.toNumber(),
          underlying: "",
          contract: 'RBinance',
          initial_exchange_rate_mantissa: initialExchangeRate.encode().toString(),
          admin: admin.val
        };
      }
    ),

    new Fetcher<{symbol: StringV, name: StringV, decimals: NumberV, admin: AddressV, underlying: AddressV, cointroller: AddressV, interestRateModel: AddressV, initialExchangeRate: NumberV}, TokenData>(`
        #### RBep20

        * "RBep20 symbol:<String> name:<String> underlying:<Address> cointroller:<Address> interestRateModel:<Address> initialExchangeRate:<Number> decimals:<Number> admin: <Address>" - A official RToken contract
          * E.g. "RToken Deploy RBep20 rZRX \"Rifi ZRX\" (Bep20 ZRX Address) (Cointroller Address) (InterestRateModel Address) 1.0 8"
      `,
      "RBep20",
      [
        new Arg("symbol", getStringV),
        new Arg("name", getStringV),
        new Arg("underlying", getAddressV),
        new Arg("cointroller", getAddressV),
        new Arg("interestRateModel", getAddressV),
        new Arg("initialExchangeRate", getExpNumberV),
        new Arg("decimals", getNumberV),
        new Arg("admin", getAddressV)
      ],
      async (world, {symbol, name, underlying, cointroller, interestRateModel, initialExchangeRate, decimals, admin}) => {

        return {
          invokation: await RBep20Contract.deploy<RToken>(world, from, [underlying.val, cointroller.val, interestRateModel.val, initialExchangeRate.val, name.val, symbol.val, decimals.val, admin.val]),
          name: name.val,
          symbol: symbol.val,
          decimals: decimals.toNumber(),
          underlying: underlying.val,
          contract: 'RBep20',
          initial_exchange_rate_mantissa: initialExchangeRate.encode().toString(),
          admin: admin.val
        };
      }
    ),

    new Fetcher<{symbol: StringV, name: StringV, decimals: NumberV, admin: AddressV, underlying: AddressV, cointroller: AddressV, interestRateModel: AddressV, initialExchangeRate: NumberV}, TokenData>(`
        #### CEvil

        * "CEvil symbol:<String> name:<String> underlying:<Address> cointroller:<Address> interestRateModel:<Address> initialExchangeRate:<Number> decimals:<Number> admin: <Address>" - A malicious RToken contract
          * E.g. "RToken Deploy CEvil rEVL \"Rifi EVL\" (Bep20 ZRX Address) (Cointroller Address) (InterestRateModel Address) 1.0 8"
      `,
      "CEvil",
      [
        new Arg("symbol", getStringV),
        new Arg("name", getStringV),
        new Arg("underlying", getAddressV),
        new Arg("cointroller", getAddressV),
        new Arg("interestRateModel", getAddressV),
        new Arg("initialExchangeRate", getExpNumberV),
        new Arg("decimals", getNumberV),
        new Arg("admin", getAddressV)
      ],
      async (world, {symbol, name, underlying, cointroller, interestRateModel, initialExchangeRate, decimals, admin}) => {
        return {
          invokation: await CEvilContract.deploy<RToken>(world, from, [underlying.val, cointroller.val, interestRateModel.val, initialExchangeRate.val, name.val, symbol.val, decimals.val, admin.val]),
          name: name.val,
          symbol: symbol.val,
          decimals: decimals.toNumber(),
          underlying: underlying.val,
          contract: 'CEvil',
          initial_exchange_rate_mantissa: initialExchangeRate.encode().toString(),
          admin: admin.val
        };
      }
    ),

    new Fetcher<{symbol: StringV, name: StringV, decimals: NumberV, admin: AddressV, underlying: AddressV, cointroller: AddressV, interestRateModel: AddressV, initialExchangeRate: NumberV}, TokenData>(`
        #### Standard

        * "symbol:<String> name:<String> underlying:<Address> cointroller:<Address> interestRateModel:<Address> initialExchangeRate:<Number> decimals:<Number> admin: <Address>" - A official RToken contract
          * E.g. "RToken Deploy Standard rZRX \"Rifi ZRX\" (Bep20 ZRX Address) (Cointroller Address) (InterestRateModel Address) 1.0 8"
      `,
      "Standard",
      [
        new Arg("symbol", getStringV),
        new Arg("name", getStringV),
        new Arg("underlying", getAddressV),
        new Arg("cointroller", getAddressV),
        new Arg("interestRateModel", getAddressV),
        new Arg("initialExchangeRate", getExpNumberV),
        new Arg("decimals", getNumberV),
        new Arg("admin", getAddressV)
      ],
      async (world, {symbol, name, underlying, cointroller, interestRateModel, initialExchangeRate, decimals, admin}) => {
        // Note: we're going to use the scenario contract as the standard deployment on local networks
        if (world.isLocalNetwork()) {
          return {
            invokation: await RBep20ScenarioContract.deploy<RToken>(world, from, [underlying.val, cointroller.val, interestRateModel.val, initialExchangeRate.val, name.val, symbol.val, decimals.val, admin.val]),
            name: name.val,
            symbol: symbol.val,
            decimals: decimals.toNumber(),
            underlying: underlying.val,
            contract: 'RBep20Scenario',
            initial_exchange_rate_mantissa: initialExchangeRate.encode().toString(),
            admin: admin.val
          };
        } else {
          return {
            invokation: await RBep20Contract.deploy<RToken>(world, from, [underlying.val, cointroller.val, interestRateModel.val, initialExchangeRate.val, name.val, symbol.val, decimals.val, admin.val]),
            name: name.val,
            symbol: symbol.val,
            decimals: decimals.toNumber(),
            underlying: underlying.val,
            contract: 'RBep20Immutable',
            initial_exchange_rate_mantissa: initialExchangeRate.encode().toString(),
            admin: admin.val
          };
        }
      },
      {catchall: true}
    )
  ];

  let tokenData = await getFetcherValue<any, TokenData>("DeployRToken", fetchers, world, params);
  let invokation = tokenData.invokation;
  delete tokenData.invokation;

  if (invokation.error) {
    throw invokation.error;
  }

  const rToken = invokation.value!;
  tokenData.address = rToken._address;

  world = await storeAndSaveContract(
    world,
    rToken,
    tokenData.symbol,
    invokation,
    [
      { index: ['rTokens', tokenData.symbol], data: tokenData },
      { index: ['Tokens', tokenData.symbol], data: tokenData }
    ]
  );

  return {world, rToken, tokenData};
}
