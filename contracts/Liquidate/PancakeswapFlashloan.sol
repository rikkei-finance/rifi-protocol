pragma solidity ^0.8.10;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "./interfaces/IPancakeCallee.sol";
import "./interfaces/IPancakeV2Flashloan.sol";
import "./interfaces/IPancakeV2Pair.sol";

abstract contract PancakeswapFlashloan is IPancakeV2Flashloan, IPancakeCallee {

  using SafeERC20 for IERC20;

  mapping(address => IPancakeV2Pair) public override tokenToPair;


  // _______USER FUNCTIONS_______

  function _flashLoan(
    address token,
    uint256 amount,
    bytes memory data 
  ) internal {
    IPancakeV2Pair pair = tokenToPair[token];
    uint256 amount0Out;
    uint256 amount1Out;

    if (pair.token0() == token) {
      amount0Out = amount;
    } else {
      amount1Out = amount;
    }
    // Flash loan based on principal + interest
    pair.swap(amount0Out, amount1Out, address(this), data);
  }

  // _______ADMIN FUNCTIONS_______


  function _setPairs(address[] calldata tokens, IPancakeV2Pair[] calldata pairs) internal {
    uint256 length = tokens.length;
    require(length == pairs.length, "mismatch length");
    for (uint256 i = 0; i < length; i++) {
      _setPair(tokens[i], pairs[i]);
    }

    emit SetPairs(tokens, pairs);
  }

  // _______HOOKS_______
  function pancakeCall(address initiator, uint256 amount0, uint256 amount1, bytes calldata data) external override {
    require(initiator == address(this), "not initiator");

    uint256 amount;
    address token;
    uint fee;
    {
      address token0 = IPancakeV2Pair(msg.sender).token0();
      address token1 = IPancakeV2Pair(msg.sender).token1();

      if (amount0 > 0) {
        amount = amount0;
        token = token0;
      } else {
        amount = amount1;
        token = token1;
      }

      require(amount0 == 0 || amount1 == 0, "this strategy is unidirectional");
      require(msg.sender == address(tokenToPair[token]), "invalid pair");

      // fee = amount * 25 / 9975
      fee = ((amount + 399) * 25 / 9975 ); // trick for minimal round up fee (399 = ((9975 - 1) / 25))
    }

    _handleFlashLoan(IERC20(token), amount, fee, data);
    IERC20(token).safeTransfer(msg.sender, amount + fee);
  }

  // _______INTERNAL FUNCTIONS_______

  function _setPair(address token, IPancakeV2Pair pair) internal {
    tokenToPair[token] = pair;
  }

  function _handleFlashLoan(
    IERC20 token,
    uint256 amount,
    uint256 fee,
    bytes calldata data
  ) internal virtual;

  function setPairs(address[] calldata tokens, IPancakeV2Pair[] calldata pairs) external override virtual;
}
