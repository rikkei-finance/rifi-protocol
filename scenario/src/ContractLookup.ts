import { Map } from 'immutable';

import { Event } from './Event';
import { World } from './World';
import { Contract } from './Contract';
import { mustString } from './Utils';

import { RBep20Delegate } from './Contract/RBep20Delegate';
import { Rifi } from './Contract/Rifi';
import { Cointroller } from './Contract/Cointroller';
import { CointrollerImpl } from './Contract/CointrollerImpl';
import { RToken } from './Contract/RToken';
import { Governor } from './Contract/Governor';
import { Bep20 } from './Contract/Bep20';
import { InterestRateModel } from './Contract/InterestRateModel';
import { PriceOracle } from './Contract/PriceOracle';
import { Timelock } from './Contract/Timelock';
import { AnchoredView } from './Contract/AnchoredView';

type ContractDataEl = string | Map<string, object> | undefined;

function getContractData(world: World, indices: string[][]): ContractDataEl {
  return indices.reduce((value: ContractDataEl, index) => {
    if (value) {
      return value;
    } else {
      return index.reduce((data: ContractDataEl, el) => {
        let lowerEl = el.toLowerCase();

        if (!data) {
          return;
        } else if (typeof data === 'string') {
          return data;
        } else {
          return (data as Map<string, ContractDataEl>).find((_v, key) => key.toLowerCase().trim() === lowerEl.trim());
        }
      }, world.contractData);
    }
  }, undefined);
}

function getContractDataString(world: World, indices: string[][]): string {
  const value: ContractDataEl = getContractData(world, indices);

  if (!value || typeof value !== 'string') {
    throw new Error(
      `Failed to find string value by index (got ${value}): ${JSON.stringify(
        indices
      )}, index contains: ${JSON.stringify(world.contractData.toJSON())}`
    );
  }

  return value;
}

export function getWorldContract<T>(world: World, indices: string[][]): T {
  const address = getContractDataString(world, indices);

  return getWorldContractByAddress<T>(world, address);
}

export function getWorldContractByAddress<T>(world: World, address: string): T {
  const contract = world.contractIndex[address.toLowerCase()];

  if (!contract) {
    throw new Error(
      `Failed to find world contract by address: ${address}, index contains: ${JSON.stringify(
        Object.keys(world.contractIndex)
      )}`
    );
  }

  return <T>(<unknown>contract);
}

export async function getTimelock(world: World): Promise<Timelock> {
  return getWorldContract(world, [['Contracts', 'Timelock']]);
}

export async function getUnitroller(world: World): Promise<Cointroller> {
  return getWorldContract(world, [['Contracts', 'Unitroller']]);
}

export async function getMaximillion(world: World): Promise<Cointroller> {
  return getWorldContract(world, [['Contracts', 'Maximillion']]);
}

export async function getCointroller(world: World): Promise<Cointroller> {
  return getWorldContract(world, [['Contracts', 'Cointroller']]);
}

export async function getCointrollerImpl(world: World, cointrollerImplArg: Event): Promise<CointrollerImpl> {
  return getWorldContract(world, [['Cointroller', mustString(cointrollerImplArg), 'address']]);
}

export function getRTokenAddress(world: World, rTokenArg: string): string {
  return getContractDataString(world, [['rTokens', rTokenArg, 'address']]);
}

export function getRTokenDelegateAddress(world: World, rTokenDelegateArg: string): string {
  return getContractDataString(world, [['RTokenDelegate', rTokenDelegateArg, 'address']]);
}

export function getBep20Address(world: World, bep20Arg: string): string {
  return getContractDataString(world, [['Tokens', bep20Arg, 'address']]);
}

export function getGovernorAddress(world: World, governorArg: string): string {
  return getContractDataString(world, [['Contracts', governorArg]]);
}

export async function getPriceOracleProxy(world: World): Promise<PriceOracle> {
  return getWorldContract(world, [['Contracts', 'PriceOracleProxy']]);
}

export async function getAnchoredView(world: World): Promise<AnchoredView> {
  return getWorldContract(world, [['Contracts', 'AnchoredView']]);
}

export async function getPriceOracle(world: World): Promise<PriceOracle> {
  return getWorldContract(world, [['Contracts', 'PriceOracle']]);
}

