pragma solidity ^0.8.10;

import "./RToken.sol";

/**
 * @title Rifi's RAstar Contract
 * @notice RToken which wraps Astar
 * @author Rifi
 */
contract RAstar is RToken {
    /**
     * @notice Construct a new RAstar money market
     * @param cointroller_ The address of the Cointroller
     * @param interestRateModel_ The address of the interest rate model
     * @param initialExchangeRateMantissa_ The initial exchange rate, scaled by 1e18
     * @param name_ ERC-20 name of this token
     * @param symbol_ ERC-20 symbol of this token
     * @param decimals_ ERC-20 decimal precision of this token
     * @param admin_ Address of the administrator of this token
     */
    constructor(CointrollerInterface cointroller_,
                InterestRateModel interestRateModel_,
                uint initialExchangeRateMantissa_,
                string memory name_,
                string memory symbol_,
                uint8 decimals_,
                address payable admin_) {
        // Creator of the contract is admin during initialization
        admin = payable(msg.sender);

        initialize(cointroller_, interestRateModel_, initialExchangeRateMantissa_, name_, symbol_, decimals_);

        // Set the proper admin now that initialization is done
        admin = admin_;
    }


    /*** User Interface ***/

    /**
     * @notice Sender supplies assets into the market and receives rTokens in exchange
     * @dev Reverts upon any failure
     */
    function mint() external payable {
        mintInternal(msg.value);
    }

    /**
     * @notice Sender redeems rTokens in exchange for the underlying asset
     * @dev Accrues interest whether or not the operation succeeds, unless reverted
     * @param redeemTokens The number of rTokens to redeem into underlying
     * @return uint 0=success, otherwise a failure (see ErrorReporter.sol for details)
     */
    function redeem(uint redeemTokens) external returns (uint) {
        redeemInternal(redeemTokens);
        return NO_ERROR;
    }

    /**
     * @notice Sender redeems rTokens in exchange for a specified amount of underlying asset
     * @dev Accrues interest whether or not the operation succeeds, unless reverted
     * @param redeemAmount The amount of underlying to redeem
     * @return uint 0=success, otherwise a failure (see ErrorReporter.sol for details)
     */
    function redeemUnderlying(uint redeemAmount) external returns (uint) {
        redeemUnderlyingInternal(redeemAmount);
        return NO_ERROR;
    }

    /**
      * @notice Sender borrows assets from the protocol to their own address
      * @param borrowAmount The amount of the underlying asset to borrow
      * @return uint 0=success, otherwise a failure (see ErrorReporter.sol for details)
      */
    function borrow(uint borrowAmount) external returns (uint) {
        borrowInternal(borrowAmount);
        return NO_ERROR;
    }

    /**
     * @notice Sender repays their own borrow
     * @dev Reverts upon any failure
     */
    function repayBorrow() external payable {
        repayBorrowInternal(msg.value);
    }

    /**
     * @notice Sender repays a borrow belonging to borrower
     * @dev Reverts upon any failure
     * @param borrower the account with the debt being payed off
     */
    function repayBorrowBehalf(address borrower) external payable {
        repayBorrowBehalfInternal(borrower, msg.value);
    }

    /**
     * @notice The sender liquidates the borrowers collateral.
     *  The collateral seized is transferred to the liquidator.
     * @dev Reverts upon any failure
     * @param borrower The borrower of this rToken to be liquidated
     * @param rTokenCollateral The market in which to seize collateral from the borrower
     */
    function liquidateBorrow(address borrower, RToken rTokenCollateral) external payable {
        liquidateBorrowInternal(borrower, msg.value, rTokenCollateral);
    }

    /**
     * @notice The sender adds to reserves.
     * @return uint 0=success, otherwise a failure (see ErrorReporter.sol for details)
     */
    function _addReserves() external payable returns (uint) {
        return _addReservesInternal(msg.value);
    }

    /**
     * @notice Send Astar to RAstar to mint
     */
    receive() external payable {
        mintInternal(msg.value);
    }

    /*** Safe Token ***/

    /**
     * @notice Gets balance of this contract in terms of Astar, before this message
     * @dev This excludes the value of the current message, if any
     * @return The quantity of Astar owned by this contract
     */
    function getCashPrior() override internal view returns (uint) {
        return address(this).balance - msg.value;
    }

    /**
     * @notice Perform the actual transfer in, which is a no-op
     * @param from Address sending the Astar
     * @param amount Amount of Astar being sent
     * @return The actual amount of Astar transferred
     */
    function doTransferIn(address from, uint amount) override internal returns (uint) {
        // Sanity checks
        require(msg.sender == from, "sender mismatch");
        require(msg.value == amount, "value mismatch");
        return amount;
    }

    function doTransferOut(address payable to, uint amount) virtual override internal {
        /* Send the Astar, with minimal gas and revert on failure */
        to.transfer(amount);
    }
}
