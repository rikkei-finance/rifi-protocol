const { address, both, etherMantissa } = require('../Utils/Ethereum');
const { makeCointroller, makeRToken } = require('../Utils/Rifi');

describe('Cointroller', () => {
  let cointroller, rToken;
  let root, accounts;

  beforeEach(async () => {
    [root, ...accounts] = saddle.accounts;
  });

  describe("_setPauseGuardian", () => {
    beforeEach(async () => {
      cointroller = await makeCointroller();
    });

    describe("failing", () => {
      it("emits a failure log if not sent by admin", async () => {
        let result = await send(cointroller, '_setPauseGuardian', [root], {from: accounts[1]});
        expect(result).toHaveTrollFailure('UNAUTHORIZED', 'SET_PAUSE_GUARDIAN_OWNER_CHECK');
      });

      it("does not change the pause guardian", async () => {
        let pauseGuardian = await call(cointroller, 'pauseGuardian');
        expect(pauseGuardian).toEqual(address(0));
        await send(cointroller, '_setPauseGuardian', [root], {from: accounts[1]});

        pauseGuardian = await call(cointroller, 'pauseGuardian');
        expect(pauseGuardian).toEqual(address(0));
      });
    });


    describe('succesfully changing pause guardian', () => {
      let result;

      beforeEach(async () => {
        cointroller = await makeCointroller();

        result = await send(cointroller, '_setPauseGuardian', [accounts[1]]);
      });

      it('emits new pause guardian event', async () => {
        expect(result).toHaveLog(
          'NewPauseGuardian',
          {newPauseGuardian: accounts[1], oldPauseGuardian: address(0)}
        );
      });

      it('changes pending pause guardian', async () => {
        let pauseGuardian = await call(cointroller, 'pauseGuardian');
        expect(pauseGuardian).toEqual(accounts[1]);
      });
    });
  });

  describe('setting paused', () => {
    beforeEach(async () => {
      rToken = await makeRToken({supportMarket: true});
      cointroller = rToken.cointroller;
    });

    let globalMethods = ["Transfer", "Seize"];
    describe('succeeding', () => {
      let pauseGuardian;
      beforeEach(async () => {
        pauseGuardian = accounts[1];
        await send(cointroller, '_setPauseGuardian', [accounts[1]], {from: root});
      });

      globalMethods.forEach(async (method) => {
        it(`only pause guardian or admin can pause ${method}`, async () => {
          await expect(send(cointroller, `_set${method}Paused`, [true], {from: accounts[2]})).rejects.toRevert("revert only pause guardian and admin can pause");
          await expect(send(cointroller, `_set${method}Paused`, [false], {from: accounts[2]})).rejects.toRevert("revert only pause guardian and admin can pause");
        });

        it(`PauseGuardian can pause of ${method}GuardianPaused`, async () => {
          result = await send(cointroller, `_set${method}Paused`, [true], {from: pauseGuardian});
          expect(result).toHaveLog(`ActionPaused`, {action: method, pauseState: true});

          let camelCase = method.charAt(0).toLowerCase() + method.substring(1);

          state = await call(cointroller, `${camelCase}GuardianPaused`);
          expect(state).toEqual(true);

          await expect(send(cointroller, `_set${method}Paused`, [false], {from: pauseGuardian})).rejects.toRevert("revert only admin can unpause");
          result = await send(cointroller, `_set${method}Paused`, [false]);

          expect(result).toHaveLog(`ActionPaused`, {action: method, pauseState: false});

          state = await call(cointroller, `${camelCase}GuardianPaused`);
          expect(state).toEqual(false);
        });

        it(`pauses ${method}`, async() => {
          await send(cointroller, `_set${method}Paused`, [true], {from: pauseGuardian});
          switch (method) {
          case "Transfer":
            await expect(
              send(cointroller, 'transferAllowed', [address(1), address(2), address(3), 1])
            ).rejects.toRevert(`revert ${method.toLowerCase()} is paused`);
            break;

          case "Seize":
            await expect(
              send(cointroller, 'seizeAllowed', [address(1), address(2), address(3), address(4), 1])
            ).rejects.toRevert(`revert ${method.toLowerCase()} is paused`);
            break;

          default:
            break;
          }
        });
      });
    });

    let marketMethods = ["Borrow", "Mint"];
    describe('succeeding', () => {
      let pauseGuardian;
      beforeEach(async () => {
        pauseGuardian = accounts[1];
        await send(cointroller, '_setPauseGuardian', [accounts[1]], {from: root});
      });

      marketMethods.forEach(async (method) => {
        it(`only pause guardian or admin can pause ${method}`, async () => {
          await expect(send(cointroller, `_set${method}Paused`, [rToken._address, true], {from: accounts[2]})).rejects.toRevert("revert only pause guardian and admin can pause");
          await expect(send(cointroller, `_set${method}Paused`, [rToken._address, false], {from: accounts[2]})).rejects.toRevert("revert only pause guardian and admin can pause");
        });

        it(`PauseGuardian can pause of ${method}GuardianPaused`, async () => {
          result = await send(cointroller, `_set${method}Paused`, [rToken._address, true], {from: pauseGuardian});
          expect(result).toHaveLog(`ActionPaused`, {rToken: rToken._address, action: method, pauseState: true});

          let camelCase = method.charAt(0).toLowerCase() + method.substring(1);

          state = await call(cointroller, `${camelCase}GuardianPaused`, [rToken._address]);
          expect(state).toEqual(true);

          await expect(send(cointroller, `_set${method}Paused`, [rToken._address, false], {from: pauseGuardian})).rejects.toRevert("revert only admin can unpause");
          result = await send(cointroller, `_set${method}Paused`, [rToken._address, false]);

          expect(result).toHaveLog(`ActionPaused`, {rToken: rToken._address, action: method, pauseState: false});

          state = await call(cointroller, `${camelCase}GuardianPaused`, [rToken._address]);
          expect(state).toEqual(false);
        });

        it(`pauses ${method}`, async() => {
          await send(cointroller, `_set${method}Paused`, [rToken._address, true], {from: pauseGuardian});
          switch (method) {
          case "Mint":
            expect(await call(cointroller, 'mintAllowed', [address(1), address(2), 1])).toHaveTrollError('MARKET_NOT_LISTED');
            await expect(send(cointroller, 'mintAllowed', [rToken._address, address(2), 1])).rejects.toRevert(`revert ${method.toLowerCase()} is paused`);
            break;

          case "Borrow":
            expect(await call(cointroller, 'borrowAllowed', [address(1), address(2), 1])).toHaveTrollError('MARKET_NOT_LISTED');
            await expect(send(cointroller, 'borrowAllowed', [rToken._address, address(2), 1])).rejects.toRevert(`revert ${method.toLowerCase()} is paused`);
            break;

          default:
            break;
          }
        });
      });
    });
  });
});
