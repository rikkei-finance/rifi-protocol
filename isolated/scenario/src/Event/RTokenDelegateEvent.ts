import { Event } from '../Event';
import { addAction, describeUser, World } from '../World';
import { decodeCall, getPastEvents } from '../Contract';
import { RToken, RTokenScenario } from '../Contract/RToken';
import { RBep20Delegate } from '../Contract/RBep20Delegate'
import { invoke, Sendable } from '../Invokation';
import {
  getAddressV,
  getEventV,
  getExpNumberV,
  getNumberV,
  getStringV,
  getBoolV
} from '../CoreValue';
import {
  AddressV,
  BoolV,
  EventV,
  NothingV,
  NumberV,
  StringV
} from '../Value';
import { Arg, Command, View, processCommandEvent } from '../Command';
import { getRTokenDelegateData } from '../ContractLookup';
import { buildRTokenDelegate } from '../Builder/RTokenDelegateBuilder';
import { verify } from '../Verify';

async function genRTokenDelegate(world: World, from: string, event: Event): Promise<World> {
  let { world: nextWorld, rTokenDelegate, delegateData } = await buildRTokenDelegate(world, from, event);
  world = nextWorld;

  world = addAction(
    world,
    `Added rToken ${delegateData.name} (${delegateData.contract}) at address ${rTokenDelegate._address}`,
    delegateData.invokation
  );

  return world;
}

async function verifyRTokenDelegate(world: World, rTokenDelegate: RBep20Delegate, name: string, contract: string, apiKey: string): Promise<World> {
  if (world.isLocalNetwork()) {
    world.printer.printLine(`Politely declining to verify on local network: ${world.network}.`);
  } else {
    await verify(world, apiKey, name, contract, rTokenDelegate._address);
  }

  return world;
}

export function rTokenDelegateCommands() {
  return [
    new Command<{ rTokenDelegateParams: EventV }>(`
        #### Deploy

        * "RTokenDelegate Deploy ...rTokenDelegateParams" - Generates a new RTokenDelegate
          * E.g. "RTokenDelegate Deploy RDaiDelegate rDaiDelegate"
      `,
      "Deploy",
      [new Arg("rTokenDelegateParams", getEventV, { variadic: true })],
      (world, from, { rTokenDelegateParams }) => genRTokenDelegate(world, from, rTokenDelegateParams.val)
    ),
    new View<{ rTokenDelegateArg: StringV, apiKey: StringV }>(`
        #### Verify

        * "RTokenDelegate <rTokenDelegate> Verify apiKey:<String>" - Verifies RTokenDelegate in Etherscan
          * E.g. "RTokenDelegate rDaiDelegate Verify "myApiKey"
      `,
      "Verify",
      [
        new Arg("rTokenDelegateArg", getStringV),
        new Arg("apiKey", getStringV)
      ],
      async (world, { rTokenDelegateArg, apiKey }) => {
        let [rToken, name, data] = await getRTokenDelegateData(world, rTokenDelegateArg.val);

        return await verifyRTokenDelegate(world, rToken, name, data.get('contract')!, apiKey.val);
      },
      { namePos: 1 }
    ),
  ];
}

export async function processRTokenDelegateEvent(world: World, event: Event, from: string | null): Promise<World> {
  return await processCommandEvent<any>("RTokenDelegate", rTokenDelegateCommands(), world, event, from);
}
