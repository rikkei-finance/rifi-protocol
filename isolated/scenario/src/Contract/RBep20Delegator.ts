import { Contract } from '../Contract';
import { Callable, Sendable } from '../Invokation';
import { RTokenMethods } from './RToken';
import { encodedNumber } from '../Encoding';

interface RBep20DelegatorMethods extends RTokenMethods {
  implementation(): Callable<string>;
  _setImplementation(
    implementation_: string,
    allowResign: boolean,
    becomImplementationData: string
  ): Sendable<void>;
}

interface RBep20DelegatorScenarioMethods extends RBep20DelegatorMethods {
  setTotalBorrows(amount: encodedNumber): Sendable<void>;
  setTotalReserves(amount: encodedNumber): Sendable<void>;
}

export interface RBep20Delegator extends Contract {
  methods: RBep20DelegatorMethods;
  name: string;
}

export interface RBep20DelegatorScenario extends Contract {
  methods: RBep20DelegatorMethods;
  name: string;
}
