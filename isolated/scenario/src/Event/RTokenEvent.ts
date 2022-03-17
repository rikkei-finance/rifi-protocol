import { Event } from '../Event';
import { addAction, describeUser, World } from '../World';
import { decodeCall, getPastEvents } from '../Contract';
import { RToken, RTokenScenario } from '../Contract/RToken';
import { RBep20Delegate } from '../Contract/RBep20Delegate'
import { RBep20Delegator } from '../Contract/RBep20Delegator'
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
import { getContract } from '../Contract';
import { Arg, Command, View, processCommandEvent } from '../Command';
import { RTokenErrorReporter } from '../ErrorReporter';
import { getCointroller, getRTokenData } from '../ContractLookup';
import { getExpMantissa } from '../Encoding';
import { buildRToken } from '../Builder/RTokenBuilder';
import { verify } from '../Verify';
import { getLiquidity } from '../Value/CointrollerValue';
import { encodedNumber } from '../Encoding';
import { getRTokenV, getRBep20DelegatorV } from '../Value/RTokenValue';

function showTrxValue(world: World): string {
  return new NumberV(world.trxInvokationOpts.get('value')).show();
}

async function genRToken(world: World, from: string, event: Event): Promise<World> {
  let { world: nextWorld, rToken, tokenData } = await buildRToken(world, from, event);
  world = nextWorld;

  world = addAction(
    world,
    `Added rToken ${tokenData.name} (${tokenData.contract}<decimals=${tokenData.decimals}>) at address ${rToken._address}`,
    tokenData.invokation
  );

  return world;
}

async function accrueInterest(world: World, from: string, rToken: RToken): Promise<World> {
  let invokation = await invoke(world, rToken.methods.accrueInterest(), from, RTokenErrorReporter);

  world = addAction(
    world,
    `RToken ${rToken.name}: Interest accrued`,
    invokation
  );

  return world;
}

async function mint(world: World, from: string, rToken: RToken, amount: NumberV | NothingV): Promise<World> {
  let invokation;
  let showAmount;

  if (amount instanceof NumberV) {
    showAmount = amount.show();
    invokation = await invoke(world, rToken.methods.mint(amount.encode()), from, RTokenErrorReporter);
  } else {
    showAmount = showTrxValue(world);
    invokation = await invoke(world, rToken.methods.mint(), from, RTokenErrorReporter);
  }

  world = addAction(
    world,
    `RToken ${rToken.name}: ${describeUser(world, from)} mints ${showAmount}`,
    invokation
  );

  return world;
}

async function redeem(world: World, from: string, rToken: RToken, tokens: NumberV): Promise<World> {
  let invokation = await invoke(world, rToken.methods.redeem(tokens.encode()), from, RTokenErrorReporter);

  world = addAction(
    world,
    `RToken ${rToken.name}: ${describeUser(world, from)} redeems ${tokens.show()} tokens`,
    invokation
  );

  return world;
}

async function redeemUnderlying(world: World, from: string, rToken: RToken, amount: NumberV): Promise<World> {
  let invokation = await invoke(world, rToken.methods.redeemUnderlying(amount.encode()), from, RTokenErrorReporter);

  world = addAction(
    world,
    `RToken ${rToken.name}: ${describeUser(world, from)} redeems ${amount.show()} underlying`,
    invokation
  );

  return world;
}

async function borrow(world: World, from: string, rToken: RToken, amount: NumberV): Promise<World> {
  let invokation = await invoke(world, rToken.methods.borrow(amount.encode()), from, RTokenErrorReporter);

  world = addAction(
    world,
    `RToken ${rToken.name}: ${describeUser(world, from)} borrows ${amount.show()}`,
    invokation
  );

  return world;
}

