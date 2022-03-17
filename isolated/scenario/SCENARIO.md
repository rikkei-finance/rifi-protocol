
# Types
* `name:<Type>` - Helper to describe arguments with names, not actually input this way
* `<Bool>` - `True` or `False`
* `<Number>` - A standard number (e.g. `5` or `6.0` or `10.0e18`)
* `<RToken>` - The local name for a given rToken when created, e.g. `rZRX`
* `<User>` - One of: `Admin, Bank, Geoff, Torrey, Robert, Coburn, Jared`
* `<String>` - A string, may be quoted but does not have to be if a single-word (e.g. `"Mint"` or `Mint`)
* `<Address>` - TODO
* `<Assertion>` - See assertions below.

# Events

## Core Events

* "History n:<Number>=5" - Prints history of actions
  * E.g. "History"
  * E.g. "History 10"
* `Read ...` - Reads given value and prints result
  * E.g. `Read RToken rBAT ExchangeRateStored` - Returns exchange rate of rBAT
* `Assert <Assertion>` - Validates given assertion, raising an exception if assertion fails
  * E.g. `Assert Equal (Bep20 BAT TokenBalance Geoff) (Exactly 5.0)` - Returns exchange rate of rBAT
* `FastForward n:<Number> Blocks` - For `RTokenScenario`, moves the block number forward n blocks. Note: in `RTokenScenario` the current block number is mocked (starting at 100000). Thus, this is the only way for the protocol to see a higher block number (for accruing interest).
  * E.g. `FastForward 5 Blocks` - Move block number forward 5 blocks.
* `Inspect` - Prints debugging information about the world
* `Debug message:<String>` - Same as inspect but prepends with a string
* `From <User> <Event>` - Runs event as the given user
  * E.g. `From Geoff (RToken rZRX Mint 5e18)`
* `Invariant <Invariant>` - Adds a new invariant to the world which is checked after each transaction
  * E.g. `Invariant Static (RToken rZRX TotalSupply)`
* `WipeInvariants` - Removes all invariants.
* `Cointroller <CointrollerEvent>` - Runs given Cointroller event
  * E.g. `Cointroller _setReserveFactor 0.5`
* `RToken <RTokenEvent>` - Runs given RToken event
  * E.g. `RToken rZRX Mint 5e18`
* `Bep20 <Bep20Event>` - Runs given Bep20 event
  * E.g. `Bep20 ZRX Facuet Geoff 5e18`
* `InterestRateModel ...event` - Runs given interest rate model event
  * E.g. `InterestRateModel Deployed (Fixed 0.5)`
* `PriceOracle <PriceOracleEvent>` - Runs given Price Oracle event
  * E.g. `PriceOracle SetPrice rZRX 1.5`

## Cointroller Events

* "Cointroller Deploy ...cointrollerParams" - Generates a new Cointroller
  * E.g. "Cointroller Deploy Scenario (PriceOracle Address) 0.1 10"
* `Cointroller SetPaused action:<String> paused:<Bool>` - Pauses or unpaused given rToken function (e.g. Mint)
  * E.g. `Cointroller SetPaused Mint True`
* `Cointroller SupportMarket <RToken>` - Adds support in the Cointroller for the given rToken
  * E.g. `Cointroller SupportMarket rZRX`
* `Cointroller EnterMarkets <User> <RToken> ...` - User enters the given markets
  * E.g. `Cointroller EnterMarkets Geoff rZRX rETH`
* `Cointroller SetMaxAssets <Number>` - Sets (or resets) the max allowed asset count
  * E.g. `Cointroller SetMaxAssets 4`
* `RToken <rToken> SetOracle oracle:<Contract>` - Sets the oracle
  * E.g. `Cointroller SetOracle (Fixed 1.5)`
* `Cointroller SetCollateralFactor <RToken> <Number>` - Sets the collateral factor for given rToken to number
  * E.g. `Cointroller SetCollateralFactor rZRX 0.1`
* `FastForward n:<Number> Blocks` - Moves the block number forward `n` blocks. Note: in `RTokenScenario` and `CointrollerScenario` the current block number is mocked (starting at 100000). This is the only way for the protocol to see a higher block number (for accruing interest).
  * E.g. `Cointroller FastForward 5 Blocks` - Move block number forward 5 blocks.

## rToken Events

* `RToken Deploy name:<RToken> underlying:<Contract> cointroller:<Contract> interestRateModel:<Contract> initialExchangeRate:<Number> decimals:<Number> admin:<Address>` - Generates a new cointroller and sets to world global
  * E.g. `RToken Deploy rZRX (Bep20 ZRX Address) (Cointroller Address) (InterestRateModel Address) 1.0 18`
* `RToken <rToken> AccrueInterest` - Accrues interest for given token
  * E.g. `RToken rZRX AccrueInterest`
