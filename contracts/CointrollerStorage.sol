pragma solidity ^0.8.10;

import "./RToken.sol";
import "./PriceOracle.sol";

contract UnitrollerAdminStorage {
    /**
    * @notice Administrator for this contract
    */
    address public admin;

    /**
    * @notice Pending administrator for this contract
    */
    address public pendingAdmin;

    /**
    * @notice Active brains of Unitroller
    */
    address public cointrollerImplementation;

    /**
    * @notice Pending brains of Unitroller
    */
    address public pendingCointrollerImplementation;
}

contract CointrollerV1Storage is UnitrollerAdminStorage {

    /**
     * @notice Oracle which gives the price of any given asset
     */
    PriceOracle public oracle;

    /**
     * @notice Multiplier used to calculate the maximum repayAmount when liquidating a borrow
     */
    uint public closeFactorMantissa;

    /**
     * @notice Multiplier representing the discount on collateral that a liquidator receives
     */
    uint public liquidationIncentiveMantissa;

    /**
     * @notice Max number of assets a single account can participate in (borrow or use as collateral)
     */
    uint public maxAssets;

    /**
     * @notice Per-account mapping of "assets you are in", capped by maxAssets
     */
    mapping(address => RToken[]) public accountAssets;

}

contract CointrollerV2Storage is CointrollerV1Storage {
    struct Market {
        // Whether or not this market is listed
        bool isListed;

        //  Multiplier representing the most one can borrow against their collateral in this market.
        //  For instance, 0.9 to allow borrowing 90% of collateral value.
        //  Must be between 0 and 1, and stored as a mantissa.
        uint collateralFactorMantissa;

        // Per-market mapping of "accounts in this asset"
        mapping(address => bool) accountMembership;

        // Whether or not this market receives RIFI
        bool isRified;
    }

    /**
     * @notice Official mapping of RTokens -> Market metadata
     * @dev Used e.g. to determine if a market is supported
     */
    mapping(address => Market) public markets;


    /**
     * @notice The Pause Guardian can pause certain actions as a safety mechanism.
     *  Actions which allow users to remove their own assets cannot be paused.
     *  Liquidation / seizing / transfer can only be paused globally, not by market.
     */
    address public pauseGuardian;
    bool public _mintGuardianPaused;
    bool public _borrowGuardianPaused;
    bool public transferGuardianPaused;
    bool public seizeGuardianPaused;
    mapping(address => bool) public mintGuardianPaused;
    mapping(address => bool) public borrowGuardianPaused;
}

contract CointrollerV3Storage is CointrollerV2Storage {
    struct RifiMarketState {
        // The market's last updated rifiBorrowIndex or rifiSupplyIndex
        uint224 index;

        // The block number the index was last updated at
        uint32 block;
    }

    /// @notice A list of all markets
    RToken[] public allMarkets;

    /// @notice The rate at which the flywheel distributes RIFI, per block
    uint public rifiRate;

    /// @notice The portion of rifiRate that each market currently receives
    mapping(address => uint) public rifiSpeeds;

    /// @notice The RIFI market supply state for each market
    mapping(address => RifiMarketState) public rifiSupplyState;

    /// @notice The RIFI market borrow state for each market
    mapping(address => RifiMarketState) public rifiBorrowState;

    /// @notice The RIFI borrow index for each market for each supplier as of the last time they accrued RIFI
    mapping(address => mapping(address => uint)) public rifiSupplierIndex;

    /// @notice The RIFI borrow index for each market for each borrower as of the last time they accrued RIFI
    mapping(address => mapping(address => uint)) public rifiBorrowerIndex;

    /// @notice The RIFI accrued but not yet transferred to each user
    mapping(address => uint) public rifiAccrued;
}

contract CointrollerV4Storage is CointrollerV3Storage {
    // @notice The borrowCapGuardian can set borrowCaps to any number for any market. Lowering the borrow cap could disable borrowing on the given market.
    address public borrowCapGuardian;

    // @notice Borrow caps enforced by borrowAllowed for each RToken address. Defaults to zero which corresponds to unlimited borrowing.
    mapping(address => uint) public borrowCaps;
}

contract CointrollerV5Storage is CointrollerV4Storage {
    /// @notice The portion of RIFI that each contributor receives per block
    mapping(address => uint) public rifiContributorSpeeds;

    /// @notice Last block at which a contributor's RIFI rewards have been allocated
    mapping(address => uint) public lastContributorBlock;
}

contract CointrollerV6Storage is CointrollerV5Storage {
    /// @notice The rate at which rifi is distributed to the corresponding borrow market (per block)
    mapping(address => uint) public rifiBorrowSpeeds;

    /// @notice The rate at which rifi is distributed to the corresponding supply market (per block)
    mapping(address => uint) public rifiSupplySpeeds;
}

contract CointrollerV7Storage is CointrollerV6Storage {
    /// @notice Flag indicating whether the function to fix RIFI accruals has been executed (RE: proposal 62 bug)
    bool public proposal65FixExecuted;

    /// @notice Accounting storage mapping account addresses to how much RIFI they owe the protocol.
    mapping(address => uint) public rifiReceivable;

    address internal rifi;
}
