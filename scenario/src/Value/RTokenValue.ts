import { Event } from '../Event';
import { World } from '../World';
import { RToken } from '../Contract/RToken';
import { RBep20Delegator } from '../Contract/RBep20Delegator';
import { Bep20 } from '../Contract/Bep20';
import {
  getAddressV,
  getCoreValue,
  getStringV,
  mapValue
} from '../CoreValue';
import { Arg, Fetcher, getFetcherValue } from '../Command';
import {
  AddressV,
  NumberV,
  Value,
  StringV
} from '../Value';
import { getWorldContractByAddress, getRTokenAddress } from '../ContractLookup';

export async function getRTokenV(world: World, event: Event): Promise<RToken> {
  const address = await mapValue<AddressV>(
    world,
    event,
    (str) => new AddressV(getRTokenAddress(world, str)),
    getCoreValue,
    AddressV
  );

  return getWorldContractByAddress<RToken>(world, address.val);
}

export async function getRBep20DelegatorV(world: World, event: Event): Promise<RBep20Delegator> {
  const address = await mapValue<AddressV>(
    world,
    event,
    (str) => new AddressV(getRTokenAddress(world, str)),
    getCoreValue,
    AddressV
  );

  return getWorldContractByAddress<RBep20Delegator>(world, address.val);
}

async function getInterestRateModel(world: World, rToken: RToken): Promise<AddressV> {
  return new AddressV(await rToken.methods.interestRateModel().call());
}

async function rTokenAddress(world: World, rToken: RToken): Promise<AddressV> {
  return new AddressV(rToken._address);
}

async function getRTokenAdmin(world: World, rToken: RToken): Promise<AddressV> {
  return new AddressV(await rToken.methods.admin().call());
}

async function getRTokenPendingAdmin(world: World, rToken: RToken): Promise<AddressV> {
  return new AddressV(await rToken.methods.pendingAdmin().call());
}

async function balanceOfUnderlying(world: World, rToken: RToken, user: string): Promise<NumberV> {
  return new NumberV(await rToken.methods.balanceOfUnderlying(user).call());
}

async function getBorrowBalance(world: World, rToken: RToken, user): Promise<NumberV> {
  return new NumberV(await rToken.methods.borrowBalanceCurrent(user).call());
}

async function getBorrowBalanceStored(world: World, rToken: RToken, user): Promise<NumberV> {
  return new NumberV(await rToken.methods.borrowBalanceStored(user).call());
}

async function getTotalBorrows(world: World, rToken: RToken): Promise<NumberV> {
  return new NumberV(await rToken.methods.totalBorrows().call());
}

async function getTotalBorrowsCurrent(world: World, rToken: RToken): Promise<NumberV> {
  return new NumberV(await rToken.methods.totalBorrowsCurrent().call());
}

async function getReserveFactor(world: World, rToken: RToken): Promise<NumberV> {
  return new NumberV(await rToken.methods.reserveFactorMantissa().call(), 1.0e18);
}

async function getTotalReserves(world: World, rToken: RToken): Promise<NumberV> {
  return new NumberV(await rToken.methods.totalReserves().call());
}

async function getCointroller(world: World, rToken: RToken): Promise<AddressV> {
  return new AddressV(await rToken.methods.cointroller().call());
}

async function getExchangeRateStored(world: World, rToken: RToken): Promise<NumberV> {
  return new NumberV(await rToken.methods.exchangeRateStored().call());
}

async function getExchangeRate(world: World, rToken: RToken): Promise<NumberV> {
  return new NumberV(await rToken.methods.exchangeRateCurrent().call(), 1e18);
}

async function getCash(world: World, rToken: RToken): Promise<NumberV> {
  return new NumberV(await rToken.methods.getCash().call());
}

async function getInterestRate(world: World, rToken: RToken): Promise<NumberV> {
  return new NumberV(await rToken.methods.borrowRatePerBlock().call(), 1.0e18 / 2102400);
}

async function getImplementation(world: World, rToken: RToken): Promise<AddressV> {
  return new AddressV(await (rToken as RBep20Delegator).methods.implementation().call());
}