* `RToken <rToken> Mint <User> amount:<Number>` - Mints the given amount of rToken as specified user
  * E.g. `RToken rZRX Mint Geoff 1.0`
* `RToken <rToken> Redeem <User> amount:<Number>` - Redeems the given amount of rToken as specified user
      * E.g. `RToken rZRX Redeem Geoff 1.0e18`
* `RToken <rToken> Borrow <User> amount:<Number>` - Borrows the given amount of this rToken as specified user
      * E.g. `RToken rZRX Borrow Geoff 1.0e18`
* `RToken <rToken> ReduceReserves amount:<Number>` - Reduces the reserves of the rToken
      * E.g. `RToken rZRX ReduceReserves 1.0e18`
* `RToken <rToken> SetReserveFactor amount:<Number>` - Sets the reserve factor for the rToken
      * E.g. `RToken rZRX SetReserveFactor 0.1`
* `RToken <rToken> SetInterestRateModel interestRateModel:<Contract>` - Sets the interest rate model for the given rToken
  * E.g. `RToken rZRX SetInterestRateModel (Fixed 1.5)`
* `RToken <rToken> SetCointroller cointroller:<Contract>` - Sets the cointroller for the given rToken
  * E.g. `RToken rZRX SetCointroller Cointroller`
* `RToken <rToken> Mock variable:<String> value:<Number>` - Mocks a given value on rToken. Note: value must be a supported mock and this will only work on a RTokenScenario contract.
  * E.g. `RToken rZRX Mock totalBorrows 5.0e18`
  * E.g. `RToken rZRX Mock totalReserves 0.5e18`

## Bep-20 Events

* `Bep20 Deploy name:<Bep20>` - Generates a new BEP-20 token by name
  * E.g. `Bep20 Deploy ZRX`
* `Bep20 <Bep20> Approve <User> <Address> <Amount>` - Adds an allowance between user and address
  * E.g. `Bep20 ZRX Approve Geoff rZRX 1.0e18`
* `Bep20 <Bep20> Faucet <Address> <Amount>` - Adds an arbitrary balance to given user
  * E.g. `Bep20 ZRX Facuet Geoff 1.0e18`

## Price Oracle Events

* `Deploy` - Generates a new price oracle (note: defaults to (Fixed 1.0))
  * E.g. `PriceOracle Deploy (Fixed 1.0)`
  * E.g. `PriceOracle Deploy Simple`
  * E.g. `PriceOracle Deploy NotPriceOracle`
* `SetPrice <RToken> <Amount>` - Sets the per-ether price for the given rToken
  * E.g. `PriceOracle SetPrice rZRX 1.0`

## Interest Rate Model Events

## Deploy

* `Deploy params:<String[]>` - Generates a new interest rate model (note: defaults to (Fixed 0.25))
  * E.g. `InterestRateModel Deploy (Fixed 0.5)`
  * E.g. `InterestRateModel Deploy Whitepaper`

# Values

## Core Values

* `True` - Returns true
* `False` - Returns false
* `Zero` - Returns 0
* `Some` - Returns 100e18
* `Little` - Returns 100e10
* `Exactly <Amount>` - Returns a strict numerical value
  * E.g. `Exactly 5.0`
* `Exp <Amount>` - Returns the mantissa for a given exp
  * E.g. `Exp 5.5`
* `Precisely <Amount>` - Matches a number to given number of significant figures
  * E.g. `Exactly 5.1000` - Matches to 5 sig figs
* `Anything` - Matches anything
* `Nothing` - Matches nothing
* `Default value:<Value> default:<Value>` - Returns value if truthy, otherwise default. Note: this does short-circuit
* `LastContract` - Returns the address of last constructed contract
* `User <...>` - Returns User value (see below)
* `Cointroller <...>` - Returns Cointroller value (see below)
* `RToken <...>` - Returns RToken value (see below)
* `Bep20 <...>` - Returns Bep20 value (see below)
* `InterestRateModel <...>` - Returns InterestRateModel value (see below)
* `PriceOracle <...>` - Returns PriceOracle value (see below)

## User Values

* `User <User> Address` - Returns address of user
  * E.g. `User Geoff Address` - Returns Geoff's address

## Cointroller Values

* `Cointroller Liquidity <User>` - Returns a given user's trued up liquidity
  * E.g. `Cointroller Liquidity Geoff`
* `Cointroller MembershipLength <User>` - Returns a given user's length of membership
  * E.g. `Cointroller MembershipLength Geoff`
* `Cointroller CheckMembership <User> <RToken>` - Returns one if user is in asset, zero otherwise.
  * E.g. `Cointroller CheckMembership Geoff rZRX`
