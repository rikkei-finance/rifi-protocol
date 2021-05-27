import {Event} from '../Event';
import {World} from '../World';
import {Cointroller} from '../Contract/Cointroller';
import {RToken} from '../Contract/RToken';
import {
  getAddressV,
  getCoreValue,
  getStringV,
  getNumberV
} from '../CoreValue';
import {
  AddressV,
  BoolV,
  ListV,
  NumberV,
  StringV,
  Value
} from '../Value';
import {Arg, Fetcher, getFetcherValue} from '../Command';
import {getCointroller} from '../ContractLookup';
import {encodedNumber} from '../Encoding';
import {getRTokenV} from '../Value/RTokenValue';
import { encodeParameters, encodeABI } from '../Utils';

export async function getCointrollerAddress(world: World, cointroller: Cointroller): Promise<AddressV> {
  return new AddressV(cointroller._address);
}

export async function getLiquidity(world: World, cointroller: Cointroller, user: string): Promise<NumberV> {
  let {0: error, 1: liquidity, 2: shortfall} = await cointroller.methods.getAccountLiquidity(user).call();
  if (Number(error) != 0) {
    throw new Error(`Failed to compute account liquidity: error code = ${error}`);
  }
  return new NumberV(Number(liquidity) - Number(shortfall));
}

export async function getHypotheticalLiquidity(world: World, cointroller: Cointroller, account: string, asset: string, redeemTokens: encodedNumber, borrowAmount: encodedNumber): Promise<NumberV> {
  let {0: error, 1: liquidity, 2: shortfall} = await cointroller.methods.getHypotheticalAccountLiquidity(account, asset, redeemTokens, borrowAmount).call();
  if (Number(error) != 0) {
    throw new Error(`Failed to compute account hypothetical liquidity: error code = ${error}`);
  }
  return new NumberV(Number(liquidity) - Number(shortfall));
}

async function getPriceOracle(world: World, cointroller: Cointroller): Promise<AddressV> {
  return new AddressV(await cointroller.methods.oracle().call());
}

async function getCloseFactor(world: World, cointroller: Cointroller): Promise<NumberV> {
  return new NumberV(await cointroller.methods.closeFactorMantissa().call(), 1e18);
}

async function getMaxAssets(world: World, cointroller: Cointroller): Promise<NumberV> {
  return new NumberV(await cointroller.methods.maxAssets().call());
}

async function getLiquidationIncentive(world: World, cointroller: Cointroller): Promise<NumberV> {
  return new NumberV(await cointroller.methods.liquidationIncentiveMantissa().call(), 1e18);
}

async function getImplementation(world: World, cointroller: Cointroller): Promise<AddressV> {
  return new AddressV(await cointroller.methods.cointrollerImplementation().call());
}

async function getBlockNumber(world: World, cointroller: Cointroller): Promise<NumberV> {
  return new NumberV(await cointroller.methods.getBlockNumber().call());
}

async function getAdmin(world: World, cointroller: Cointroller): Promise<AddressV> {
  return new AddressV(await cointroller.methods.admin().call());
}

async function getPendingAdmin(world: World, cointroller: Cointroller): Promise<AddressV> {
  return new AddressV(await cointroller.methods.pendingAdmin().call());
}

async function getCollateralFactor(world: World, cointroller: Cointroller, rToken: RToken): Promise<NumberV> {
  let {0: _isListed, 1: collateralFactorMantissa} = await cointroller.methods.markets(rToken._address).call();
  return new NumberV(collateralFactorMantissa, 1e18);
}

async function membershipLength(world: World, cointroller: Cointroller, user: string): Promise<NumberV> {
  return new NumberV(await cointroller.methods.membershipLength(user).call());
}

async function checkMembership(world: World, cointroller: Cointroller, user: string, rToken: RToken): Promise<BoolV> {
  return new BoolV(await cointroller.methods.checkMembership(user, rToken._address).call());
}