async function repayBorrow(world: World, from: string, rToken: RToken, amount: NumberV | NothingV): Promise<World> {
  let invokation;
  let showAmount;

  if (amount instanceof NumberV) {
    showAmount = amount.show();
    invokation = await invoke(world, rToken.methods.repayBorrow(amount.encode()), from, RTokenErrorReporter);
  } else {
    showAmount = showTrxValue(world);
    invokation = await invoke(world, rToken.methods.repayBorrow(), from, RTokenErrorReporter);
  }

  world = addAction(
    world,
    `RToken ${rToken.name}: ${describeUser(world, from)} repays ${showAmount} of borrow`,
    invokation
  );

  return world;
}

async function repayBorrowBehalf(world: World, from: string, behalf: string, rToken: RToken, amount: NumberV | NothingV): Promise<World> {
  let invokation;
  let showAmount;

  if (amount instanceof NumberV) {
    showAmount = amount.show();
    invokation = await invoke(world, rToken.methods.repayBorrowBehalf(behalf, amount.encode()), from, RTokenErrorReporter);
  } else {
    showAmount = showTrxValue(world);
    invokation = await invoke(world, rToken.methods.repayBorrowBehalf(behalf), from, RTokenErrorReporter);
  }

  world = addAction(
    world,
    `RToken ${rToken.name}: ${describeUser(world, from)} repays ${showAmount} of borrow on behalf of ${describeUser(world, behalf)}`,
    invokation
  );

  return world;
}

async function liquidateBorrow(world: World, from: string, rToken: RToken, borrower: string, collateral: RToken, repayAmount: NumberV | NothingV): Promise<World> {
  let invokation;
  let showAmount;

  if (repayAmount instanceof NumberV) {
    showAmount = repayAmount.show();
    invokation = await invoke(world, rToken.methods.liquidateBorrow(borrower, repayAmount.encode(), collateral._address), from, RTokenErrorReporter);
  } else {
    showAmount = showTrxValue(world);
    invokation = await invoke(world, rToken.methods.liquidateBorrow(borrower, collateral._address), from, RTokenErrorReporter);
  }

  world = addAction(
    world,
    `RToken ${rToken.name}: ${describeUser(world, from)} liquidates ${showAmount} from of ${describeUser(world, borrower)}, seizing ${collateral.name}.`,
    invokation
  );

  return world;
}

async function seize(world: World, from: string, rToken: RToken, liquidator: string, borrower: string, seizeTokens: NumberV): Promise<World> {
  let invokation = await invoke(world, rToken.methods.seize(liquidator, borrower, seizeTokens.encode()), from, RTokenErrorReporter);

  world = addAction(
    world,
    `RToken ${rToken.name}: ${describeUser(world, from)} initiates seizing ${seizeTokens.show()} to ${describeUser(world, liquidator)} from ${describeUser(world, borrower)}.`,
    invokation
  );

  return world;
}

async function evilSeize(world: World, from: string, rToken: RToken, treasure: RToken, liquidator: string, borrower: string, seizeTokens: NumberV): Promise<World> {
  let invokation = await invoke(world, rToken.methods.evilSeize(treasure._address, liquidator, borrower, seizeTokens.encode()), from, RTokenErrorReporter);

  world = addAction(
    world,
    `RToken ${rToken.name}: ${describeUser(world, from)} initiates illegal seizing ${seizeTokens.show()} to ${describeUser(world, liquidator)} from ${describeUser(world, borrower)}.`,
    invokation
  );

  return world;
}

async function setPendingAdmin(world: World, from: string, rToken: RToken, newPendingAdmin: string): Promise<World> {
  let invokation = await invoke(world, rToken.methods._setPendingAdmin(newPendingAdmin), from, RTokenErrorReporter);

  world = addAction(
    world,
    `RToken ${rToken.name}: ${describeUser(world, from)} sets pending admin to ${newPendingAdmin}`,
    invokation
  );

  return world;
}

async function acceptAdmin(world: World, from: string, rToken: RToken): Promise<World> {
  let invokation = await invoke(world, rToken.methods._acceptAdmin(), from, RTokenErrorReporter);

  world = addAction(
    world,
    `RToken ${rToken.name}: ${describeUser(world, from)} accepts admin`,
    invokation
  );

  return world;
}

