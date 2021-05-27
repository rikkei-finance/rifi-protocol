import { Contract } from '../Contract';
import { Callable, Sendable } from '../Invokation';
import { encodedNumber } from '../Encoding';

interface CointrollerImplMethods {
  _become(
    cointroller: string,
    priceOracle?: string,
    maxAssets?: encodedNumber,
    closeFactor?: encodedNumber,
    reinitializing?: boolean
  ): Sendable<string>;

  _become(
    cointroller: string,
    rifiRate: encodedNumber,
    rifiMarkets: string[],
    otherMarkets: string[]
  ): Sendable<string>;
}

export interface CointrollerImpl extends Contract {
  methods: CointrollerImplMethods;
}