async function getAssetsIn(world: World, cointroller: Cointroller, user: string): Promise<ListV> {
  let assetsList = await cointroller.methods.getAssetsIn(user).call();

  return new ListV(assetsList.map((a) => new AddressV(a)));
}

async function getRifiMarkets(world: World, cointroller: Cointroller): Promise<ListV> {
  let mkts = await cointroller.methods.getRifiMarkets().call();

  return new ListV(mkts.map((a) => new AddressV(a)));
}

async function checkListed(world: World, cointroller: Cointroller, rToken: RToken): Promise<BoolV> {
  let {0: isListed, 1: _collateralFactorMantissa} = await cointroller.methods.markets(rToken._address).call();

  return new BoolV(isListed);
}

async function checkIsRified(world: World, cointroller: Cointroller, rToken: RToken): Promise<BoolV> {
  let {0: isListed, 1: _collateralFactorMantissa, 2: isRified} = await cointroller.methods.markets(rToken._address).call();
  return new BoolV(isRified);
}


export function cointrollerFetchers() {
  return [
    new Fetcher<{cointroller: Cointroller}, AddressV>(`
        #### Address

        * "Cointroller Address" - Returns address of cointroller
      `,
      "Address",
      [new Arg("cointroller", getCointroller, {implicit: true})],
      (world, {cointroller}) => getCointrollerAddress(world, cointroller)
    ),
    new Fetcher<{cointroller: Cointroller, account: AddressV}, NumberV>(`
        #### Liquidity

        * "Cointroller Liquidity <User>" - Returns a given user's trued up liquidity
          * E.g. "Cointroller Liquidity Geoff"
      `,
      "Liquidity",
      [
        new Arg("cointroller", getCointroller, {implicit: true}),
        new Arg("account", getAddressV)
      ],
      (world, {cointroller, account}) => getLiquidity(world, cointroller, account.val)
    ),
    new Fetcher<{cointroller: Cointroller, account: AddressV, action: StringV, amount: NumberV, rToken: RToken}, NumberV>(`
        #### Hypothetical

        * "Cointroller Hypothetical <User> <Action> <Asset> <Number>" - Returns a given user's trued up liquidity given a hypothetical change in asset with redeeming a certain number of tokens and/or borrowing a given amount.
          * E.g. "Cointroller Hypothetical Geoff Redeems 6.0 rZRX"
          * E.g. "Cointroller Hypothetical Geoff Borrows 5.0 rZRX"
      `,
      "Hypothetical",
      [
        new Arg("cointroller", getCointroller, {implicit: true}),
        new Arg("account", getAddressV),
        new Arg("action", getStringV),
        new Arg("amount", getNumberV),
        new Arg("rToken", getRTokenV)
      ],
      async (world, {cointroller, account, action, rToken, amount}) => {
        let redeemTokens: NumberV;
        let borrowAmount: NumberV;

        switch (action.val.toLowerCase()) {
          case "borrows":
            redeemTokens = new NumberV(0);
            borrowAmount = amount;
            break;
          case "redeems":
            redeemTokens = amount;
            borrowAmount = new NumberV(0);
            break;
          default:
            throw new Error(`Unknown hypothetical: ${action.val}`);
        }

        return await getHypotheticalLiquidity(world, cointroller, account.val, rToken._address, redeemTokens.encode(), borrowAmount.encode());
      }
    ),
    new Fetcher<{cointroller: Cointroller}, AddressV>(`
        #### Admin

        * "Cointroller Admin" - Returns the Cointrollers's admin
          * E.g. "Cointroller Admin"
      `,
      "Admin",
      [new Arg("cointroller", getCointroller, {implicit: true})],
      (world, {cointroller}) => getAdmin(world, cointroller)
    ),
    new Fetcher<{cointroller: Cointroller}, AddressV>(`
        #### PendingAdmin

        * "Cointroller PendingAdmin" - Returns the pending admin of the Cointroller
          * E.g. "Cointroller PendingAdmin" - Returns Cointroller's pending admin
      `,
      "PendingAdmin",
      [
        new Arg("cointroller", getCointroller, {implicit: true}),
      ],
      (world, {cointroller}) => getPendingAdmin(world, cointroller)
    ),
    new Fetcher<{cointroller: Cointroller}, AddressV>(`
        #### PriceOracle

        * "Cointroller PriceOracle" - Returns the Cointrollers's price oracle
          * E.g. "Cointroller PriceOracle"
      `,
      "PriceOracle",
      [new Arg("cointroller", getCointroller, {implicit: true})],
      (world, {cointroller}) => getPriceOracle(world, cointroller)
    ),
    new Fetcher<{cointroller: Cointroller}, NumberV>(`
        #### CloseFactor

        * "Cointroller CloseFactor" - Returns the Cointrollers's price oracle
          * E.g. "Cointroller CloseFactor"
      `,
      "CloseFactor",
      [new Arg("cointroller", getCointroller, {implicit: true})],
      (world, {cointroller}) => getCloseFactor(world, cointroller)
    ),
    new Fetcher<{cointroller: Cointroller}, NumberV>(`
        #### MaxAssets

        * "Cointroller MaxAssets" - Returns the Cointrollers's price oracle
          * E.g. "Cointroller MaxAssets"
      `,
      "MaxAssets",
      [new Arg("cointroller", getCointroller, {implicit: true})],
      (world, {cointroller}) => getMaxAssets(world, cointroller)
    ),
    new Fetcher<{cointroller: Cointroller}, NumberV>(`
        #### LiquidationIncentive

        * "Cointroller LiquidationIncentive" - Returns the Cointrollers's liquidation incentive
          * E.g. "Cointroller LiquidationIncentive"
      `,
      "LiquidationIncentive",
      [new Arg("cointroller", getCointroller, {implicit: true})],
      (world, {cointroller}) => getLiquidationIncentive(world, cointroller)
    ),
    new Fetcher<{cointroller: Cointroller}, AddressV>(`
        #### Implementation

        * "Cointroller Implementation" - Returns the Cointrollers's implementation
          * E.g. "Cointroller Implementation"
      `,
      "Implementation",
      [new Arg("cointroller", getCointroller, {implicit: true})],
      (world, {cointroller}) => getImplementation(world, cointroller)
    ),
    new Fetcher<{cointroller: Cointroller}, NumberV>(`
        #### BlockNumber

        * "Cointroller BlockNumber" - Returns the Cointrollers's mocked block number (for scenario runner)
          * E.g. "Cointroller BlockNumber"
      `,
      "BlockNumber",
      [new Arg("cointroller", getCointroller, {implicit: true})],
      (world, {cointroller}) => getBlockNumber(world, cointroller)
    ),
    new Fetcher<{cointroller: Cointroller, rToken: RToken}, NumberV>(`
        #### CollateralFactor

        * "Cointroller CollateralFactor <RToken>" - Returns the collateralFactor associated with a given asset
          * E.g. "Cointroller CollateralFactor rZRX"
      `,
      "CollateralFactor",
      [
        new Arg("cointroller", getCointroller, {implicit: true}),
        new Arg("rToken", getRTokenV)
      ],
      (world, {cointroller, rToken}) => getCollateralFactor(world, cointroller, rToken)
    ),
    new Fetcher<{cointroller: Cointroller, account: AddressV}, NumberV>(`
        #### MembershipLength

        * "Cointroller MembershipLength <User>" - Returns a given user's length of membership
          * E.g. "Cointroller MembershipLength Geoff"
      `,
      "MembershipLength",
      [
        new Arg("cointroller", getCointroller, {implicit: true}),
        new Arg("account", getAddressV)
      ],
      (world, {cointroller, account}) => membershipLength(world, cointroller, account.val)
    ),
    new Fetcher<{cointroller: Cointroller, account: AddressV, rToken: RToken}, BoolV>(`
        #### CheckMembership

        * "Cointroller CheckMembership <User> <RToken>" - Returns one if user is in asset, zero otherwise.
          * E.g. "Cointroller CheckMembership Geoff rZRX"
      `,
      "CheckMembership",
      [
        new Arg("cointroller", getCointroller, {implicit: true}),
        new Arg("account", getAddressV),
        new Arg("rToken", getRTokenV)
      ],
      (world, {cointroller, account, rToken}) => checkMembership(world, cointroller, account.val, rToken)
    ),
    new Fetcher<{cointroller: Cointroller, account: AddressV}, ListV>(`
        #### AssetsIn

        * "Cointroller AssetsIn <User>" - Returns the assets a user is in
          * E.g. "Cointroller AssetsIn Geoff"
      `,
      "AssetsIn",
      [
        new Arg("cointroller", getCointroller, {implicit: true}),
        new Arg("account", getAddressV)
      ],
      (world, {cointroller, account}) => getAssetsIn(world, cointroller, account.val)
    ),
    new Fetcher<{cointroller: Cointroller, rToken: RToken}, BoolV>(`
        #### CheckListed

        * "Cointroller CheckListed <RToken>" - Returns true if market is listed, false otherwise.
          * E.g. "Cointroller CheckListed rZRX"
      `,
      "CheckListed",
      [
        new Arg("cointroller", getCointroller, {implicit: true}),
        new Arg("rToken", getRTokenV)
      ],
      (world, {cointroller, rToken}) => checkListed(world, cointroller, rToken)
    ),
    new Fetcher<{cointroller: Cointroller, rToken: RToken}, BoolV>(`
        #### CheckIsRified

        * "Cointroller CheckIsRified <RToken>" - Returns true if market is listed, false otherwise.
          * E.g. "Cointroller CheckIsRified rZRX"
      `,
      "CheckIsRified",
      [
        new Arg("cointroller", getCointroller, {implicit: true}),
        new Arg("rToken", getRTokenV)
      ],
      (world, {cointroller, rToken}) => checkIsRified(world, cointroller, rToken)
    ),
    new Fetcher<{cointroller: Cointroller}, AddressV>(`
        #### PauseGuardian

        * "PauseGuardian" - Returns the Cointrollers's PauseGuardian
        * E.g. "Cointroller PauseGuardian"
        `,
        "PauseGuardian",
        [
          new Arg("cointroller", getCointroller, {implicit: true})
        ],
        async (world, {cointroller}) => new AddressV(await cointroller.methods.pauseGuardian().call())
    ),

    new Fetcher<{cointroller: Cointroller}, BoolV>(`
        #### _MintGuardianPaused

        * "_MintGuardianPaused" - Returns the Cointrollers's original global Mint paused status
        * E.g. "Cointroller _MintGuardianPaused"
        `,
        "_MintGuardianPaused",
        [new Arg("cointroller", getCointroller, {implicit: true})],
        async (world, {cointroller}) => new BoolV(await cointroller.methods._mintGuardianPaused().call())
    ),
    new Fetcher<{cointroller: Cointroller}, BoolV>(`
        #### _BorrowGuardianPaused

        * "_BorrowGuardianPaused" - Returns the Cointrollers's original global Borrow paused status
        * E.g. "Cointroller _BorrowGuardianPaused"
        `,
        "_BorrowGuardianPaused",
        [new Arg("cointroller", getCointroller, {implicit: true})],
        async (world, {cointroller}) => new BoolV(await cointroller.methods._borrowGuardianPaused().call())
    ),

    new Fetcher<{cointroller: Cointroller}, BoolV>(`
        #### TransferGuardianPaused

        * "TransferGuardianPaused" - Returns the Cointrollers's Transfer paused status
        * E.g. "Cointroller TransferGuardianPaused"
        `,
        "TransferGuardianPaused",
        [new Arg("cointroller", getCointroller, {implicit: true})],
        async (world, {cointroller}) => new BoolV(await cointroller.methods.transferGuardianPaused().call())
    ),
    new Fetcher<{cointroller: Cointroller}, BoolV>(`
        #### SeizeGuardianPaused

        * "SeizeGuardianPaused" - Returns the Cointrollers's Seize paused status
        * E.g. "Cointroller SeizeGuardianPaused"
        `,
        "SeizeGuardianPaused",
        [new Arg("cointroller", getCointroller, {implicit: true})],
        async (world, {cointroller}) => new BoolV(await cointroller.methods.seizeGuardianPaused().call())
    ),

    new Fetcher<{cointroller: Cointroller, rToken: RToken}, BoolV>(`
        #### MintGuardianMarketPaused

        * "MintGuardianMarketPaused" - Returns the Cointrollers's Mint paused status in market
        * E.g. "Cointroller MintGuardianMarketPaused rREP"
        `,
        "MintGuardianMarketPaused",
        [
          new Arg("cointroller", getCointroller, {implicit: true}),
          new Arg("rToken", getRTokenV)
        ],
        async (world, {cointroller, rToken}) => new BoolV(await cointroller.methods.mintGuardianPaused(rToken._address).call())
    ),
    new Fetcher<{cointroller: Cointroller, rToken: RToken}, BoolV>(`
        #### BorrowGuardianMarketPaused

        * "BorrowGuardianMarketPaused" - Returns the Cointrollers's Borrow paused status in market
        * E.g. "Cointroller BorrowGuardianMarketPaused rREP"
        `,
        "BorrowGuardianMarketPaused",
        [
          new Arg("cointroller", getCointroller, {implicit: true}),
          new Arg("rToken", getRTokenV)
        ],
        async (world, {cointroller, rToken}) => new BoolV(await cointroller.methods.borrowGuardianPaused(rToken._address).call())
    ),

    new Fetcher<{cointroller: Cointroller}, ListV>(`
      #### GetRifiMarkets

      * "GetRifiMarkets" - Returns an array of the currently enabled Rifi markets. To use the auto-gen array getter rifiMarkets(uint), use RifiMarkets
      * E.g. "Cointroller GetRifiMarkets"
      `,
      "GetRifiMarkets",
      [new Arg("cointroller", getCointroller, {implicit: true})],
      async(world, {cointroller}) => await getRifiMarkets(world, cointroller)
     ),

    new Fetcher<{cointroller: Cointroller}, NumberV>(`
      #### RifiRate

      * "RifiRate" - Returns the current rifi rate.
      * E.g. "Cointroller RifiRate"
      `,
      "RifiRate",
      [new Arg("cointroller", getCointroller, {implicit: true})],
      async(world, {cointroller}) => new NumberV(await cointroller.methods.rifiRate().call())
    ),

    new Fetcher<{cointroller: Cointroller, signature: StringV, callArgs: StringV[]}, NumberV>(`
        #### CallNum

        * "CallNum signature:<String> ...callArgs<CoreValue>" - Simple direct call method
          * E.g. "Cointroller CallNum \"rifiSpeeds(address)\" (Address Coburn)"
      `,
      "CallNum",
      [
        new Arg("cointroller", getCointroller, {implicit: true}),
        new Arg("signature", getStringV),
        new Arg("callArgs", getCoreValue, {variadic: true, mapped: true})
      ],
      async (world, {cointroller, signature, callArgs}) => {
        const fnData = encodeABI(world, signature.val, callArgs.map(a => a.val));
        const res = await world.web3.eth.call({
            to: cointroller._address,
            data: fnData
          })
        const resNum : any = world.web3.eth.abi.decodeParameter('uint256',res);
        return new NumberV(resNum);
      }
    ),
    new Fetcher<{cointroller: Cointroller, RToken: RToken, key: StringV}, NumberV>(`
        #### RifiSupplyState(address)

        * "Cointroller RifiBorrowState rZRX "index"
      `,
      "RifiSupplyState",
      [
        new Arg("cointroller", getCointroller, {implicit: true}),
        new Arg("RToken", getRTokenV),
        new Arg("key", getStringV),
      ],
      async (world, {cointroller, RToken, key}) => {
        const result = await cointroller.methods.rifiSupplyState(RToken._address).call();
        return new NumberV(result[key.val]);
      }
    ),
    new Fetcher<{cointroller: Cointroller, RToken: RToken, key: StringV}, NumberV>(`
        #### RifiBorrowState(address)

        * "Cointroller RifiBorrowState rZRX "index"
      `,
      "RifiBorrowState",
      [
        new Arg("cointroller", getCointroller, {implicit: true}),
        new Arg("RToken", getRTokenV),
        new Arg("key", getStringV),
      ],
      async (world, {cointroller, RToken, key}) => {
        const result = await cointroller.methods.rifiBorrowState(RToken._address).call();
        return new NumberV(result[key.val]);
      }
    ),
    new Fetcher<{cointroller: Cointroller, account: AddressV, key: StringV}, NumberV>(`
        #### RifiAccrued(address)

        * "Cointroller RifiAccrued Coburn
      `,
      "RifiAccrued",
      [
        new Arg("cointroller", getCointroller, {implicit: true}),
        new Arg("account", getAddressV),
      ],
      async (world, {cointroller,account}) => {
        const result = await cointroller.methods.rifiAccrued(account.val).call();
        return new NumberV(result);
      }
    ),
    new Fetcher<{cointroller: Cointroller, RToken: RToken, account: AddressV}, NumberV>(`
        #### rifiSupplierIndex

        * "Cointroller RifiSupplierIndex rZRX Coburn
      `,
      "RifiSupplierIndex",
      [
        new Arg("cointroller", getCointroller, {implicit: true}),
        new Arg("RToken", getRTokenV),
        new Arg("account", getAddressV),
      ],
      async (world, {cointroller, RToken, account}) => {
        return new NumberV(await cointroller.methods.rifiSupplierIndex(RToken._address, account.val).call());
      }
    ),
    new Fetcher<{cointroller: Cointroller, RToken: RToken, account: AddressV}, NumberV>(`
        #### RifiBorrowerIndex

        * "Cointroller RifiBorrowerIndex rZRX Coburn
      `,
      "RifiBorrowerIndex",
      [
        new Arg("cointroller", getCointroller, {implicit: true}),
        new Arg("RToken", getRTokenV),
        new Arg("account", getAddressV),
      ],
      async (world, {cointroller, RToken, account}) => {
        return new NumberV(await cointroller.methods.rifiBorrowerIndex(RToken._address, account.val).call());
      }
    ),
    new Fetcher<{cointroller: Cointroller, RToken: RToken}, NumberV>(`
        #### RifiSpeed

        * "Cointroller RifiSpeed rZRX
      `,
      "RifiSpeed",
      [
        new Arg("cointroller", getCointroller, {implicit: true}),
        new Arg("RToken", getRTokenV),
      ],
      async (world, {cointroller, RToken}) => {
        return new NumberV(await cointroller.methods.rifiSpeeds(RToken._address).call());
      }
    ),
    new Fetcher<{cointroller: Cointroller}, AddressV>(`
        #### BorrowCapGuardian

        * "BorrowCapGuardian" - Returns the Cointrollers's BorrowCapGuardian
        * E.g. "Cointroller BorrowCapGuardian"
        `,
        "BorrowCapGuardian",
        [
          new Arg("cointroller", getCointroller, {implicit: true})
        ],
        async (world, {cointroller}) => new AddressV(await cointroller.methods.borrowCapGuardian().call())
    ),
    new Fetcher<{cointroller: Cointroller, RToken: RToken}, NumberV>(`
        #### BorrowCaps

        * "Cointroller BorrowCaps rZRX
      `,
      "BorrowCaps",
      [
        new Arg("cointroller", getCointroller, {implicit: true}),
        new Arg("RToken", getRTokenV),
      ],
      async (world, {cointroller, RToken}) => {
        return new NumberV(await cointroller.methods.borrowCaps(RToken._address).call());
      }
    )
  ];
}

export async function getCointrollerValue(world: World, event: Event): Promise<Value> {
  return await getFetcherValue<any, any>("Cointroller", cointrollerFetchers(), world, event);
}
