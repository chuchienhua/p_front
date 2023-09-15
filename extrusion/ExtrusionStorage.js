import React, { useState, useRef } from 'react';
import axios from 'axios';
import { HotTable } from '@handsontable/react';
import Handsontable from 'handsontable';
import { registerAllCellTypes } from 'handsontable/cellTypes';
import Utils from '../Utils';
import moment from 'moment';
import { toast } from 'react-toastify';
import * as XLSX from 'xlsx-js-style';
import LoadingPage from '../LoadingPage';
import InvtDetailTable from './InvtDetailTable';

const ExtrusionStorage = () => {

    registerAllCellTypes();

    const [isLoading, setIsLoading] = useState(false);

    const [queryType, setQueryType] = useState('date');
    const [searchDate, setSearchDate] = useState(moment(new Date()).format('YYYY-MM-DD'));
    const [line, setLine] = useState('A');
    const [seqStart, setSeqStart] = useState(0);
    const [seqEnd, setSeqEnd] = useState(0);
    const [lotNo, setLotNo] = useState('K230722K41');
    const [searchType, setSearchType] = useState('picking');

    const [rows, setRows] = useState([]); //領繳
    const [hiddenCols, setHiddenCols] = useState([]); //隱藏

    const [invtDetailRows, setInvtDetailRows] = useState([]); //方便調帳領繳用
    const [adjustLotNo, setAdjustLotNo] = useState(''); //調帳中的批號
    const [adjustProductNo, setAdjustProductNo] = useState(''); //調帳中的成品簡碼
    const [showTable, setShowTable] = useState('normal'); //顯示的表格

    const columns = [
        { data: 'LINE', type: 'text', width: 40, className: 'htCenter' },
        { data: 'SEQUENCE', type: 'text', width: 40, className: 'htCenter' },
        { data: 'VERSION', type: 'text', width: 55, className: 'htCenter' },
        { data: 'PRODUCT_NO', type: 'text', width: 110 },
        { data: 'FEEDER_NO', type: 'text', width: 55, className: 'htCenter' },
        { data: 'PRODUCT_WEIGHT', type: 'text', width: 75, className: 'htRight' },
        { data: 'MATERIAL', type: 'text', width: 110 },
        { data: 'LOT_NO', type: 'text', width: 100 },
        { data: 'LOC', type: 'text', width: 60 },
        { data: 'RATIO', type: 'numeric', width: 90, numericFormat: { pattern: '##0.00' } },
        { data: 'START_TIME', type: 'text', width: 160 },
        { data: 'END_TIME', type: 'text', width: 160 },
        { data: 'VISION_START_TIME', type: 'text', width: 90 },
        { data: 'VISION_END_TIME', type: 'text', width: 90 },
        { data: 'START_WEIGHT', type: 'numeric', width: 110 },
        { data: 'END_WEIGHT', type: 'numeric', width: 110 },
        {
            data: 'PICK_WEIGHT',
            type: 'numeric',
            width: 80,
            renderer: function (instance, td, row, col, prop, value, cellProperties) {
                Handsontable.renderers.NumericRenderer.apply(this, arguments);
                if (0 > value) {
                    td.classList.add('text-danger');
                }
            },
        },
        { data: 'PICK_RATIO', type: 'numeric', width: 100, numericFormat: { pattern: '##0.00' } },
        {
            data: 'PICK_DIFF',
            type: 'numeric',
            width: 100,
            numericFormat: {
                pattern: '##0.00'
            },
            renderer: function (instance, td, row, col, prop, value, cellProperties) {
                Handsontable.renderers.NumericRenderer.apply(this, arguments);
                const toleranceRatio = instance.getDataAtCell(row, 30);  //取得允差欄位數值
                if (toleranceRatio <= Math.abs(value)) {
                    td.classList.add('bg-danger');
                    td.classList.add('text-light');
                }
            },
        },
        { data: 'SPEED', type: 'numeric', width: 45 },
        {
            data: 'FEED_STORAGE',
            type: 'numeric',
            width: 90,
            renderer: function (instance, td, row, col, prop, value, cellProperties) {
                Handsontable.renderers.NumericRenderer.apply(this, arguments);
                if (0 > value) {
                    td.classList.add('text-danger');
                }
            },
        },
        { data: 'PACK_WEIGHT', type: 'numeric', width: 70 },
        { data: 'PACK_NOTE', type: 'text', width: 70 },
        { data: 'SCRAP_WEIGHT', type: 'numeric', width: 45 },
        { data: 'HEAD_WEIGHT', type: 'numeric', width: 45 },
        { data: 'REMAIN_BAG_WEIGHT', type: 'numeric', width: 45 },
        { data: 'OUTPUT_WEIGHT', type: 'numeric', width: 55 },
        {
            data: 'GAP',
            type: 'numeric',
            width: 55,
            renderer: function (instance, td, row, col, prop, value, cellProperties) {
                Handsontable.renderers.NumericRenderer.apply(this, arguments);
                if (0 > value) {
                    td.classList.add('text-danger');
                }
            },
        },
        {
            data: 'LINK_PICK_BTN',
            width: 70,
            renderer: function (instance, td, row, col, prop, value, cellProperties) {
                const icon = document.createElement('SPAN');
                icon.className = "icon bi-link-45deg";
                icon.innerHTML = ' 開啟';

                const btn = document.createElement('LINK_BTN');
                btn.className = 'btn btn-outline-secondary btn-sm px-1 py-0 nowrap align-top';
                btn.appendChild(icon);

                //這樣無法從PBTC系統抓使用者，會抓Portal的
                const erpURL = 'https://portal.ccpgp.com/' +
                    'TEST/' +
                    'Verify_Process/FlowView/RedirectIndexNFlow?template=MD/index/12d28bc2-cb1d-43d8-bb5e-d0974a6586b9' +
                    '&ISS_NO=' + value +
                    '&QUERYNOW=Y';

                Handsontable.dom.addEvent(btn, 'click', () => {
                    window.open(erpURL);
                });

                const div = document.createElement('DIV');
                div.appendChild(btn);

                Handsontable.dom.empty(td);
                td.appendChild(div);
            },
        },
        {
            data: 'LINK_PAY_BTN',
            width: 70,
            renderer: function (instance, td, row, col, prop, value, cellProperties) {
                const icon = document.createElement('SPAN');
                icon.className = "icon bi-link-45deg";
                icon.innerHTML = ' 開啟';

                const btn = document.createElement('LINK_BTN');
                btn.className = 'btn btn-outline-secondary btn-sm px-1 py-0 nowrap align-top';
                btn.appendChild(icon);

                //這樣無法從PBTC系統抓使用者，會抓Portal的
                const erpURL = 'https://portal.ccpgp.com/' +
                    'TEST/' +
                    'Verify_Process/FlowView/RedirectIndexNFlow?template=MD/index/3ca70199-47a6-4598-a9bb-ea1e3d63d54c' +
                    '&SHTNO1=' + value +
                    //'&LOT_NO1=' + instance.getDataAtCell(row, 7) + 
                    //'&PRD_PC1=' + instance.getDataAtCell(row, 3) +
                    '&QUERYNOW=Y';

                Handsontable.dom.addEvent(btn, 'click', () => {
                    window.open(erpURL);
                });

                const div = document.createElement('DIV');
                div.appendChild(btn);

                Handsontable.dom.empty(td);
                td.appendChild(div);
            },
        },
        { data: 'TOLERANCE_RATIO', type: 'numeric', width: 55 }
    ];
    const colHeader = [
        '線別', '序號', '配方別', '成品簡碼', '入料機', '成品總重', '原料簡碼', '批號', '儲位', '配方比例', '排程啟動時間', '排程結束時間', 'VISION啟動', 'VISION結束',
        '啟動重量', '結束重量', '領料量', '領料(%)', '差異(%)', '產速', '實際繳庫量', '已包裝量', '包裝結束', '料頭', '前料', '殘包', '產出量', '差異量', '領料連結', '繳庫連結', '允差',
    ];
    const hotTableComponent = useRef(null);

    //切換要隱藏的欄位
    const switchColSetting = type => {
        let hidden = [];
        //12+2
        switch (type) {
            case 'picking':
                hidden = [8, 14, 15, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 29, 30];
                break;
            case 'pay':
                hidden = [4, 6, 9, 14, 15, 16, 17, 18, 28, 30];
                break;
            case 'quality':
                hidden = [5, 7, 8, 10, 11, 12, 13, 14, 15, 16, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29];
                break;
            default:
                break;
        }

        setHiddenCols(hidden);
    }

    const query = storageType => {
        //檢查與防呆
        let errorString = '';
        if ('order' === queryType) {
            if (!line) {
                errorString = '請輸入線別';
            } else if (!seqStart) {
                errorString = '請輸入序號';
            } else if (10 < seqEnd - seqStart) {
                errorString = '請勿一次查詢超過10筆工令';
            }

        } else if ('week' === queryType) {
            if (moment(searchDate).isBefore(moment(new Date()).subtract(7, 'days'))) {
                errorString = '請勿查詢超過一週以上';
            }

        }

        if (moment(searchDate).isAfter(moment(new Date()))) {
            errorString = '無法查詢未來日期';
        }

        if (errorString.length) {
            toast.warn(errorString);
            return;
        }

        setRows([]);
        setSearchType(storageType);
        setShowTable('normal');
        setIsLoading(true);

        const apiUrl = Utils.generateApiUrl('/extrusion/storage', [storageType, queryType]);
        axios.post(apiUrl, {
            date: searchDate,
            line: line,
            seqStart: seqStart,
            seqEnd: seqEnd,
            lotNo: lotNo,
        }, {
            ...Utils.pbtAxiosConfig,
        }).then(res => {
            if (!res.data.error) {
                let appendArray = [];
                switchColSetting(storageType);

                res.data.res.forEach(element => {
                    //計算差異量
                    let gap = 0;
                    if ('picking' === storageType) {
                        gap = element.PICK_WEIGHT - (element.PRO_WT * element.RATIO / 100);
                    } else if ('pay' === storageType) {
                        gap = element.FEED_STORAGE - element.PACK_WEIGHT - element.SCRAP_WEIGHT - element.HEAD_WEIGHT + element.REMAIN_BAG_WEIGHT;
                    }

                    appendArray.push({
                        LINE: element.LINE,
                        SEQUENCE: element.SEQ,
                        VERSION: element.SCH_SEQ,
                        PRODUCT_NO: element.PRD_PC,
                        PRODUCT_WEIGHT: element.PRO_WT,
                        MATERIAL: element.MAT_PC || element.MATERIAL,
                        LOT_NO: element.LOT_NO,
                        LOC: element.LOC,
                        RATIO: element.RATIO,
                        FEEDER_NO: element.FEEDER_NO,
                        START_TIME: (element.ACT_STR_TIME) ? moment(element.ACT_STR_TIME).format('YYYY-MM-DD HH:mm:ss') : '-',
                        END_TIME: (element.ACT_END_TIME) ? moment(element.ACT_END_TIME).format('YYYY-MM-DD HH:mm:ss') : '-',
                        VISION_START_TIME: (element.VISION_START_TIME) ? moment(element.VISION_START_TIME).format('HH:mm:ss') : '-',
                        VISION_END_TIME: (element.VISION_END_TIME) ? moment(element.VISION_END_TIME).format('HH:mm:ss') : '-',
                        START_WEIGHT: element.START_WEIGHT,
                        END_WEIGHT: element.END_WEIGHT,
                        PICK_WEIGHT: element.PICK_WEIGHT,
                        PICK_RATIO: element.PICK_RATIO,
                        PICK_DIFF: element.PICK_DIFF,
                        SPEED: element.WT_PER_HR,
                        FEED_STORAGE: element.FEED_STORAGE,
                        PACK_WEIGHT: element.PACK_WEIGHT || 0,
                        PACK_NOTE: element.PACK_NOTE,
                        SCRAP_WEIGHT: element.SCRAP_WEIGHT || 0,
                        HEAD_WEIGHT: element.HEAD_WEIGHT || 0,
                        REMAIN_BAG_WEIGHT: element.REMAIN_BAG_WEIGHT || 0,
                        OUTPUT_WEIGHT: element.PACK_WEIGHT + element.SCRAP_WEIGHT + element.HEAD_WEIGHT + element.REMAIN_BAG_WEIGHT,
                        GAP: gap,
                        LINK_PICK_BTN: element.LASTEST_SHT_NO,
                        LINK_PAY_BTN: element.LASTEST_SHT_NO,
                        TOLERANCE_RATIO: element.TOLERANCE_RATIO,
                    });
                });
                setRows(appendArray);

            } else {
                toast.error(`查詢失敗，${res.data.res}`);
            }
        }).catch(err => toast.error(`查詢失敗，${err}`))
            .finally(() => setIsLoading(false));
    }

    //輸出表格
    const exportFile = () => {
        let exportFileName = '';
        switch (searchType) {
            case 'picking':
                exportFileName = '押出領料表';
                break;
            case 'pay':
                exportFileName = '押出繳庫表';
                break;
            case 'quality':
                exportFileName = '押出入料品質表';
                break;
            default:
                break;
        }

        if (rows.length) {
            if ('quality' === searchType) {
                //入料品質有需要styling的東西，只好特別匯出成xlsx
                exportXLSX();
            } else {
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
                    filename: exportFileName,
                    mimeType: 'text/csv',
                    rowDelimiter: '\r\n',
                });
            }
        } else {
            toast.warn('請先查詢，再做匯出');
        }
    }

    //輸出表格
    const exportXLSX = () => {
        const colNames = ['線別', '序號', '配方別', '成品簡碼', '入料機', '原料簡碼', '配方比例', '領料(%)', '差異(%)'];

        let wb = XLSX.utils.book_new();
        let ws = XLSX.utils.aoa_to_sheet([colNames]);

        //欄位寬度
        ws['!cols'] = [5, 5, 8, 15, 8, 15, 10, 10, 10].map(width => ({ wch: width }));

        let rowCount = 0;
        rows.forEach((array, rowIndex) => {
            rowCount++;
            let cells = [
                array.LINE,
                array.SEQUENCE,
                array.VERSION,
                array.PRODUCT_NO,
                array.FEEDER_NO,
                array.MATERIAL,
                array.RATIO,
                array.PICK_RATIO,
                array.PICK_DIFF,
            ];

            //將每個cell存到sheet中
            cells.forEach((col, colIndex) => {
                if (null === col) {
                    col = '';
                }
                let value = col.toString().trim().replace(/\n/g, '\r\n');
                let cell = {
                    v: value,
                    t: 's',
                    s: {
                        alignment: { vertical: 'top', horizontal: 'right', wrapText: true },
                    },
                };

                //處理差異(%)
                if (8 === colIndex && 10 <= Math.abs(value)) {
                    cell.s['fill'] = { fgColor: { rgb: "FF0000" } };
                    cell.s['font'] = { colort: { rgb: "FFFFFF" } };
                }
                const addr = XLSX.utils.encode_cell({ c: colIndex, r: rowIndex + 1 });
                ws[addr] = cell;
            });
        })

        let lastAddr = XLSX.utils.encode_cell({ c: Math.max(colNames.length - 1, 0), r: Math.max(rowCount, 1) });
        ws['!ref'] = `A1:${lastAddr}`;

        XLSX.utils.book_append_sheet(wb, ws, 'report_1');
        XLSX.writeFile(wb, '押出入料品質表.xlsx');
    }

    const invtAdjust = () => {
        if ('lotNo' === queryType) {
            setShowTable('invtDetail');
            setRows([]);
            setInvtDetailRows([]);
            setIsLoading(true);

            const apiUrl = Utils.generateApiUrl('/extrusion/invtDetail', [lotNo]);
            axios.get(apiUrl, {
                ...Utils.pbtAxiosConfig,
            }).then(res => {
                console.log(res.data);
                if (!res.data.error && res.data.pick.length && res.data.pay.length) {
                    let appendArray = [];
                    res.data.pick.forEach((element, index) => {
                        //找出已調整的領料量
                        const adjustRows = res.data?.pickAdjust.filter(x => (x.MAT_PC === element.MAT_PC)); //暫時不顯示已調整量
                        appendArray.push({
                            MATERIAL: element.MAT_PC,
                            RATIO: element.RATIO,
                            FEEDER_NO: element.FEEDER_NO,
                            PICK_WEIGHT_NEED: element.PRO_WT * element.RATIO / 100,
                            PICK_WEIGHT_FEED: element.PICK_WEIGHT,
                            PICK_WEIGHT_ADJUST_BEFORE: adjustRows.length ? adjustRows[0].PICK_WEIGHT : element.PICK_WEIGHT,
                            //PICK_WEIGHT_ADJUST_BEFORE: element.PICK_WEIGHT,
                            PICK_WEIGHT_ADJUST_AFTER: 0,
                            PICK_WEIGHT_GAP: `=SUM(G${index + 1}-F${index + 1})`,
                            PRODUCT_WEIGHT: res.data.productWeight,
                            FEED_WEIGHT: res.data.payLatest,
                            FEED_WEIGHT_ADJUST: res.data.pay[0].PACK_WEIGHT + res.data.pay[0].SCRAP_WEIGHT + res.data.pay[0].HEAD_WEIGHT + res.data.pay[0].REMAIN_BAG_WEIGHT - res.data.reworkWeight,
                            PACK_WEIGHT: res.data.pay[0].PACK_WEIGHT || 0,
                            IS_EMPTYING: (1 === res.data.pay[0].IS_EMPTYING),
                            SCRAP_WEIGHT: res.data.pay[0].SCRAP_WEIGHT || 0,
                            HEAD_WEIGHT: res.data.pay[0].HEAD_WEIGHT || 0,
                            REMAIN_BAG_WEIGHT: res.data.pay[0].REMAIN_BAG_WEIGHT || 0,
                            REWORK_WEIGHT: res.data.reworkWeight || 0,
                            GAP: res.data.payLatest - res.data.pay[0].PACK_WEIGHT - res.data.pay[0].SCRAP_WEIGHT - res.data.pay[0].HEAD_WEIGHT - res.data.pay[0].REMAIN_BAG_WEIGHT,
                            OUTPUT_RATE: `=J1*100/F${res.data.pick.length + 1}`,
                        });
                    });

                    //加總
                    appendArray.push({
                        MATERIAL: '加總',
                        FEEDER_NO: '',
                        PICK_WEIGHT_NEED: `=SUM(D1:D${res.data.pick.length})`,
                        PICK_WEIGHT_FEED: `=SUM(E1:E${res.data.pick.length})`,
                        PICK_WEIGHT_ADJUST_BEFORE: `=SUM(F1:F${res.data.pick.length})`,
                        PICK_WEIGHT_ADJUST_AFTER: `=SUM(G1:G${res.data.pick.length})`,
                        PICK_WEIGHT_GAP: `=SUM(H1:H${res.data.pick.length})`,
                    });
                    setInvtDetailRows(appendArray);
                    setAdjustLotNo(lotNo);
                    setAdjustProductNo(res.data.productNo);
                } else {
                    toast.error(`查詢失敗，${res.data.res}，或入料機異常`);
                }

            }).catch(err => console.error(err))
                .finally(() => setIsLoading(false));

        } else {
            toast.warn('此功能僅適用限於批號');
        }
    }

    return (
        <div className="extrusion-storage-page m-2">
            <div className="input-group input-group-sm w-50">
                <span className="input-group-text">查詢方式</span>
                <select className="form-select" value={queryType} onChange={evt => setQueryType(evt.target.value)}>
                    <option value="order">工令(累計至今)</option>
                    <option value="lotNo">批號(累計至今)</option>
                    <option value="date">入庫日期(今08:00~明08:00)</option>
                    <option value="week">入庫累計(入庫至今)</option>
                </select>

                <span className={`input-group-text ${'date' === queryType || 'week' === queryType ? '' : 'd-none'}`}>日期</span>
                <input type="date" className={`form-control ${'date' === queryType || 'week' === queryType ? '' : 'd-none'}`} defaultValue={searchDate} onChange={evt => setSearchDate(evt.target.value)} />

                <span className={`input-group-text ${'order' === queryType ? '' : 'd-none'}`}>線別</span>
                <input type="text" className={`form-control ${'order' === queryType ? '' : 'd-none'}`} value={line} onChange={evt => setLine(evt.target.value)} />

                <span className={`input-group-text ${'order' === queryType ? '' : 'd-none'}`}>起始序號</span>
                <input type="number" className={`form-control ${'order' === queryType ? '' : 'd-none'}`} value={seqStart} onChange={evt => setSeqStart(evt.target.value)} />

                <span className={`input-group-text ${'order' === queryType ? '' : 'd-none'}`}>結束序號</span>
                <input type="number" className={`form-control ${'order' === queryType ? '' : 'd-none'}`} value={seqEnd} onChange={evt => setSeqEnd(evt.target.value)} />

                <span className={`input-group-text ${'lotNo' === queryType ? '' : 'd-none'}`}>Lot No</span>
                <input type="text" className={`form-control ${'lotNo' === queryType ? '' : 'd-none'}`} value={lotNo} onChange={evt => setLotNo(evt.target.value)} />
            </div>

            <button type="button" className="btn btn-primary mt-2 me-2" onClick={() => query('picking')} disabled={isLoading}><span className="icon bi-search"></span> 領料查詢</button>
            <button type="button" className="btn btn-primary mt-2 me-2" onClick={() => query('pay')} disabled={isLoading}><span className="icon bi-search"></span> 繳庫查詢</button>
            <button type="button" className="btn btn-primary mt-2 me-2" onClick={() => query('quality')} disabled={isLoading}><span className="icon bi-search"></span> 入料品質</button>
            <button type="button" className="btn btn-outline-success rounded mt-2 me-2" onClick={exportFile} disabled={isLoading}><span className="icon bi-cloud-download"></span> 匯出</button>

            <button type="button" className="btn btn-success mt-2 me-2" onClick={() => invtAdjust()} disabled={isLoading}><span className="icon bi-pencil-square"></span> 輔助領繳調整</button>
            <div className="badge rounded-pill text-bg-warning">目前VISION啟動/結束時間測試中(與現場輸入差異上限為15分鐘，若30分鐘內連續生產(第二筆啟動-第一筆結束)，則不抓VISION電流值，直接以輸入值為主)</div>

            {
                (isLoading) ?
                    <LoadingPage />
                    :
                    ('normal' === showTable) ?
                        <div className="extrusion-storage-table mt-2 w-100 overflow-hidden" style={{ minHeight: "70vh" }}>
                            <HotTable
                                licenseKey="non-commercial-and-evaluation"
                                data={rows}
                                columns={columns}
                                colHeaders={colHeader}
                                rowHeaders={false}
                                readOnly={true}
                                hiddenColumns={{ columns: hiddenCols }}
                                ref={hotTableComponent}
                            />
                        </div>
                        :
                        <InvtDetailTable rows={invtDetailRows} setRows={setInvtDetailRows} lotNo={adjustLotNo} productNo={adjustProductNo} />
            }
        </div >
    )
};

export default ExtrusionStorage;