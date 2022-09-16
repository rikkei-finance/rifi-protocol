pragma solidity ^0.8.10;

import "./PriceOracle.sol";
import "./RErc20.sol";

interface oracleChainlink {
    function decimals() external view returns (uint8);
    function latestRoundData()
    external
    view
    returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    );
}

contract SimplePriceOracle is PriceOracle, CointrollerErrorReporter {
    /**
     * @notice Administrator for this contract
     */
    address public admin;

    /**
     * @notice Pending administrator for this contract
     */
    address public pendingAdmin;

    mapping(address => uint) prices;

    event PricePosted(address asset, uint previousPriceMantissa, uint requestedPriceMantissa, uint newPriceMantissa);

    event OracleChanged(address rToken, address oldOracle, address newOracle);

    event NewPendingAdmin(address oldPendingAdmin, address newPendingAdmin);
    event NewAdmin(address oldAdmin, address newAdmin);

    mapping(address => oracleChainlink) public oracleData;

    constructor() {
      admin = msg.sender;
    }

    function setOracleData(address rToken, oracleChainlink _oracle) external {
        require(msg.sender == admin, "only admin can set");
        address oldOracle = address(oracleData[rToken]);
        oracleData[rToken] = _oracle;
        emit OracleChanged(rToken, oldOracle, address(oracleData[rToken]));
    }

    function getUnderlyingDecimals(RToken rToken) internal view returns (uint256 decimals) {
        if (compareStrings(rToken.symbol(), "rETH")) {
            decimals = 18;
        } else {
            decimals = EIP20Interface(RErc20(address(rToken)).underlying()).decimals();
        }
    }

    function getUnderlyingPrice(RToken rToken) override public view returns (uint) {
        uint decimals = getUnderlyingDecimals(rToken);
        ( , int256 answer, , , ) = oracleData[address(rToken)].latestRoundData();
        return 10 ** (18 - decimals) * uint(answer);
    }

    function _setPendingAdmin(address newPendingAdmin) public returns (uint) {
        // Check caller = admin
        if (msg.sender != admin) {
            return fail(Error.UNAUTHORIZED, FailureInfo.SET_PENDING_ADMIN_OWNER_CHECK);
        }

        // Save current value, if any, for inclusion in log
        address oldPendingAdmin = pendingAdmin;

        // Store pendingAdmin with value newPendingAdmin
        pendingAdmin = newPendingAdmin;

        // Emit NewPendingAdmin(oldPendingAdmin, newPendingAdmin)
        emit NewPendingAdmin(oldPendingAdmin, newPendingAdmin);

        return uint(Error.NO_ERROR);
    }

    function _acceptAdmin() public returns (uint) {
        // Check caller is pendingAdmin and pendingAdmin ≠ address(0)
        if (msg.sender != pendingAdmin || msg.sender == address(0)) {
            return fail(Error.UNAUTHORIZED, FailureInfo.ACCEPT_ADMIN_PENDING_ADMIN_CHECK);
        }

        // Save current values for inclusion in log
        address oldAdmin = admin;
        address oldPendingAdmin = pendingAdmin;

        // Store admin with value pendingAdmin
        admin = pendingAdmin;

        // Clear the pending value
        pendingAdmin = address(0);

        emit NewAdmin(oldAdmin, admin);
        emit NewPendingAdmin(oldPendingAdmin, pendingAdmin);

        return uint(Error.NO_ERROR);
    }

    function compareStrings(string memory a, string memory b) internal pure returns (bool) {
        return (keccak256(abi.encodePacked((a))) == keccak256(abi.encodePacked((b))));
    }
}

