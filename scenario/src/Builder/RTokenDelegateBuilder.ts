import { Event } from '../Event';
import { World } from '../World';
import { RBep20Delegate, RBep20DelegateScenario } from '../Contract/RBep20Delegate';
import { RToken } from '../Contract/RToken';
import { Invokation } from '../Invokation';
import { getStringV } from '../CoreValue';
import { AddressV, NumberV, StringV } from '../Value';
import { Arg, Fetcher, getFetcherValue } from '../Command';
import { storeAndSaveContract } from '../Networks';
import { getContract, getTestContract } from '../Contract';

const RDaiDelegateContract = getContract('RDaiDelegate');
const RDaiDelegateScenarioContract = getTestContract('RDaiDelegateScenario');
const RBep20DelegateContract = getContract('RBep20Delegate');
const RBep20DelegateScenarioContract = getTestContract('RBep20DelegateScenario');


export interface RTokenDelegateData {
  invokation: Invokation<RBep20Delegate>;
  name: string;
  contract: string;
  description?: string;
}

export async function buildRTokenDelegate(
  world: World,
  from: string,
  params: Event
): Promise<{ world: World; rTokenDelegate: RBep20Delegate; delegateData: RTokenDelegateData }> {
  const fetchers = [
    new Fetcher<{ name: StringV; }, RTokenDelegateData>(
      `
        #### RDaiDelegate

        * "RDaiDelegate name:<String>"
          * E.g. "RTokenDelegate Deploy RDaiDelegate rDaiDelegate"
      `,
      'RDaiDelegate',
      [
        new Arg('name', getStringV)
      ],
      async (
        world,
        { name }
      ) => {
        return {
          invokation: await RDaiDelegateContract.deploy<RBep20Delegate>(world, from, []),
          name: name.val,
          contract: 'RDaiDelegate',
          description: 'Standard CDai Delegate'
        };
      }
    ),

    new Fetcher<{ name: StringV; }, RTokenDelegateData>(
      `
        #### RDaiDelegateScenario

        * "RDaiDelegateScenario name:<String>" - A RDaiDelegate Scenario for local testing
          * E.g. "RTokenDelegate Deploy RDaiDelegateScenario rDaiDelegate"
      `,
      'RDaiDelegateScenario',
      [
        new Arg('name', getStringV)
      ],
      async (
        world,
        { name }
      ) => {
        return {
          invokation: await RDaiDelegateScenarioContract.deploy<RBep20DelegateScenario>(world, from, []),
          name: name.val,
          contract: 'RDaiDelegateScenario',
          description: 'Scenario CDai Delegate'
        };
      }
    ),

    new Fetcher<{ name: StringV; }, RTokenDelegateData>(
      `
        #### RBep20Delegate

        * "RBep20Delegate name:<String>"
          * E.g. "RTokenDelegate Deploy RBep20Delegate rDaiDelegate"
      `,
      'RBep20Delegate',
      [
        new Arg('name', getStringV)
      ],
      async (
        world,
        { name }
      ) => {
        return {
          invokation: await RBep20DelegateContract.deploy<RBep20Delegate>(world, from, []),
          name: name.val,
          contract: 'RBep20Delegate',
          description: 'Standard RBep20 Delegate'
        };
      }
    ),

    new Fetcher<{ name: StringV; }, RTokenDelegateData>(
      `
        #### RBep20DelegateScenario

        * "RBep20DelegateScenario name:<String>" - A RBep20Delegate Scenario for local testing
          * E.g. "RTokenDelegate Deploy RBep20DelegateScenario rDaiDelegate"
      `,
      'RBep20DelegateScenario',
      [
        new Arg('name', getStringV),
      ],
      async (
        world,
        { name }
      ) => {
        return {
          invokation: await RBep20DelegateScenarioContract.deploy<RBep20DelegateScenario>(world, from, []),
          name: name.val,
          contract: 'RBep20DelegateScenario',
          description: 'Scenario RBep20 Delegate'
        };
      }
    )
  ];

  let delegateData = await getFetcherValue<any, RTokenDelegateData>("DeployRToken", fetchers, world, params);
  let invokation = delegateData.invokation;
  delete delegateData.invokation;

  if (invokation.error) {
    throw invokation.error;
  }

  const rTokenDelegate = invokation.value!;

  world = await storeAndSaveContract(
    world,
    rTokenDelegate,
    delegateData.name,
    invokation,
    [
      {
        index: ['RTokenDelegate', delegateData.name],
        data: {
          address: rTokenDelegate._address,
          contract: delegateData.contract,
          description: delegateData.description
        }
      }
    ]
  );

  return { world, rTokenDelegate, delegateData };
}
