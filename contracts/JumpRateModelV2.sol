pragma solidity ^0.8.10;

import "./BaseJumpRateModelV2.sol";
import "./InterestRateModel.sol";


/**
  * @title Rifi's JumpRateModel Contract V2 for V2 rTokens
  * @author Rifi
  * @notice Supports only for V2 rTokens
  */
contract JumpRateModelV2 is InterestRateModel, BaseJumpRateModelV2  {

	/**
     * @notice Calculates the current borrow rate per block
     * @param cash The amount of cash in the market
     * @param borrows The amount of borrows in the market
     * @param reserves The amount of reserves in the market
     * @return The borrow rate percentage per block as a mantissa (scaled by 1e18)
     */
    function getBorrowRate(uint cash, uint borrows, uint reserves) override external view returns (uint) {
        return getBorrowRateInternal(cash, borrows, reserves);
    }

    constructor(
        uint256 baseRatePerYear,
        uint256 lowerBaseRatePerYear,
        uint256 multiplierPerYear,
        uint256 jumpMultiplierPerYear,
        uint256 kink_,
        uint256 lowerKink_,
        address owner_
    )
        public
        BaseJumpRateModelV2(
            baseRatePerYear,
            lowerBaseRatePerYear,
            multiplierPerYear,
            jumpMultiplierPerYear,
            kink_,
            lowerKink_,
            owner_
        )
    {}
}
