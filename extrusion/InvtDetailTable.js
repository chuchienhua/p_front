import React, { useState, useRef } from 'react';
import { HyperFormula } from 'hyperformula';
import { HotTable } from '@handsontable/react';
import Handsontable from 'handsontable';
import { registerAllCellTypes } from 'handsontable/cellTypes';
import axios from 'axios';
import Utils from '../Utils';
import { toast } from 'react-toastify';

function InvtDetailTable(props) {

    const rows = props.rows;
    const setRows = props.setRows;
    const lotNo = props.lotNo;
    const productNo = props.productNo;

    registerAllCellTypes();

    const hyperFormulaInstance = HyperFormula.buildEmpty({
        licenseKey: 'internal-use-in-handsontable',
    });

    const formulas = {
        engine: hyperFormulaInstance,
    }

    const [isLoading, setIsLoading] = useState(false);

    const [adjustSuccess, setAdjustSuccess] = useState(false);
    const [createRowsIndex, setCreateRowsIndex] = useState([]); //哪些列是新增來的

    const columns = [
        { data: 'MATERIAL', type: 'text', width: 110, readOnly: true },
        { data: 'RATIO', type: 'numeric', width: 80, numericFormat: { pattern: '##0.00 ' }, readOnly: true },
        { data: 'FEEDER_NO', type: 'text', width: 60, readOnly: true },
        { data: 'PICK_WEIGHT_NEED', type: 'numeric', width: 90, numericFormat: { pattern: '##0.0' }, readOnly: true },
        { data: 'PICK_WEIGHT_FEED', type: 'numeric', width: 90, numericFormat: { pattern: '##0.0' }, readOnly: true },
        { data: 'PICK_WEIGHT_ADJUST_BEFORE', type: 'numeric', width: 105, numericFormat: { pattern: '##0.0' }, readOnly: true },
        { data: 'PICK_WEIGHT_ADJUST_AFTER', type: 'numeric', width: 105, numericFormat: { pattern: '##0.0' }, className: 'bg-light' },
        { data: 'PICK_WEIGHT_GAP', type: 'numeric', width: 90, numericFormat: { pattern: '##0.0' }, readOnly: true },
        { data: 'PRODUCT_WEIGHT', type: 'numeric', width: 75, className: 'align-middle', readOnly: true },
        { data: 'FEED_WEIGHT', type: 'numeric', width: 90, className: 'align-middle', readOnly: true },
        { data: 'FEED_WEIGHT_ADJUST', type: 'numeric', width: 90, className: 'bg-light align-middle' },
        { data: 'PACK_WEIGHT', type: 'numeric', width: 60, className: 'align-middle', readOnly: true },
        { data: 'IS_EMPTYING', type: 'checkbox', width: 45, className: 'align-middle htCenter', readOnly: true },
        { data: 'SCRAP_WEIGHT', type: 'numeric', width: 50, className: 'align-middle', readOnly: true },
        { data: 'HEAD_WEIGHT', type: 'numeric', width: 50, className: 'align-middle', readOnly: true },
        { data: 'REMAIN_BAG_WEIGHT', type: 'numeric', width: 50, className: 'align-middle', readOnly: true },
        { data: 'REWORK_WEIGHT', type: 'numeric', width: 75, className: 'align-middle', readOnly: true },
        { data: 'GAP', type: 'numeric', width: 60, className: 'align-middle', readOnly: true },
        { data: 'OUTPUT_RATE', type: 'numeric', width: 60, numericFormat: { pattern: '##0.00' }, className: 'align-middle', readOnly: true },
        {
            data: 'RUN_BTN',
            width: 80,
            readOnly: true,
            renderer: function (instance, td, row, col, prop, value, cellProperties) {
                const div = document.createElement('DIV');

                if (adjustSuccess) {
                    const icon = document.createElement('SPAN');
                    icon.className = "icon bi-check-circle text-success";
                    icon.innerHTML = ' 已調整';
                    div.appendChild(icon);

                } else if (isLoading) {
                    const spinner = document.createElement('SPAN');
                    spinner.className = "spinner-border text-secondary";
                    div.appendChild(spinner);

                } else {
                    const icon = document.createElement('SPAN');
                    icon.className = "icon bi-terminal";
                    icon.innerHTML = ' 調整';

                    const btn = document.createElement('RUN_BTN');
                    btn.className = 'btn btn-outline-secondary px-1 py-0 nowrap';
                    btn.appendChild(icon);

                    Handsontable.dom.addEvent(btn, 'click', () => {
                        if (!isLoading) {
                            runAdjustPickAndPay();
                        }
                    });
                    div.appendChild(btn);
                }

                Handsontable.dom.empty(td);
                td.appendChild(div);
                td.classList.add('htCenter');
                td.classList.add('htMiddle');
            },
        },
    ];
    const colHeader = [
        '原料簡碼', '配方比例', '入料機', '理論領料量', '原始領料量', '已調過領料量', '調整後領料量', '領料差異量', '主排程<br>設定重量', '實際繳庫量', '目標繳庫量',
        '包裝量', '包裝<br>完成', '料頭', '前料', '殘包', '重工改番<br>入料量', '差異量', '產出率', '一鍵調整'
    ];
    const mergeCells = [
        { row: 0, col: 8, rowspan: rows.length, colspan: 1 },
        { row: 0, col: 9, rowspan: rows.length, colspan: 1 },
        { row: 0, col: 10, rowspan: rows.length, colspan: 1 },
        { row: 0, col: 11, rowspan: rows.length, colspan: 1 },
        { row: 0, col: 12, rowspan: rows.length, colspan: 1 },
        { row: 0, col: 13, rowspan: rows.length, colspan: 1 },
        { row: 0, col: 14, rowspan: rows.length, colspan: 1 },
        { row: 0, col: 15, rowspan: rows.length, colspan: 1 },
        { row: 0, col: 16, rowspan: rows.length, colspan: 1 },
        { row: 0, col: 17, rowspan: rows.length, colspan: 1 },
        { row: 0, col: 18, rowspan: rows.length, colspan: 1 },
        { row: 0, col: 19, rowspan: rows.length, colspan: 1 },
    ];
    const hotTableComponent = useRef(null);
    const readOnlyRowControll = (row, col) => {
        if (row === (rows.length - 1)) {
            return { readOnly: true };
        } else if (createRowsIndex.includes(row) && col !== 3 && col !== 4 && col !== 5 && col !== 7) {
            return { readOnly: false };
        }
    }

    //在倒數第二行新增不在配方內的原料
    const newRow = () => {
        let oldRows = [...rows];
        oldRows.splice(
            rows.length - 1,
            1,
            {
                MATERIAL: '必要', FEEDER_NO: '必要', PICK_WEIGHT_NEED: 0, PICK_WEIGHT_FEED: 0, PICK_WEIGHT_ADJUST_BEFORE: 0,
                PICK_WEIGHT_ADJUST_AFTER: 0, PICK_WEIGHT_GAP: `=SUM(G${rows.length}-F${rows.length})`,
            },
            {
                MATERIAL: '加總', FEEDER_NO: '',
                PICK_WEIGHT_NEED: `=SUM(D1:D${rows.length})`,
                PICK_WEIGHT_FEED: `=SUM(E1:E${rows.length})`,
                PICK_WEIGHT_ADJUST_BEFORE: `=SUM(F1:F${rows.length})`,
                PICK_WEIGHT_ADJUST_AFTER: `=SUM(G1:G${rows.length})`,
                PICK_WEIGHT_GAP: `=SUM(H1:H${rows.length})`,
            }
        );
        setRows(oldRows);

        let createIndexList = [...createRowsIndex];
        createIndexList.push(rows.length - 1);
        setCreateRowsIndex(createIndexList);

        hotTableComponent.current.hotInstance.setDataAtCell(0, 18, `=J1*100/F${oldRows.length + 1}`); //更新產出率計算
    }

    //根據輸入的調整領料量
    const runAdjustPickAndPay = () => {
        setIsLoading(true);

        //移除加總
        const sendRows = [...rows];
        sendRows.pop();

        //計算本次繳庫量，改為直接修改累計量
        //const feedWeight = rows[0].FEED_WEIGHT_ADJUST - rows[0].FEED_WEIGHT;

        const apiUrl = Utils.generateApiUrl('/extrusion/adjustPickAndPay', [lotNo]);
        axios.post(apiUrl, {
            productNo: productNo,
            rows: sendRows,
        }, {
            ...Utils.pbtAxiosConfig,
        }).then(res => {
            if (!res.data.error) {
                toast.success('調整成功!');
                setAdjustSuccess(true);
            } else {
                toast.error(`調整失敗，${res.data.res}`);
            }
        }).catch(err => console.error(err))
            .finally(() => setIsLoading(false));
    }

    const exportFile = () => {
        const hot = hotTableComponent.current.hotInstance;
        const exportPlugin = hot.getPlugin('exportFile');
        exportPlugin.downloadFile('csv', {
            bom: true,
            columnDelimiter: ',',
            columnHeaders: true,
            exportHiddenColumns: false,
            rowHeaders: false,
            exportHiddenRows: true,
            fileExtension: 'csv',
            filename: '領繳調整',
            mimeType: 'text/csv',
            rowDelimiter: '\r\n',
        });
    }

    return (
        <>
            <div className="input-group input-group-sm w-50 mt-2">
                <span className="input-group-text">調整中批號</span>
                <input type="text" className="form-control" value={lotNo} disabled />

                <span className="input-group-text">成品簡碼</span>
                <input type="text" className="form-control" value={productNo} disabled />

                <button type="button" className="btn btn-outline-info btn-sm me-2" onClick={newRow} disabled={isLoading || !rows.length}><span className="icon bi-plus-circle"></span> 新增一列</button>
                <button type="button" className="btn btn-outline-success" onClick={exportFile} disabled={isLoading}><span className="icon bi-cloud-download"></span> 匯出</button>
            </div>

            <div className="extrusion-invtDetail-table mt-2 w-100 overflow-hidden" style={{ minHeight: "40rem" }}>
                <HotTable
                    data={rows}
                    columns={columns}
                    colHeaders={colHeader}
                    rowHeaders={false}
                    mergeCells={rows.length ? mergeCells : []}
                    formulas={formulas}
                    cells={(row, col) => readOnlyRowControll(row, col)}
                    licenseKey='non-commercial-and-evaluation'
                    ref={hotTableComponent}
                />
            </div>
        </>
    );
}

export default InvtDetailTable;