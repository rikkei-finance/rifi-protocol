import {Event} from '../Event';
import {addAction, describeUser, World} from '../World';
import {decodeCall, getPastEvents} from '../Contract';
import {Cointroller} from '../Contract/Cointroller';
import {CointrollerImpl} from '../Contract/CointrollerImpl';
import {RToken} from '../Contract/RToken';
import {invoke} from '../Invokation';
import {
  getAddressV,
  getBoolV,
  getEventV,
  getExpNumberV,
  getNumberV,
  getPercentV,
  getStringV,
  getCoreValue
} from '../CoreValue';
import {
  AddressV,
  BoolV,
  EventV,
  NumberV,
  StringV
} from '../Value';
import {Arg, Command, View, processCommandEvent} from '../Command';
import {buildCointrollerImpl} from '../Builder/CointrollerImplBuilder';
import {CointrollerErrorReporter} from '../ErrorReporter';
import {getCointroller, getCointrollerImpl} from '../ContractLookup';
import {getLiquidity} from '../Value/CointrollerValue';
import {getRTokenV} from '../Value/RTokenValue';
import {encodedNumber} from '../Encoding';
import {encodeABI, rawValues} from "../Utils";

async function genCointroller(world: World, from: string, params: Event): Promise<World> {
  let {world: nextWorld, cointrollerImpl: cointroller, cointrollerImplData: cointrollerData} = await buildCointrollerImpl(world, from, params);
  world = nextWorld;

  world = addAction(
    world,
    `Added Cointroller (${cointrollerData.description}) at address ${cointroller._address}`,
    cointrollerData.invokation
  );

  return world;
};

async function setPaused(world: World, from: string, cointroller: Cointroller, actionName: string, isPaused: boolean): Promise<World> {
  const pauseMap = {
    "Mint": cointroller.methods._setMintPaused
  };

  if (!pauseMap[actionName]) {
    throw `Cannot find pause function for action "${actionName}"`;
  }

  let invokation = await invoke(world, cointroller[actionName]([isPaused]), from, CointrollerErrorReporter);

  world = addAction(
    world,
    `Cointroller: set paused for ${actionName} to ${isPaused}`,
    invokation
  );

  return world;
}

async function setMaxAssets(world: World, from: string, cointroller: Cointroller, numberOfAssets: NumberV): Promise<World> {
  let invokation = await invoke(world, cointroller.methods._setMaxAssets(numberOfAssets.encode()), from, CointrollerErrorReporter);

  world = addAction(
    world,
    `Set max assets to ${numberOfAssets.show()}`,
    invokation
  );

  return world;
}

async function setLiquidationIncentive(world: World, from: string, cointroller: Cointroller, liquidationIncentive: NumberV): Promise<World> {
  let invokation = await invoke(world, cointroller.methods._setLiquidationIncentive(liquidationIncentive.encode()), from, CointrollerErrorReporter);

  world = addAction(
    world,
    `Set liquidation incentive to ${liquidationIncentive.show()}`,
    invokation
  );

  return world;
}

async function supportMarket(world: World, from: string, cointroller: Cointroller, rToken: RToken): Promise<World> {
  if (world.dryRun) {
    // Skip this specifically on dry runs since it's likely to crash due to a number of reasons
    world.printer.printLine(`Dry run: Supporting market  \`${rToken._address}\``);
    return world;
  }

  let invokation = await invoke(world, cointroller.methods._supportMarket(rToken._address), from, CointrollerErrorReporter);

  world = addAction(
    world,
    `Supported market ${rToken.name}`,
    invokation
  );

  return world;
}

async function unlistMarket(world: World, from: string, cointroller: Cointroller, rToken: RToken): Promise<World> {
  let invokation = await invoke(world, cointroller.methods.unlist(rToken._address), from, CointrollerErrorReporter);

  world = addAction(
    world,
    `Unlisted market ${rToken.name}`,
    invokation
  );

  return world;
}

