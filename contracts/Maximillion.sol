pragma solidity ^0.8.10;

import "./RETH.sol";

/**
 * @title Rifi's Maximillion Contract
 * @author Rifi
 */
contract Maximillion {
    /**
     * @notice The default rETH market to repay in
     */
    RETH public rETH;

    /**
     * @notice Construct a Maximillion to repay max in a RETH market
     */
    constructor(RETH rETH_) public {
        rETH = rETH_;
    }

    /**
     * @notice msg.sender sends Native token to repay an account's borrow in the rETH market
     * @dev The provided Native token is applied towards the borrow balance, any excess is refunded
     * @param borrower The address of the borrower account to repay on behalf of
     */
    function repayBehalf(address borrower) public payable {
        repayBehalfExplicit(borrower, rETH);
    }

    /**
     * @notice msg.sender sends Native token to repay an account's borrow in a rETH market
     * @dev The provided Native token is applied towards the borrow balance, any excess is refunded
     * @param borrower The address of the borrower account to repay on behalf of
     * @param rETH_ The address of the rETH contract to repay in
     */
    function repayBehalfExplicit(address borrower, RETH rETH_) public payable {
        uint received = msg.value;
        uint borrows = rETH_.borrowBalanceCurrent(borrower);
        if (received > borrows) {
            rETH_.repayBorrowBehalf{value: borrows}(borrower);
            payable(msg.sender).transfer(received - borrows);
        } else {
            rETH_.repayBorrowBehalf{value: received}(borrower);
        }
    }
}
