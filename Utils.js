import axios from "axios";

//產生API網址
function generateApiUrl(apiName, params = []) {
  let url = "/api/kh_pbtc_server" + apiName;

  params.forEach((param) => {
    url += "/" + param.toString();
  });

  return url;
}

//從LocalStorage取出persist
function parsePersistFromLocalStorage() {
  let persist = localStorage.getItem("persist:root");
  let obj = null;
  if (persist) {
    obj = JSON.parse(persist);
    if (obj) {
      for (let key in obj) {
        obj[key] = JSON.parse(obj[key]);
      }
    }
  }
  return obj;
}

//從localStorage中取出token
function getTokenFromLocalStorage() {
  let obj = parsePersistFromLocalStorage();
  if (obj) {
    return obj.token;
  }

  return null;
}

//從localStorage中取出firm
function getFirmFromLocalStorage() {
  let obj = parsePersistFromLocalStorage();
  if (obj) {
    return obj.firm;
  }

  return null;
}

//統一API用的axios config
const pbtAxiosConfig = {
  transformRequest: axios.defaults.transformRequest.concat((data, headers) => {
    headers["Authorization"] = `Bearer ${getTokenFromLocalStorage()}`;
    headers["Firm"] = `${getFirmFromLocalStorage()}`;

    return data;
  }),
  timeout: 60000,
};

//依照配方比例計算小數點精度
function getMaterialPrecision(totalWeight, ratio, batchNum) {
  /*
    若配方比≧5 則原料領用量顯示至整數
    若配方比≧0.1 , <5  則原料領用量顯示至小數點後一位(修正)
    若配方比<0.1 則原料領用量顯示至小數點後四位
    重量 < 0.01 Kg 時, 改以 g 顯示
    */
  let res = {
    batchWeight: 0,
    totalWeight: 0,
  };
  if (5 <= ratio) {
    res.batchWeight = (
      0.01 > totalWeight / batchNum
        ? (totalWeight / batchNum) * 1000
        : totalWeight / batchNum
    ).toFixed(0);
    res.totalWeight = (
      0.01 > totalWeight / batchNum ? totalWeight * 1000 : totalWeight
    ).toFixed(0);
  } else if (0.1 <= ratio && 5 > ratio) {
    res.batchWeight = (
      0.01 > totalWeight / batchNum
        ? (totalWeight / batchNum) * 1000
        : totalWeight / batchNum
    ).toFixed(1);
    res.totalWeight = (
      0.01 > totalWeight / batchNum ? totalWeight * 1000 : totalWeight
    ).toFixed(1);
  } else {
    res.batchWeight = (
      0.01 > totalWeight / batchNum
        ? (totalWeight / batchNum) * 1000
        : totalWeight / batchNum
    ).toFixed(4);
    res.totalWeight = (
      0.01 > totalWeight / batchNum ? totalWeight * 1000 : totalWeight
    ).toFixed(4);
  }

  return res;
}

//兩廠掃QR Code共用程式(佳峰收料完料印的標籤、半成品標籤、與供應商提供的標籤三種)
function decodeMaterialQrCode(qrCode) {
  //佳峰標籤範例: 棧板編號(BatchNo);批號(LotNo);物料碼;製造日期;有效日期;供應商簡碼;每包重量;淨重
  //半成品標籤範例: 配料日期;班別;拌粉工令LOT_NO;半成品簡碼;單批總淨重
  //供應商標籤範例: 物料碼\批號(LotNo)\原廠批號\生產日期\使用年限\重量\單位\供應商\包裝方式\包裝性質
  const obj = {
    batchNo: "",
    lotNo: "",
    material: "",
    weight: 0,
    error: false,
  };

  const originalQrCode = qrCode.split(";");
  const supplierQrCode = qrCode.split("/");

  if (8 === originalQrCode.length) {
    obj.batchNo = originalQrCode[0];
    obj.lotNo = originalQrCode[1];
    obj.material = originalQrCode[2];
    obj.weight = originalQrCode[6];
  } else if (5 === originalQrCode.length) {
    obj.batchNo = originalQrCode[2];
    obj.material = originalQrCode[3];
    obj.weight = originalQrCode[4];
  } else if (11 === supplierQrCode.length) {
    obj.batchNo = supplierQrCode[3]; //先以原廠批號代替
    obj.lotNo = supplierQrCode[2];
    obj.material = supplierQrCode[1];
    obj.weight = supplierQrCode[4];
  } else {
    obj.error = true;
  }

  return obj;
}

//取Route的名字，已建立TABLE對照
const mapRouteName = (route) => {
  switch (route) {
    case "recipe":
      return "配方管理";
    case "mixing":
      return "拌粉排程";
    case "mixingPDA":
      return "拌粉PDA";
    case "extrusion":
      return "押出作業";
    case "extrusionStorage":
      return "押出領繳";
    case "authManage":
      return "權限管理";
    case "packing":
      return "包裝作業";
    case "fileMaintain":
      return "檔案維護";
    case "materialManage":
      return "原料管理";
    case "trace":
      return "生產追溯";
    case "managementReport":
      return "管理報表";
    case "siloStatus":
      return "SILO看板";
    default:
      return "路由異常";
  }
};

function getAuthRouteMap() {
  let obj = parsePersistFromLocalStorage();
  if (obj && Array.isArray(obj.authRoute)) {
    const map = new Map(
      obj.authRoute.map((route) => {
        return [route.ROUTE, route];
      })
    );
    return map;
  }

  return null;
}

export default {
  generateApiUrl,
  getTokenFromLocalStorage,
  getFirmFromLocalStorage,
  pbtAxiosConfig,
  getMaterialPrecision,
  decodeMaterialQrCode,
  mapRouteName,
  getAuthRouteMap,
};