async function enterMarkets(world: World, from: string, cointroller: Cointroller, assets: string[]): Promise<World> {
  let invokation = await invoke(world, cointroller.methods.enterMarkets(assets), from, CointrollerErrorReporter);

  world = addAction(
    world,
    `Called enter assets ${assets} as ${describeUser(world, from)}`,
    invokation
  );

  return world;
}

async function exitMarket(world: World, from: string, cointroller: Cointroller, asset: string): Promise<World> {
  let invokation = await invoke(world, cointroller.methods.exitMarket(asset), from, CointrollerErrorReporter);

  world = addAction(
    world,
    `Called exit market ${asset} as ${describeUser(world, from)}`,
    invokation
  );

  return world;
}

async function setPriceOracle(world: World, from: string, cointroller: Cointroller, priceOracleAddr: string): Promise<World> {
  let invokation = await invoke(world, cointroller.methods._setPriceOracle(priceOracleAddr), from, CointrollerErrorReporter);

  world = addAction(
    world,
    `Set price oracle for to ${priceOracleAddr} as ${describeUser(world, from)}`,
    invokation
  );

  return world;
}

async function setCollateralFactor(world: World, from: string, cointroller: Cointroller, rToken: RToken, collateralFactor: NumberV): Promise<World> {
  let invokation = await invoke(world, cointroller.methods._setCollateralFactor(rToken._address, collateralFactor.encode()), from, CointrollerErrorReporter);

  world = addAction(
    world,
    `Set collateral factor for ${rToken.name} to ${collateralFactor.show()}`,
    invokation
  );

  return world;
}

async function setCloseFactor(world: World, from: string, cointroller: Cointroller, closeFactor: NumberV): Promise<World> {
  let invokation = await invoke(world, cointroller.methods._setCloseFactor(closeFactor.encode()), from, CointrollerErrorReporter);

  world = addAction(
    world,
    `Set close factor to ${closeFactor.show()}`,
    invokation
  );

  return world;
}

async function fastForward(world: World, from: string, cointroller: Cointroller, blocks: NumberV): Promise<World> {
  let invokation = await invoke(world, cointroller.methods.fastForward(blocks.encode()), from, CointrollerErrorReporter);

  world = addAction(
    world,
    `Fast forward ${blocks.show()} blocks to #${invokation.value}`,
    invokation
  );

  return world;
}

async function sendAny(world: World, from:string, cointroller: Cointroller, signature: string, callArgs: string[]): Promise<World> {
  const fnData = encodeABI(world, signature, callArgs);
  await world.web3.eth.sendTransaction({
      to: cointroller._address,
      data: fnData,
      from: from
    })
  return world;
}

async function addRifiMarkets(world: World, from: string, cointroller: Cointroller, rTokens: RToken[]): Promise<World> {
  let invokation = await invoke(world, cointroller.methods._addRifiMarkets(rTokens.map(c => c._address)), from, CointrollerErrorReporter);

  world = addAction(
    world,
    `Added RIFI markets ${rTokens.map(c => c.name)}`,
    invokation
  );

  return world;
}

async function dropRifiMarket(world: World, from: string, cointroller: Cointroller, rToken: RToken): Promise<World> {
  let invokation = await invoke(world, cointroller.methods._dropRifiMarket(rToken._address), from, CointrollerErrorReporter);

  world = addAction(
    world,
    `Drop RIFI market ${rToken.name}`,
    invokation
  );

  return world;
}

async function refreshRifiSpeeds(world: World, from: string, cointroller: Cointroller): Promise<World> {
  let invokation = await invoke(world, cointroller.methods.refreshRifiSpeeds(), from, CointrollerErrorReporter);

  world = addAction(
    world,
    `Refreshed RIFI speeds`,
    invokation
  );

  return world;
}

async function claimRifi(world: World, from: string, cointroller: Cointroller, holder: string): Promise<World> {
  let invokation = await invoke(world, cointroller.methods.claimRifi(holder), from, CointrollerErrorReporter);

  world = addAction(
    world,
    `Rifi claimed by ${holder}`,
    invokation
  );

  return world;
}

