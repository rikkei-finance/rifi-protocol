import { Event } from '../Event';
import { addAction, describeUser, World } from '../World';
import { CointrollerImpl } from '../Contract/CointrollerImpl';
import { Unitroller } from '../Contract/Unitroller';
import { invoke } from '../Invokation';
import { getAddressV, getArrayV, getEventV, getExpNumberV, getNumberV, getStringV, getCoreValue } from '../CoreValue';
import { ArrayV, AddressV, EventV, NumberV, StringV } from '../Value';
import { Arg, Command, View, processCommandEvent } from '../Command';
import { buildCointrollerImpl } from '../Builder/CointrollerImplBuilder';
import { CointrollerErrorReporter } from '../ErrorReporter';
import { getCointrollerImpl, getCointrollerImplData, getUnitroller } from '../ContractLookup';
import { verify } from '../Verify';
import { mergeContractABI } from '../Networks';
import { encodedNumber } from '../Encoding';
import { encodeABI } from '../Utils';

async function genCointrollerImpl(world: World, from: string, params: Event): Promise<World> {
  let { world: nextWorld, cointrollerImpl, cointrollerImplData } = await buildCointrollerImpl(
    world,
    from,
    params
  );
  world = nextWorld;

  world = addAction(
    world,
    `Added Cointroller Implementation (${cointrollerImplData.description}) at address ${cointrollerImpl._address}`,
    cointrollerImplData.invokation
  );

  return world;
}

async function mergeABI(
  world: World,
  from: string,
  cointrollerImpl: CointrollerImpl,
  unitroller: Unitroller
): Promise<World> {
  if (!world.dryRun) {
    // Skip this specifically on dry runs since it's likely to crash due to a number of reasons
    world = await mergeContractABI(world, 'Cointroller', unitroller, unitroller.name, cointrollerImpl.name);
  }

  return world;
}

async function becomeG1(
  world: World,
  from: string,
  cointrollerImpl: CointrollerImpl,
  unitroller: Unitroller,
  priceOracleAddr: string,
  closeFactor: encodedNumber,
  maxAssets: encodedNumber
): Promise<World> {
  let invokation = await invoke(
    world,
    cointrollerImpl.methods._become(unitroller._address, priceOracleAddr, closeFactor, maxAssets, false),
    from,
    CointrollerErrorReporter
  );
  if (!world.dryRun) {
    // Skip this specifically on dry runs since it's likely to crash due to a number of reasons
    world = await mergeContractABI(world, 'Cointroller', unitroller, unitroller.name, cointrollerImpl.name);
  }

  world = addAction(
    world,
    `Become ${unitroller._address}'s Cointroller Impl with priceOracle=${priceOracleAddr},closeFactor=${closeFactor},maxAssets=${maxAssets}`,
    invokation
  );

  return world;
}

// Recome calls `become` on the G1 Cointroller, but passes a flag to not modify any of the initialization variables.
async function recome(
  world: World,
  from: string,
  cointrollerImpl: CointrollerImpl,
  unitroller: Unitroller
): Promise<World> {
  let invokation = await invoke(
    world,
    cointrollerImpl.methods._become(
      unitroller._address,
      '0x0000000000000000000000000000000000000000',
      0,
      0,
      true
    ),
    from,
    CointrollerErrorReporter
  );

  world = await mergeContractABI(world, 'Cointroller', unitroller, unitroller.name, cointrollerImpl.name);

  world = addAction(world, `Recome ${unitroller._address}'s Cointroller Impl`, invokation);

  return world;
}

async function becomeG2(
  world: World,
  from: string,
  cointrollerImpl: CointrollerImpl,
  unitroller: Unitroller
): Promise<World> {
  let invokation = await invoke(
    world,
    cointrollerImpl.methods._become(unitroller._address),
    from,
    CointrollerErrorReporter
  );

  if (!world.dryRun) {
    // Skip this specifically on dry runs since it's likely to crash due to a number of reasons
    world = await mergeContractABI(world, 'Cointroller', unitroller, unitroller.name, cointrollerImpl.name);
  }

  world = addAction(world, `Become ${unitroller._address}'s Cointroller Impl`, invokation);

  return world;
}

