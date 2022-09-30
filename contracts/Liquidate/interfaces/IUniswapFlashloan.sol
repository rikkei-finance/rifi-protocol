pragma solidity >=0.7.5;

import "./IUniswapV3Pool.sol";

interface IUniswapFlashloan {
  event SetPairs(
    address[] tokens,
    IUniswapV3Pool[] pairs
  );

  function tokenToPair(address) external returns (IUniswapV3Pool);

  function setPairs(address[] calldata tokens, IUniswapV3Pool[] calldata pairs) external;
}