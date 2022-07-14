pragma solidity ^0.8.10;

import "./RNative.sol";

/**
 * @title Rifi's Maximillion Contract
 * @author Rifi
 */
contract Maximillion {
    /**
     * @notice The default rNative market to repay in
     */
    RNative public rNative;

    /**
     * @notice Construct a Maximillion to repay max in a RNative market
     */
    constructor(RNative rNative_) public {
        rNative = rNative_;
    }

    /**
     * @notice msg.sender sends Native token to repay an account's borrow in the rNative market
     * @dev The provided Native token is applied towards the borrow balance, any excess is refunded
     * @param borrower The address of the borrower account to repay on behalf of
     */
    function repayBehalf(address borrower) public payable {
        repayBehalfExplicit(borrower, rNative);
    }

    /**
     * @notice msg.sender sends Native token to repay an account's borrow in a rNative market
     * @dev The provided Native token is applied towards the borrow balance, any excess is refunded
     * @param borrower The address of the borrower account to repay on behalf of
     * @param rNative_ The address of the rNative contract to repay in
     */
    function repayBehalfExplicit(address borrower, RNative rNative_) public payable {
        uint received = msg.value;
        uint borrows = rNative_.borrowBalanceCurrent(borrower);
        if (received > borrows) {
            rNative_.repayBorrowBehalf{value: borrows}(borrower);
            payable(msg.sender).transfer(received - borrows);
        } else {
            rNative_.repayBorrowBehalf{value: received}(borrower);
        }
    }
}
