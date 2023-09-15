import React, { useState, useEffect } from "react";
import axios from "axios";
import { HotTable } from "@handsontable/react";
import Handsontable from "handsontable";
import { registerAllCellTypes } from "handsontable/cellTypes";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import Utils from "./Utils";

function MaterialManage() {
  registerAllCellTypes();

  const [mounted, setMounted] = useState(false);
  const [tabName, setTabName] = useState("material");
  const [printer, setPrinter] = useState([]); //所有標籤機

  const [material, setMaterial] = useState("*"); //查詢欄位
  const [selPrinter, setSelPrinter] = useState(""); //選擇的標籤機

  const [materialRows, setMaterialRows] = useState([]); //原料量
  const [remainderRows, setRemainderRows] = useState([]); //餘料量

  const columns = [
    { data: "MATERIAL", type: "text", width: 110, readOnly: true },
    { data: "WEIGHT", type: "numeric", width: 60 },
    { data: "BATCH_NO", type: "text", width: 150 },
    { data: "LOT_NO", type: "text", width: 150 },
    {
      data: "SAVE_BTN",
      width: 65,
      readOnly: true,
      renderer: function (instance, td, row, col, prop, value, cellProperties) {
        const icon = document.createElement("SPAN");
        icon.className = "icon bi-save";
        icon.innerHTML = " 儲存";

        const btn = document.createElement("SAVE_BTN");
        btn.className =
          "btn btn-outline-success btn-sm px-1 py-0 nowrap align-top";
        btn.appendChild(icon);

        Handsontable.dom.addEvent(btn, "click", () => {
          saveBtn(row);
        });

        const div = document.createElement("DIV");
        div.appendChild(btn);

        Handsontable.dom.empty(td);
        td.appendChild(div);
      },
    },
    {
      data: "LABEL_BTN",
      width: 65,
      readOnly: true,
      renderer: function (instance, td, row, col, prop, value, cellProperties) {
        const icon = document.createElement("SPAN");
        icon.className = "icon bi-printer";
        icon.innerHTML = " 列印";

        const btn = document.createElement("LABEL_BTN");
        btn.className =
          "btn btn-outline-secondary btn-sm px-1 py-0 nowrap align-top";
        btn.appendChild(icon);

        Handsontable.dom.addEvent(btn, "click", () => {
          labelBtn(row);
        });

        const div = document.createElement("DIV");
        div.appendChild(btn);

        Handsontable.dom.empty(td);
        td.appendChild(div);
      },
    },
  ];
  const colHeader = ["原料名稱", "餘料量", "棧板編號", "批號", "更新", "標籤"];

  useEffect(() => {
    if (!mounted) {
      //取得標籤機
      const getPrinter = () => {
        const apiUrl = Utils.generateApiUrl("/printer");
        axios
          .get(apiUrl, {
            ...Utils.pbtAxiosConfig,
          })
          .then((res) => {
            if (!res.data.error && res.data.res.length) {
              setPrinter(res.data.res);
            }
          })
          .catch((err) => console.error(err));
      };
      getPrinter();

      setMounted(true);
    }
  }, [mounted]);

  //儲存餘料桶
  const saveBtn = (row) => {
    let errorString = "";
    if (
      0 < remainderRows[row].WEIGHT &&
      (!remainderRows[row].BATCH_NO || !remainderRows[row].LOT_NO)
    ) {
      errorString = "請輸入棧板編號與批號";
    }

    if (!errorString.length) {
      const apiUrl = Utils.generateApiUrl("/recipe/updateRemainder");
      axios
        .post(
          apiUrl,
          {
            material: remainderRows[row].MATERIAL,
            weight: remainderRows[row].WEIGHT,
            batchNo: remainderRows[row].BATCH_NO,
            lotNo: remainderRows[row].LOT_NO,
          },
          {
            ...Utils.pbtAxiosConfig,
          }
        )
        .then((res) => {
          if (!res.data.error) {
            toast.success("餘料數量更新成功");
            queryRemainder();
          } else {
            toast.error("餘料數量更新失敗");
          }
        })
        .catch((err) => console.error(err));
    } else {
      toast.warn(errorString);
    }
  };

  //列印餘料標籤
  const labelBtn = (row) => {
    const callback = (res) => {
      if (res.isConfirmed) {
        if (0 < selPrinter.length) {
          const apiURL = Utils.generateApiUrl("/printMachine");
          axios
            .post(
              apiURL,
              {
                printerIP: selPrinter,
                printData: remainderRows[row].MATERIAL,
              },
              {
                ...Utils.pbtAxiosConfig,
              }
            )
            .then((res) => {
              if (!res.data.error) {
                toast.success("成功!");
              } else {
                toast.error("失敗!");
              }
            })
            .catch((err) => console.error(err));
        } else {
          toast.error("請選擇標籤機");
        }
      }
    };

    Swal.fire({
      title: `確認列印原料簡碼${remainderRows[row].MATERIAL}嗎`,
      position: "top",
      showCancelButton: true,
    })
      .then(callback)
      .catch((error) => {
        Swal.showValidationMessage(`Request failed: ${error}`);
      });
  };

  //檢查Tab位置
  const switchActive = (newTab) => {
    return newTab === tabName ? "nav-link active" : "nav-link";
  };

  //取得原料
  const queryMaterials = () => {
    const apiUrl = Utils.generateApiUrl("/recipe/getMaterials");
    axios
      .get(apiUrl, {
        ...Utils.pbtAxiosConfig,
      })
      .then((res) => {
        if (!res.data.error) {
          let appendData = [];
          console.log(res.data);
          //   console.log(res.data.res);
          res.data.res.forEach((element) =>
            appendData.push({ MATERIAL: element.CODE })
          );
          setMaterialRows(appendData);
        } else {
          toast.error(`查詢失敗! ${res.data.res.toString()}`);
          setMaterialRows([]);
        }
      })
      .catch((err) => console.error(err));
  };

  //取得原料餘料量
  const queryRemainder = () => {
    const apiUrl = Utils.generateApiUrl("/recipe/remainder", [material]);
    axios
      .get(apiUrl, {
        ...Utils.pbtAxiosConfig,
      })
      .then((res) => {
        if (!res.data.error) {
        //   console.log(res.data);
          setRemainderRows(res.data.res);
        } else {
          toast.error(`查詢失敗! ${res.data.res.toString()}`);
          setRemainderRows([]);
        }
      })
      .catch((err) => console.error(err));
  };

  //新增/刪除 原料/餘料
  const materialEdit = (operation) => {
    const callback = (res) => {
      if (res.isConfirmed) {
        if (0 < res.value.trim().length) {
          const apiURL = Utils.generateApiUrl("/recipe/materialManage", [
            tabName,
            operation,
            res.value,
          ]);
          axios
            .get(apiURL, {
              ...Utils.pbtAxiosConfig,
            })
            .then((res) => {
              if (!res.data.error) {
                toast.success("成功!");
                queryRemainder();
                queryMaterials();
              } else {
                toast.error("失敗!");
              }
            })
            .catch((err) => console.error(err));
        } else {
          toast.warn("請確認輸入的原料簡碼格式");
        }
      }
    };

    Swal.fire({
      title: `請輸入欲${"remove" === operation ? "移除" : "新增"}的${
        "remainder" === tabName ? "餘料" : ""
      }原料簡碼`,
      input: "text",
      position: "top",
      showCancelButton: true,
    })
      .then(callback)
      .catch((error) => {
        Swal.showValidationMessage(`Request failed: ${error}`);
      });
  };

  //掃描QR Code後直接查詢餘料
  const scanQRCode = () => {
    let timerInterval;
    Swal.fire({
      title: "請於10秒內掃描餘料QR Code!",
      input: "text",
      inputPlaceholder: "QRCode",
      showConfirmButton: false,
      timer: 10000,
      timerProgressBar: true,
      allowOutsideClick: false,
      willClose: () => {
        clearInterval(timerInterval);
      },
    })
      .then((result) => {
        /* 時間到以後 */
        if (result.dismiss === Swal.DismissReason.timer) {
          toast.error("已過期，請再掃碼一次");
        } else {
          setMaterial(result.value);
        }
      })
      .catch((err) => alert("QRCode Error ", err));
  };

  //生成標籤機的選項
  const generatePrinter = () => {
    let div = [];
    printer.forEach((element, index) => {
      div.push(
        <option key={index} value={element.PRINTER_IP}>
          {element.PRINTER_NAME}
        </option>
      );
    });
    return div;
  };

  return (
    <div className="material-manage-page m-2">
      <ul className="nav nav-tabs">
        <li className="nav-item">
          <div
            className={switchActive("material")}
            onClick={() => setTabName("material")}
          >
            配方原料
          </div>
        </li>

        <li className="nav-item">
          <div
            className={switchActive("remainder")}
            onClick={() => setTabName("remainder")}
          >
            餘料
          </div>
        </li>
      </ul>

      {"remainder" === tabName && (
        <>
          <div className="input-group input-group-sm mt-2">
            <span className="input-group-text">查詢簡碼</span>
            <input
              type="text"
              className="form-control"
              value={material}
              onChange={(evt) => setMaterial(evt.target.value)}
            />

            <button
              type="button"
              className="btn btn-warning"
              onClick={scanQRCode}
            >
              <span className="icon bi-qr-code-scan"></span> QR Code
            </button>
          </div>

          <div className="input-group input-group-sm mt-2">
            <span className="input-group-text">標籤機</span>
            <select
              className="form-select"
              value={selPrinter}
              onChange={(evt) => setSelPrinter(evt.target.value)}
            >
              <option>---請選擇---</option>
              {generatePrinter()}
            </select>
          </div>
        </>
      )}

      <button
        type="button"
        className="btn btn-sm btn-outline-primary mt-2 me-2"
        onClick={"material" === tabName ? queryMaterials : queryRemainder}
      >
        <span className="icon bi-search"></span> 查詢
      </button>

      <button
        type="button"
        className="btn btn-sm btn-outline-info mt-2 me-2"
        onClick={() => materialEdit("create")}
      >
        <span className="icon bi-plus-circle"></span> 新增
      </button>

      <button
        type="button"
        className="btn btn-sm btn-outline-danger mt-2 me-2"
        onClick={() => materialEdit("remove")}
      >
        <span className="icon bi-x-circle"></span> 移除
      </button>

      <div className="material-manage-table mt-2 mb-2">
        <HotTable
          licenseKey="non-commercial-and-evaluation"
          data={"material" === tabName ? materialRows : remainderRows}
          columns={columns}
          colHeaders={colHeader}
          rowHeaders={false}
          hiddenColumns={{
            columns: "material" === tabName ? [1, 2, 3, 4] : [],
          }}
        />
      </div>
    </div>
  );
}

export default MaterialManage;
