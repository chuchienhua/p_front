import React, { useRef } from 'react';
import { HyperFormula } from 'hyperformula';
import { HotTable } from '@handsontable/react';
import Handsontable from 'handsontable';
import { registerAllCellTypes } from 'handsontable/cellTypes';
import Utils from '../Utils';
import axios from 'axios';
import { toast } from 'react-toastify';

function ScrapRecordTable(props) {

    const hyperFormulaInstance = HyperFormula.buildEmpty({
        licenseKey: 'internal-use-in-handsontable',
    });

    const formulas = {
        engine: hyperFormulaInstance,
    }

    registerAllCellTypes();

    const scrapRows = props.rows; //料頭產出內容
    const feeders = props.feeders; //所有入料機，要轉成線別
    const bagSeries = props.bagSeries; //回收太空袋種類
    const batchNo = props.batchNo; //回收太空袋的批號
    const isAdmin = props.isAdmin; //是否為管理員
    const readOnlyRows = props.readOnlyRows; //無法編輯的列數

    let lines = [];
    let existsLine = new Set();
    feeders.forEach(element => {
        if (!existsLine.has(element.LINE)) {
            lines.push(element.LINE);
            existsLine.add(element.LINE);
        }
    });

    const columns = [
        { data: 'LINE', type: 'autocomplete', source: lines, strict: true, allowInvalid: false, width: 50 },
        { data: 'SEQUENCE', type: 'numeric', width: 50 },
        {
            data: 'PRD_PC',
            width: 100,
            readOnly: true,
            renderer: function (instance, td, row, col, prop, value, cellProperties) {
                Handsontable.renderers.TextRenderer.apply(this, arguments);
                if (0 < row) {
                    if (!bagSeriesAllow(value)) {
                        td.classList.add('bg-danger');
                        td.classList.add('text-light');
                    }
                }
            },
        },
        { data: 'WEIGHING_WEIGHT_BEFORE', type: 'numeric', width: 50, readOnly: true },
        { data: 'WEIGHING_WEIGHT', type: 'numeric', width: 50 },
        { data: 'WEIGHING_DIFF', type: 'numeric', width: 50, readOnly: true },
        {
            data: 'WEIGHT',
            type: 'numeric',
            width: 50,
            readOnly: true,
            renderer: function (instance, td, row, col, prop, value, cellProperties) {
                Handsontable.renderers.NumericRenderer.apply(this, arguments);
                if (0 < row) {
                    if (value !== instance.getDataAtCell(row, 5)) {
                        td.classList.add('bg-danger');
                        td.classList.add('text-light');
                    }
                }
            },
        },
        { data: 'WEIGHT_RESTART', type: 'numeric', width: 60 },
        { data: 'WEIGHT_BREAK', type: 'numeric', width: 50 },
        { data: 'WEIGHT_ABNORMAL', type: 'numeric', width: 70 },
        { data: 'SCHEDULE_ERR', type: 'checkbox', width: 50, readOnly: true },
        { data: 'DISALLOW', type: 'checkbox', width: 50, readOnly: true },
        { data: 'CREATOR', type: 'text', width: 60, readOnly: true },
        { data: 'CREATOR_NAME', type: 'text', width: 60, readOnly: true },
        { data: 'CREATE_TIME', type: 'text', width: 160, readOnly: true },
        { data: 'LAST_WORK_SHIFT', type: 'dropdown', source: ['', '早', '中', '晚'], strict: true, allowInvalid: false, width: 60 },
        {
            data: 'EDIT_BTN',
            width: 70,
            renderer: function (instance, td, row, col, prop, value, cellProperties) {
                if (readOnlyRows.includes(row) && 0 < row) {
                    const icon = document.createElement('SPAN');
                    icon.className = "icon bi-save";
                    icon.innerHTML = ' 儲存';

                    const btn = document.createElement('EDIT_BTN');
                    btn.className = 'btn btn-outline-secondary btn-sm px-1 py-0 nowrap align-top';
                    if (!isAdmin) {
                        btn.className += ' disabled';
                    }
                    btn.appendChild(icon);
                    Handsontable.dom.addEvent(btn, 'click', () => {
                        if (isAdmin) {
                            editBtn(row);
                        }
                    });

                    const div = document.createElement('DIV');
                    div.appendChild(btn);

                    Handsontable.dom.empty(td);
                    td.appendChild(div);
                }
            },
        },
        { data: 'EDITOR', type: 'text', width: 60, readOnly: true },
        { data: 'EDIT_TIME', type: 'text', width: 160, readOnly: true },
    ];
    const colHeader = [
        '線別', '序號', '產品簡碼', '秤重<br>前重', '秤重<br>後重', '秤重<br>差值', '重量<br>(kg)', '開關機<br>重量', '斷條<br>重量', '設備異常<br>重量',
        '時間<br>異常', '品番<br>異常', '員工<br>編號', '名字', '加入時間', '上一班<br>產出', '管理員<br>修改', '修改人', '修改時間',
    ];
    const readOnlyRowControll = (row, col) => {
        if (readOnlyRows.includes(row)) {
            if (isAdmin && 0 !== row) {
                if (4 === col || 7 === col || 8 === col || 9 === col || 15 === col) {
                    return { readOnly: false }; //管理員能夠修改現有料頭重量
                } else {
                    return { readOnly: true };
                }
            } else {
                return { readOnly: true };
            }
        }
    }

    //檢查太空袋系列與符合的成品簡碼
    const bagSeriesAllow = productNo => {
        switch (bagSeries) {
            case '1000/3000(W)':
                return ('1' === productNo[0] || '3' === productNo[0] || 'V1' === productNo.substring(0, 2) || 'V3' === productNo.substring(0, 2) || 'SK' === productNo.substring(0, 2));
            case '1000/3000(B)':
                return ('1' === productNo[0] || '3' === productNo[0] || 'V1' === productNo.substring(0, 2) || 'V3' === productNo.substring(0, 2) || 'SK' === productNo.substring(0, 2));
            case '2000/4000(W)':
                return ('2' === productNo[0] || '4' === productNo[0] || 'V2' === productNo.substring(0, 2) || 'V4' === productNo.substring(0, 2));
            case '2000/4000(B)':
                return ('2' === productNo[0] || '4' === productNo[0] || 'V2' === productNo.substring(0, 2) || 'V4' === productNo.substring(0, 2));
            case '5000':
                return ('1' === productNo[0] || '2' === productNo[0] || '3' === productNo[0] || '4' === productNo[0] || '5' === productNo[0] || 'V1' === productNo.substring(0, 2) || 'V2' === productNo.substring(0, 2) || 'V3' === productNo.substring(0, 2) || 'V4' === productNo.substring(0, 2) || 'V5' === productNo.substring(0, 2));
            case '6000~9000':
                return ('6' === productNo[0] || '7' === productNo[0] || '8' === productNo[0] || '9' === productNo[0] || 'OFFPBT01' === productNo || 'OFFPBT' === productNo);
            default:
                return false;
        }
    }

    //輸入線別序號自動袋出成品簡碼
    const queryProductNo = async (line, sequence) => {
        let obj = {
            productNo: 'NOT FOUND',
            scheduleError: false,
        }

        try {
            const apiUrl = Utils.generateApiUrl('/schedules', [line, sequence]);
            let res = await axios.get(apiUrl, {
                ...Utils.pbtAxiosConfig,
            })
            if (!res.data.error && res.data.res.length) {
                //console.log(res.data.res[0]);
                obj.productNo = res.data.res[0].PRD_PC;
                obj.scheduleError = !res.data.res[0].ACT_STR_TIME; //尚未開始生產無批號，無法過帳
            }
        } catch (err) {
            console.error(err);
        }

        return obj;
    }

    const handleAfterChange = async (changes, source) => {
        //console.log(changes, source); //[[row, colName, oldValue, newValue]]，[1, 'SEQUENCE', 5230, 4851]
        if ('edit' === source && Array.isArray(changes)) {
            const [row, colName, oldValue, newValue] = changes[0];
            const rowData = scrapRows[row];
            if (('LINE' === colName || 'SEQUENCE' === colName) && (oldValue !== newValue) && rowData.LINE && rowData.SEQUENCE) {
                //僅在更新線別或序號時重新抓取成品簡碼
                const res = await queryProductNo(rowData.LINE, rowData.SEQUENCE);
                hotTableComponent.current.hotInstance.setDataAtCell(row, 2, res.productNo);

                //檢查排程是否尚未開始
                hotTableComponent.current.hotInstance.setDataAtCell(row, 10, res.scheduleError);

                //檢查成品簡碼是否符合太空袋系列規則
                hotTableComponent.current.hotInstance.setDataAtCell(row, 11, !bagSeriesAllow(res.productNo));
            }
        }
    }

    //更新指定料頭的重量(限管理員)
    const editBtn = row => {
        const apiUrl = Utils.generateApiUrl('/extrusion/updateBags', [batchNo]);
        axios.post(apiUrl, {
            scrapList: [scrapRows[row]], //只儲存允許新增的
            type: 'update',
        }, {
            ...Utils.pbtAxiosConfig,
        }).then(res => {
            if (!res.data.error) {
                toast.success('更新成功');
            } else {
                toast.error(`更新失敗，${res.data.res}`);
            }
        }).catch(err => console.error(err));
    }

    const hotTableComponent = useRef(null);

    return (
        <div className="scrap-record-table w-100 overflow-hidden mt-2" style={{ minHeight: "20rem" }}>
            <HotTable
                data={scrapRows}
                columns={columns}
                colHeaders={colHeader}
                rowHeaders={false}
                formulas={formulas}
                cells={(row, col) => readOnlyRowControll(row, col)}
                afterChange={handleAfterChange}
                ref={hotTableComponent}
                licenseKey="non-commercial-and-evaluation"
            />
        </div>
    );
}

export default ScrapRecordTable;