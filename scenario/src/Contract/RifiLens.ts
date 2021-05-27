import { Contract } from '../Contract';
import { encodedNumber } from '../Encoding';
import { Callable, Sendable } from '../Invokation';

export interface RifiLensMethods {
  rTokenBalances(rToken: string, account: string): Sendable<[string,number,number,number,number,number]>;
  rTokenBalancesAll(rTokens: string[], account: string): Sendable<[string,number,number,number,number,number][]>;
  rTokenMetadata(rToken: string): Sendable<[string,number,number,number,number,number,number,number,number,boolean,number,string,number,number]>;
  rTokenMetadataAll(rTokens: string[]): Sendable<[string,number,number,number,number,number,number,number,number,boolean,number,string,number,number][]>;
  rTokenUnderlyingPrice(rToken: string): Sendable<[string,number]>;
  rTokenUnderlyingPriceAll(rTokens: string[]): Sendable<[string,number][]>;
  getAccountLimits(cointroller: string, account: string): Sendable<[string[],number,number]>;
}

export interface RifiLens extends Contract {
  methods: RifiLensMethods;
  name: string;
}