export function rTokenFetchers() {
  return [
    new Fetcher<{ rToken: RToken }, AddressV>(`
        #### Address

        * "RToken <RToken> Address" - Returns address of RToken contract
          * E.g. "RToken rZRX Address" - Returns rZRX's address
      `,
      "Address",
      [
        new Arg("rToken", getRTokenV)
      ],
      (world, { rToken }) => rTokenAddress(world, rToken),
      { namePos: 1 }
    ),

    new Fetcher<{ rToken: RToken }, AddressV>(`
        #### InterestRateModel

        * "RToken <RToken> InterestRateModel" - Returns the interest rate model of RToken contract
          * E.g. "RToken rZRX InterestRateModel" - Returns rZRX's interest rate model
      `,
      "InterestRateModel",
      [
        new Arg("rToken", getRTokenV)
      ],
      (world, { rToken }) => getInterestRateModel(world, rToken),
      { namePos: 1 }
    ),

    new Fetcher<{ rToken: RToken }, AddressV>(`
        #### Admin

        * "RToken <RToken> Admin" - Returns the admin of RToken contract
          * E.g. "RToken rZRX Admin" - Returns rZRX's admin
      `,
      "Admin",
      [
        new Arg("rToken", getRTokenV)
      ],
      (world, { rToken }) => getRTokenAdmin(world, rToken),
      { namePos: 1 }
    ),

    new Fetcher<{ rToken: RToken }, AddressV>(`
        #### PendingAdmin

        * "RToken <RToken> PendingAdmin" - Returns the pending admin of RToken contract
          * E.g. "RToken rZRX PendingAdmin" - Returns rZRX's pending admin
      `,
      "PendingAdmin",
      [
        new Arg("rToken", getRTokenV)
      ],
      (world, { rToken }) => getRTokenPendingAdmin(world, rToken),
      { namePos: 1 }
    ),

    new Fetcher<{ rToken: RToken }, AddressV>(`
        #### Underlying

        * "RToken <RToken> Underlying" - Returns the underlying asset (if applicable)
          * E.g. "RToken rZRX Underlying"
      `,
      "Underlying",
      [
        new Arg("rToken", getRTokenV)
      ],
      async (world, { rToken }) => new AddressV(await rToken.methods.underlying().call()),
      { namePos: 1 }
    ),

    new Fetcher<{ rToken: RToken, address: AddressV }, NumberV>(`
        #### UnderlyingBalance

        * "RToken <RToken> UnderlyingBalance <User>" - Returns a user's underlying balance (based on given exchange rate)
          * E.g. "RToken rZRX UnderlyingBalance Geoff"
      `,
      "UnderlyingBalance",
      [
        new Arg("rToken", getRTokenV),
        new Arg<AddressV>("address", getAddressV)
      ],
      (world, { rToken, address }) => balanceOfUnderlying(world, rToken, address.val),
      { namePos: 1 }
    ),

    new Fetcher<{ rToken: RToken, address: AddressV }, NumberV>(`
        #### BorrowBalance

        * "RToken <RToken> BorrowBalance <User>" - Returns a user's borrow balance (including interest)
          * E.g. "RToken rZRX BorrowBalance Geoff"
      `,
      "BorrowBalance",
      [
        new Arg("rToken", getRTokenV),
        new Arg("address", getAddressV)
      ],
      (world, { rToken, address }) => getBorrowBalance(world, rToken, address.val),
      { namePos: 1 }
    ),

    new Fetcher<{ rToken: RToken, address: AddressV }, NumberV>(`
        #### BorrowBalanceStored

        * "RToken <RToken> BorrowBalanceStored <User>" - Returns a user's borrow balance (without specifically re-accruing interest)
          * E.g. "RToken rZRX BorrowBalanceStored Geoff"
      `,
      "BorrowBalanceStored",
      [
        new Arg("rToken", getRTokenV),
        new Arg("address", getAddressV)
      ],
      (world, { rToken, address }) => getBorrowBalanceStored(world, rToken, address.val),
      { namePos: 1 }
    ),

    new Fetcher<{ rToken: RToken }, NumberV>(`
        #### TotalBorrows

        * "RToken <RToken> TotalBorrows" - Returns the rToken's total borrow balance
          * E.g. "RToken rZRX TotalBorrows"
      `,
      "TotalBorrows",
      [
        new Arg("rToken", getRTokenV)
      ],
      (world, { rToken }) => getTotalBorrows(world, rToken),
      { namePos: 1 }
    ),

    new Fetcher<{ rToken: RToken }, NumberV>(`
        #### TotalBorrowsCurrent

        * "RToken <RToken> TotalBorrowsCurrent" - Returns the rToken's total borrow balance with interest
          * E.g. "RToken rZRX TotalBorrowsCurrent"
      `,
      "TotalBorrowsCurrent",
      [
        new Arg("rToken", getRTokenV)
      ],
      (world, { rToken }) => getTotalBorrowsCurrent(world, rToken),
      { namePos: 1 }
    ),

    new Fetcher<{ rToken: RToken }, NumberV>(`
        #### Reserves

        * "RToken <RToken> Reserves" - Returns the rToken's total reserves
          * E.g. "RToken rZRX Reserves"
      `,
      "Reserves",
      [
        new Arg("rToken", getRTokenV)
      ],
      (world, { rToken }) => getTotalReserves(world, rToken),
      { namePos: 1 }
    ),

    new Fetcher<{ rToken: RToken }, NumberV>(`
        #### ReserveFactor

        * "RToken <RToken> ReserveFactor" - Returns reserve factor of RToken contract
          * E.g. "RToken rZRX ReserveFactor" - Returns rZRX's reserve factor
      `,
      "ReserveFactor",
      [
        new Arg("rToken", getRTokenV)
      ],
      (world, { rToken }) => getReserveFactor(world, rToken),
      { namePos: 1 }
    ),

    new Fetcher<{ rToken: RToken }, AddressV>(`
        #### Cointroller

        * "RToken <RToken> Cointroller" - Returns the rToken's cointroller
          * E.g. "RToken rZRX Cointroller"
      `,
      "Cointroller",
      [
        new Arg("rToken", getRTokenV)
      ],
      (world, { rToken }) => getCointroller(world, rToken),
      { namePos: 1 }
    ),

    new Fetcher<{ rToken: RToken }, NumberV>(`
        #### ExchangeRateStored

        * "RToken <RToken> ExchangeRateStored" - Returns the rToken's exchange rate (based on balances stored)
          * E.g. "RToken rZRX ExchangeRateStored"
      `,
      "ExchangeRateStored",
      [
        new Arg("rToken", getRTokenV)
      ],
      (world, { rToken }) => getExchangeRateStored(world, rToken),
      { namePos: 1 }
    ),

    new Fetcher<{ rToken: RToken }, NumberV>(`
        #### ExchangeRate

        * "RToken <RToken> ExchangeRate" - Returns the rToken's current exchange rate
          * E.g. "RToken rZRX ExchangeRate"
      `,
      "ExchangeRate",
      [
        new Arg("rToken", getRTokenV)
      ],
      (world, { rToken }) => getExchangeRate(world, rToken),
      { namePos: 1 }
    ),

    new Fetcher<{ rToken: RToken }, NumberV>(`
        #### Cash

        * "RToken <RToken> Cash" - Returns the rToken's current cash
          * E.g. "RToken rZRX Cash"
      `,
      "Cash",
      [
        new Arg("rToken", getRTokenV)
      ],
      (world, { rToken }) => getCash(world, rToken),
      { namePos: 1 }
    ),

    new Fetcher<{ rToken: RToken }, NumberV>(`
        #### InterestRate

        * "RToken <RToken> InterestRate" - Returns the rToken's current interest rate
          * E.g. "RToken rZRX InterestRate"
      `,
      "InterestRate",
      [
        new Arg("rToken", getRTokenV)
      ],
      (world, {rToken}) => getInterestRate(world, rToken),
      {namePos: 1}
    ),
    new Fetcher<{rToken: RToken, signature: StringV}, NumberV>(`
        #### CallNum

        * "RToken <RToken> Call <signature>" - Simple direct call method, for now with no parameters
          * E.g. "RToken rZRX Call \"borrowIndex()\""
      `,
      "CallNum",
      [
        new Arg("rToken", getRTokenV),
        new Arg("signature", getStringV),
      ],
      async (world, {rToken, signature}) => {
        const res = await world.web3.eth.call({
            to: rToken._address,
            data: world.web3.eth.abi.encodeFunctionSignature(signature.val)
          })
        const resNum : any = world.web3.eth.abi.decodeParameter('uint256',res);
        return new NumberV(resNum);
      }
      ,
      {namePos: 1}
    ),
    new Fetcher<{ rToken: RToken }, AddressV>(`
        #### Implementation

        * "RToken <RToken> Implementation" - Returns the rToken's current implementation
          * E.g. "RToken rDAI Implementation"
      `,
      "Implementation",
      [
        new Arg("rToken", getRTokenV)
      ],
      (world, { rToken }) => getImplementation(world, rToken),
      { namePos: 1 }
    )
  ];
}

export async function getRTokenValue(world: World, event: Event): Promise<Value> {
  return await getFetcherValue<any, any>("rToken", rTokenFetchers(), world, event);
}
