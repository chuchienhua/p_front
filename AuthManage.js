import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import Utils from "./Utils";
import LoadingPage from "./LoadingPage";

function AuthManage() {
  const [mounted, setMounted] = useState(false);
  const [routesDetail, setRoutesDetail] = useState([]);

  const [currentRoute, setCurrentRoute] = useState(""); //選擇的Route

  const [inputPPS, setInputPPS] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [firm, setFirm] = useState("");

  const [showType, setShowType] = useState("ALL"); //顯示名單的方式
  const [crew, setCrew] = useState([]); //權限的人員名單
  const [admin, setAdmin] = useState([]); //權限的管理人員名單

  useEffect(() => {
    if (!mounted) {
      const loadAPI = async () => {
        try {
          await queryRoutes();
          setMounted(true);
        } catch (err) {
          toast.error("載入異常", err.toString());
        }
      };
      loadAPI();
    }
  }, [mounted]);

  //切換選擇的Route時，顯示名單
  useEffect(() => {
    if (currentRoute.length) {
      let crewList = [];
      let adminList = [];
      if ("ALL" === showType) {
        crewList = routesDetail
          .filter((x) => x.ROUTE === currentRoute && "0" === x.ISADMIN)
          .map((x) => `${x.PPS_CODE}(${x.NAME})`);
        adminList = routesDetail
          .filter((x) => x.ROUTE === currentRoute && "1" === x.ISADMIN)
          .map((x) => `${x.PPS_CODE}(${x.NAME})`);
      } else {
        crewList = routesDetail
          .filter((x) => x.ROUTE === currentRoute && "0" === x.ISADMIN)
          .map((x) => x[showType]);
        adminList = routesDetail
          .filter((x) => x.ROUTE === currentRoute && "1" === x.ISADMIN)
          .map((x) => x[showType]);
      }
      setCrew(crewList);
      setAdmin(adminList);
    }
  }, [currentRoute, routesDetail, showType]);

  const queryRoutes = async () => {
    const apiUrl = Utils.generateApiUrl("/routes");
    let res = await axios.get(apiUrl, {
      ...Utils.pbtAxiosConfig,
    });
    if (res.data.length) {
      //console.log(res.data);
      setRoutesDetail(res.data);
    }
  };

  const queryUser = async () => {
    const apiUrl = Utils.generateApiUrl("/getUserData", [inputPPS]);
    let res = await axios.get(apiUrl, {
      ...Utils.pbtAxiosConfig,
    });
    if (res.data.res.length) {
      //console.log(res.data);
      setName(res.data.res[0].NAME);
      setCompany(res.data.res[0].COMPANY);
      setFirm(res.data.res[0].FIRM);
    }
  };

  //移除/新增人員或管理員
  const crewEdit = (type, isAdmin) => {
    const callback = (res) => {
      if (res.isConfirmed) {
        if (0 < res.value.trim().length) {
          console.log(res.value);
          const apiUrl = Utils.generateApiUrl(
            "remove" === type ? "/removeRouteUser" : "/addRouteUser"
          );
          axios
            .post(
              apiUrl,
              {
                ppsCode: res.value,
                route: currentRoute,
                isAdmin: isAdmin,
              },
              {
                ...Utils.pbtAxiosConfig,
              }
            )
            .then((res) => {
              if (!res.data.error) {
                toast.success(`權限編輯成功`);
                queryRoutes();
              } else {
                toast.error(`權限編輯失敗，${res.data.res}`);
              }
            })
            .catch((err) => console.error(err));
        } else {
          toast.warn("請確認輸入的員工編號格式");
        }
      }
    };

    Swal.fire({
      title: `${"remove" === type ? "移除" : "新增"}${
        isAdmin ? "管理" : "一般"
      }人員權限`,
      input: "text",
      inputPlaceholder: "員工編號",
      inputValue: inputPPS || "",
      position: "top",
      showCancelButton: true,
    })
      .then(callback)
      .catch((error) => {
        Swal.showValidationMessage(`Request failed: ${error}`);
      });
  };

  const generateRoutes = () => {
    let routesFound = [];
    let div = [];
    routesDetail.forEach((element, index) => {
      if (!routesFound.includes(element.ROUTE)) {
        div.push(
          <option key={index} value={element.ROUTE}>
            {element.ROUTE_NAME}
          </option>
        );
        routesFound.push(element.ROUTE);
      }
    });
    return div;
  };

  const getBtnClassName = (tabIndex) => {
    return tabIndex === showType
      ? "btn btn-outline-secondary active"
      : "btn btn-outline-secondary";
  };

  if (!mounted) {
    return <LoadingPage />;
  }

  return (
    <div className="auth-manage-page m-2">
      <div className="input-group w-75">
        <span className="input-group-text">員工編號</span>
        <input
          className="form-control"
          value={inputPPS}
          onChange={(evt) => setInputPPS(evt.target.value)}
        />
        <button
          type="button"
          className="btn btn-outline-primary rounded-end me-2"
          onClick={queryUser}
          disabled={!inputPPS.length}
        >
          <span className="icon bi-search"></span> 查詢
        </button>

        <span className="input-group-text">中文姓名</span>
        <input className="form-control" value={name} disabled />
        <span className="input-group-text">所屬公司</span>
        <input className="form-control" value={company} disabled />
        <span className="input-group-text">所屬廠別</span>
        <input className="form-control" value={firm} disabled />
      </div>

      <hr />

      <div className="input-group w-25 mt-2">
        <span className="input-group-text">頁面權限</span>
        <select
          className="form-select"
          value={currentRoute}
          onChange={(evt) => setCurrentRoute(evt.target.value)}
        >
          <option>---請選擇---</option>
          {generateRoutes()}
        </select>
      </div>

      <div
        className="btn-group mt-2 me-2"
        role="group"
        aria-label="Basic radio toggle button group"
      >
        <button
          className={getBtnClassName("ALL")}
          onClick={() => setShowType("ALL")}
        >
          顯示全部
        </button>
        <button
          className={getBtnClassName("PPS_CODE")}
          onClick={() => setShowType("PPS_CODE")}
        >
          員工編號
        </button>
        <button
          className={getBtnClassName("NAME")}
          onClick={() => setShowType("NAME")}
        >
          中文姓名
        </button>
      </div>
      <div className="badge rounded-pill text-bg-danger">
        配方管理權限改以營業秘密申請
      </div>

      <div className="input-group w-100 mt-2">
        <span className="input-group-text">人員名單</span>
        <input className="form-control" value={crew} disabled />

        <button
          type="button"
          className="btn btn-success rounded-end me-2"
          onClick={() => crewEdit("normal", false)}
          disabled={!currentRoute.length}
        >
          <span className="icon bi-plus-circle"></span> 新增
        </button>
        <button
          type="button"
          className="btn btn-danger rounded"
          onClick={() => crewEdit("remove", false)}
          disabled={!currentRoute.length}
        >
          <span className="icon bi-x-circle"></span> 移除
        </button>
      </div>

      {0 < admin.length && (
        <div className="input-group w-100 mt-2">
          <span className="input-group-text">管理人員</span>
          <input className="form-control" value={admin} disabled />

          <button
            type="button"
            className="btn btn-success rounded-end me-2"
            onClick={() => crewEdit("normal", true)}
            disabled={!currentRoute.length}
          >
            <span className="icon bi-plus-circle"></span> 新增
          </button>
          <button
            type="button"
            className="btn btn-danger rounded"
            onClick={() => crewEdit("remove", true)}
            disabled={!currentRoute.length}
          >
            <span className="icon bi-x-circle"></span> 移除
          </button>
        </div>
      )}
    </div>
  );
}

export default AuthManage;
