pragma solidity ^0.8.0;

import "./IPancakeV2Pair.sol";


interface IPancakeV2Flashloan {
  event SetPairs(
    address[] tokens,
    IPancakeV2Pair[] pairs
  );

  function tokenToPair(address) external returns (IPancakeV2Pair);

  function setPairs(address[] calldata tokens, IPancakeV2Pair[] calldata pairs) external;
}