async function addReserves(world: World, from: string, rToken: RToken, amount: NumberV): Promise<World> {
  let invokation = await invoke(world, rToken.methods._addReserves(amount.encode()), from, RTokenErrorReporter);

  world = addAction(
    world,
    `RToken ${rToken.name}: ${describeUser(world, from)} adds to reserves by ${amount.show()}`,
    invokation
  );

  return world;
}

async function reduceReserves(world: World, from: string, rToken: RToken, amount: NumberV): Promise<World> {
  let invokation = await invoke(world, rToken.methods._reduceReserves(amount.encode()), from, RTokenErrorReporter);

  world = addAction(
    world,
    `RToken ${rToken.name}: ${describeUser(world, from)} reduces reserves by ${amount.show()}`,
    invokation
  );

  return world;
}

async function setReserveFactor(world: World, from: string, rToken: RToken, reserveFactor: NumberV): Promise<World> {
  let invokation = await invoke(world, rToken.methods._setReserveFactor(reserveFactor.encode()), from, RTokenErrorReporter);

  world = addAction(
    world,
    `RToken ${rToken.name}: ${describeUser(world, from)} sets reserve factor to ${reserveFactor.show()}`,
    invokation
  );

  return world;
}

async function setInterestRateModel(world: World, from: string, rToken: RToken, interestRateModel: string): Promise<World> {
  let invokation = await invoke(world, rToken.methods._setInterestRateModel(interestRateModel), from, RTokenErrorReporter);

  world = addAction(
    world,
    `Set interest rate for ${rToken.name} to ${interestRateModel} as ${describeUser(world, from)}`,
    invokation
  );

  return world;
}

async function setCointroller(world: World, from: string, rToken: RToken, cointroller: string): Promise<World> {
  let invokation = await invoke(world, rToken.methods._setCointroller(cointroller), from, RTokenErrorReporter);

  world = addAction(
    world,
    `Set cointroller for ${rToken.name} to ${cointroller} as ${describeUser(world, from)}`,
    invokation
  );

  return world;
}

async function sweepToken(world: World, from: string, rToken: RToken, token: string): Promise<World> {
  let invokation = await invoke(world, rToken.methods.sweepToken(token), from, RTokenErrorReporter);

  world = addAction(
    world,
    `Swept BEP-20 at ${token} to admin`,
    invokation
  );

  return world;
}

async function becomeImplementation(
  world: World,
  from: string,
  rToken: RToken,
  becomeImplementationData: string
): Promise<World> {

  const rBep20Delegate = getContract('RBep20Delegate');
  const rBep20DelegateContract = await rBep20Delegate.at<RBep20Delegate>(world, rToken._address);

  let invokation = await invoke(
    world,
    rBep20DelegateContract.methods._becomeImplementation(becomeImplementationData),
    from,
    RTokenErrorReporter
  );

  world = addAction(
    world,
    `RToken ${rToken.name}: ${describeUser(
      world,
      from
    )} initiates _becomeImplementation with data:${becomeImplementationData}.`,
    invokation
  );

  return world;
}

async function resignImplementation(
  world: World,
  from: string,
  rToken: RToken,
): Promise<World> {

  const rBep20Delegate = getContract('RBep20Delegate');
  const rBep20DelegateContract = await rBep20Delegate.at<RBep20Delegate>(world, rToken._address);

  let invokation = await invoke(
    world,
    rBep20DelegateContract.methods._resignImplementation(),
    from,
    RTokenErrorReporter
  );

  world = addAction(
    world,
    `RToken ${rToken.name}: ${describeUser(
      world,
      from
    )} initiates _resignImplementation.`,
    invokation
  );

  return world;
}

async function setImplementation(
  world: World,
  from: string,
  rToken: RBep20Delegator,
  implementation: string,
  allowResign: boolean,
  becomeImplementationData: string
): Promise<World> {
  let invokation = await invoke(
    world,
    rToken.methods._setImplementation(
      implementation,
      allowResign,
      becomeImplementationData
    ),
    from,
    RTokenErrorReporter
  );

  world = addAction(
    world,
    `RToken ${rToken.name}: ${describeUser(
      world,
      from
    )} initiates setImplementation with implementation:${implementation} allowResign:${allowResign} data:${becomeImplementationData}.`,
    invokation
  );

  return world;
}

