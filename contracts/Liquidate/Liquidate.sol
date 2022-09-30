pragma solidity ^0.8.10;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../RTokenInterfaces.sol";
import "../RNative.sol";
import "../RNativeInterface.sol";
import "../WETHInterface.sol";
import "./interfaces/IV3SwapRouter.sol";
import "./UniswapFlashloan.sol";

 contract Liquidate is UniswapFlashloan, AccessControl {

  struct LiquidateData {
    address rToken;
    address borrower;
    address rTokenCollateral;
    uint repayAmount;
  }

  uint public constant NO_ERROR = 0;
  bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR");
  IV3SwapRouter public exchange;
  address public wETH;
  address public rETH;

  receive() external payable {}

  constructor(IV3SwapRouter _exchange, address _wETH, address _rETH) {
    _grantRole(getRoleAdmin(OPERATOR_ROLE), _msgSender());
    exchange = _exchange;
    wETH = _wETH;
    rETH = _rETH;
  }

  // _______ADMIN FUNCTIONS_______

  function setExchange(IV3SwapRouter _exchange) external onlyRole(getRoleAdmin(OPERATOR_ROLE)) {
    exchange = _exchange;
  }

  function setRETH(address _rETH) external onlyRole(getRoleAdmin(OPERATOR_ROLE)) {
    rETH = _rETH;
  }

  function setWETH(address _wETH) external onlyRole(getRoleAdmin(OPERATOR_ROLE)) {
    wETH = _wETH;
  }

  function setPairs(address[] calldata tokens, IUniswapV3Pool[] calldata pairs) external override onlyRole(getRoleAdmin(OPERATOR_ROLE)) {
    _setPairs(tokens, pairs);
  }

  /**
  * @dev withdrawETH withdraw ETH coin
  * @param _recipient address of recipient
  */
  function withdrawETH(address _recipient) external onlyRole(getRoleAdmin(OPERATOR_ROLE)) {
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
    if (rToken == rETH) {
      _flashLoan(wETH, repayAmount, params);
    } else {
      address token = RErc20Interface(rToken).underlying();
      _flashLoan(token, repayAmount, params);
    }
  }

  // _______INTERNAL FUNCTIONS_______

  function _handleFlashLoan(
    IERC20 token,
    uint256 fee,
    bytes calldata data
  ) internal override returns(uint amount){
    LiquidateData memory liquidateData = abi.decode(data, (LiquidateData));
    amount = liquidateData.repayAmount;
    require(RTokenInterface(liquidateData.rToken).isRToken() || address(token) == wETH, "Wrong token");
    require(token.balanceOf(address(this)) >= amount, "Not enough balance");
    token.approve(liquidateData.rToken, amount);
    _liquidateBorrow(liquidateData, amount);
    _redeem(liquidateData.rTokenCollateral);
    _swap(liquidateData, address(token), amount + fee);
    token.approve(msg.sender, amount + fee);
    return amount;
  }

  function _liquidateBorrow(LiquidateData memory lqData, uint256 amount) internal {
    if (lqData.rToken == rETH) {
      WETHInterface(wETH).withdraw(amount);
      RNativeInterface(lqData.rToken).liquidateBorrow{value: amount }(lqData.borrower, RToken(lqData.rTokenCollateral));
    } else {
      uint ERROR = RErc20Interface(lqData.rToken).liquidateBorrow(lqData.borrower, amount, RTokenInterface(lqData.rTokenCollateral));
      require(ERROR == NO_ERROR, "liquidateBorrow error");
    }
  }

  function _redeem(address rTokenCollateral) internal {
    uint ERROR = rTokenCollateral == rETH ?
      RNativeInterface(rTokenCollateral).redeem(RTokenInterface(rTokenCollateral).balanceOf(address(this)))
      :
      RErc20Interface(rTokenCollateral).redeem(RTokenInterface(rTokenCollateral).balanceOf(address(this)));
    require(ERROR == NO_ERROR, "redeem error");
  } 

  function _swap(LiquidateData memory lqData, address tokenTo, uint256 amountOut) internal {
    if (lqData.rToken != lqData.rTokenCollateral){
      if (lqData.rTokenCollateral == rETH) {
        _swapInternal(wETH, address(tokenTo), amountOut);
      } else {
        _swapInternal(RErc20Interface(lqData.rTokenCollateral).underlying(), address(tokenTo), amountOut);
      }
    } else if (lqData.rToken == rETH) {
      WETHInterface(wETH).deposit{value: amountOut}();
    } 
  }

  function _swapInternal(address tokenFrom, address tokenTo, uint256 amountOut) internal {
    address[] memory path = new address[](2);
    path[0] = tokenFrom;
    path[1] = tokenTo;
    uint24 fee = 3000;

    if (tokenFrom == wETH) {
      uint amountInMax = address(this).balance;
      exchange.exactOutputSingle(IV3SwapRouter.ExactOutputSingleParams(tokenFrom, tokenTo, fee, address(this), amountOut, amountInMax, 0));
    } else { 
      uint amountInMax = IERC20(tokenFrom).balanceOf(address(this));
      IERC20(tokenFrom).approve(address(exchange), amountInMax);
      exchange.exactOutputSingle(IV3SwapRouter.ExactOutputSingleParams(tokenFrom, tokenTo, fee, address(this), amountOut, amountInMax, 0));
    }
  }
}