import { Contract } from '../Contract';
import { Sendable } from '../Invokation';
import { RTokenMethods, RTokenScenarioMethods } from './RToken';

interface RBep20DelegateMethods extends RTokenMethods {
  _becomeImplementation(data: string): Sendable<void>;
  _resignImplementation(): Sendable<void>;
}

interface RBep20DelegateScenarioMethods extends RTokenScenarioMethods {
  _becomeImplementation(data: string): Sendable<void>;
  _resignImplementation(): Sendable<void>;
}

export interface RBep20Delegate extends Contract {
  methods: RBep20DelegateMethods;
  name: string;
}

export interface RBep20DelegateScenario extends Contract {
  methods: RBep20DelegateScenarioMethods;
  name: string;
}
