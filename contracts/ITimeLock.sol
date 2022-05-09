pragma solidity ^0.5.16;

interface ITimelock {
    function admin() external returns (address);
    function pendingAdmin() external returns (address);
    function delay() external returns (uint);
    function queuedTransactions(bytes32) external returns (bool);

    function setDelay(uint delay_) external;

    function acceptAdmin() external;

    function setPendingAdmin(address pendingAdmin_) external;

    function queueTransaction(address target, uint value, string calldata signature, bytes calldata data, uint eta) external returns (bytes32);

    function cancelTransaction(address target, uint value, string calldata signature, bytes calldata data, uint eta) external;

    function executeTransaction(address target, uint value, string calldata signature, bytes calldata data, uint eta) external payable returns (bytes memory);
}