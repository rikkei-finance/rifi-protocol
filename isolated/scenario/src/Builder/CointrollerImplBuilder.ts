import { Event } from '../Event';
import { addAction, World } from '../World';
import { CointrollerImpl } from '../Contract/CointrollerImpl';
import { Invokation, invoke } from '../Invokation';
import { getAddressV, getExpNumberV, getNumberV, getStringV } from '../CoreValue';
import { AddressV, NumberV, StringV } from '../Value';
import { Arg, Fetcher, getFetcherValue } from '../Command';
import { storeAndSaveContract } from '../Networks';
import { getContract, getTestContract } from '../Contract';

const CointrollerG1Contract = getContract('CointrollerG1');
const CointrollerScenarioG1Contract = getTestContract('CointrollerScenarioG1');

const CointrollerG2Contract = getContract('CointrollerG2');
const CointrollerScenarioG2Contract = getContract('CointrollerScenarioG2');

const CointrollerG3Contract = getContract('CointrollerG3');
const CointrollerScenarioG3Contract = getContract('CointrollerScenarioG3');

const CointrollerG4Contract = getContract('CointrollerG4');
const CointrollerScenarioG4Contract = getContract('CointrollerScenarioG4');

const CointrollerG5Contract = getContract('CointrollerG5');
const CointrollerScenarioG5Contract = getContract('CointrollerScenarioG5');

const CointrollerContract = getContract('Cointroller');
const CointrollerScenarioG6Contract = getContract('CointrollerScenarioG6');

const CointrollerScenarioContract = getTestContract('CointrollerScenario');
const CointrollerContract = getContract('Cointroller');

const CointrollerBorkedContract = getTestContract('CointrollerBorked');

export interface CointrollerImplData {
  invokation: Invokation<CointrollerImpl>;
  name: string;
  contract: string;
  description: string;
}

