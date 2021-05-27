import { Event } from '../Event';
import { addAction, World, describeUser } from '../World';
import { Rifi, RifiScenario } from '../Contract/Rifi';
import { buildRifi } from '../Builder/RifiBuilder';
import { invoke } from '../Invokation';
import {
  getAddressV,
  getEventV,
  getNumberV,
  getStringV,
} from '../CoreValue';
import {
  AddressV,
  EventV,
  NumberV,
  StringV
} from '../Value';
import { Arg, Command, processCommandEvent, View } from '../Command';
import { getRifi } from '../ContractLookup';
import { NoErrorReporter } from '../ErrorReporter';
import { verify } from '../Verify';
import { encodedNumber } from '../Encoding';

async function genRifi(world: World, from: string, params: Event): Promise<World> {
  let { world: nextWorld, rifi, tokenData } = await buildRifi(world, from, params);
  world = nextWorld;

  world = addAction(
    world,
    `Deployed Rifi (${rifi.name}) to address ${rifi._address}`,
    tokenData.invokation
  );

  return world;
}

async function verifyRifi(world: World, rifi: Rifi, apiKey: string, modelName: string, contractName: string): Promise<World> {
  if (world.isLocalNetwork()) {
    world.printer.printLine(`Politely declining to verify on local network: ${world.network}.`);
  } else {
    await verify(world, apiKey, modelName, contractName, rifi._address);
  }

  return world;
}

async function approve(world: World, from: string, rifi: Rifi, address: string, amount: NumberV): Promise<World> {
  let invokation = await invoke(world, rifi.methods.approve(address, amount.encode()), from, NoErrorReporter);

  world = addAction(
    world,
    `Approved Rifi token for ${from} of ${amount.show()}`,
    invokation
  );

  return world;
}

async function transfer(world: World, from: string, rifi: Rifi, address: string, amount: NumberV): Promise<World> {
  let invokation = await invoke(world, rifi.methods.transfer(address, amount.encode()), from, NoErrorReporter);

  world = addAction(
    world,
    `Transferred ${amount.show()} Rifi tokens from ${from} to ${address}`,
    invokation
  );

  return world;
}

async function transferFrom(world: World, from: string, rifi: Rifi, owner: string, spender: string, amount: NumberV): Promise<World> {
  let invokation = await invoke(world, rifi.methods.transferFrom(owner, spender, amount.encode()), from, NoErrorReporter);

  world = addAction(
    world,
    `"Transferred from" ${amount.show()} Rifi tokens from ${owner} to ${spender}`,
    invokation
  );

  return world;
}

async function transferScenario(world: World, from: string, rifi: RifiScenario, addresses: string[], amount: NumberV): Promise<World> {
  let invokation = await invoke(world, rifi.methods.transferScenario(addresses, amount.encode()), from, NoErrorReporter);

  world = addAction(
    world,
    `Transferred ${amount.show()} Rifi tokens from ${from} to ${addresses}`,
    invokation
  );

  return world;
}

async function transferFromScenario(world: World, from: string, rifi: RifiScenario, addresses: string[], amount: NumberV): Promise<World> {
  let invokation = await invoke(world, rifi.methods.transferFromScenario(addresses, amount.encode()), from, NoErrorReporter);

  world = addAction(
    world,
    `Transferred ${amount.show()} Rifi tokens from ${addresses} to ${from}`,
    invokation
  );

  return world;
}

async function delegate(world: World, from: string, rifi: Rifi, account: string): Promise<World> {
  let invokation = await invoke(world, rifi.methods.delegate(account), from, NoErrorReporter);

  world = addAction(
    world,
    `"Delegated from" ${from} to ${account}`,
    invokation
  );

  return world;
}

async function setBlockNumber(
  world: World,
  from: string,
  rifi: Rifi,
  blockNumber: NumberV
): Promise<World> {
  return addAction(
    world,
    `Set Rifi blockNumber to ${blockNumber.show()}`,
    await invoke(world, rifi.methods.setBlockNumber(blockNumber.encode()), from)
  );
}

