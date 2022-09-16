pragma solidity ^0.8.10;

import "./RMatic.sol";

/**
 * @title Rifi's Maximillion Contract
 * @author Rifi
 */
contract Maximillion {
    /**
     * @notice The default rMatic market to repay in
     */
    RMatic public rMatic;

    /**
     * @notice Construct a Maximillion to repay max in a RMatic market
     */
    constructor(RMatic rMatic_) public {
        rMatic = rMatic_;
    }

    /**
     * @notice msg.sender sends Matic token to repay an account's borrow in the rMatic market
     * @dev The provided Matic token is applied towards the borrow balance, any excess is refunded
     * @param borrower The address of the borrower account to repay on behalf of
     */
    function repayBehalf(address borrower) public payable {
        repayBehalfExplicit(borrower, rMatic);
    }

    /**
     * @notice msg.sender sends Matic token to repay an account's borrow in a rMatic market
     * @dev The provided Matic token is applied towards the borrow balance, any excess is refunded
     * @param borrower The address of the borrower account to repay on behalf of
     * @param rMatic_ The address of the rMatic contract to repay in
     */
    function repayBehalfExplicit(address borrower, RMatic rMatic_) public payable {
        uint received = msg.value;
        uint borrows = rMatic_.borrowBalanceCurrent(borrower);
        if (received > borrows) {
            rMatic_.repayBorrowBehalf{value: borrows}(borrower);
            payable(msg.sender).transfer(received - borrows);
        } else {
            rMatic_.repayBorrowBehalf{value: received}(borrower);
        }
    }
}
