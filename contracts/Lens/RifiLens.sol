pragma solidity ^0.8.10;

import "../RErc20.sol";
import "../RToken.sol";
import "../PriceOracle.sol";
import "../EIP20Interface.sol";
import "../Governance/GovernorAlpha.sol";
import "../Governance/Rifi.sol";

interface CointrollerLensInterface {
    function markets(address) external view returns (bool, uint);
    function oracle() external view returns (PriceOracle);
    function getAccountLiquidity(address) external view returns (uint, uint, uint);
    function getAssetsIn(address) external view returns (RToken[] memory);
    function claimRifi(address) external;
    function rifiAccrued(address) external view returns (uint);
}

interface GovernorBravoInterface {
    struct Receipt {
        bool hasVoted;
        uint8 support;
        uint96 votes;
    }
    struct Proposal {
        uint id;
        address proposer;
        uint eta;
        uint startBlock;
        uint endBlock;
        uint forVotes;
        uint againstVotes;
        uint abstainVotes;
        bool canceled;
        bool executed;
    }
    function getActions(uint proposalId) external view returns (address[] memory targets, uint[] memory values, string[] memory signatures, bytes[] memory calldatas);
    function proposals(uint proposalId) external view returns (Proposal memory);
    function getReceipt(uint proposalId, address voter) external view returns (Receipt memory);
}

