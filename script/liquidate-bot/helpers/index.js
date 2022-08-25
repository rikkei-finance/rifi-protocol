const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const number2Hex = (num, withPrefix = true) => {
  const hexString = Number(num).toString(16);
  if (withPrefix) {
    return `0x${hexString}`
  } else {
    return hexString
  }
}

const numberToString = (num) => {
  let sign = "";
  num = num + "";
  if (num.charAt(0) === "-") {
    num = num.substring(1);
    sign = "-";
  }
  let arr = num.split(/[e]/ig);
  if (arr.length < 2) return sign + num;

  const dot = (.1).toLocaleString().substring(1, 2);
  const n = arr[0].replace(/^0+/, '');
  const exp = +arr[1];
  let w = n.replace(dot, '');
  const pos = n.split(dot)[1] ? n.indexOf(dot) + exp : w.length + exp;
  let L = pos - w.length, s = "" + BigInt(w);
  if (exp >= 0) {
    if (L >= 0) {
      w = s + "0".repeat(L)
    } else {
      w = r()
    }
  } else {
    if (pos <= 0)  {
      w = "0" + dot + "0".repeat(Math.abs(pos)) + s
    } else {
      w = r();
    }
  }
  const t = w.split(dot); 
  if (+t[0]==0 && +t[1]==0 || (+w==0 && +s==0) ) w = "0";
  return sign + w;
  function r() {return w.replace(new RegExp(`^(.{${pos}})(.)`), `$1${dot}$2`)}
}

const round = (num) => {
  num = num + "";
  return num.split(".")[0];
}

module.exports = { sleep, number2Hex, numberToString, round };