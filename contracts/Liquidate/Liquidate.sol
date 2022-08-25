pragma solidity ^0.8.10;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./PancakeswapFlashloan.sol";
import "../RTokenInterfaces.sol";
import "../RNative.sol";
import "../RNativeInterface.sol";
import "./interfaces/WBNBInterface.sol";
import "./interfaces/IPancakeRouter02.sol";

contract Liquidate is PancakeswapFlashloan, AccessControl {

  struct LiquidateData {
    address rToken;
    address borrower;
    address rTokenCollateral;
    uint repayAmount;
  }
  uint public constant NO_ERROR = 0;
  bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR");
  IPancakeRouter02 public exchange;
  address public wBNB;
  address public rBNB;

  receive() external payable {}

  constructor(IPancakeRouter02 _exchange, address _wBNB, address _rBNB) {
    _grantRole(getRoleAdmin(OPERATOR_ROLE), _msgSender());
    exchange = _exchange;
    wBNB = _wBNB;
    rBNB = _rBNB;
  }

  // _______ADMIN FUNCTIONS_______

  function setExchange(IPancakeRouter02 _exchange) external onlyRole(getRoleAdmin(OPERATOR_ROLE)) {
    exchange = _exchange;
  }

  function setRBNB(address _rBNB) external onlyRole(getRoleAdmin(OPERATOR_ROLE)) {
    rBNB = _rBNB;
  }

  function setWBNB(address _wBNB) external onlyRole(getRoleAdmin(OPERATOR_ROLE)) {
    wBNB = _wBNB;
  }

  function setPairs(address[] calldata tokens, IPancakeV2Pair[] calldata pairs) external override onlyRole(getRoleAdmin(OPERATOR_ROLE)) {
    _setPairs(tokens, pairs);
  }

  /**
  * @dev withdrawBNB withdraw BNB coin
  * @param _recipient address of recipient
  */
  function withdrawBNB(address _recipient) external onlyRole(getRoleAdmin(OPERATOR_ROLE)) {
      Address.sendValue(payable(_recipient), address(this).balance);
  }

  /**
  * @dev withdrawERC20Token withdraw ERC20 token
  * @param _recipient address of recipient
  */
  function withdrawERC20Token(address _token, address _recipient) external onlyRole(getRoleAdmin(OPERATOR_ROLE)) {
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
  function liquidateBorrow(address rToken, address borrower, uint repayAmount, address rTokenCollateral) external {
    bytes memory params = abi.encode(
      LiquidateData({ rToken: rToken, borrower: borrower, rTokenCollateral: rTokenCollateral, repayAmount: repayAmount })
    );
    if (rToken == rBNB) {
      _flashLoan(wBNB, repayAmount, params);
    } else {
      address token = RErc20Interface(rToken).underlying();
      _flashLoan(token, repayAmount, params);
    }
  }

  // _______INTERNAL FUNCTIONS_______

  function _handleFlashLoan(
    IERC20 token,
    uint256 amount,
    uint256 fee,
    bytes calldata data
  ) internal override {
    LiquidateData memory liquidateData = abi.decode(data, (LiquidateData));
    require(RTokenInterface(liquidateData.rToken).isRToken() || address(token) == wBNB, "Wrong token");
    require(token.balanceOf(address(this)) >= amount, "Not enough balance");
    token.approve(liquidateData.rToken, amount);
    _liquidateBorrow(liquidateData, amount);
    _redeem(liquidateData.rTokenCollateral);
    _swap(liquidateData, address(token), amount + fee);
    token.approve(msg.sender, amount + fee);
  }

  function _liquidateBorrow(LiquidateData memory lqData, uint256 amount) internal {
    if (lqData.rToken == rBNB) {
      WBNBInterface(wBNB).withdraw(amount);
      RNativeInterface(lqData.rToken).liquidateBorrow{value: amount }(lqData.borrower, RToken(lqData.rTokenCollateral));
    } else {
      uint ERROR = RErc20Interface(lqData.rToken).liquidateBorrow(lqData.borrower, amount, RTokenInterface(lqData.rTokenCollateral));
      require(ERROR == NO_ERROR, "liquidateBorrow error");
    }
  }

  function _redeem(address rTokenCollateral) internal {
    uint ERROR = rTokenCollateral == rBNB ?
      RNativeInterface(rTokenCollateral).redeem(RTokenInterface(rTokenCollateral).balanceOf(address(this)))
      :
      RErc20Interface(rTokenCollateral).redeem(RTokenInterface(rTokenCollateral).balanceOf(address(this)));
    require(ERROR == NO_ERROR, "redeem error");
  }

  function _swap(LiquidateData memory lqData, address tokenTo, uint256 amountOut) internal {
    if (lqData.rToken != lqData.rTokenCollateral){
      if (lqData.rTokenCollateral == rBNB) {
        _swapInternal(wBNB, address(tokenTo), amountOut);
      } else {
        _swapInternal(RErc20Interface(lqData.rTokenCollateral).underlying(), address(tokenTo), amountOut);
      }
    } else if (lqData.rToken == rBNB) {
      WBNBInterface(wBNB).deposit{value: amountOut}();
    } 
  }

  function _swapInternal(address tokenFrom, address tokenTo, uint256 amountOut) internal {
    address[] memory path = new address[](2);
    path[0] = tokenFrom;
    path[1] = tokenTo;
    if (tokenFrom == wBNB) {
      uint amountInMax = address(this).balance;
      exchange.swapETHForExactTokens{value: amountInMax}(amountOut, path, address(this), block.timestamp + 20);
    } else {
      uint amountInMax = IERC20(tokenFrom).balanceOf(address(this));
      IERC20(tokenFrom).approve(address(exchange), amountInMax);
      exchange.swapTokensForExactTokens(amountOut, amountInMax, path, address(this), block.timestamp + 20);
    }
  }
}