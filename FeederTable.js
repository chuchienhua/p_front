import React, { useState, useRef, useEffect } from "react";
import { HotTable } from "@handsontable/react";
import { registerAllCellTypes } from "handsontable/cellTypes";
import { registerAllModules } from "handsontable/registry";
import Swal from "sweetalert2";
import Utils from "./Utils";
import axios from "axios";
import { toast } from "react-toastify";

function FeederTable() {
  const [feeders, setFeederRows] = useState([]);
  const [mounted, setMounted] = useState(false);
  const colHeader = [
    "公司別",
    "廠別",
    "線別",
    "入料機名稱",
    "入料品質<br>誤差比例",
  ];
  const columns = [
    {
      data: "COMPANY",
      width: 90,
      type: "text",
      readOnly: true,
    },
    {
      data: "FIRM",
      width: 90,
      type: "text",
      readOnly: true,
    },
    {
      data: "LINE",
      width: 90,
      type: "text",
      readOnly: true,
    },
    {
      data: "FEEDER",
      width: 90,
      type: "text",
      readOnly: true,
    },
    {
      data: "TOLERANCE_RATIO",
      width: 110,
      type: "numeric",
    },
  ];

  const hotTableComponent = useRef(null);
  registerAllCellTypes();
  registerAllModules();

  useEffect(() => {
    if (!mounted) {
      const getFeeder = async () => {
        const apiUrl = Utils.generateApiUrl("/feeder/fileMaintain");
        let appendArray = [];
        let res = await axios.get(apiUrl, {
          ...Utils.pbtAxiosConfig,
        });
        if (!res.data.error && 0 < res.data.res.length) {
          const feeder = res.data.res;
          feeder.forEach((element) =>
            appendArray.push({
              LINE: element.LINE,
              FEEDER: element.FEEDER,
              COMPANY: element.COMPANY,
              FIRM: element.FIRM,
              TOLERANCE_RATIO: element.TOLERANCE_RATIO,
            })
          );
          setFeederRows(appendArray);
        }
      };
      const loadAPI = async () => {
        try {
          await Promise.all([getFeeder()]);
          setMounted(true);
        } catch (err) {
          toast.error("載入異常", "" + err);
        }
      };
      loadAPI();
    }
  }, [mounted]);

  const editFeederList = (operation) => {
    const callback = (res) => {
      if (res.isConfirmed) {
        const apiURL = Utils.generateApiUrl("/feeder/editfile", [operation]);
        if (operation === "update") {
          axios
            .post(
              apiURL,
              {
                feederArray: feeders,
              },
              {
                ...Utils.pbtAxiosConfig,
              }
            )
            .then((res) => {
              if (!res.data.error) {
                toast.success("新增儲存成功!");
                getFeeder();
              } else {
                toast.error(`儲存失敗，${JSON.stringify(res.data.res)}`);
              }
            })
            .catch((err) => console.error(err));
        } else {
          axios
            .post(
              apiURL,
              {
                line: res.value.line,
                feeder: res.value.feeder,
                toleranceRatio: res.value.tolerance,
              },
              {
                ...Utils.pbtAxiosConfig,
              }
            )
            .then((res) => {
              if (!res.data.error) {
                if (operation === "create") {
                  toast.success("新增儲存成功!");
                } else if (operation === "delete") {
                  toast.success("移除成功!");
                }
                getFeeder();
              } else {
                toast.error(`儲存失敗，${JSON.stringify(res.data.res)}`);
              }
            })
            .catch((err) => console.error(err));
        }
      } else {
        toast.error("儲存失敗");
      }
    };
    if (operation === "update") {
      Swal.fire({
        title: `確定要儲存嗎?`,
        position: "top",
        showCancelButton: true,
      })
        .then(callback)
        .catch((err) => {
          Swal.showValidationMessage(`Request failed: ${err}`);
        });
    } else {
      Swal.fire({
        title: `請輸入欲${
          "delete" === operation ? "移除" : "新增"
        }的線別、入料機名稱和誤差比例`,
        html: `
                <div style="font-size: 18px">
                    <p>請選擇<span class="font-weight-bold">入料機名稱</span></p>
                    <input type="text" id="input-feeder" style="width: 80%; height: 30px" />
                    <p style="margin-top: 30px;">請選擇<span class="font-weight-bold">線別</span></p>
                    <input type="text" id="input-line" style="width: 80%; height: 30px;">
                    ${
                      "create" === operation
                        ? `<p style="margin-top: 30px;">請選擇<span class="font-weight-bold">誤差比例</span></p>
                    <input type="number" id="input-tolerance" style="width: 80% height: 30px;"></div>`
                        : `</div>`
                    }`,
        preConfirm: () => {
          let data = {
            line: document.getElementById("input-line")
              ? document.getElementById("input-line").value
              : "",
            feeder: document.getElementById("input-feeder")
              ? document.getElementById("input-feeder").value
              : "",
            tolerance: document.getElementById("input-tolerance")
              ? document.getElementById("input-tolerance").value
              : "",
          };
          return data;
        },
        position: "top",
        showCancelButton: true,
      })
        .then(callback)
        .catch((err) => {
          Swal.showValidationMessage(`Request failed: ${err}`);
        });
    }
  };

  const getFeeder = async () => {
    const apiUrl = Utils.generateApiUrl("/feeder/fileMaintain");
    let appendArray = [];
    let res = await axios.get(apiUrl, {
      ...Utils.pbtAxiosConfig,
    });
    if (!res.data.error && 0 < res.data.res.length) {
      const feeder = res.data.res;
      feeder.forEach((element) =>
        appendArray.push({
          LINE: element.LINE,
          FEEDER: element.FEEDER,
          COMPANY: element.COMPANY,
          FIRM: element.FIRM,
          TOLERANCE_RATIO: element.TOLERANCE_RATIO,
        })
      );
      setFeederRows(appendArray);
    }
  };

  return (
    <div className="feeder-manage-table mt-2 mb-2">
      <button
        type="button"
        className="btn btn-outline-info rounded me-2"
        onClick={() => editFeederList("create")}
      >
        <span className="icon bi-plus-circle"></span>新增
      </button>
      <button
        type="button"
        className="btn btn-outline-danger rounded me-2"
        onClick={() => editFeederList("delete")}
      >
        <span className="icon bi-x-circle"></span>移除
      </button>
      <button
        type="button"
        className="btn btn-outline-success rounded me-2"
        onClick={() => editFeederList("update")}
      >
        <span className="icon bi-save"></span>修改儲存
      </button>

      <div className="mt-2">
        <HotTable
          data={feeders}
          columns={columns}
          colHeaders={colHeader}
          rowHeaders={false}
          licenseKey="non-commercial-and-evaluation"
          ref={hotTableComponent}
        />
      </div>
    </div>
  );
}

export default FeederTable;