export async function getRifi(
  world: World,
  rifiArg: Event
): Promise<Rifi> {
  return getWorldContract(world, [['Rifi', 'address']]);
}

export async function getRifiData(
  world: World,
  rifiArg: string
): Promise<[Rifi, string, Map<string, string>]> {
  let contract = await getRifi(world, <Event>(<any>rifiArg));
  let data = getContractData(world, [['Rifi', rifiArg]]);

  return [contract, rifiArg, <Map<string, string>>(<any>data)];
}

export async function getGovernorData(
  world: World,
  governorArg: string
): Promise<[Governor, string, Map<string, string>]> {
  let contract = getWorldContract<Governor>(world, [['Governor', governorArg, 'address']]);
  let data = getContractData(world, [['Governor', governorArg]]);

  return [contract, governorArg, <Map<string, string>>(<any>data)];
}

export async function getInterestRateModel(
  world: World,
  interestRateModelArg: Event
): Promise<InterestRateModel> {
  return getWorldContract(world, [['InterestRateModel', mustString(interestRateModelArg), 'address']]);
}

export async function getInterestRateModelData(
  world: World,
  interestRateModelArg: string
): Promise<[InterestRateModel, string, Map<string, string>]> {
  let contract = await getInterestRateModel(world, <Event>(<any>interestRateModelArg));
  let data = getContractData(world, [['InterestRateModel', interestRateModelArg]]);

  return [contract, interestRateModelArg, <Map<string, string>>(<any>data)];
}

export async function getBep20Data(
  world: World,
  bep20Arg: string
): Promise<[Bep20, string, Map<string, string>]> {
  let contract = getWorldContract<Bep20>(world, [['Tokens', bep20Arg, 'address']]);
  let data = getContractData(world, [['Tokens', bep20Arg]]);

  return [contract, bep20Arg, <Map<string, string>>(<any>data)];
}

export async function getRTokenData(
  world: World,
  rTokenArg: string
): Promise<[RToken, string, Map<string, string>]> {
  let contract = getWorldContract<RToken>(world, [['rTokens', rTokenArg, 'address']]);
  let data = getContractData(world, [['RTokens', rTokenArg]]);

  return [contract, rTokenArg, <Map<string, string>>(<any>data)];
}

export async function getRTokenDelegateData(
  world: World,
  rTokenDelegateArg: string
): Promise<[RBep20Delegate, string, Map<string, string>]> {
  let contract = getWorldContract<RBep20Delegate>(world, [['RTokenDelegate', rTokenDelegateArg, 'address']]);
  let data = getContractData(world, [['RTokenDelegate', rTokenDelegateArg]]);

  return [contract, rTokenDelegateArg, <Map<string, string>>(<any>data)];
}

export async function getCointrollerImplData(
  world: World,
  cointrollerImplArg: string
): Promise<[CointrollerImpl, string, Map<string, string>]> {
  let contract = await getCointrollerImpl(world, <Event>(<any>cointrollerImplArg));
  let data = getContractData(world, [['Cointroller', cointrollerImplArg]]);

  return [contract, cointrollerImplArg, <Map<string, string>>(<any>data)];
}

export function getAddress(world: World, addressArg: string): string {
  if (addressArg.toLowerCase() === 'zero') {
    return '0x0000000000000000000000000000000000000000';
  }

  if (addressArg.startsWith('0x')) {
    return addressArg;
  }

  let alias = Object.entries(world.settings.aliases).find(
    ([alias, addr]) => alias.toLowerCase() === addressArg.toLowerCase()
  );
  if (alias) {
    return alias[1];
  }

  let account = world.accounts.find(account => account.name.toLowerCase() === addressArg.toLowerCase());
  if (account) {
    return account.address;
  }

  return getContractDataString(world, [
    ['Contracts', addressArg],
    ['rTokens', addressArg, 'address'],
    ['RTokenDelegate', addressArg, 'address'],
    ['Tokens', addressArg, 'address'],
    ['Cointroller', addressArg, 'address']
  ]);
}

export function getContractByName(world: World, name: string): Contract {
  return getWorldContract(world, [['Contracts', name]]);
}
