import { Event } from '../Event';
import { World } from '../World';
import { Rifi } from '../Contract/Rifi';
import {
  getAddressV,
  getNumberV
} from '../CoreValue';
import {
  AddressV,
  ListV,
  NumberV,
  StringV,
  Value
} from '../Value';
import { Arg, Fetcher, getFetcherValue } from '../Command';
import { getRifi } from '../ContractLookup';

export function rifiFetchers() {
  return [
    new Fetcher<{ rifi: Rifi }, AddressV>(`
        #### Address

        * "<Rifi> Address" - Returns the address of Rifi token
          * E.g. "Rifi Address"
      `,
      "Address",
      [
        new Arg("rifi", getRifi, { implicit: true })
      ],
      async (world, { rifi }) => new AddressV(rifi._address)
    ),

    new Fetcher<{ rifi: Rifi }, StringV>(`
        #### Name

        * "<Rifi> Name" - Returns the name of the Rifi token
          * E.g. "Rifi Name"
      `,
      "Name",
      [
        new Arg("rifi", getRifi, { implicit: true })
      ],
      async (world, { rifi }) => new StringV(await rifi.methods.name().call())
    ),

    new Fetcher<{ rifi: Rifi }, StringV>(`
        #### Symbol

        * "<Rifi> Symbol" - Returns the symbol of the Rifi token
          * E.g. "Rifi Symbol"
      `,
      "Symbol",
      [
        new Arg("rifi", getRifi, { implicit: true })
      ],
      async (world, { rifi }) => new StringV(await rifi.methods.symbol().call())
    ),

    new Fetcher<{ rifi: Rifi }, NumberV>(`
        #### Decimals

        * "<Rifi> Decimals" - Returns the number of decimals of the Rifi token
          * E.g. "Rifi Decimals"
      `,
      "Decimals",
      [
        new Arg("rifi", getRifi, { implicit: true })
      ],
      async (world, { rifi }) => new NumberV(await rifi.methods.decimals().call())
    ),

    new Fetcher<{ rifi: Rifi }, NumberV>(`
        #### TotalSupply

        * "Rifi TotalSupply" - Returns Rifi token's total supply
      `,
      "TotalSupply",
      [
        new Arg("rifi", getRifi, { implicit: true })
      ],
      async (world, { rifi }) => new NumberV(await rifi.methods.totalSupply().call())
    ),

    new Fetcher<{ rifi: Rifi, address: AddressV }, NumberV>(`
        #### TokenBalance

        * "Rifi TokenBalance <Address>" - Returns the Rifi token balance of a given address
          * E.g. "Rifi TokenBalance Geoff" - Returns Geoff's Rifi balance
      `,
      "TokenBalance",
      [
        new Arg("rifi", getRifi, { implicit: true }),
        new Arg("address", getAddressV)
      ],
      async (world, { rifi, address }) => new NumberV(await rifi.methods.balanceOf(address.val).call())
    ),

    new Fetcher<{ rifi: Rifi, owner: AddressV, spender: AddressV }, NumberV>(`
        #### Allowance

        * "Rifi Allowance owner:<Address> spender:<Address>" - Returns the Rifi allowance from owner to spender
          * E.g. "Rifi Allowance Geoff Torrey" - Returns the Rifi allowance of Geoff to Torrey
      `,
      "Allowance",
      [
        new Arg("rifi", getRifi, { implicit: true }),
        new Arg("owner", getAddressV),
        new Arg("spender", getAddressV)
      ],
      async (world, { rifi, owner, spender }) => new NumberV(await rifi.methods.allowance(owner.val, spender.val).call())
    ),

    new Fetcher<{ rifi: Rifi, account: AddressV }, NumberV>(`
        #### GetCurrentVotes

        * "Rifi GetCurrentVotes account:<Address>" - Returns the current Rifi votes balance for an account
          * E.g. "Rifi GetCurrentVotes Geoff" - Returns the current Rifi vote balance of Geoff
      `,
      "GetCurrentVotes",
      [
        new Arg("rifi", getRifi, { implicit: true }),
        new Arg("account", getAddressV),
      ],
      async (world, { rifi, account }) => new NumberV(await rifi.methods.getCurrentVotes(account.val).call())
    ),

    new Fetcher<{ rifi: Rifi, account: AddressV, blockNumber: NumberV }, NumberV>(`
        #### GetPriorVotes

        * "Rifi GetPriorVotes account:<Address> blockBumber:<Number>" - Returns the current Rifi votes balance at given block
          * E.g. "Rifi GetPriorVotes Geoff 5" - Returns the Rifi vote balance for Geoff at block 5
      `,
      "GetPriorVotes",
      [
        new Arg("rifi", getRifi, { implicit: true }),
        new Arg("account", getAddressV),
        new Arg("blockNumber", getNumberV),
      ],
      async (world, { rifi, account, blockNumber }) => new NumberV(await rifi.methods.getPriorVotes(account.val, blockNumber.encode()).call())
    ),

    new Fetcher<{ rifi: Rifi, account: AddressV }, NumberV>(`
        #### GetCurrentVotesBlock

        * "Rifi GetCurrentVotesBlock account:<Address>" - Returns the current Rifi votes checkpoint block for an account
          * E.g. "Rifi GetCurrentVotesBlock Geoff" - Returns the current Rifi votes checkpoint block for Geoff
      `,
      "GetCurrentVotesBlock",
      [
        new Arg("rifi", getRifi, { implicit: true }),
        new Arg("account", getAddressV),
      ],
      async (world, { rifi, account }) => {
        const numCheckpoints = Number(await rifi.methods.numCheckpoints(account.val).call());
        const checkpoint = await rifi.methods.checkpoints(account.val, numCheckpoints - 1).call();

        return new NumberV(checkpoint.fromBlock);
      }
    ),

    new Fetcher<{ rifi: Rifi, account: AddressV }, NumberV>(`
        #### VotesLength

        * "Rifi VotesLength account:<Address>" - Returns the Rifi vote checkpoint array length
          * E.g. "Rifi VotesLength Geoff" - Returns the Rifi vote checkpoint array length of Geoff
      `,
      "VotesLength",
      [
        new Arg("rifi", getRifi, { implicit: true }),
        new Arg("account", getAddressV),
      ],
      async (world, { rifi, account }) => new NumberV(await rifi.methods.numCheckpoints(account.val).call())
    ),

    new Fetcher<{ rifi: Rifi, account: AddressV }, ListV>(`
        #### AllVotes

        * "Rifi AllVotes account:<Address>" - Returns information about all votes an account has had
          * E.g. "Rifi AllVotes Geoff" - Returns the Rifi vote checkpoint array
      `,
      "AllVotes",
      [
        new Arg("rifi", getRifi, { implicit: true }),
        new Arg("account", getAddressV),
      ],
      async (world, { rifi, account }) => {
        const numCheckpoints = Number(await rifi.methods.numCheckpoints(account.val).call());
        const checkpoints = await Promise.all(new Array(numCheckpoints).fill(undefined).map(async (_, i) => {
          const {fromBlock, votes} = await rifi.methods.checkpoints(account.val, i).call();

          return new StringV(`Block ${fromBlock}: ${votes} vote${votes !== 1 ? "s" : ""}`);
        }));

        return new ListV(checkpoints);
      }
    )
  ];
}

export async function getRifiValue(world: World, event: Event): Promise<Value> {
  return await getFetcherValue<any, any>("Rifi", rifiFetchers(), world, event);
}