async function donate(world: World, from: string, rToken: RToken): Promise<World> {
  let invokation = await invoke(world, rToken.methods.donate(), from, RTokenErrorReporter);

  world = addAction(
    world,
    `Donate for ${rToken.name} as ${describeUser(world, from)} with value ${showTrxValue(world)}`,
    invokation
  );

  return world;
}

async function setRTokenMock(world: World, from: string, rToken: RTokenScenario, mock: string, value: NumberV): Promise<World> {
  let mockMethod: (number) => Sendable<void>;

  switch (mock.toLowerCase()) {
    case "totalborrows":
      mockMethod = rToken.methods.setTotalBorrows;
      break;
    case "totalreserves":
      mockMethod = rToken.methods.setTotalReserves;
      break;
    default:
      throw new Error(`Mock "${mock}" not defined for rToken`);
  }

  let invokation = await invoke(world, mockMethod(value.encode()), from);

  world = addAction(
    world,
    `Mocked ${mock}=${value.show()} for ${rToken.name}`,
    invokation
  );

  return world;
}

async function verifyRToken(world: World, rToken: RToken, name: string, contract: string, apiKey: string): Promise<World> {
  if (world.isLocalNetwork()) {
    world.printer.printLine(`Politely declining to verify on local network: ${world.network}.`);
  } else {
    await verify(world, apiKey, name, contract, rToken._address);
  }

  return world;
}

async function printMinters(world: World, rToken: RToken): Promise<World> {
  let events = await getPastEvents(world, rToken, rToken.name, 'Mint');
  let addresses = events.map((event) => event.returnValues['minter']);
  let uniq = [...new Set(addresses)];

  world.printer.printLine("Minters:")

  uniq.forEach((address) => {
    world.printer.printLine(`\t${address}`)
  });

  return world;
}

async function printBorrowers(world: World, rToken: RToken): Promise<World> {
  let events = await getPastEvents(world, rToken, rToken.name, 'Borrow');
  let addresses = events.map((event) => event.returnValues['borrower']);
  let uniq = [...new Set(addresses)];

  world.printer.printLine("Borrowers:")

  uniq.forEach((address) => {
    world.printer.printLine(`\t${address}`)
  });

  return world;
}