export function rifiCommands() {
  return [
    new Command<{ params: EventV }>(`
        #### Deploy

        * "Deploy ...params" - Generates a new Rifi token
          * E.g. "Rifi Deploy"
      `,
      "Deploy",
      [
        new Arg("params", getEventV, { variadic: true })
      ],
      (world, from, { params }) => genRifi(world, from, params.val)
    ),

    new View<{ rifi: Rifi, apiKey: StringV, contractName: StringV }>(`
        #### Verify

        * "<Rifi> Verify apiKey:<String> contractName:<String>=Rifi" - Verifies Rifi token in Etherscan
          * E.g. "Rifi Verify "myApiKey"
      `,
      "Verify",
      [
        new Arg("rifi", getRifi, { implicit: true }),
        new Arg("apiKey", getStringV),
        new Arg("contractName", getStringV, { default: new StringV("Rifi") })
      ],
      async (world, { rifi, apiKey, contractName }) => {
        return await verifyRifi(world, rifi, apiKey.val, rifi.name, contractName.val)
      }
    ),

    new Command<{ rifi: Rifi, spender: AddressV, amount: NumberV }>(`
        #### Approve

        * "Rifi Approve spender:<Address> <Amount>" - Adds an allowance between user and address
          * E.g. "Rifi Approve Geoff 1.0e18"
      `,
      "Approve",
      [
        new Arg("rifi", getRifi, { implicit: true }),
        new Arg("spender", getAddressV),
        new Arg("amount", getNumberV)
      ],
      (world, from, { rifi, spender, amount }) => {
        return approve(world, from, rifi, spender.val, amount)
      }
    ),

    new Command<{ rifi: Rifi, recipient: AddressV, amount: NumberV }>(`
        #### Transfer

        * "Rifi Transfer recipient:<User> <Amount>" - Transfers a number of tokens via "transfer" as given user to recipient (this does not depend on allowance)
          * E.g. "Rifi Transfer Torrey 1.0e18"
      `,
      "Transfer",
      [
        new Arg("rifi", getRifi, { implicit: true }),
        new Arg("recipient", getAddressV),
        new Arg("amount", getNumberV)
      ],
      (world, from, { rifi, recipient, amount }) => transfer(world, from, rifi, recipient.val, amount)
    ),

    new Command<{ rifi: Rifi, owner: AddressV, spender: AddressV, amount: NumberV }>(`
        #### TransferFrom

        * "Rifi TransferFrom owner:<User> spender:<User> <Amount>" - Transfers a number of tokens via "transfeFrom" to recipient (this depends on allowances)
          * E.g. "Rifi TransferFrom Geoff Torrey 1.0e18"
      `,
      "TransferFrom",
      [
        new Arg("rifi", getRifi, { implicit: true }),
        new Arg("owner", getAddressV),
        new Arg("spender", getAddressV),
        new Arg("amount", getNumberV)
      ],
      (world, from, { rifi, owner, spender, amount }) => transferFrom(world, from, rifi, owner.val, spender.val, amount)
    ),

    new Command<{ rifi: RifiScenario, recipients: AddressV[], amount: NumberV }>(`
        #### TransferScenario

        * "Rifi TransferScenario recipients:<User[]> <Amount>" - Transfers a number of tokens via "transfer" to the given recipients (this does not depend on allowance)
          * E.g. "Rifi TransferScenario (Jared Torrey) 10"
      `,
      "TransferScenario",
      [
        new Arg("rifi", getRifi, { implicit: true }),
        new Arg("recipients", getAddressV, { mapped: true }),
        new Arg("amount", getNumberV)
      ],
      (world, from, { rifi, recipients, amount }) => transferScenario(world, from, rifi, recipients.map(recipient => recipient.val), amount)
    ),

    new Command<{ rifi: RifiScenario, froms: AddressV[], amount: NumberV }>(`
        #### TransferFromScenario

        * "Rifi TransferFromScenario froms:<User[]> <Amount>" - Transfers a number of tokens via "transferFrom" from the given users to msg.sender (this depends on allowance)
          * E.g. "Rifi TransferFromScenario (Jared Torrey) 10"
      `,
      "TransferFromScenario",
      [
        new Arg("rifi", getRifi, { implicit: true }),
        new Arg("froms", getAddressV, { mapped: true }),
        new Arg("amount", getNumberV)
      ],
      (world, from, { rifi, froms, amount }) => transferFromScenario(world, from, rifi, froms.map(_from => _from.val), amount)
    ),

    new Command<{ rifi: Rifi, account: AddressV }>(`
        #### Delegate

        * "Rifi Delegate account:<Address>" - Delegates votes to a given account
          * E.g. "Rifi Delegate Torrey"
      `,
      "Delegate",
      [
        new Arg("rifi", getRifi, { implicit: true }),
        new Arg("account", getAddressV),
      ],
      (world, from, { rifi, account }) => delegate(world, from, rifi, account.val)
    ),
    new Command<{ rifi: Rifi, blockNumber: NumberV }>(`
      #### SetBlockNumber

      * "SetBlockNumber <Seconds>" - Sets the blockTimestamp of the Rifi Harness
      * E.g. "Rifi SetBlockNumber 500"
      `,
        'SetBlockNumber',
        [new Arg('rifi', getRifi, { implicit: true }), new Arg('blockNumber', getNumberV)],
        (world, from, { rifi, blockNumber }) => setBlockNumber(world, from, rifi, blockNumber)
      )
  ];
}

export async function processRifiEvent(world: World, event: Event, from: string | null): Promise<World> {
  return await processCommandEvent<any>("Rifi", rifiCommands(), world, event, from);
}