async function becomeG3(
  world: World,
  from: string,
  cointrollerImpl: CointrollerImpl,
  unitroller: Unitroller,
  rifiRate: encodedNumber,
  rifiMarkets: string[],
  otherMarkets: string[]
): Promise<World> {
  let invokation = await invoke(
    world,
    cointrollerImpl.methods._become(unitroller._address, rifiRate, rifiMarkets, otherMarkets),
    from,
    CointrollerErrorReporter
  );

  if (!world.dryRun) {
    // Skip this specifically on dry runs since it's likely to crash due to a number of reasons
    world = await mergeContractABI(world, 'Cointroller', unitroller, unitroller.name, cointrollerImpl.name);
  }

  world = addAction(world, `Become ${unitroller._address}'s Cointroller Impl`, invokation);

  return world;
}

async function becomeG4(
  world: World,
  from: string,
  cointrollerImpl: CointrollerImpl,
  unitroller: Unitroller
): Promise<World> {
  let invokation = await invoke(
    world,
    cointrollerImpl.methods._become(unitroller._address),
    from,
    CointrollerErrorReporter
  );

  if (!world.dryRun) {
    // Skip this specifically on dry runs since it's likely to crash due to a number of reasons
    world = await mergeContractABI(world, 'Cointroller', unitroller, unitroller.name, cointrollerImpl.name);
  }

  world = addAction(world, `Become ${unitroller._address}'s Cointroller Impl`, invokation);

  return world;
}

async function becomeG5(
  world: World,
  from: string,
  cointrollerImpl: CointrollerImpl,
  unitroller: Unitroller
): Promise<World> {
  let invokation = await invoke(
    world,
    cointrollerImpl.methods._become(unitroller._address),
    from,
    CointrollerErrorReporter
  );

  if (!world.dryRun) {
    // Skip this specifically on dry runs since it's likely to crash due to a number of reasons
    world = await mergeContractABI(world, 'Cointroller', unitroller, unitroller.name, cointrollerImpl.name);
  }

  world = addAction(world, `Become ${unitroller._address}'s Cointroller Impl`, invokation);

  return world;
}

async function becomeG6(
  world: World,
  from: string,
  cointrollerImpl: CointrollerImpl,
  unitroller: Unitroller
): Promise<World> {
  let invokation = await invoke(
    world,
    cointrollerImpl.methods._become(unitroller._address),
    from,
    CointrollerErrorReporter
  );

  if (!world.dryRun) {
    // Skip this specifically on dry runs since it's likely to crash due to a number of reasons
    world = await mergeContractABI(world, 'Cointroller', unitroller, unitroller.name, cointrollerImpl.name);
  }

  world = addAction(world, `Become ${unitroller._address}'s Cointroller Impl`, invokation);

  return world;
}

async function become(
  world: World,
  from: string,
  cointrollerImpl: CointrollerImpl,
  unitroller: Unitroller
): Promise<World> {
  let invokation = await invoke(
    world,
    cointrollerImpl.methods._become(unitroller._address),
    from,
    CointrollerErrorReporter
  );

  if (!world.dryRun) {
    // Skip this specifically on dry runs since it's likely to crash due to a number of reasons
    world = await mergeContractABI(world, 'Cointroller', unitroller, unitroller.name, cointrollerImpl.name);
  }

  world = addAction(world, `Become ${unitroller._address}'s Cointroller Impl`, invokation);

  return world;
}

async function verifyCointrollerImpl(
  world: World,
  cointrollerImpl: CointrollerImpl,
  name: string,
  contract: string,
  apiKey: string
): Promise<World> {
  if (world.isLocalNetwork()) {
    world.printer.printLine(`Politely declining to verify on local network: ${world.network}.`);
  } else {
    await verify(world, apiKey, name, contract, cointrollerImpl._address);
  }

  return world;
}

