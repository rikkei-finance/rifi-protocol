import { Event } from '../Event';
import { World } from '../World';
import { RBep20Delegate } from '../Contract/RBep20Delegate';
import {
  getCoreValue,
  mapValue
} from '../CoreValue';
import { Arg, Fetcher, getFetcherValue } from '../Command';
import {
  AddressV,
  Value,
} from '../Value';
import { getWorldContractByAddress, getRTokenDelegateAddress } from '../ContractLookup';

export async function getRTokenDelegateV(world: World, event: Event): Promise<RBep20Delegate> {
  const address = await mapValue<AddressV>(
    world,
    event,
    (str) => new AddressV(getRTokenDelegateAddress(world, str)),
    getCoreValue,
    AddressV
  );

  return getWorldContractByAddress<RBep20Delegate>(world, address.val);
}

async function rTokenDelegateAddress(world: World, rTokenDelegate: RBep20Delegate): Promise<AddressV> {
  return new AddressV(rTokenDelegate._address);
}

export function rTokenDelegateFetchers() {
  return [
    new Fetcher<{ rTokenDelegate: RBep20Delegate }, AddressV>(`
        #### Address

        * "RTokenDelegate <RTokenDelegate> Address" - Returns address of RTokenDelegate contract
          * E.g. "RTokenDelegate rDaiDelegate Address" - Returns rDaiDelegate's address
      `,
      "Address",
      [
        new Arg("rTokenDelegate", getRTokenDelegateV)
      ],
      (world, { rTokenDelegate }) => rTokenDelegateAddress(world, rTokenDelegate),
      { namePos: 1 }
    ),
  ];
}

export async function getRTokenDelegateValue(world: World, event: Event): Promise<Value> {
  return await getFetcherValue<any, any>("RTokenDelegate", rTokenDelegateFetchers(), world, event);
}