* "Cointroller CheckListed <RToken>" - Returns true if market is listed, false otherwise.
  * E.g. "Cointroller CheckListed rZRX"

## RToken Values
* `RToken <RToken> UnderlyingBalance <User>` - Returns a user's underlying balance (based on given exchange rate)
  * E.g. `RToken rZRX UnderlyingBalance Geoff`
* `RToken <RToken> BorrowBalance <User>` - Returns a user's borrow balance (including interest)
  * E.g. `RToken rZRX BorrowBalance Geoff`
* `RToken <RToken> TotalBorrowBalance` - Returns the rToken's total borrow balance
  * E.g. `RToken rZRX TotalBorrowBalance`
* `RToken <RToken> Reserves` - Returns the rToken's total reserves
  * E.g. `RToken rZRX Reserves`
* `RToken <RToken> Cointroller` - Returns the rToken's cointroller
  * E.g. `RToken rZRX Cointroller`
* `RToken <RToken> PriceOracle` - Returns the rToken's price oracle
  * E.g. `RToken rZRX PriceOracle`
* `RToken <RToken> ExchangeRateStored` - Returns the rToken's exchange rate (based on balances stored)
  * E.g. `RToken rZRX ExchangeRateStored`
* `RToken <RToken> ExchangeRate` - Returns the rToken's current exchange rate
  * E.g. `RToken rZRX ExchangeRate`

## Bep-20 Values

* `Bep20 <Bep20> Address` - Returns address of BEP-20 contract
  * E.g. `Bep20 ZRX Address` - Returns ZRX's address
* `Bep20 <Bep20> Name` - Returns name of BEP-20 contract
  * E.g. `Bep20 ZRX Address` - Returns ZRX's name
* `Bep20 <Bep20> Symbol` - Returns symbol of BEP-20 contract
  * E.g. `Bep20 ZRX Symbol` - Returns ZRX's symbol
* `Bep20 <Bep20> Decimals` - Returns number of decimals in BEP-20 contract
  * E.g. `Bep20 ZRX Decimals` - Returns ZRX's decimals
* `Bep20 <Bep20> TotalSupply` - Returns the BEP-20 token's total supply
  * E.g. `Bep20 ZRX TotalSupply`
  * E.g. `Bep20 rZRX TotalSupply`
* `Bep20 <Bep20> TokenBalance <Address>` - Returns the BEP-20 token balance of a given address
  * E.g. `Bep20 ZRX TokenBalance Geoff` - Returns a user's ZRX balance
  * E.g. `Bep20 rZRX TokenBalance Geoff` - Returns a user's rZRX balance
  * E.g. `Bep20 ZRX TokenBalance rZRX` - Returns rZRX's ZRX balance
* `Bep20 <Bep20> Allowance owner:<Address> spender:<Address>` - Returns the BEP-20 allowance from owner to spender
  * E.g. `Bep20 ZRX Allowance Geoff Torrey` - Returns the ZRX allowance of Geoff to Torrey
  * E.g. `Bep20 rZRX Allowance Geoff Coburn` - Returns the rZRX allowance of Geoff to Coburn
  * E.g. `Bep20 ZRX Allowance Geoff rZRX` - Returns the ZRX allowance of Geoff to the rZRX rToken

## PriceOracle Values

* `Address` - Gets the address of the global price oracle
* `Price asset:<Address>` - Gets the price of the given asset

## Interest Rate Model Values

* `Address` - Gets the address of the global interest rate model

# Assertions

* `Equal given:<Value> expected:<Value>` - Asserts that given matches expected.
  * E.g. `Assert Equal (Exactly 0) Zero`
  * E.g. `Assert Equal (RToken rZRX TotalSupply) (Exactly 55)`
  * E.g. `Assert Equal (RToken rZRX Cointroller) (Cointroller Address)`
* `True given:<Value>` - Asserts that given is true.
  * E.g. `Assert True (Cointroller CheckMembership Geoff rETH)`
* `False given:<Value>` - Asserts that given is false.
  * E.g. `Assert False (Cointroller CheckMembership Geoff rETH)`
* `Failure error:<String> info:<String> detail:<Number?>` - Asserts that last transaction had a graceful failure with given error, info and detail.
  * E.g. `Assert Failure UNAUTHORIZED SUPPORT_MARKET_OWNER_CHECK`
  * E.g. `Assert Failure MATH_ERROR MINT_CALCULATE_BALANCE 5`
* `Revert` - Asserts that the last transaction reverted.
* `Success` - Asserts that the last transaction completed successfully (that is, did not revert nor emit graceful failure).
* `Log name:<String> ((key:<String> value:<Value>) ...)` - Asserts that last transaction emitted log with given name and key-value pairs.
  * E.g. `Assert Log Minted (("account" (User Geoff address)) ("amount" (Exactly 55)))`