async function updateContributorRewards(world: World, from: string, cointroller: Cointroller, contributor: string): Promise<World> {
  let invokation = await invoke(world, cointroller.methods.updateContributorRewards(contributor), from, CointrollerErrorReporter);

  world = addAction(
    world,
    `Contributor rewards updated for ${contributor}`,
    invokation
  );

  return world;
}

async function grantRifi(world: World, from: string, cointroller: Cointroller, recipient: string, amount: NumberV): Promise<World> {
  let invokation = await invoke(world, cointroller.methods._grantRifi(recipient, amount.encode()), from, CointrollerErrorReporter);

  world = addAction(
    world,
    `${amount.show()} rifi granted to ${recipient}`,
    invokation
  );

  return world;
}

async function setRifiRate(world: World, from: string, cointroller: Cointroller, rate: NumberV): Promise<World> {
  let invokation = await invoke(world, cointroller.methods._setRifiRate(rate.encode()), from, CointrollerErrorReporter);

  world = addAction(
    world,
    `Rifi rate set to ${rate.show()}`,
    invokation
  );

  return world;
}

async function setRifiSpeed(world: World, from: string, cointroller: Cointroller, rToken: RToken, speed: NumberV): Promise<World> {
  let invokation = await invoke(world, cointroller.methods._setRifiSpeed(rToken._address, speed.encode()), from, CointrollerErrorReporter);

  world = addAction(
    world,
    `Rifi speed for market ${rToken._address} set to ${speed.show()}`,
    invokation
  );

  return world;
}

async function setContributorRifiSpeed(world: World, from: string, cointroller: Cointroller, contributor: string, speed: NumberV): Promise<World> {
  let invokation = await invoke(world, cointroller.methods._setContributorRifiSpeed(contributor, speed.encode()), from, CointrollerErrorReporter);

  world = addAction(
    world,
    `Rifi speed for contributor ${contributor} set to ${speed.show()}`,
    invokation
  );

  return world;
}

async function printLiquidity(world: World, cointroller: Cointroller): Promise<World> {
  let enterEvents = await getPastEvents(world, cointroller, 'StdCointroller', 'MarketEntered');
  let addresses = enterEvents.map((event) => event.returnValues['account']);
  let uniq = [...new Set(addresses)];

  world.printer.printLine("Liquidity:")

  const liquidityMap = await Promise.all(uniq.map(async (address) => {
    let userLiquidity = await getLiquidity(world, cointroller, address);

    return [address, userLiquidity.val];
  }));

  liquidityMap.forEach(([address, liquidity]) => {
    world.printer.printLine(`\t${world.settings.lookupAlias(address)}: ${liquidity / 1e18}e18`)
  });

  return world;
}

async function setPendingAdmin(world: World, from: string, cointroller: Cointroller, newPendingAdmin: string): Promise<World> {
  let invokation = await invoke(world, cointroller.methods._setPendingAdmin(newPendingAdmin), from, CointrollerErrorReporter);

  world = addAction(
    world,
    `Cointroller: ${describeUser(world, from)} sets pending admin to ${newPendingAdmin}`,
    invokation
  );

  return world;
}

async function acceptAdmin(world: World, from: string, cointroller: Cointroller): Promise<World> {
  let invokation = await invoke(world, cointroller.methods._acceptAdmin(), from, CointrollerErrorReporter);

  world = addAction(
    world,
    `Cointroller: ${describeUser(world, from)} accepts admin`,
    invokation
  );

  return world;
}

async function setPauseGuardian(world: World, from: string, cointroller: Cointroller, newPauseGuardian: string): Promise<World> {
  let invokation = await invoke(world, cointroller.methods._setPauseGuardian(newPauseGuardian), from, CointrollerErrorReporter);

  world = addAction(
    world,
    `Cointroller: ${describeUser(world, from)} sets pause guardian to ${newPauseGuardian}`,
    invokation
  );

  return world;
}

