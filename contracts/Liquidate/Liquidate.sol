pragma solidity ^0.8.10;

import {IFlashLoanReceiver} from './interfaces/IFlashLoanReceiver.sol';
import {ILendingPoolAddressesProvider} from './interfaces/ILendingPoolAddressesProvider.sol';
import {ILendingPool} from './interfaces/ILendingPool.sol';
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "../RTokenInterfaces.sol";
import "../RNative.sol";
import "../RNativeInterface.sol";
import "./interfaces/WASTRInterface.sol";
import "./interfaces/IPancakeRouter02.sol";

contract Liquidate is IFlashLoanReceiver, AccessControl, ReentrancyGuard {
  struct LiquidateData {
    address rToken;
    address borrower;
    address rTokenCollateral;
    uint256 repayAmount;
  }
  uint256 public constant NO_ERROR = 0;
  bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR");
  ILendingPoolAddressesProvider public immutable override ADDRESSES_PROVIDER;
  ILendingPool public immutable override LENDING_POOL;
  IPancakeRouter02 public exchange;
  address public wASTR;
  address public rASTR;

  receive() external payable {}

  constructor(
    ILendingPoolAddressesProvider provider,
    IPancakeRouter02 _exchange,
    address _wASTR,
    address _rASTR
  ) {
    ADDRESSES_PROVIDER = provider;
    LENDING_POOL = ILendingPool(provider.getLendingPool());

    _grantRole(getRoleAdmin(OPERATOR_ROLE), _msgSender());
    exchange = _exchange;
    wASTR = _wASTR;
    rASTR = _rASTR;
  }

  // _______ADMIN FUNCTIONS_______

  function setExchange(IPancakeRouter02 _exchange) external onlyRole(getRoleAdmin(OPERATOR_ROLE)) {
    exchange = _exchange;
  }

  function setRASTR(address _rASTR) external onlyRole(getRoleAdmin(OPERATOR_ROLE)) {
    rASTR = _rASTR;
  }

  function setWASTR(address _wASTR) external onlyRole(getRoleAdmin(OPERATOR_ROLE)) {
    wASTR = _wASTR;
  }

  /**
   * @dev withdrawASTR withdraw ASTR coin
   * @param _recipient address of recipient
   */
  function withdrawASTR(address _recipient) external onlyRole(getRoleAdmin(OPERATOR_ROLE)) {
    Address.sendValue(payable(_recipient), address(this).balance);
  }

  /**
   * @dev withdrawERC20Token withdraw ERC20 token
   * @param _recipient address of recipient
   */
  function withdrawERC20Token(address _token, address _recipient)
    external
    onlyRole(getRoleAdmin(OPERATOR_ROLE))
  {
    IERC20(_token).transfer(_recipient, IERC20(_token).balanceOf(address(this)));
  }

  // _______USER FUNCTIONS_______

  /**
   * @notice Sender liquidates the borrowers collateral by flashing loan it to the exchange
   * @dev Reverts upon any failure
   * @param rToken The rToken to be liquidated
   * @param borrower The borrower of this rToken to be liquidated
   * @param repayAmount The amount of the underlying asset to repay
   * @param rTokenCollateral The market in which to seize collateral from the borrower
   */
  function liquidateBorrow(
    address rToken,
    address borrower,
    uint256 repayAmount,
    address rTokenCollateral
  ) external {
    bytes memory params = abi.encode(
      LiquidateData({
        rToken: rToken,
        borrower: borrower,
        rTokenCollateral: rTokenCollateral,
        repayAmount: repayAmount
      })
    );
    address asset = rToken == rASTR ? wASTR : RErc20Interface(rToken).underlying();

    address[] memory assets = new address[](1);
    assets[0] = asset;

    uint256[] memory amounts = new uint256[](1);
    amounts[0] = repayAmount;

    uint256[] memory modes = new uint256[](1);
    modes[0] = 0;

    LENDING_POOL.flashLoan(address(this), assets, amounts, modes, address(this), params, 0);
  }

  // _______HOOKS_______

  /**
   * @dev This function is called after your contract has received the flash loaned amount
   */
  function executeOperation(
    address[] calldata assets,
    uint256[] calldata amounts,
    uint256[] calldata premiums,
    address initiator,
    bytes calldata params
  ) external override nonReentrant returns (bool) {
    require(msg.sender == address(LENDING_POOL), "unknown callback sender");
    require(initiator == address(this), "not initiator");
    return _handleFlashLoan(IERC20(assets[0]), amounts[0], premiums[0], params);
  }

  // _______INTERNAL FUNCTIONS_______

  function _handleFlashLoan(
    IERC20 token,
    uint256 amount,
    uint256 fee,
    bytes calldata data
  ) internal returns (bool) {
    LiquidateData memory liquidateData = abi.decode(data, (LiquidateData));
    require(RTokenInterface(liquidateData.rToken).isRToken() || address(token) == wASTR, "Wrong token");
    require(token.balanceOf(address(this)) >= amount, "Not enough balance");
    token.approve(liquidateData.rToken, amount);
    _liquidateBorrow(liquidateData, amount);
    _redeem(liquidateData.rTokenCollateral);
    _swap(liquidateData, address(token), amount + fee);
    token.approve(msg.sender, amount + fee);

    return true;
  }

  function _liquidateBorrow(LiquidateData memory lqData, uint256 amount) internal {
    if (lqData.rToken == rASTR) {
      WASTRInterface(wASTR).withdraw(amount);
      RNativeInterface(lqData.rToken).liquidateBorrow{value: amount}(
        lqData.borrower,
        RToken(lqData.rTokenCollateral)
      );
    } else {
      uint256 ERROR = RErc20Interface(lqData.rToken).liquidateBorrow(lqData.borrower, amount, RTokenInterface(lqData.rTokenCollateral));
      require(ERROR == NO_ERROR, "liquidateBorrow error");
    }
  }

  function _redeem(address rTokenCollateral) internal {
    uint256 ERROR = rTokenCollateral == rASTR
      ? RNativeInterface(rTokenCollateral).redeem(
        RTokenInterface(rTokenCollateral).balanceOf(address(this))
      )
      : RErc20Interface(rTokenCollateral).redeem(
        RTokenInterface(rTokenCollateral).balanceOf(address(this))
      );
    require(ERROR == NO_ERROR, "redeem error");
  }

  function _swap(
    LiquidateData memory lqData,
    address tokenTo,
    uint256 amountOut
  ) internal {
    if (lqData.rToken != lqData.rTokenCollateral) {
      if (lqData.rTokenCollateral == rASTR) {
        _swapInternal(wASTR, address(tokenTo), amountOut);
      } else {
        _swapInternal(RErc20Interface(lqData.rTokenCollateral).underlying(), address(tokenTo), amountOut);
      }
    } else if (lqData.rToken == rASTR) {
      WASTRInterface(wASTR).deposit{value: amountOut}();
    }
  }

  function _swapInternal(
    address tokenFrom,
    address tokenTo,
    uint256 amountOut
  ) internal {
    address[] memory path = new address[](2);
    path[0] = tokenFrom;
    path[1] = tokenTo;
    if (tokenFrom == wASTR) {
      uint256 amountInMax = address(this).balance;
      exchange.swapETHForExactTokens{value: amountInMax}(amountOut, path, address(this), block.timestamp + 20);
    } else {
      uint256 amountInMax = IERC20(tokenFrom).balanceOf(address(this));
      IERC20(tokenFrom).approve(address(exchange), amountInMax);
      exchange.swapTokensForExactTokens(amountOut, amountInMax, path, address(this), block.timestamp + 20);
    }
  }
}
