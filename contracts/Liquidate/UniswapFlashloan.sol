pragma solidity ^0.8.10;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IUniswapV3Pool.sol";
import "./interfaces/IUniswapFlashloan.sol";
import "./interfaces/IUniswapV3FlashCallback.sol";
import "./NoDelegateCall.sol";

abstract contract UniswapFlashloan is IUniswapFlashloan, IUniswapV3FlashCallback, NoDelegateCall {

  using SafeERC20 for IERC20;

  mapping(address => IUniswapV3Pool) public override tokenToPair;

  // _______USER FUNCTIONS_______

  function _flashLoan(
    address token,
    uint256 amount,
    bytes memory data 
  ) internal {
    IUniswapV3Pool pair = tokenToPair[token];

    uint256 amount0Out;
    uint256 amount1Out;

    if (pair.token0() == token) {
      amount0Out = amount;
    } else {
      amount1Out = amount;
    }

    // Flash loan based on principal + interest
    pair.flash(address(this), amount0Out, amount1Out, data);
  }

  // _______ADMIN FUNCTIONS_______

  function _setPairs(address[] calldata tokens, IUniswapV3Pool[] calldata pairs) internal {
    uint256 length = tokens.length;
    require(length == pairs.length, "mismatch length");
    for (uint256 i = 0; i < length; i++) {
      _setPair(tokens[i], pairs[i]);
    }

    emit SetPairs(tokens, pairs);
  }

  // _______HOOKS_______

  function uniswapV3FlashCallback(uint256 fee0, uint256 fee1, bytes calldata data) external override {
    
    address token;
    uint fee;
    {
      address token0 = IUniswapV3Pool(msg.sender).token0();
      address token1 = IUniswapV3Pool(msg.sender).token1();

      if (fee0 > 0) {
        token = token0;
        fee = fee0;

      } else {
        token = token1;
        fee = fee1;
      }

      require(fee0 == 0 || fee1 == 0, "this strategy is unidirectional");
      require(msg.sender == address(tokenToPair[token]), "invalid pair");
    }

    uint256 amount = _handleFlashLoan(IERC20(token), fee, data);
    IERC20(token).safeTransfer(msg.sender, amount + fee);
  }

  // _______INTERNAL FUNCTIONS_______

  function _setPair(address token, IUniswapV3Pool pair) internal {
    tokenToPair[token] = pair;
  }

  function _handleFlashLoan(
    IERC20 token,
    uint256 fee,
    bytes calldata data
  ) internal virtual returns(uint);

  function setPairs(address[] calldata tokens, IUniswapV3Pool[] calldata pairs) external override virtual;
}