async function setGuardianPaused(world: World, from: string, cointroller: Cointroller, action: string, state: boolean): Promise<World> {
  let fun;
  switch(action){
    case "Transfer":
      fun = cointroller.methods._setTransferPaused
      break;
    case "Seize":
      fun = cointroller.methods._setSeizePaused
      break;
  }
  let invokation = await invoke(world, fun(state), from, CointrollerErrorReporter);

  world = addAction(
    world,
    `Cointroller: ${describeUser(world, from)} sets ${action} paused`,
    invokation
  );

  return world;
}

async function setGuardianMarketPaused(world: World, from: string, cointroller: Cointroller, rToken: RToken, action: string, state: boolean): Promise<World> {
  let fun;
  switch(action){
    case "Mint":
      fun = cointroller.methods._setMintPaused
      break;
    case "Borrow":
      fun = cointroller.methods._setBorrowPaused
      break;
  }
  let invokation = await invoke(world, fun(rToken._address, state), from, CointrollerErrorReporter);

  world = addAction(
    world,
    `Cointroller: ${describeUser(world, from)} sets ${action} paused`,
    invokation
  );

  return world;
}

async function setMarketBorrowCaps(world: World, from: string, cointroller: Cointroller, rTokens: RToken[], borrowCaps: NumberV[]): Promise<World> {
  let invokation = await invoke(world, cointroller.methods._setMarketBorrowCaps(rTokens.map(c => c._address), borrowCaps.map(c => c.encode())), from, CointrollerErrorReporter);

  world = addAction(
    world,
    `Borrow caps on ${rTokens} set to ${borrowCaps}`,
    invokation
  );

  return world;
}

async function setBorrowCapGuardian(world: World, from: string, cointroller: Cointroller, newBorrowCapGuardian: string): Promise<World> {
  let invokation = await invoke(world, cointroller.methods._setBorrowCapGuardian(newBorrowCapGuardian), from, CointrollerErrorReporter);

  world = addAction(
    world,
    `Cointroller: ${describeUser(world, from)} sets borrow cap guardian to ${newBorrowCapGuardian}`,
    invokation
  );

  return world;
}

