import {Event} from '../Event';
import {World} from '../World';
import {CointrollerImpl} from '../Contract/CointrollerImpl';
import {
  getAddressV
} from '../CoreValue';
import {
  AddressV,
  Value
} from '../Value';
import {Arg, Fetcher, getFetcherValue} from '../Command';
import {getCointrollerImpl} from '../ContractLookup';

export async function getCointrollerImplAddress(world: World, cointrollerImpl: CointrollerImpl): Promise<AddressV> {
  return new AddressV(cointrollerImpl._address);
}

export function cointrollerImplFetchers() {
  return [
    new Fetcher<{cointrollerImpl: CointrollerImpl}, AddressV>(`
        #### Address

        * "CointrollerImpl Address" - Returns address of cointroller implementation
      `,
      "Address",
      [new Arg("cointrollerImpl", getCointrollerImpl)],
      (world, {cointrollerImpl}) => getCointrollerImplAddress(world, cointrollerImpl),
      {namePos: 1}
    )
  ];
}

export async function getCointrollerImplValue(world: World, event: Event): Promise<Value> {
  return await getFetcherValue<any, any>("CointrollerImpl", cointrollerImplFetchers(), world, event);
}
