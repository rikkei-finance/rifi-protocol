pragma solidity 0.5.16;

import "./PriceOracle.sol";
import "./ErrorReporter.sol";
import "./RTokenInterfaces.sol";
import "./EIP20Interface.sol";


interface IDIAOracle {
    function getValue(string calldata) external view returns (uint128, uint128);
}

contract DIAPriceOracle is PriceOracle, CointrollerErrorReporter {
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

    event OracleChanged(address rToken, string oldOracle, string newOracle);

    event NewPendingAdmin(address oldPendingAdmin, address newPendingAdmin);
    event NewAdmin(address oldAdmin, address newAdmin);
    event NewOracle(address oldOracle, address newOracle);

    IDIAOracle public diaOracle;
    mapping(address => string) public pair;

    constructor(IDIAOracle oracle) public {
        admin = msg.sender;
        diaOracle = oracle;
    }

    function setOracle(IDIAOracle newOracle) external {
        require(msg.sender == admin, "only admin can set");
        IDIAOracle old = diaOracle;
        diaOracle = newOracle;
        emit NewOracle(address(old), address(newOracle));
    }

    function setOracleData(address rToken, string calldata newKeyPair) external {
        require(msg.sender == admin, "only admin can set");
        string memory oldKeyPair = pair[rToken];
        pair[rToken] = newKeyPair;
        emit OracleChanged(rToken, oldKeyPair, pair[rToken]);
    }

    function getUnderlyingPrice(RToken rToken) public view returns (uint) {
        uint256 decimals = _getUnderlyingDecimals(rToken);
        string memory keyPair = pair[address(rToken)];
        (uint128 answer, ) = diaOracle.getValue(keyPair);
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


    function _getUnderlyingDecimals(RToken rToken) internal view returns (uint256) {
      if (compareStrings(rToken.symbol(), "rASTR")) {
        return 18;
      } else {
        RBep20Storage rBep20 = RBep20Storage(address(rToken));
        EIP20Interface underlying = EIP20Interface(rBep20.underlying());
        return underlying.decimals();
      }
    }

    function compareStrings(string memory a, string memory b) internal pure returns (bool) {
        return (keccak256(abi.encodePacked((a))) == keccak256(abi.encodePacked((b))));
    }
}
