import React, { useState, useRef } from "react";
import { HotTable } from "@handsontable/react";
import Handsontable from "handsontable";
import { registerAllCellTypes } from "handsontable/cellTypes";
import { toast } from "react-toastify";
import axios from "axios";
import Utils from "../Utils";
import Swal from 'sweetalert2';

function StockSetting() {

    const [isLoading, setIsLoading] = useState(false);
    const [rows, setRows] = useState([]);
    const [targetName, setTargetName] = useState('*'); // 產品/原料簡碼
    const [searchType, setSearchType] = useState('P'); // p:產品 m:原料

    registerAllCellTypes();
    const hotTableComponent = useRef(null);

    const columns = [
        { data: 'NAME', type: 'text', width: 80, className: 'htCenter htMiddle', readOnly: true }, // 產品簡碼/原料簡碼
        /*{ data: 'STOCK', type: 'numeric', width: 80, className: 'htCenter htMiddle', numericFormat: { pattern: '#,##0.0', thousandSeparated: true } },*/ // 庫存
        { data: 'SAFETY_STOCK', type: 'numeric', width: 80, className: 'htCenter htMiddle', numericFormat: { pattern: '#,##0', thousandSeparated: true } }, // 安全庫存
        { data: 'STOCK_MAX', type: 'numeric', width: 80, className: 'htCenter htMiddle', numericFormat: { pattern: '#,##0', thousandSeparated: true } }, // 庫存上限
        {
            data: 'SAVE_BTN',
            width: 80,
            renderer: function (instance, td, row, col, prop, value, cellProperties) {
                const icon = document.createElement('SPAN');
                icon.className = 'icon bi-save';
                icon.innerHTML = '儲存';

                const btn = document.createElement('SAVE_BTN');
                btn.className = 'btn btn-outline-success rounded btn-sm px-1 py-0 nowrap align-top';
                btn.appendChild(icon);

                Handsontable.dom.addEvent(btn, 'click', () => {
                    const selectedLast = instance.getSelectedLast();
                    editList(selectedLast);
                });

                const div = document.createElement('DIV');
                div.appendChild(btn);

                Handsontable.dom.empty(td);
                td.appendChild(div);
                td.classList.add('htCenter');
                td.classList.add('align-middle');
            }
        }
    ];
    const colHeaders_product = [
        '產品簡碼', /*'庫存',*/ '安全庫存', '庫存上限', '儲存'
    ];
    const colHeaders_material = [
        '原料簡碼', /*'庫存',*/ '安全庫存', '庫存上限', '儲存'
    ];

    const handleChangeSelect = (evt) => {
        setRows([]);
        setSearchType(evt.target.value);
    };

    //查詢
    const queryStock = () => {
        setIsLoading(true);
        setRows([]);

        const apiURL = Utils.generateApiUrl('/stockSetting/getStock');
        const apiData = { searchType, targetName };
        let data = [];
        axios.post(apiURL, apiData, { ...Utils.pbtAxiosConfig, timeout: 5000, })
            .then(res => {
                if ('' === res.data.error) {
                    const result = res.data.res;
                    result.forEach(element => data.push({
                        NAME: element.NAME,
                        SAFETY_STOCK: element.SAFETY_STOCK,
                        STOCK_MAX: element.STOCK_MAX,
                    }));
                    if (0 === res.data.res.length) {
                        toast.error('查無資料');
                        setIsLoading(false);
                    }
                    setRows(data);
                    setIsLoading(false);
                }
                else {
                    toast.error(`查無資料，${res.data.error}`);
                    setIsLoading(false);
                }
            }).catch(err => {
                console.error(err);
                toast.error(`查無資料，${err.toString()}`);
                setIsLoading(false);
            })
    };

    //更新
    const editList = (selectedLast) => {
        let selected = selectedLast[0];
        const callback = res => {
            if (res.isConfirmed) {
                const targetName = rows[selected].NAME;
                const safetyStock = rows[selected].SAFETY_STOCK;
                const stockMax = rows[selected].STOCK_MAX;
                if ('' === safetyStock || '' === stockMax) {
                    toast.error('安全庫存、庫存上限欄位不得為空');
                } else {
                    const apiURL = Utils.generateApiUrl('/stockSetting/updateStock', [targetName]);
                    const apiData = { safetyStock, stockMax };
                    axios.post(apiURL, apiData, { ...Utils.pbtAxiosConfig, timeout: 5000 })
                        .then(res => {
                            if ('' === res.data.error) {
                                toast.success('更新成功');
                            } else {
                                toast.error(`更新失敗，${'' + res.data.error}`);
                            }
                        }).catch(err => {
                            console.error(err);
                            toast.error(`更新失敗，${'' + err}`);
                        });
                }
            }
        };

        Swal.fire({
            title: '確定要儲存嗎?',
            html: `
            <div style="font-size: 18px">
                <p style="margin-top: 10px;">產品/原料簡碼</p>
                <input type="text" id="input-proudctNo" style="width: 80%; height: 30px" readOnly={true} value=${rows[selected].NAME} />
                <p style="margin-top: 10px;">安全庫存</p>
                <input type="text" id="input-LOT_No" style="width: 80%; height: 30px" readOnly={true} value=${rows[selected].SAFETY_STOCK} />
                <p style="margin-top: 10px;">庫存上限</p>
                <input type="text" id="input-weight" style="width: 80%; height: 30px" readOnly={true} value=${rows[selected].STOCK_MAX} />
            </div> `,
            position: 'top',
            showCancelButton: true,
            showConfirmButton: true,
        }).then(callback).catch(error => {
            Swal.showValidationMessage(`Request failed: ${error}`);
        });
    };

    return (
        <div className="stock-setting-page">
            <div className="input-group input-group-sm mt-2" style={{ maxWidth: '50rem' }}>
                <span className="input-group-text">查詢種類</span>
                <select className="form-select" value={searchType} onChange={handleChangeSelect} disabled={isLoading} style={{ maxWidth: '120px' }}>
                    <option value='P'>產品</option>
                    <option value='M'>原料</option>
                </select>
                <span className="input-group-text">簡碼</span>
                <input type="text" className="form-control" value={targetName} onChange={evt => setTargetName(evt.target.value)} />
                <button type="button" className="btn btn-primary rounded-end me-2" onClick={queryStock} disabled={isLoading}>
                    <span className="icon bi-search"></span>查詢
                </button>
            </div>
            {('P' === searchType) ?
                <>
                    <div className="stock-setting-table w-100 mt-2 mb-2" style={{ minHeight: '50rem' }}>
                        <HotTable
                            data={rows}
                            columns={columns}
                            colHeaders={colHeaders_product}
                            ref={hotTableComponent}
                            licenseKey="non-commercial-and-evaluation"
                        />
                    </div>
                </>
                : null}
            {('M' === searchType) ?
                <>
                    <div className="stock-setting-table w-100 mt-2 mb-2" style={{ minHeight: '50rem' }}>
                        <HotTable
                            data={rows}
                            columns={columns}
                            colHeaders={colHeaders_material}
                            ref={hotTableComponent}
                            licenseKey="non-commercial-and-evaluation"
                        />
                    </div>
                </>
                : null}
        </div>
    )
}

export default StockSetting;