export function cointrollerCommands() {
  return [
    new Command<{cointrollerParams: EventV}>(`
        #### Deploy

        * "Cointroller Deploy ...cointrollerParams" - Generates a new Cointroller (not as Impl)
          * E.g. "Cointroller Deploy YesNo"
      `,
      "Deploy",
      [new Arg("cointrollerParams", getEventV, {variadic: true})],
      (world, from, {cointrollerParams}) => genCointroller(world, from, cointrollerParams.val)
    ),
    new Command<{cointroller: Cointroller, action: StringV, isPaused: BoolV}>(`
        #### SetPaused

        * "Cointroller SetPaused <Action> <Bool>" - Pauses or unpaused given rToken function
          * E.g. "Cointroller SetPaused "Mint" True"
      `,
      "SetPaused",
      [
        new Arg("cointroller", getCointroller, {implicit: true}),
        new Arg("action", getStringV),
        new Arg("isPaused", getBoolV)
      ],
      (world, from, {cointroller, action, isPaused}) => setPaused(world, from, cointroller, action.val, isPaused.val)
    ),
    new Command<{cointroller: Cointroller, rToken: RToken}>(`
        #### SupportMarket

        * "Cointroller SupportMarket <RToken>" - Adds support in the Cointroller for the given rToken
          * E.g. "Cointroller SupportMarket rZRX"
      `,
      "SupportMarket",
      [
        new Arg("cointroller", getCointroller, {implicit: true}),
        new Arg("rToken", getRTokenV)
      ],
      (world, from, {cointroller, rToken}) => supportMarket(world, from, cointroller, rToken)
    ),
    new Command<{cointroller: Cointroller, rToken: RToken}>(`
        #### UnList

        * "Cointroller UnList <RToken>" - Mock unlists a given market in tests
          * E.g. "Cointroller UnList rZRX"
      `,
      "UnList",
      [
        new Arg("cointroller", getCointroller, {implicit: true}),
        new Arg("rToken", getRTokenV)
      ],
      (world, from, {cointroller, rToken}) => unlistMarket(world, from, cointroller, rToken)
    ),
    new Command<{cointroller: Cointroller, rTokens: RToken[]}>(`
        #### EnterMarkets

        * "Cointroller EnterMarkets (<RToken> ...)" - User enters the given markets
          * E.g. "Cointroller EnterMarkets (rZRX rETH)"
      `,
      "EnterMarkets",
      [
        new Arg("cointroller", getCointroller, {implicit: true}),
        new Arg("rTokens", getRTokenV, {mapped: true})
      ],
      (world, from, {cointroller, rTokens}) => enterMarkets(world, from, cointroller, rTokens.map((c) => c._address))
    ),
    new Command<{cointroller: Cointroller, rToken: RToken}>(`
        #### ExitMarket

        * "Cointroller ExitMarket <RToken>" - User exits the given markets
          * E.g. "Cointroller ExitMarket rZRX"
      `,
      "ExitMarket",
      [
        new Arg("cointroller", getCointroller, {implicit: true}),
        new Arg("rToken", getRTokenV)
      ],
      (world, from, {cointroller, rToken}) => exitMarket(world, from, cointroller, rToken._address)
    ),
    new Command<{cointroller: Cointroller, maxAssets: NumberV}>(`
        #### SetMaxAssets

        * "Cointroller SetMaxAssets <Number>" - Sets (or resets) the max allowed asset count
          * E.g. "Cointroller SetMaxAssets 4"
      `,
      "SetMaxAssets",
      [
        new Arg("cointroller", getCointroller, {implicit: true}),
        new Arg("maxAssets", getNumberV)
      ],
      (world, from, {cointroller, maxAssets}) => setMaxAssets(world, from, cointroller, maxAssets)
    ),
    new Command<{cointroller: Cointroller, liquidationIncentive: NumberV}>(`
        #### LiquidationIncentive

        * "Cointroller LiquidationIncentive <Number>" - Sets the liquidation incentive
          * E.g. "Cointroller LiquidationIncentive 1.1"
      `,
      "LiquidationIncentive",
      [
        new Arg("cointroller", getCointroller, {implicit: true}),
        new Arg("liquidationIncentive", getExpNumberV)
      ],
      (world, from, {cointroller, liquidationIncentive}) => setLiquidationIncentive(world, from, cointroller, liquidationIncentive)
    ),
    new Command<{cointroller: Cointroller, priceOracle: AddressV}>(`
        #### SetPriceOracle

        * "Cointroller SetPriceOracle oracle:<Address>" - Sets the price oracle address
          * E.g. "Cointroller SetPriceOracle 0x..."
      `,
      "SetPriceOracle",
      [
        new Arg("cointroller", getCointroller, {implicit: true}),
        new Arg("priceOracle", getAddressV)
      ],
      (world, from, {cointroller, priceOracle}) => setPriceOracle(world, from, cointroller, priceOracle.val)
    ),
    new Command<{cointroller: Cointroller, rToken: RToken, collateralFactor: NumberV}>(`
        #### SetCollateralFactor

        * "Cointroller SetCollateralFactor <RToken> <Number>" - Sets the collateral factor for given rToken to number
          * E.g. "Cointroller SetCollateralFactor rZRX 0.1"
      `,
      "SetCollateralFactor",
      [
        new Arg("cointroller", getCointroller, {implicit: true}),
        new Arg("rToken", getRTokenV),
        new Arg("collateralFactor", getExpNumberV)
      ],
      (world, from, {cointroller, rToken, collateralFactor}) => setCollateralFactor(world, from, cointroller, rToken, collateralFactor)
    ),
    new Command<{cointroller: Cointroller, closeFactor: NumberV}>(`
        #### SetCloseFactor

        * "Cointroller SetCloseFactor <Number>" - Sets the close factor to given percentage
          * E.g. "Cointroller SetCloseFactor 0.2"
      `,
      "SetCloseFactor",
      [
        new Arg("cointroller", getCointroller, {implicit: true}),
        new Arg("closeFactor", getPercentV)
      ],
      (world, from, {cointroller, closeFactor}) => setCloseFactor(world, from, cointroller, closeFactor)
    ),
    new Command<{cointroller: Cointroller, newPendingAdmin: AddressV}>(`
        #### SetPendingAdmin

        * "Cointroller SetPendingAdmin newPendingAdmin:<Address>" - Sets the pending admin for the Cointroller
          * E.g. "Cointroller SetPendingAdmin Geoff"
      `,
      "SetPendingAdmin",
      [
        new Arg("cointroller", getCointroller, {implicit: true}),
        new Arg("newPendingAdmin", getAddressV)
      ],
      (world, from, {cointroller, newPendingAdmin}) => setPendingAdmin(world, from, cointroller, newPendingAdmin.val)
    ),
    new Command<{cointroller: Cointroller}>(`
        #### AcceptAdmin

        * "Cointroller AcceptAdmin" - Accepts admin for the Cointroller
          * E.g. "From Geoff (Cointroller AcceptAdmin)"
      `,
      "AcceptAdmin",
      [
        new Arg("cointroller", getCointroller, {implicit: true}),
      ],
      (world, from, {cointroller}) => acceptAdmin(world, from, cointroller)
    ),
    new Command<{cointroller: Cointroller, newPauseGuardian: AddressV}>(`
        #### SetPauseGuardian

        * "Cointroller SetPauseGuardian newPauseGuardian:<Address>" - Sets the PauseGuardian for the Cointroller
          * E.g. "Cointroller SetPauseGuardian Geoff"
      `,
      "SetPauseGuardian",
      [
        new Arg("cointroller", getCointroller, {implicit: true}),
        new Arg("newPauseGuardian", getAddressV)
      ],
      (world, from, {cointroller, newPauseGuardian}) => setPauseGuardian(world, from, cointroller, newPauseGuardian.val)
    ),

    new Command<{cointroller: Cointroller, action: StringV, isPaused: BoolV}>(`
        #### SetGuardianPaused

        * "Cointroller SetGuardianPaused <Action> <Bool>" - Pauses or unpaused given rToken function
        * E.g. "Cointroller SetGuardianPaused "Transfer" True"
        `,
        "SetGuardianPaused",
        [
          new Arg("cointroller", getCointroller, {implicit: true}),
          new Arg("action", getStringV),
          new Arg("isPaused", getBoolV)
        ],
        (world, from, {cointroller, action, isPaused}) => setGuardianPaused(world, from, cointroller, action.val, isPaused.val)
    ),

    new Command<{cointroller: Cointroller, rToken: RToken, action: StringV, isPaused: BoolV}>(`
        #### SetGuardianMarketPaused

        * "Cointroller SetGuardianMarketPaused <RToken> <Action> <Bool>" - Pauses or unpaused given rToken function
        * E.g. "Cointroller SetGuardianMarketPaused rREP "Mint" True"
        `,
        "SetGuardianMarketPaused",
        [
          new Arg("cointroller", getCointroller, {implicit: true}),
          new Arg("rToken", getRTokenV),
          new Arg("action", getStringV),
          new Arg("isPaused", getBoolV)
        ],
        (world, from, {cointroller, rToken, action, isPaused}) => setGuardianMarketPaused(world, from, cointroller, rToken, action.val, isPaused.val)
    ),

    new Command<{cointroller: Cointroller, blocks: NumberV, _keyword: StringV}>(`
        #### FastForward

        * "FastForward n:<Number> Blocks" - Moves the block number forward "n" blocks. Note: in "RTokenScenario" and "CointrollerScenario" the current block number is mocked (starting at 100000). This is the only way for the protocol to see a higher block number (for accruing interest).
          * E.g. "Cointroller FastForward 5 Blocks" - Move block number forward 5 blocks.
      `,
      "FastForward",
      [
        new Arg("cointroller", getCointroller, {implicit: true}),
        new Arg("blocks", getNumberV),
        new Arg("_keyword", getStringV)
      ],
      (world, from, {cointroller, blocks}) => fastForward(world, from, cointroller, blocks)
    ),
    new View<{cointroller: Cointroller}>(`
        #### Liquidity

        * "Cointroller Liquidity" - Prints liquidity of all minters or borrowers
      `,
      "Liquidity",
      [
        new Arg("cointroller", getCointroller, {implicit: true}),
      ],
      (world, {cointroller}) => printLiquidity(world, cointroller)
    ),
    new View<{cointroller: Cointroller, input: StringV}>(`
        #### Decode

        * "Decode input:<String>" - Prints information about a call to a Cointroller contract
      `,
      "Decode",
      [
        new Arg("cointroller", getCointroller, {implicit: true}),
        new Arg("input", getStringV)

      ],
      (world, {cointroller, input}) => decodeCall(world, cointroller, input.val)
    ),

    new Command<{cointroller: Cointroller, signature: StringV, callArgs: StringV[]}>(`
      #### Send
      * Cointroller Send functionSignature:<String> callArgs[] - Sends any transaction to cointroller
      * E.g: Cointroller Send "setRifiAddress(address)" (Address RIFI)
      `,
      "Send",
      [
        new Arg("cointroller", getCointroller, {implicit: true}),
        new Arg("signature", getStringV),
        new Arg("callArgs", getCoreValue, {variadic: true, mapped: true})
      ],
      (world, from, {cointroller, signature, callArgs}) => sendAny(world, from, cointroller, signature.val, rawValues(callArgs))
    ),
    new Command<{cointroller: Cointroller, rTokens: RToken[]}>(`
      #### AddRifiMarkets

      * "Cointroller AddRifiMarkets (<Address> ...)" - Makes a market RIFI-enabled
      * E.g. "Cointroller AddRifiMarkets (rZRX rBAT)
      `,
      "AddRifiMarkets",
      [
        new Arg("cointroller", getCointroller, {implicit: true}),
        new Arg("rTokens", getRTokenV, {mapped: true})
      ],
      (world, from, {cointroller, rTokens}) => addRifiMarkets(world, from, cointroller, rTokens)
     ),
    new Command<{cointroller: Cointroller, rToken: RToken}>(`
      #### DropRifiMarket

      * "Cointroller DropRifiMarket <Address>" - Makes a market RIFI
      * E.g. "Cointroller DropRifiMarket rZRX
      `,
      "DropRifiMarket",
      [
        new Arg("cointroller", getCointroller, {implicit: true}),
        new Arg("rToken", getRTokenV)
      ],
      (world, from, {cointroller, rToken}) => dropRifiMarket(world, from, cointroller, rToken)
     ),

    new Command<{cointroller: Cointroller}>(`
      #### RefreshRifiSpeeds

      * "Cointroller RefreshRifiSpeeds" - Recalculates all the RIFI market speeds
      * E.g. "Cointroller RefreshRifiSpeeds
      `,
      "RefreshRifiSpeeds",
      [
        new Arg("cointroller", getCointroller, {implicit: true})
      ],
      (world, from, {cointroller}) => refreshRifiSpeeds(world, from, cointroller)
    ),
    new Command<{cointroller: Cointroller, holder: AddressV}>(`
      #### ClaimComp

      * "Cointroller ClaimRifi <holder>" - Claims comp
      * E.g. "Cointroller ClaimRifi Geoff
      `,
      "ClaimRifi",
      [
        new Arg("cointroller", getCointroller, {implicit: true}),
        new Arg("holder", getAddressV)
      ],
      (world, from, {cointroller, holder}) => claimRifi(world, from, cointroller, holder.val)
    ),
    new Command<{cointroller: Cointroller, contributor: AddressV}>(`
      #### UpdateContributorRewards

      * "Cointroller UpdateContributorRewards <contributor>" - Updates rewards for a contributor
      * E.g. "Cointroller UpdateContributorRewards Geoff
      `,
      "UpdateContributorRewards",
      [
        new Arg("cointroller", getCointroller, {implicit: true}),
        new Arg("contributor", getAddressV)
      ],
      (world, from, {cointroller, contributor}) => updateContributorRewards(world, from, cointroller, contributor.val)
    ),
    new Command<{cointroller: Cointroller, recipient: AddressV, amount: NumberV}>(`
      #### GrantComp

      * "Cointroller GrantRifi <recipient> <amount>" - Grants RIFI to a recipient
      * E.g. "Cointroller GrantRifi Geoff 1e18
      `,
      "GrantRifi",
      [
        new Arg("cointroller", getCointroller, {implicit: true}),
        new Arg("recipient", getAddressV),
        new Arg("amount", getNumberV)
      ],
      (world, from, {cointroller, recipient, amount}) => grantRifi(world, from, cointroller, recipient.val, amount)
    ),
    new Command<{cointroller: Cointroller, rate: NumberV}>(`
      #### SetRifiRate

      * "Cointroller SetRifiRate <rate>" - Sets RIFI rate
      * E.g. "Cointroller SetRifiRate 1e18
      `,
      "SetRifiRate",
      [
        new Arg("cointroller", getCointroller, {implicit: true}),
        new Arg("rate", getNumberV)
      ],
      (world, from, {cointroller, rate}) => setRifiRate(world, from, cointroller, rate)
    ),
    new Command<{cointroller: Cointroller, rToken: RToken, speed: NumberV}>(`
      #### SetRifiSpeed
      * "Cointroller SetRifiSpeed <rToken> <rate>" - Sets RIFI speed for market
      * E.g. "Cointroller SetRifiSpeed rToken 1000
      `,
      "SetRifiSpeed",
      [
        new Arg("cointroller", getCointroller, {implicit: true}),
        new Arg("rToken", getRTokenV),
        new Arg("speed", getNumberV)
      ],
      (world, from, {cointroller, rToken, speed}) => setRifiSpeed(world, from, cointroller, rToken, speed)
    ),
    new Command<{cointroller: Cointroller, contributor: AddressV, speed: NumberV}>(`
      #### SetContributorRifiSpeed
      * "Cointroller SetContributorRifiSpeed <contributor> <rate>" - Sets RIFI speed for contributor
      * E.g. "Cointroller SetContributorRifiSpeed contributor 1000
      `,
      "SetContributorRifiSpeed",
      [
        new Arg("cointroller", getCointroller, {implicit: true}),
        new Arg("contributor", getAddressV),
        new Arg("speed", getNumberV)
      ],
      (world, from, {cointroller, contributor, speed}) => setContributorRifiSpeed(world, from, cointroller, contributor.val, speed)
    ),
    new Command<{cointroller: Cointroller, rTokens: RToken[], borrowCaps: NumberV[]}>(`
      #### SetMarketBorrowCaps

      * "Cointroller SetMarketBorrowCaps (<RToken> ...) (<borrowCap> ...)" - Sets Market Borrow Caps
      * E.g "Cointroller SetMarketBorrowCaps (rZRX rUSDC) (10000.0e18, 1000.0e6)
      `,
      "SetMarketBorrowCaps",
      [
        new Arg("cointroller", getCointroller, {implicit: true}),
        new Arg("rTokens", getRTokenV, {mapped: true}),
        new Arg("borrowCaps", getNumberV, {mapped: true})
      ],
      (world, from, {cointroller,rTokens,borrowCaps}) => setMarketBorrowCaps(world, from, cointroller, rTokens, borrowCaps)
    ),
    new Command<{cointroller: Cointroller, newBorrowCapGuardian: AddressV}>(`
        #### SetBorrowCapGuardian

        * "Cointroller SetBorrowCapGuardian newBorrowCapGuardian:<Address>" - Sets the Borrow Cap Guardian for the Cointroller
          * E.g. "Cointroller SetBorrowCapGuardian Geoff"
      `,
      "SetBorrowCapGuardian",
      [
        new Arg("cointroller", getCointroller, {implicit: true}),
        new Arg("newBorrowCapGuardian", getAddressV)
      ],
      (world, from, {cointroller, newBorrowCapGuardian}) => setBorrowCapGuardian(world, from, cointroller, newBorrowCapGuardian.val)
    )
  ];
}

export async function processCointrollerEvent(world: World, event: Event, from: string | null): Promise<World> {
  return await processCommandEvent<any>("Cointroller", cointrollerCommands(), world, event, from);
}
