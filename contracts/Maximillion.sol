pragma solidity ^0.8.10;

import "./RAstar.sol";

/**
 * @title Rifi's Maximillion Contract
 * @author Rifi
 */
contract Maximillion {
    /**
     * @notice The default rAstar market to repay in
     */
    RAstar public rAstar;

    /**
     * @notice Construct a Maximillion to repay max in a RAstar market
     */
    constructor(RAstar rAstar_) public {
        rAstar = rAstar_;
    }

    /**
     * @notice msg.sender sends Native token to repay an account's borrow in the rAstar market
     * @dev The provided Native token is applied towards the borrow balance, any excess is refunded
     * @param borrower The address of the borrower account to repay on behalf of
     */
    function repayBehalf(address borrower) public payable {
        repayBehalfExplicit(borrower, rAstar);
    }

    /**
     * @notice msg.sender sends Native token to repay an account's borrow in a rAstar market
     * @dev The provided Native token is applied towards the borrow balance, any excess is refunded
     * @param borrower The address of the borrower account to repay on behalf of
     * @param rAstar_ The address of the rAstar contract to repay in
     */
    function repayBehalfExplicit(address borrower, RAstar rAstar_) public payable {
        uint received = msg.value;
        uint borrows = rAstar_.borrowBalanceCurrent(borrower);
        if (received > borrows) {
            rAstar_.repayBorrowBehalf{value: borrows}(borrower);
            payable(msg.sender).transfer(received - borrows);
        } else {
            rAstar_.repayBorrowBehalf{value: received}(borrower);
        }
    }
}