async function printLiquidity(world: World, rToken: RToken): Promise<World> {
  let mintEvents = await getPastEvents(world, rToken, rToken.name, 'Mint');
  let mintAddresses = mintEvents.map((event) => event.returnValues['minter']);
  let borrowEvents = await getPastEvents(world, rToken, rToken.name, 'Borrow');
  let borrowAddresses = borrowEvents.map((event) => event.returnValues['borrower']);
  let uniq = [...new Set(mintAddresses.concat(borrowAddresses))];
  let cointroller = await getCointroller(world);

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

export function rTokenCommands() {
  return [
    new Command<{ rTokenParams: EventV }>(`
        #### Deploy

        * "RToken Deploy ...rTokenParams" - Generates a new RToken
          * E.g. "RToken rZRX Deploy"
      `,
      "Deploy",
      [new Arg("rTokenParams", getEventV, { variadic: true })],
      (world, from, { rTokenParams }) => genRToken(world, from, rTokenParams.val)
    ),
    new View<{ rTokenArg: StringV, apiKey: StringV }>(`
        #### Verify

        * "RToken <rToken> Verify apiKey:<String>" - Verifies RToken in Etherscan
          * E.g. "RToken rZRX Verify "myApiKey"
      `,
      "Verify",
      [
        new Arg("rTokenArg", getStringV),
        new Arg("apiKey", getStringV)
      ],
      async (world, { rTokenArg, apiKey }) => {
        let [rToken, name, data] = await getRTokenData(world, rTokenArg.val);

        return await verifyRToken(world, rToken, name, data.get('contract')!, apiKey.val);
      },
      { namePos: 1 }
    ),
    new Command<{ rToken: RToken }>(`
        #### AccrueInterest

        * "RToken <rToken> AccrueInterest" - Accrues interest for given token
          * E.g. "RToken rZRX AccrueInterest"
      `,
      "AccrueInterest",
      [
        new Arg("rToken", getRTokenV)
      ],
      (world, from, { rToken }) => accrueInterest(world, from, rToken),
      { namePos: 1 }
    ),
    new Command<{ rToken: RToken, amount: NumberV | NothingV }>(`
        #### Mint

        * "RToken <rToken> Mint amount:<Number>" - Mints the given amount of rToken as specified user
          * E.g. "RToken rZRX Mint 1.0e18"
      `,
      "Mint",
      [
        new Arg("rToken", getRTokenV),
        new Arg("amount", getNumberV, { nullable: true })
      ],
      (world, from, { rToken, amount }) => mint(world, from, rToken, amount),
      { namePos: 1 }
    ),
    new Command<{ rToken: RToken, tokens: NumberV }>(`
        #### Redeem

        * "RToken <rToken> Redeem tokens:<Number>" - Redeems the given amount of rTokens as specified user
          * E.g. "RToken rZRX Redeem 1.0e9"
      `,
      "Redeem",
      [
        new Arg("rToken", getRTokenV),
        new Arg("tokens", getNumberV)
      ],
      (world, from, { rToken, tokens }) => redeem(world, from, rToken, tokens),
      { namePos: 1 }
    ),
    new Command<{ rToken: RToken, amount: NumberV }>(`
        #### RedeemUnderlying

        * "RToken <rToken> RedeemUnderlying amount:<Number>" - Redeems the given amount of underlying as specified user
          * E.g. "RToken rZRX RedeemUnderlying 1.0e18"
      `,
      "RedeemUnderlying",
      [
        new Arg("rToken", getRTokenV),
        new Arg("amount", getNumberV)
      ],
      (world, from, { rToken, amount }) => redeemUnderlying(world, from, rToken, amount),
      { namePos: 1 }
    ),
    new Command<{ rToken: RToken, amount: NumberV }>(`
        #### Borrow

        * "RToken <rToken> Borrow amount:<Number>" - Borrows the given amount of this rToken as specified user
          * E.g. "RToken rZRX Borrow 1.0e18"
      `,
      "Borrow",
      [
        new Arg("rToken", getRTokenV),
        new Arg("amount", getNumberV)
      ],
      // Note: we override from
      (world, from, { rToken, amount }) => borrow(world, from, rToken, amount),
      { namePos: 1 }
    ),
    new Command<{ rToken: RToken, amount: NumberV | NothingV }>(`
        #### RepayBorrow

        * "RToken <rToken> RepayBorrow underlyingAmount:<Number>" - Repays borrow in the given underlying amount as specified user
          * E.g. "RToken rZRX RepayBorrow 1.0e18"
      `,
      "RepayBorrow",
      [
        new Arg("rToken", getRTokenV),
        new Arg("amount", getNumberV, { nullable: true })
      ],
      (world, from, { rToken, amount }) => repayBorrow(world, from, rToken, amount),
      { namePos: 1 }
    ),
    new Command<{ rToken: RToken, behalf: AddressV, amount: NumberV | NothingV }>(`
        #### RepayBorrowBehalf

        * "RToken <rToken> RepayBorrowBehalf behalf:<User> underlyingAmount:<Number>" - Repays borrow in the given underlying amount on behalf of another user
          * E.g. "RToken rZRX RepayBorrowBehalf Geoff 1.0e18"
      `,
      "RepayBorrowBehalf",
      [
        new Arg("rToken", getRTokenV),
        new Arg("behalf", getAddressV),
        new Arg("amount", getNumberV, { nullable: true })
      ],
      (world, from, { rToken, behalf, amount }) => repayBorrowBehalf(world, from, behalf.val, rToken, amount),
      { namePos: 1 }
    ),
    new Command<{ borrower: AddressV, rToken: RToken, collateral: RToken, repayAmount: NumberV | NothingV }>(`
        #### Liquidate

        * "RToken <rToken> Liquidate borrower:<User> rTokenCollateral:<Address> repayAmount:<Number>" - Liquidates repayAmount of given token seizing collateral token
          * E.g. "RToken rZRX Liquidate Geoff rBAT 1.0e18"
      `,
      "Liquidate",
      [
        new Arg("rToken", getRTokenV),
        new Arg("borrower", getAddressV),
        new Arg("collateral", getRTokenV),
        new Arg("repayAmount", getNumberV, { nullable: true })
      ],
      (world, from, { borrower, rToken, collateral, repayAmount }) => liquidateBorrow(world, from, rToken, borrower.val, collateral, repayAmount),
      { namePos: 1 }
    ),
    new Command<{ rToken: RToken, liquidator: AddressV, borrower: AddressV, seizeTokens: NumberV }>(`
        #### Seize

        * "RToken <rToken> Seize liquidator:<User> borrower:<User> seizeTokens:<Number>" - Seizes a given number of tokens from a user (to be called from other RToken)
          * E.g. "RToken rZRX Seize Geoff Torrey 1.0e18"
      `,
      "Seize",
      [
        new Arg("rToken", getRTokenV),
        new Arg("liquidator", getAddressV),
        new Arg("borrower", getAddressV),
        new Arg("seizeTokens", getNumberV)
      ],
      (world, from, { rToken, liquidator, borrower, seizeTokens }) => seize(world, from, rToken, liquidator.val, borrower.val, seizeTokens),
      { namePos: 1 }
    ),
    new Command<{ rToken: RToken, treasure: RToken, liquidator: AddressV, borrower: AddressV, seizeTokens: NumberV }>(`
        #### EvilSeize

        * "RToken <rToken> EvilSeize treasure:<Token> liquidator:<User> borrower:<User> seizeTokens:<Number>" - Improperly seizes a given number of tokens from a user
          * E.g. "RToken rEVL EvilSeize rZRX Geoff Torrey 1.0e18"
      `,
      "EvilSeize",
      [
        new Arg("rToken", getRTokenV),
        new Arg("treasure", getRTokenV),
        new Arg("liquidator", getAddressV),
        new Arg("borrower", getAddressV),
        new Arg("seizeTokens", getNumberV)
      ],
      (world, from, { rToken, treasure, liquidator, borrower, seizeTokens }) => evilSeize(world, from, rToken, treasure, liquidator.val, borrower.val, seizeTokens),
      { namePos: 1 }
    ),
    new Command<{ rToken: RToken, amount: NumberV }>(`
        #### ReduceReserves

        * "RToken <rToken> ReduceReserves amount:<Number>" - Reduces the reserves of the rToken
          * E.g. "RToken rZRX ReduceReserves 1.0e18"
      `,
      "ReduceReserves",
      [
        new Arg("rToken", getRTokenV),
        new Arg("amount", getNumberV)
      ],
      (world, from, { rToken, amount }) => reduceReserves(world, from, rToken, amount),
      { namePos: 1 }
    ),
    new Command<{ rToken: RToken, amount: NumberV }>(`
    #### AddReserves

    * "RToken <rToken> AddReserves amount:<Number>" - Adds reserves to the rToken
      * E.g. "RToken rZRX AddReserves 1.0e18"
  `,
      "AddReserves",
      [
        new Arg("rToken", getRTokenV),
        new Arg("amount", getNumberV)
      ],
      (world, from, { rToken, amount }) => addReserves(world, from, rToken, amount),
      { namePos: 1 }
    ),
    new Command<{ rToken: RToken, newPendingAdmin: AddressV }>(`
        #### SetPendingAdmin

        * "RToken <rToken> SetPendingAdmin newPendingAdmin:<Address>" - Sets the pending admin for the rToken
          * E.g. "RToken rZRX SetPendingAdmin Geoff"
      `,
      "SetPendingAdmin",
      [
        new Arg("rToken", getRTokenV),
        new Arg("newPendingAdmin", getAddressV)
      ],
      (world, from, { rToken, newPendingAdmin }) => setPendingAdmin(world, from, rToken, newPendingAdmin.val),
      { namePos: 1 }
    ),
    new Command<{ rToken: RToken }>(`
        #### AcceptAdmin

        * "RToken <rToken> AcceptAdmin" - Accepts admin for the rToken
          * E.g. "From Geoff (RToken rZRX AcceptAdmin)"
      `,
      "AcceptAdmin",
      [
        new Arg("rToken", getRTokenV)
      ],
      (world, from, { rToken }) => acceptAdmin(world, from, rToken),
      { namePos: 1 }
    ),
    new Command<{ rToken: RToken, reserveFactor: NumberV }>(`
        #### SetReserveFactor

        * "RToken <rToken> SetReserveFactor reserveFactor:<Number>" - Sets the reserve factor for the rToken
          * E.g. "RToken rZRX SetReserveFactor 0.1"
      `,
      "SetReserveFactor",
      [
        new Arg("rToken", getRTokenV),
        new Arg("reserveFactor", getExpNumberV)
      ],
      (world, from, { rToken, reserveFactor }) => setReserveFactor(world, from, rToken, reserveFactor),
      { namePos: 1 }
    ),
    new Command<{ rToken: RToken, interestRateModel: AddressV }>(`
        #### SetInterestRateModel

        * "RToken <rToken> SetInterestRateModel interestRateModel:<Contract>" - Sets the interest rate model for the given rToken
          * E.g. "RToken rZRX SetInterestRateModel (FixedRate 1.5)"
      `,
      "SetInterestRateModel",
      [
        new Arg("rToken", getRTokenV),
        new Arg("interestRateModel", getAddressV)
      ],
      (world, from, { rToken, interestRateModel }) => setInterestRateModel(world, from, rToken, interestRateModel.val),
      { namePos: 1 }
    ),
    new Command<{ rToken: RToken, token: AddressV }>(`
        #### SweepToken

        * "RToken <rToken> SweepToken bep20Token:<Contract>" - Sweeps the given bep-20 token from the contract
          * E.g. "RToken rZRX SweepToken BAT"
      `,
      "SweepToken",
      [
        new Arg("rToken", getRTokenV),
        new Arg("token", getAddressV)
      ],
      (world, from, { rToken, token }) => sweepToken(world, from, rToken, token.val),
      { namePos: 1 }
    ),
    new Command<{ rToken: RToken, cointroller: AddressV }>(`
        #### SetCointroller

        * "RToken <rToken> SetCointroller cointroller:<Contract>" - Sets the cointroller for the given rToken
          * E.g. "RToken rZRX SetCointroller Cointroller"
      `,
      "SetCointroller",
      [
        new Arg("rToken", getRTokenV),
        new Arg("cointroller", getAddressV)
      ],
      (world, from, { rToken, cointroller }) => setCointroller(world, from, rToken, cointroller.val),
      { namePos: 1 }
    ),
    new Command<{
      rToken: RToken;
      becomeImplementationData: StringV;
    }>(
      `
        #### BecomeImplementation

        * "RToken <rToken> BecomeImplementation becomeImplementationData:<String>"
          * E.g. "RToken rDAI BecomeImplementation "0x01234anyByTeS56789""
      `,
      'BecomeImplementation',
      [
        new Arg('rToken', getRTokenV),
        new Arg('becomeImplementationData', getStringV)
      ],
      (world, from, { rToken, becomeImplementationData }) =>
        becomeImplementation(
          world,
          from,
          rToken,
          becomeImplementationData.val
        ),
      { namePos: 1 }
    ),
    new Command<{rToken: RToken;}>(
      `
        #### ResignImplementation

        * "RToken <rToken> ResignImplementation"
          * E.g. "RToken rDAI ResignImplementation"
      `,
      'ResignImplementation',
      [new Arg('rToken', getRTokenV)],
      (world, from, { rToken }) =>
        resignImplementation(
          world,
          from,
          rToken
        ),
      { namePos: 1 }
    ),
    new Command<{
      rToken: RBep20Delegator;
      implementation: AddressV;
      allowResign: BoolV;
      becomeImplementationData: StringV;
    }>(
      `
        #### SetImplementation

        * "RToken <rToken> SetImplementation implementation:<Address> allowResign:<Bool> becomeImplementationData:<String>"
          * E.g. "RToken rDAI SetImplementation (RToken rDaiDelegate Address) True "0x01234anyByTeS56789"
      `,
      'SetImplementation',
      [
        new Arg('rToken', getRBep20DelegatorV),
        new Arg('implementation', getAddressV),
        new Arg('allowResign', getBoolV),
        new Arg('becomeImplementationData', getStringV)
      ],
      (world, from, { rToken, implementation, allowResign, becomeImplementationData }) =>
        setImplementation(
          world,
          from,
          rToken,
          implementation.val,
          allowResign.val,
          becomeImplementationData.val
        ),
      { namePos: 1 }
    ),
    new Command<{ rToken: RToken }>(`
        #### Donate

        * "RToken <rToken> Donate" - Calls the donate (payable no-op) function
          * E.g. "(Trx Value 5.0e18 (RToken rETH Donate))"
      `,
      "Donate",
      [
        new Arg("rToken", getRTokenV)
      ],
      (world, from, { rToken }) => donate(world, from, rToken),
      { namePos: 1 }
    ),
    new Command<{ rToken: RToken, variable: StringV, value: NumberV }>(`
        #### Mock

        * "RToken <rToken> Mock variable:<String> value:<Number>" - Mocks a given value on rToken. Note: value must be a supported mock and this will only work on a "RTokenScenario" contract.
          * E.g. "RToken rZRX Mock totalBorrows 5.0e18"
          * E.g. "RToken rZRX Mock totalReserves 0.5e18"
      `,
      "Mock",
      [
        new Arg("rToken", getRTokenV),
        new Arg("variable", getStringV),
        new Arg("value", getNumberV),
      ],
      (world, from, { rToken, variable, value }) => setRTokenMock(world, from, <RTokenScenario>rToken, variable.val, value),
      { namePos: 1 }
    ),
    new View<{ rToken: RToken }>(`
        #### Minters

        * "RToken <rToken> Minters" - Print address of all minters
      `,
      "Minters",
      [
        new Arg("rToken", getRTokenV)
      ],
      (world, { rToken }) => printMinters(world, rToken),
      { namePos: 1 }
    ),
    new View<{ rToken: RToken }>(`
        #### Borrowers

        * "RToken <rToken> Borrowers" - Print address of all borrowers
      `,
      "Borrowers",
      [
        new Arg("rToken", getRTokenV)
      ],
      (world, { rToken }) => printBorrowers(world, rToken),
      { namePos: 1 }
    ),
    new View<{ rToken: RToken }>(`
        #### Liquidity

        * "RToken <rToken> Liquidity" - Prints liquidity of all minters or borrowers
      `,
      "Liquidity",
      [
        new Arg("rToken", getRTokenV)
      ],
      (world, { rToken }) => printLiquidity(world, rToken),
      { namePos: 1 }
    ),
    new View<{ rToken: RToken, input: StringV }>(`
        #### Decode

        * "Decode <rToken> input:<String>" - Prints information about a call to a rToken contract
      `,
      "Decode",
      [
        new Arg("rToken", getRTokenV),
        new Arg("input", getStringV)

      ],
      (world, { rToken, input }) => decodeCall(world, rToken, input.val),
      { namePos: 1 }
    )
  ];
}

export async function processRTokenEvent(world: World, event: Event, from: string | null): Promise<World> {
  return await processCommandEvent<any>("RToken", rTokenCommands(), world, event, from);
}