contract RifiLens {
    struct RTokenMetadata {
        address rToken;
        uint exchangeRateCurrent;
        uint supplyRatePerBlock;
        uint borrowRatePerBlock;
        uint reserveFactorMantissa;
        uint totalBorrows;
        uint totalReserves;
        uint totalSupply;
        uint totalCash;
        bool isListed;
        uint collateralFactorMantissa;
        address underlyingAssetAddress;
        uint rTokenDecimals;
        uint underlyingDecimals;
    }

    function rTokenMetadata(RToken rToken) public returns (RTokenMetadata memory) {
        uint exchangeRateCurrent = rToken.exchangeRateCurrent();
        CointrollerLensInterface cointroller = CointrollerLensInterface(address(rToken.cointroller()));
        (bool isListed, uint collateralFactorMantissa) = cointroller.markets(address(rToken));
        address underlyingAssetAddress;
        uint underlyingDecimals;

        if (compareStrings(rToken.symbol(), "rNative")) {
            underlyingAssetAddress = address(0);
            underlyingDecimals = 18;
        } else {
            RErc20 rErc20 = RErc20(address(rToken));
            underlyingAssetAddress = rErc20.underlying();
            underlyingDecimals = EIP20Interface(rErc20.underlying()).decimals();
        }

        return RTokenMetadata({
            rToken: address(rToken),
            exchangeRateCurrent: exchangeRateCurrent,
            supplyRatePerBlock: rToken.supplyRatePerBlock(),
            borrowRatePerBlock: rToken.borrowRatePerBlock(),
            reserveFactorMantissa: rToken.reserveFactorMantissa(),
            totalBorrows: rToken.totalBorrows(),
            totalReserves: rToken.totalReserves(),
            totalSupply: rToken.totalSupply(),
            totalCash: rToken.getCash(),
            isListed: isListed,
            collateralFactorMantissa: collateralFactorMantissa,
            underlyingAssetAddress: underlyingAssetAddress,
            rTokenDecimals: rToken.decimals(),
            underlyingDecimals: underlyingDecimals
        });
    }

    function rTokenMetadataAll(RToken[] calldata rTokens) external returns (RTokenMetadata[] memory) {
        uint rTokenCount = rTokens.length;
        RTokenMetadata[] memory res = new RTokenMetadata[](rTokenCount);
        for (uint i = 0; i < rTokenCount; i++) {
            res[i] = rTokenMetadata(rTokens[i]);
        }
        return res;
    }

    struct RTokenBalances {
        address rToken;
        uint balanceOf;
        uint borrowBalanceCurrent;
        uint balanceOfUnderlying;
        uint tokenBalance;
        uint tokenAllowance;
    }

    function rTokenBalances(RToken rToken, address payable account) public returns (RTokenBalances memory) {
        uint balanceOf = rToken.balanceOf(account);
        uint borrowBalanceCurrent = rToken.borrowBalanceCurrent(account);
        uint balanceOfUnderlying = rToken.balanceOfUnderlying(account);
        uint tokenBalance;
        uint tokenAllowance;

        if (compareStrings(rToken.symbol(), "rNative")) {
            tokenBalance = account.balance;
            tokenAllowance = account.balance;
        } else {
            RErc20 rErc20 = RErc20(address(rToken));
            EIP20Interface underlying = EIP20Interface(rErc20.underlying());
            tokenBalance = underlying.balanceOf(account);
            tokenAllowance = underlying.allowance(account, address(rToken));
        }

        return RTokenBalances({
            rToken: address(rToken),
            balanceOf: balanceOf,
            borrowBalanceCurrent: borrowBalanceCurrent,
            balanceOfUnderlying: balanceOfUnderlying,
            tokenBalance: tokenBalance,
            tokenAllowance: tokenAllowance
        });
    }

    function rTokenBalancesAll(RToken[] calldata rTokens, address payable account) external returns (RTokenBalances[] memory) {
        uint rTokenCount = rTokens.length;
        RTokenBalances[] memory res = new RTokenBalances[](rTokenCount);
        for (uint i = 0; i < rTokenCount; i++) {
            res[i] = rTokenBalances(rTokens[i], account);
        }
        return res;
    }

    struct RTokenUnderlyingPrice {
        address rToken;
        uint underlyingPrice;
    }

    function rTokenUnderlyingPrice(RToken rToken) public view returns (RTokenUnderlyingPrice memory) {
        CointrollerLensInterface cointroller = CointrollerLensInterface(address(rToken.cointroller()));
        PriceOracle priceOracle = cointroller.oracle();

        return RTokenUnderlyingPrice({
            rToken: address(rToken),
            underlyingPrice: priceOracle.getUnderlyingPrice(rToken)
        });
    }

    function rTokenUnderlyingPriceAll(RToken[] calldata rTokens) external view returns (RTokenUnderlyingPrice[] memory) {
        uint rTokenCount = rTokens.length;
        RTokenUnderlyingPrice[] memory res = new RTokenUnderlyingPrice[](rTokenCount);
        for (uint i = 0; i < rTokenCount; i++) {
            res[i] = rTokenUnderlyingPrice(rTokens[i]);
        }
        return res;
    }

    struct AccountLimits {
        RToken[] markets;
        uint liquidity;
        uint shortfall;
    }

    function getAccountLimits(CointrollerLensInterface cointroller, address account) public view returns (AccountLimits memory) {
        (uint errorCode, uint liquidity, uint shortfall) = cointroller.getAccountLiquidity(account);
        require(errorCode == 0);

        return AccountLimits({
            markets: cointroller.getAssetsIn(account),
            liquidity: liquidity,
            shortfall: shortfall
        });
    }

    struct GovReceipt {
        uint proposalId;
        bool hasVoted;
        bool support;
        uint96 votes;
    }

    function getGovReceipts(GovernorAlpha governor, address voter, uint[] memory proposalIds) public view returns (GovReceipt[] memory) {
        uint proposalCount = proposalIds.length;
        GovReceipt[] memory res = new GovReceipt[](proposalCount);
        for (uint i = 0; i < proposalCount; i++) {
            GovernorAlpha.Receipt memory receipt = governor.getReceipt(proposalIds[i], voter);
            res[i] = GovReceipt({
                proposalId: proposalIds[i],
                hasVoted: receipt.hasVoted,
                support: receipt.support,
                votes: receipt.votes
            });
        }
        return res;
    }

    struct GovBravoReceipt {
        uint proposalId;
        bool hasVoted;
        uint8 support;
        uint96 votes;
    }

    function getGovBravoReceipts(GovernorBravoInterface governor, address voter, uint[] memory proposalIds) public view returns (GovBravoReceipt[] memory) {
        uint proposalCount = proposalIds.length;
        GovBravoReceipt[] memory res = new GovBravoReceipt[](proposalCount);
        for (uint i = 0; i < proposalCount; i++) {
            GovernorBravoInterface.Receipt memory receipt = governor.getReceipt(proposalIds[i], voter);
            res[i] = GovBravoReceipt({
                proposalId: proposalIds[i],
                hasVoted: receipt.hasVoted,
                support: receipt.support,
                votes: receipt.votes
            });
        }
        return res;
    }

    struct GovProposal {
        uint proposalId;
        address proposer;
        uint eta;
        address[] targets;
        uint[] values;
        string[] signatures;
        bytes[] calldatas;
        uint startBlock;
        uint endBlock;
        uint forVotes;
        uint againstVotes;
        bool canceled;
        bool executed;
    }

    function setProposal(GovProposal memory res, GovernorAlpha governor, uint proposalId) internal view {
        (
            ,
            address proposer,
            uint eta,
            uint startBlock,
            uint endBlock,
            uint forVotes,
            uint againstVotes,
            bool canceled,
            bool executed
        ) = governor.proposals(proposalId);
        res.proposalId = proposalId;
        res.proposer = proposer;
        res.eta = eta;
        res.startBlock = startBlock;
        res.endBlock = endBlock;
        res.forVotes = forVotes;
        res.againstVotes = againstVotes;
        res.canceled = canceled;
        res.executed = executed;
    }

    function getGovProposals(GovernorAlpha governor, uint[] calldata proposalIds) external view returns (GovProposal[] memory) {
        GovProposal[] memory res = new GovProposal[](proposalIds.length);
        for (uint i = 0; i < proposalIds.length; i++) {
            (
                address[] memory targets,
                uint[] memory values,
                string[] memory signatures,
                bytes[] memory calldatas
            ) = governor.getActions(proposalIds[i]);
            res[i] = GovProposal({
                proposalId: 0,
                proposer: address(0),
                eta: 0,
                targets: targets,
                values: values,
                signatures: signatures,
                calldatas: calldatas,
                startBlock: 0,
                endBlock: 0,
                forVotes: 0,
                againstVotes: 0,
                canceled: false,
                executed: false
            });
            setProposal(res[i], governor, proposalIds[i]);
        }
        return res;
    }

    struct GovBravoProposal {
        uint proposalId;
        address proposer;
        uint eta;
        address[] targets;
        uint[] values;
        string[] signatures;
        bytes[] calldatas;
        uint startBlock;
        uint endBlock;
        uint forVotes;
        uint againstVotes;
        uint abstainVotes;
        bool canceled;
        bool executed;
    }

    function setBravoProposal(GovBravoProposal memory res, GovernorBravoInterface governor, uint proposalId) internal view {
        GovernorBravoInterface.Proposal memory p = governor.proposals(proposalId);

        res.proposalId = proposalId;
        res.proposer = p.proposer;
        res.eta = p.eta;
        res.startBlock = p.startBlock;
        res.endBlock = p.endBlock;
        res.forVotes = p.forVotes;
        res.againstVotes = p.againstVotes;
        res.abstainVotes = p.abstainVotes;
        res.canceled = p.canceled;
        res.executed = p.executed;
    }

    function getGovBravoProposals(GovernorBravoInterface governor, uint[] calldata proposalIds) external view returns (GovBravoProposal[] memory) {
        GovBravoProposal[] memory res = new GovBravoProposal[](proposalIds.length);
        for (uint i = 0; i < proposalIds.length; i++) {
            (
                address[] memory targets,
                uint[] memory values,
                string[] memory signatures,
                bytes[] memory calldatas
            ) = governor.getActions(proposalIds[i]);
            res[i] = GovBravoProposal({
                proposalId: 0,
                proposer: address(0),
                eta: 0,
                targets: targets,
                values: values,
                signatures: signatures,
                calldatas: calldatas,
                startBlock: 0,
                endBlock: 0,
                forVotes: 0,
                againstVotes: 0,
                abstainVotes: 0,
                canceled: false,
                executed: false
            });
            setBravoProposal(res[i], governor, proposalIds[i]);
        }
        return res;
    }

    struct RifiBalanceMetadata {
        uint balance;
        uint votes;
        address delegate;
    }

    function getRifiBalanceMetadata(Rifi rifi, address account) external view returns (RifiBalanceMetadata memory) {
        return RifiBalanceMetadata({
            balance: rifi.balanceOf(account),
            votes: uint256(rifi.getCurrentVotes(account)),
            delegate: rifi.delegates(account)
        });
    }

    struct RifiBalanceMetadataExt {
        uint balance;
        uint votes;
        address delegate;
        uint allocated;
    }

    function getRifiBalanceMetadataExt(Rifi rifi, CointrollerLensInterface cointroller, address account) external returns (RifiBalanceMetadataExt memory) {
        uint balance = rifi.balanceOf(account);
        cointroller.claimRifi(account);
        uint newBalance = rifi.balanceOf(account);
        uint accrued = cointroller.rifiAccrued(account);
        uint total = add(accrued, newBalance, "sum rifi total");
        uint allocated = sub(total, balance, "sub allocated");

        return RifiBalanceMetadataExt({
            balance: balance,
            votes: uint256(rifi.getCurrentVotes(account)),
            delegate: rifi.delegates(account),
            allocated: allocated
        });
    }

    struct RifiVotes {
        uint blockNumber;
        uint votes;
    }

    function getRifiVotes(Rifi rifi, address account, uint32[] calldata blockNumbers) external view returns (RifiVotes[] memory) {
        RifiVotes[] memory res = new RifiVotes[](blockNumbers.length);
        for (uint i = 0; i < blockNumbers.length; i++) {
            res[i] = RifiVotes({
                blockNumber: uint256(blockNumbers[i]),
                votes: uint256(rifi.getPriorVotes(account, blockNumbers[i]))
            });
        }
        return res;
    }

    function compareStrings(string memory a, string memory b) internal pure returns (bool) {
        return (keccak256(abi.encodePacked((a))) == keccak256(abi.encodePacked((b))));
    }

    function add(uint a, uint b, string memory errorMessage) internal pure returns (uint) {
        uint c = a + b;
        require(c >= a, errorMessage);
        return c;
    }

    function sub(uint a, uint b, string memory errorMessage) internal pure returns (uint) {
        require(b <= a, errorMessage);
        uint c = a - b;
        return c;
    }
}
