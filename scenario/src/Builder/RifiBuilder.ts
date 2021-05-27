import { Event } from '../Event';
import { World, addAction } from '../World';
import { Rifi, RifiScenario } from '../Contract/Rifi';
import { Invokation } from '../Invokation';
import { getAddressV } from '../CoreValue';
import { StringV, AddressV } from '../Value';
import { Arg, Fetcher, getFetcherValue } from '../Command';
import { storeAndSaveContract } from '../Networks';
import { getContract } from '../Contract';

const RifiContract = getContract('Rifi');
const RifiScenarioContract = getContract('RifiScenario');

export interface TokenData {
  invokation: Invokation<Rifi>;
  contract: string;
  address?: string;
  symbol: string;
  name: string;
  decimals?: number;
}

export async function buildRifi(
  world: World,
  from: string,
  params: Event
): Promise<{ world: World; rifi: Rifi; tokenData: TokenData }> {
  const fetchers = [
    new Fetcher<{ account: AddressV }, TokenData>(
      `
      #### Scenario

      * "Rifi Deploy Scenario account:<Address>" - Deploys Scenario Rifi Token
        * E.g. "Rifi Deploy Scenario Geoff"
    `,
      'Scenario',
      [
        new Arg("account", getAddressV),
      ],
      async (world, { account }) => {
        return {
          invokation: await RifiScenarioContract.deploy<RifiScenario>(world, from, [account.val]),
          contract: 'RifiScenario',
          symbol: 'RIFI',
          name: 'Rifi Governance Token',
          decimals: 18
        };
      }
    ),

    new Fetcher<{ account: AddressV }, TokenData>(
      `
      #### Rifi

      * "Rifi Deploy account:<Address>" - Deploys Rifi Token
        * E.g. "Rifi Deploy Geoff"
    `,
      'Rifi',
      [
        new Arg("account", getAddressV),
      ],
      async (world, { account }) => {
        if (world.isLocalNetwork()) {
          return {
            invokation: await RifiScenarioContract.deploy<RifiScenario>(world, from, [account.val]),
            contract: 'RifiScenario',
            symbol: 'RIFI',
            name: 'Rifi Governance Token',
            decimals: 18
          };
        } else {
          return {
            invokation: await RifiContract.deploy<Rifi>(world, from, [account.val]),
            contract: 'Rifi',
            symbol: 'RIFI',
            name: 'Rifi Governance Token',
            decimals: 18
          };
        }
      },
      { catchall: true }
    )
  ];

  let tokenData = await getFetcherValue<any, TokenData>("DeployRifi", fetchers, world, params);
  let invokation = tokenData.invokation;
  delete tokenData.invokation;

  if (invokation.error) {
    throw invokation.error;
  }

  const rifi = invokation.value!;
  tokenData.address = rifi._address;

  world = await storeAndSaveContract(
    world,
    rifi,
    'Rifi',
    invokation,
    [
      { index: ['Rifi'], data: tokenData },
      { index: ['Tokens', tokenData.symbol], data: tokenData }
    ]
  );

  tokenData.invokation = invokation;

  return { world, rifi, tokenData };
}
