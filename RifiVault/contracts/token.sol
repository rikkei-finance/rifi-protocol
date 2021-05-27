pragma solidity 0.6.12;

contract Token {
    mapping(address => mapping(address => uint256)) allowed;

    function approve(address _spender, uint256 _value) external returns (bool) {
        allowed[msg.sender][_spender] = _value;
        return true;
    }
}