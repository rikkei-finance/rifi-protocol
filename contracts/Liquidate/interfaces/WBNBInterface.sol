pragma solidity ^0.8.10;

interface WBNBInterface {
    event  Approval(address indexed src, address indexed guy, uint wad);
    event  Transfer(address indexed src, address indexed dst, uint wad);
    event  Deposit(address indexed dst, uint wad);
    event  Withdrawal(address indexed src, uint wad);

    function balanceOf(address) external returns (uint);
    function allowance(address, address) external returns (uint);

    function deposit() external payable;
    function withdraw(uint wad) external;
    function totalSupply() external view returns (uint);

    function approve(address guy, uint wad) external returns (bool);

    function transfer(address dst, uint wad) external returns (bool);

    function transferFrom(address src, address dst, uint wad) external returns (bool);
}