export function cointrollerImplCommands() {
  return [
    new Command<{ cointrollerImplParams: EventV }>(
      `
        #### Deploy

        * "CointrollerImpl Deploy ...cointrollerImplParams" - Generates a new Cointroller Implementation
          * E.g. "CointrollerImpl Deploy MyScen Scenario"
      `,
      'Deploy',
      [new Arg('cointrollerImplParams', getEventV, { variadic: true })],
      (world, from, { cointrollerImplParams }) => genCointrollerImpl(world, from, cointrollerImplParams.val)
    ),
    new View<{ cointrollerImplArg: StringV; apiKey: StringV }>(
      `
        #### Verify

        * "CointrollerImpl <Impl> Verify apiKey:<String>" - Verifies Cointroller Implemetation in Etherscan
          * E.g. "CointrollerImpl Verify "myApiKey"
      `,
      'Verify',
      [new Arg('cointrollerImplArg', getStringV), new Arg('apiKey', getStringV)],
      async (world, { cointrollerImplArg, apiKey }) => {
        let [cointrollerImpl, name, data] = await getCointrollerImplData(world, cointrollerImplArg.val);

        return await verifyCointrollerImpl(world, cointrollerImpl, name, data.get('contract')!, apiKey.val);
      },
      { namePos: 1 }
    ),
    new Command<{
      unitroller: Unitroller;
      cointrollerImpl: CointrollerImpl;
      priceOracle: AddressV;
      closeFactor: NumberV;
      maxAssets: NumberV;
    }>(
      `
        #### BecomeG1

        * "CointrollerImpl <Impl> BecomeG1 priceOracle:<Number> closeFactor:<Exp> maxAssets:<Number>" - Become the cointroller, if possible.
          * E.g. "CointrollerImpl MyImpl BecomeG1
      `,
      'BecomeG1',
      [
        new Arg('unitroller', getUnitroller, { implicit: true }),
        new Arg('cointrollerImpl', getCointrollerImpl),
        new Arg('priceOracle', getAddressV),
        new Arg('closeFactor', getExpNumberV),
        new Arg('maxAssets', getNumberV)
      ],
      (world, from, { unitroller, cointrollerImpl, priceOracle, closeFactor, maxAssets }) =>
        becomeG1(
          world,
          from,
          cointrollerImpl,
          unitroller,
          priceOracle.val,
          closeFactor.encode(),
          maxAssets.encode()
        ),
      { namePos: 1 }
    ),

    new Command<{
      unitroller: Unitroller;
      cointrollerImpl: CointrollerImpl;
    }>(
      `
        #### BecomeG2

        * "CointrollerImpl <Impl> BecomeG2" - Become the cointroller, if possible.
          * E.g. "CointrollerImpl MyImpl BecomeG2
      `,
      'BecomeG2',
      [
        new Arg('unitroller', getUnitroller, { implicit: true }),
        new Arg('cointrollerImpl', getCointrollerImpl)
      ],
      (world, from, { unitroller, cointrollerImpl }) => becomeG2(world, from, cointrollerImpl, unitroller),
      { namePos: 1 }
    ),

    new Command<{
      unitroller: Unitroller;
      cointrollerImpl: CointrollerImpl;
      rifiRate: NumberV;
      rifiMarkets: ArrayV<AddressV>;
      otherMarkets: ArrayV<AddressV>;
    }>(
      `
        #### BecomeG3

        * "CointrollerImpl <Impl> BecomeG3 <Rate> <RifiMarkets> <OtherMarkets>" - Become the cointroller, if possible.
          * E.g. "CointrollerImpl MyImpl BecomeG3 0.1e18 [rDAI, rETH, rUSDC]
      `,
      'BecomeG3',
      [
        new Arg('unitroller', getUnitroller, { implicit: true }),
        new Arg('cointrollerImpl', getCointrollerImpl),
        new Arg('rifiRate', getNumberV, { default: new NumberV(1e18) }),
        new Arg('rifiMarkets', getArrayV(getAddressV),  {default: new ArrayV([]) }),
        new Arg('otherMarkets', getArrayV(getAddressV), { default: new ArrayV([]) })
      ],
      (world, from, { unitroller, cointrollerImpl, rifiRate, rifiMarkets, otherMarkets }) => {
        return becomeG3(world, from, cointrollerImpl, unitroller, rifiRate.encode(), rifiMarkets.val.map(a => a.val), otherMarkets.val.map(a => a.val))
      },
      { namePos: 1 }
    ),

    new Command<{
      unitroller: Unitroller;
      cointrollerImpl: CointrollerImpl;
    }>(
      `
        #### BecomeG4
        * "CointrollerImpl <Impl> BecomeG4" - Become the cointroller, if possible.
          * E.g. "CointrollerImpl MyImpl BecomeG4
      `,
      'BecomeG4',
      [
        new Arg('unitroller', getUnitroller, { implicit: true }),
        new Arg('cointrollerImpl', getCointrollerImpl)
      ],
      (world, from, { unitroller, cointrollerImpl }) => {
        return becomeG4(world, from, cointrollerImpl, unitroller)
      },
      { namePos: 1 }
    ),

    new Command<{
      unitroller: Unitroller;
      cointrollerImpl: CointrollerImpl;
    }>(
      `
        #### BecomeG5
        * "CointrollerImpl <Impl> BecomeG5" - Become the cointroller, if possible.
          * E.g. "CointrollerImpl MyImpl BecomeG5
      `,
      'BecomeG5',
      [
        new Arg('unitroller', getUnitroller, { implicit: true }),
        new Arg('cointrollerImpl', getCointrollerImpl)
      ],
      (world, from, { unitroller, cointrollerImpl }) => {
        return becomeG5(world, from, cointrollerImpl, unitroller)
      },
      { namePos: 1 }
    ),

    new Command<{
      unitroller: Unitroller;
      cointrollerImpl: CointrollerImpl;
    }>(
      `
        #### BecomeG6
        * "CointrollerImpl <Impl> BecomeG6" - Become the cointroller, if possible.
          * E.g. "CointrollerImpl MyImpl BecomeG6
      `,
      'BecomeG6',
      [
        new Arg('unitroller', getUnitroller, { implicit: true }),
        new Arg('cointrollerImpl', getCointrollerImpl)
      ],
      (world, from, { unitroller, cointrollerImpl }) => {
        return becomeG6(world, from, cointrollerImpl, unitroller)
      },
      { namePos: 1 }
    ),

    new Command<{
      unitroller: Unitroller;
      cointrollerImpl: CointrollerImpl;
    }>(
      `
        #### Become

        * "CointrollerImpl <Impl> Become <Rate> <RifiMarkets> <OtherMarkets>" - Become the cointroller, if possible.
          * E.g. "CointrollerImpl MyImpl Become 0.1e18 [rDAI, rETH, rUSDC]
      `,
      'Become',
      [
        new Arg('unitroller', getUnitroller, { implicit: true }),
        new Arg('cointrollerImpl', getCointrollerImpl)
      ],
      (world, from, { unitroller, cointrollerImpl }) => {
        return become(world, from, cointrollerImpl, unitroller)
      },
      { namePos: 1 }
    ),

    new Command<{
      unitroller: Unitroller;
      cointrollerImpl: CointrollerImpl;
    }>(
      `
        #### MergeABI

        * "CointrollerImpl <Impl> MergeABI" - Merges the ABI, as if it was a become.
          * E.g. "CointrollerImpl MyImpl MergeABI
      `,
      'MergeABI',
      [
        new Arg('unitroller', getUnitroller, { implicit: true }),
        new Arg('cointrollerImpl', getCointrollerImpl)
      ],
      (world, from, { unitroller, cointrollerImpl }) => mergeABI(world, from, cointrollerImpl, unitroller),
      { namePos: 1 }
    ),
    new Command<{ unitroller: Unitroller; cointrollerImpl: CointrollerImpl }>(
      `
        #### Recome

        * "CointrollerImpl <Impl> Recome" - Recome the cointroller
          * E.g. "CointrollerImpl MyImpl Recome
      `,
      'Recome',
      [
        new Arg('unitroller', getUnitroller, { implicit: true }),
        new Arg('cointrollerImpl', getCointrollerImpl)
      ],
      (world, from, { unitroller, cointrollerImpl }) => recome(world, from, cointrollerImpl, unitroller),
      { namePos: 1 }
    )
  ];
}

export async function processCointrollerImplEvent(
  world: World,
  event: Event,
  from: string | null
): Promise<World> {
  return await processCommandEvent<any>('CointrollerImpl', cointrollerImplCommands(), world, event, from);
}