export async function buildCointrollerImpl(
  world: World,
  from: string,
  event: Event
): Promise<{ world: World; cointrollerImpl: CointrollerImpl; cointrollerImplData: CointrollerImplData }> {
  const fetchers = [
    new Fetcher<{ name: StringV }, CointrollerImplData>(
      `
        #### ScenarioG1

        * "ScenarioG1 name:<String>" - The Cointroller Scenario for local testing (G1)
          * E.g. "CointrollerImpl Deploy ScenarioG1 MyScen"
      `,
      'ScenarioG1',
      [new Arg('name', getStringV)],
      async (world, { name }) => ({
        invokation: await CointrollerScenarioG1Contract.deploy<CointrollerImpl>(world, from, []),
        name: name.val,
        contract: 'CointrollerScenarioG1',
        description: 'ScenarioG1 Cointroller Impl'
      })
    ),

    new Fetcher<{ name: StringV }, CointrollerImplData>(
      `
        #### ScenarioG2

        * "ScenarioG2 name:<String>" - The Cointroller Scenario for local testing (G2)
          * E.g. "CointrollerImpl Deploy ScenarioG2 MyScen"
      `,
      'ScenarioG2',
      [new Arg('name', getStringV)],
      async (world, { name }) => ({
        invokation: await CointrollerScenarioG2Contract.deploy<CointrollerImpl>(world, from, []),
        name: name.val,
        contract: 'CointrollerScenarioG2Contract',
        description: 'ScenarioG2 Cointroller Impl'
      })
    ),

    new Fetcher<{ name: StringV }, CointrollerImplData>(
      `
        #### ScenarioG3

        * "ScenarioG3 name:<String>" - The Cointroller Scenario for local testing (G3)
          * E.g. "CointrollerImpl Deploy ScenarioG3 MyScen"
      `,
      'ScenarioG3',
      [new Arg('name', getStringV)],
      async (world, { name }) => ({
        invokation: await CointrollerScenarioG3Contract.deploy<CointrollerImpl>(world, from, []),
        name: name.val,
        contract: 'CointrollerScenarioG3Contract',
        description: 'ScenarioG3 Cointroller Impl'
      })
    ),

    new Fetcher<{ name: StringV }, CointrollerImplData>(
      `
        #### ScenarioG4
        * "ScenarioG4 name:<String>" - The Cointroller Scenario for local testing (G4)
          * E.g. "CointrollerImpl Deploy ScenarioG4 MyScen"
      `,
      'ScenarioG4',
      [new Arg('name', getStringV)],
      async (world, { name }) => ({
        invokation: await CointrollerScenarioG4Contract.deploy<CointrollerImpl>(world, from, []),
        name: name.val,
        contract: 'CointrollerScenarioG4Contract',
        description: 'ScenarioG4 Cointroller Impl'
      })
    ),

    new Fetcher<{ name: StringV }, CointrollerImplData>(
      `
        #### ScenarioG5
        * "ScenarioG5 name:<String>" - The Cointroller Scenario for local testing (G5)
          * E.g. "CointrollerImpl Deploy ScenarioG5 MyScen"
      `,
      'ScenarioG5',
      [new Arg('name', getStringV)],
      async (world, { name }) => ({
        invokation: await CointrollerScenarioG5Contract.deploy<CointrollerImpl>(world, from, []),
        name: name.val,
        contract: 'CointrollerScenarioG5Contract',
        description: 'ScenarioG5 Cointroller Impl'
      })
    ),

    new Fetcher<{ name: StringV }, CointrollerImplData>(
      `
        #### ScenarioG6
        * "ScenarioG6 name:<String>" - The Cointroller Scenario for local testing (G6)
          * E.g. "CointrollerImpl Deploy ScenarioG6 MyScen"
      `,
      'ScenarioG6',
      [new Arg('name', getStringV)],
      async (world, { name }) => ({
        invokation: await CointrollerScenarioG6Contract.deploy<CointrollerImpl>(world, from, []),
        name: name.val,
        contract: 'CointrollerScenarioG6Contract',
        description: 'ScenarioG6 Cointroller Impl'
      })
    ),

    new Fetcher<{ name: StringV }, CointrollerImplData>(
      `
        #### Scenario

        * "Scenario name:<String>" - The Cointroller Scenario for local testing
          * E.g. "CointrollerImpl Deploy Scenario MyScen"
      `,
      'Scenario',
      [new Arg('name', getStringV)],
      async (world, { name }) => ({
        invokation: await CointrollerScenarioContract.deploy<CointrollerImpl>(world, from, []),
        name: name.val,
        contract: 'CointrollerScenario',
        description: 'Scenario Cointroller Impl'
      })
    ),

    new Fetcher<{ name: StringV }, CointrollerImplData>(
      `
        #### StandardG1

        * "StandardG1 name:<String>" - The standard generation 1 Cointroller contract
          * E.g. "Cointroller Deploy StandardG1 MyStandard"
      `,
      'StandardG1',
      [new Arg('name', getStringV)],
      async (world, { name }) => {
        return {
          invokation: await CointrollerG1Contract.deploy<CointrollerImpl>(world, from, []),
          name: name.val,
          contract: 'CointrollerG1',
          description: 'StandardG1 Cointroller Impl'
        };
      }
    ),

    new Fetcher<{ name: StringV }, CointrollerImplData>(
      `
        #### StandardG2

        * "StandardG2 name:<String>" - The standard generation 2 Cointroller contract
          * E.g. "Cointroller Deploy StandardG2 MyStandard"
      `,
      'StandardG2',
      [new Arg('name', getStringV)],
      async (world, { name }) => {
        return {
          invokation: await CointrollerG2Contract.deploy<CointrollerImpl>(world, from, []),
          name: name.val,
          contract: 'CointrollerG2',
          description: 'StandardG2 Cointroller Impl'
        };
      }
    ),

    new Fetcher<{ name: StringV }, CointrollerImplData>(
      `
        #### StandardG3

        * "StandardG3 name:<String>" - The standard generation 3 Cointroller contract
          * E.g. "Cointroller Deploy StandardG3 MyStandard"
      `,
      'StandardG3',
      [new Arg('name', getStringV)],
      async (world, { name }) => {
        return {
          invokation: await CointrollerG3Contract.deploy<CointrollerImpl>(world, from, []),
          name: name.val,
          contract: 'CointrollerG3',
          description: 'StandardG3 Cointroller Impl'
        };
      }
    ),

    new Fetcher<{ name: StringV }, CointrollerImplData>(
      `
        #### StandardG4

        * "StandardG4 name:<String>" - The standard generation 4 Cointroller contract
          * E.g. "Cointroller Deploy StandardG4 MyStandard"
      `,
      'StandardG4',
      [new Arg('name', getStringV)],
      async (world, { name }) => {
        return {
          invokation: await CointrollerG4Contract.deploy<CointrollerImpl>(world, from, []),
          name: name.val,
          contract: 'CointrollerG4',
          description: 'StandardG4 Cointroller Impl'
        };
      }
    ),

    new Fetcher<{ name: StringV }, CointrollerImplData>(
      `
        #### StandardG5
        * "StandardG5 name:<String>" - The standard generation 5 Cointroller contract
          * E.g. "Cointroller Deploy StandardG5 MyStandard"
      `,
      'StandardG5',
      [new Arg('name', getStringV)],
      async (world, { name }) => {
        return {
          invokation: await CointrollerG5Contract.deploy<CointrollerImpl>(world, from, []),
          name: name.val,
          contract: 'CointrollerG5',
          description: 'StandardG5 Cointroller Impl'
        };
      }
    ),

    new Fetcher<{ name: StringV }, CointrollerImplData>(
      `
        #### StandardG6
        * "StandardG6 name:<String>" - The standard generation 6 Cointroller contract
          * E.g. "Cointroller Deploy StandardG6 MyStandard"
      `,
      'StandardG6',
      [new Arg('name', getStringV)],
      async (world, { name }) => {
        return {
          invokation: await CointrollerContract.deploy<CointrollerImpl>(world, from, []),
          name: name.val,
          contract: 'Cointroller',
          description: 'StandardG6 Cointroller Impl'
        };
      }
    ),

    new Fetcher<{ name: StringV }, CointrollerImplData>(
      `
        #### Standard

        * "Standard name:<String>" - The standard Cointroller contract
          * E.g. "Cointroller Deploy Standard MyStandard"
      `,
      'Standard',
      [new Arg('name', getStringV)],
      async (world, { name }) => {
        return {
          invokation: await CointrollerContract.deploy<CointrollerImpl>(world, from, []),
          name: name.val,
          contract: 'Cointroller',
          description: 'Standard Cointroller Impl'
        };
      }
    ),

    new Fetcher<{ name: StringV }, CointrollerImplData>(
      `
        #### Borked

        * "Borked name:<String>" - A Borked Cointroller for testing
          * E.g. "CointrollerImpl Deploy Borked MyBork"
      `,
      'Borked',
      [new Arg('name', getStringV)],
      async (world, { name }) => ({
        invokation: await CointrollerBorkedContract.deploy<CointrollerImpl>(world, from, []),
        name: name.val,
        contract: 'CointrollerBorked',
        description: 'Borked Cointroller Impl'
      })
    ),
    new Fetcher<{ name: StringV }, CointrollerImplData>(
      `
        #### Default

        * "name:<String>" - The standard Cointroller contract
          * E.g. "CointrollerImpl Deploy MyDefault"
      `,
      'Default',
      [new Arg('name', getStringV)],
      async (world, { name }) => {
        if (world.isLocalNetwork()) {
          // Note: we're going to use the scenario contract as the standard deployment on local networks
          return {
            invokation: await CointrollerScenarioContract.deploy<CointrollerImpl>(world, from, []),
            name: name.val,
            contract: 'CointrollerScenario',
            description: 'Scenario Cointroller Impl'
          };
        } else {
          return {
            invokation: await CointrollerContract.deploy<CointrollerImpl>(world, from, []),
            name: name.val,
            contract: 'Cointroller',
            description: 'Standard Cointroller Impl'
          };
        }
      },
      { catchall: true }
    )
  ];

  let cointrollerImplData = await getFetcherValue<any, CointrollerImplData>(
    'DeployCointrollerImpl',
    fetchers,
    world,
    event
  );
  let invokation = cointrollerImplData.invokation;
  delete cointrollerImplData.invokation;

  if (invokation.error) {
    throw invokation.error;
  }
  const cointrollerImpl = invokation.value!;

  world = await storeAndSaveContract(world, cointrollerImpl, cointrollerImplData.name, invokation, [
    {
      index: ['Cointroller', cointrollerImplData.name],
      data: {
        address: cointrollerImpl._address,
        contract: cointrollerImplData.contract,
        description: cointrollerImplData.description
      }
    }
  ]);

  return { world, cointrollerImpl, cointrollerImplData };
}
