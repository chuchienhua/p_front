import React, { useRef, useState } from "react";
import moment from "moment";
import { toast } from "react-toastify";
import axios from "axios";
import { HotTable } from "@handsontable/react";
import { registerAllCellTypes } from "handsontable/cellTypes";
import Handsontable from "handsontable";
import { HyperFormula } from "hyperformula";
import Utils from "../Utils";

//彙整報表
function SummaryReport() {

    const hyperFormulaInstance = HyperFormula.buildEmpty({
        licenseKey: 'internal-use-in-handsontable',
    });
    const formulas = {
        engine: hyperFormulaInstance,
    };

    registerAllCellTypes();

    const [date, setDate] = useState(moment(new Date()).subtract(1, 'days').format('YYYY-MM-DD')); //查詢日期
    const [isLoading, setIsLoading] = useState(false);
    const [rows, setRows] = useState([]); //查詢結果
    const [reportType, setReportType] = useState('day'); //報表種類
    const [mergeCells, setMergCells] = useState([]); //合併欄位
    const hotTableComponent = useRef(null);

    const columns_day = [
        { data: 'LINE', type: 'text', width: 50, className: 'htCenter htMiddle', readOnly: true },
        { data: 'PRODUCTIVITY', type: 'numeric', width: 50, className: 'htCenter htMiddle', readOnly: true, numericFormat: { pattern: '#,##0.00', thousandSeparated: true }, }, //產量
        { data: 'STANDARD_PRODUCTIVITY', type: 'numeric', width: 70, className: 'htCenter htMiddle', readOnly: true, numericFormat: { pattern: '#,##0.0', thousandSeparated: true }, }, //標準產量
        {
            data: 'AVABILITY_RATE',
            type: 'numeric',
            width: 60,
            className: 'htCenter htMiddle',
            readOnly: true,
            numericFormat: { pattern: '#,##0.0%', thousandSeparated: true },
            renderer: function (instance, td, row, col, prop, value, cellProperties) {
                Handsontable.renderers.NumericRenderer.apply(this, arguments);
                if (1 < value) {
                    td.classList.add('bg-danger');
                    td.classList.add('text-light');
                }
            }
        }, //稼動率
        { data: 'PRODUCTION_TIME', type: 'numeric', width: 70, className: 'htCenter htMiddle', readOnly: true, numericFormat: { pattern: '#,##0.0', thousandSeparated: true }, }, //運行時間
        { data: 'AVABILITY_TIME', type: 'numeric', width: 90, className: 'htCenter htMiddle', readOnly: true, numericFormat: { pattern: '#,##0.0%', thousandSeparated: true }, }, //經時稼動率
        { data: 'ELECTRICITY', type: 'numeric', width: 70, className: 'htCenter htMiddle', readOnly: true, numericFormat: { pattern: '#,##0', thousandSeparated: true }, }, //用電量
        { data: 'ELECTRICITY_UNIT', type: 'numeric', width: 90, className: 'htCenter htMiddle', readOnly: true, numericFormat: { pattern: '#,##0.0', thousandSeparated: true }, }, //用電量原單位
        { data: 'WD', type: 'numeric', width: 80, className: 'htCenter htMiddle', readOnly: true, numericFormat: { pattern: '#,##0.0', thousandSeparated: true }, }, //WD用量
        { data: 'WASTEWATER', type: 'numeric', width: 90, className: 'htCenter htMiddle', readOnly: true, numericFormat: { pattern: '#,##0.0', thousandSeparated: true }, }, //廢水生產量
        { data: 'AI', type: 'numeric', width: 60, className: 'htCenter htMiddle', readOnly: true, numericFormat: { pattern: '#,##0', thousandSeparated: true }, }, //AI用量
        { data: 'SHIPMENT', type: 'numeric', width: 60, className: 'htCenter htMiddle', readOnly: true, numericFormat: { pattern: '#,##0', thousandSeparated: true }, }, //出貨量
    ];
    const columns_month = [
        {
            data: 'DATE',
            type: 'text',
            width: 90,
            className: 'htCenter htMiddle',
            readOnly: true,
            renderer: function (instance, td, row, col, prop, value, cellProperties) {
                if ('小計' === value) {
                    td.innerHTML = value;
                } else {
                    const formated = moment(value).format('MM/DD/YY');
                    td.innerHTML = formated;
                }
            }
        }, //日期
        { data: 'LINE_A', type: 'numeric', width: 80, className: 'htCenter htMiddle', readOnly: true, numericFormat: { pattern: '#,##0.00', thousandSeparated: true }, }, //A線每日產量
        { data: 'LINE_B', type: 'numeric', width: 80, className: 'htCenter htMiddle', readOnly: true, numericFormat: { pattern: '#,##0.00', thousandSeparated: true }, }, //B線每日產量
        { data: 'LINE_C', type: 'numeric', width: 80, className: 'htCenter htMiddle', readOnly: true, numericFormat: { pattern: '#,##0.00', thousandSeparated: true }, }, //C線每日產量
        { data: 'LINE_D', type: 'numeric', width: 80, className: 'htCenter htMiddle', readOnly: true, numericFormat: { pattern: '#,##0.00', thousandSeparated: true }, }, //D線每日產量
        { data: 'LINE_E', type: 'numeric', width: 80, className: 'htCenter htMiddle', readOnly: true, numericFormat: { pattern: '#,##0.00', thousandSeparated: true }, }, //E線每日產量
        { data: 'LINE_F', type: 'numeric', width: 80, className: 'htCenter htMiddle', readOnly: true, numericFormat: { pattern: '#,##0.00', thousandSeparated: true }, }, //F線每日產量
        { data: 'LINE_G', type: 'numeric', width: 80, className: 'htCenter htMiddle', readOnly: true, numericFormat: { pattern: '#,##0.00', thousandSeparated: true }, }, //G線每日產量
        { data: 'LINE_H', type: 'numeric', width: 80, className: 'htCenter htMiddle', readOnly: true, numericFormat: { pattern: '#,##0.00', thousandSeparated: true }, }, //H線每日產量
        { data: 'LINE_K', type: 'numeric', width: 80, className: 'htCenter htMiddle', readOnly: true, numericFormat: { pattern: '#,##0.00', thousandSeparated: true }, }, //K線每日產量
        { data: 'LINE_M', type: 'numeric', width: 80, className: 'htCenter htMiddle', readOnly: true, numericFormat: { pattern: '#,##0.00', thousandSeparated: true }, }, //M線每日產量
        { data: 'LINE_N', type: 'numeric', width: 80, className: 'htCenter htMiddle', readOnly: true, numericFormat: { pattern: '#,##0.00', thousandSeparated: true }, }, //N線每日產量
        { data: 'LINE_Q', type: 'numeric', width: 80, className: 'htCenter htMiddle', readOnly: true, numericFormat: { pattern: '#,##0.00', thousandSeparated: true }, }, //Q線每日產量
        { data: 'LINE_R', type: 'numeric', width: 80, className: 'htCenter htMiddle', readOnly: true, numericFormat: { pattern: '#,##0.00', thousandSeparated: true }, }, //R線每日產量
        { data: 'LINE_S', type: 'numeric', width: 80, className: 'htCenter htMiddle', readOnly: true, numericFormat: { pattern: '#,##0.00', thousandSeparated: true }, }, //S線每日產量
        { data: 'LINE_T', type: 'numeric', width: 80, className: 'htCenter htMiddle', readOnly: true, numericFormat: { pattern: '#,##0.00', thousandSeparated: true }, }, //T線每日產量
        { data: 'WW', type: 'numeric', width: 90, className: 'htCenter htMiddle', readOnly: true, numericFormat: { pattern: '#,##0.0', thousandSeparated: true }, }, //公用流體WW
        { data: 'AI', type: 'numeric', width: 90, className: 'htCenter htMiddle', readOnly: true, numericFormat: { pattern: '#,##0.0', thousandSeparated: true }, }, //公用流體AI
        { data: 'WD', type: 'numeric', width: 90, className: 'htCenter htMiddle', readOnly: true, numericFormat: { pattern: '#,##0.0', thousandSeparated: true }, }, //公用流體WD
        { data: 'EL', type: 'numeric', width: 90, className: 'htCenter htMiddle', readOnly: true, numericFormat: { pattern: '#,##0', thousandSeparated: true }, }, //公用流體EL
        { data: 'PRODUCTIVITY', type: 'numeric', width: 80, className: 'htCenter htMiddle', readOnly: true, numericFormat: { pattern: '#,##0.00', thousandSeparated: true }, }, //單日產量
        { data: 'AVABILITY_RATE', type: 'numeric', width: 70, className: 'htCenter htMiddle', readOnly: true, numericFormat: { pattern: '#,##0.0%', thousandSeparated: true }, }, //稼動率
        { data: 'WW_UNIT', type: 'numeric', width: 70, className: 'htCenter htMiddle', readOnly: true, numericFormat: { pattern: '#,##0.00', thousandSeparated: true }, }, //原單位WW
        { data: 'AI_UNIT', type: 'numeric', width: 70, className: 'htCenter htMiddle', readOnly: true, numericFormat: { pattern: '#,##0.00', thousandSeparated: true }, }, //原單位AI
        { data: 'WD_UNIT', type: 'numeric', width: 70, className: 'htCenter htMiddle', readOnly: true, numericFormat: { pattern: '#,##0.00', thousandSeparated: true }, }, //原單位WD
        { data: 'EL_UNIT', type: 'numeric', width: 70, className: 'htCenter htMiddle', readOnly: true, numericFormat: { pattern: '#,##0', thousandSeparated: true }, }, //原單位EL
        { data: 'SHIPMENT', type: 'numeric', width: 80, className: 'htCenter htMiddle', readOnly: true, numericFormat: { pattern: '#,##0', thousandSeparated: true }, }, //出貨量
    ];
    const colHeaders_day = [
        [
            '線別', '產量', '標準產能', '稼動率', '運行時間', '經時稼動率',
            '用電量', '用電原單位', 'WD用量', '廢水產生量', 'AI用量', '出貨量',
        ],
        [
            '', 'T/D', 'T/D', '%', 'Hr/D', '%', 'kWh', 'kWh/MT', 'M³', 'M³', 'Nm³', 'kg'
        ],
    ];
    const colHeaders_month = [
        [
            '日期', '每日產量<br />A線', '每日產量<br />B線', '每日產量<br />C線', '每日產量<br />D線', '每日產量<br />E線', '每日產量<br />F線', '每日產量<br />G線', '每日產量<br />H線', '每日產量<br />K線',
            '每日產量<br />M線', '每日產量<br />N線', '每日產量<br />Q線', '每日產量<br />R線', '每日產量<br />S線', '每日產量<br />T線', '公用流體<br/>WW', '公用流體<br/>AI', '公用流體<br/>WD', '公用流體<br/>EL',
            '單日產量', '稼動率', '原單位<br/>WW', '原單位<br/>AI', '原單位<br/>WD', '原單位<br/>EL', '出貨量',
        ],
        [
            '', 'MT', 'MT', 'MT', 'MT', 'MT', 'MT', 'MT', 'MT', 'MT', 'MT', 'MT', 'MT', 'MT', 'MT', 'MT',
            'M³', 'Nm³', 'M³', 'kWh', 'MT', '%', 'M³/MT', 'Nm³/kg', 'M³/MT', 'kWh/MT', 'kg',
        ],
    ];

    const queryReport = () => {
        setIsLoading(true);
        setRows([]);
        setMergCells([]);
        let data = [];
        const targetDate = moment(date).format('YYYYMMDD');
        const targetStartOfMonth = moment(date).startOf("month").format('YYYYMMDD');
        const targetEndOfMonth = moment(date).endOf('month').format('YYYYMMDD');

        if ('day' === reportType) {
            const apiUrl = Utils.generateApiUrl('/summaryReport/getDayReport');
            const apiData = { targetDate };
            axios.post(apiUrl, apiData, { ...Utils.pbtAxiosConfig, timeout: 10000, })
                .then(res => {
                    if (!res.data.error) {
                        const result = res.data.res;
                        if (0 === result.length) {
                            toast.error('查無此日期的日報表');
                            setIsLoading(false);
                            setRows([]);
                            return;
                        }
                        result.forEach(element => data.push({
                            LINE: element.LINE,
                            PRODUCTIVITY: element.PRODUCTIVITY,
                            STANDARD_PRODUCTIVITY: element.STANDARD_PRODUCTIVITY,
                            AVABILITY_RATE: (null === element.AVABILITY_RATE) ? 0 : element.AVABILITY_RATE,
                            PRODUCTION_TIME: element.PRODUCTION_TIME,
                            AVABILITY_TIME: (0 === element.PRODUCTION_TIME) ? 0 : element.AVABILITY_TIME,
                            ELECTRICITY: element.ELECTRICITY,
                            ELECTRICITY_UNIT: (null === element.ELECTRICITY_UNIT) ? 0 : element.ELECTRICITY_UNIT,
                            WD: (null === element.WD) ? 0 : element.WD,
                            AI: (null === element.AI) ? 0 : element.AI,
                            WASTEWATER: (null === element.WASTEWATER) ? 0 : element.WASTEWATER,
                            SHIPMENT: (null === element.SHIPMENT) ? 0 : element.SHIPMENT,
                        }));
                        const mergeSettings = [
                            { row: 0, col: 8, rowspan: 15, colspan: 1 },
                            { row: 0, col: 9, rowspan: 15, colspan: 1 },
                            { row: 0, col: 10, rowspan: 15, colspan: 1 },
                            { row: 0, col: 11, rowspan: 15, colspan: 1 },
                        ];
                        setRows(data);
                        setMergCells(mergeSettings);
                        setIsLoading(false);
                    } else {
                        toast.error('查無此日期的日報表');
                        setIsLoading(false);
                    }
                }).catch(err => {
                    console.error(err);
                    toast.error(`查詢錯誤，${err.toString()}`);
                    setIsLoading(false);
                })
        } else if ('month' === reportType) {
            const apiUrl = Utils.generateApiUrl('/summaryReport/getMonthReport');
            const apiData = { targetStartOfMonth, targetEndOfMonth };
            let data = [];
            axios.post(apiUrl, apiData, { ...Utils.pbtAxiosConfig, timeout: 10000, })
                .then(res => {
                    if (!res.data.error || 0 !== res.data.length) {
                        const result = res.data.res;
                        result.forEach(element => data.push({
                            DATE: element.REPORT_DATE,
                            LINE_A: element.A_PRODUCTIVITY,
                            LINE_B: element.B_PRODUCTIVITY,
                            LINE_C: element.C_PRODUCTIVITY,
                            LINE_D: element.D_PRODUCTIVITY,
                            LINE_E: element.E_PRODUCTIVITY,
                            LINE_F: element.F_PRODUCTIVITY,
                            LINE_G: element.G_PRODUCTIVITY,
                            LINE_H: element.H_PRODUCTIVITY,
                            LINE_K: element.K_PRODUCTIVITY,
                            LINE_M: element.M_PRODUCTIVITY,
                            LINE_N: element.N_PRODUCTIVITY,
                            LINE_Q: element.Q_PRODUCTIVITY,
                            LINE_R: element.R_PRODUCTIVITY,
                            LINE_S: element.S_PRODUCTIVITY,
                            LINE_T: element.T_PRODUCTIVITY,
                            WW: (null === element.WASTEWATER) ? 0 : element.WASTEWATER,
                            AI: (null === element.AI) ? 0 : element.AI,
                            WD: (null === element.WD) ? 0 : element.WD,
                            EL: (null === element.ELECTRICITY) ? 0 : element.ELECTRICITY,
                            PRODUCTIVITY: element.DAY_PRODUCTIVITY,
                            AVABILITY_RATE: element.AVAIBILITY_RATE,
                            SHIPMENT: (null === element.SHIPMENT) ? 0 : element.SHIPMENT,
                            AI_UNIT: (null === element.AI_UNIT) ? 0 : element.AI_UNIT,
                            WD_UNIT: (null === element.WD_UNIT) ? 0 : element.WD_UNIT,
                            WW_UNIT: (null === element.WW_UNIT) ? 0 : element.WW_UNIT,
                            EL_UNIT: (null === element.EL_UNIT) ? 0 : element.EL_UNIT,
                        }));
                        setRows(data);
                        setIsLoading(false);
                    } else {
                        toast.error(`查無資料，${res.data.error}`);
                        setIsLoading(false);
                    }
                }).catch(err => {
                    console.error(err);
                    toast.error(`查詢錯誤，${err.toString()}`);
                    setIsLoading(false);
                })
        } else {
            setIsLoading(false);
        }
    };

    const exportExcel = () => {
        if (rows.length) {
            setIsLoading(true);
            if ('day' === reportType) {
                const apiUrl = Utils.generateApiUrl('/summaryReport/exportDayReport');
                const apiData = { rows };
                const downloadFile = `${date}_PBTC生產日報`;

                const callback = res => {
                    const uint8Array = new Uint8Array(res.data);
                    const blob = new Blob([uint8Array], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = downloadFile;
                    a.click();

                    window.URL.revokeObjectURL(url);
                    setIsLoading(false);
                };

                return axios.post(apiUrl, apiData, { ...Utils.pbtAxiosConfig, timeout: 30000, responseType: "arraybuffer", })
                    .then(callback).catch(err => {
                        console.error(err);
                        toast.error('報表下載失敗');
                        setIsLoading(false);
                    });
            } else if ('month' === reportType) {
                const apiUrl = Utils.generateApiUrl('/summaryReport/exportMonthReport');
                const apiData = { rows };
                const downloadFile = `${moment(date).month() + 1}月_PBTC生產月報`;

                const callback = res => {
                    const uint8Array = new Uint8Array(res.data);
                    const blob = new Blob([uint8Array], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = downloadFile;
                    a.click();

                    window.URL.revokeObjectURL(url);
                    setIsLoading(false);
                }

                return axios.post(apiUrl, apiData, { ...Utils.pbtAxiosConfig, timeout: 30000, responseType: "arraybuffer", })
                    .then(callback).catch(err => {
                        console.error(err);
                        toast.error('報表下載失敗');
                        setIsLoading(false);
                    });
            }

        } else {
            toast.warn('請先查詢，再做匯出');
        }
    };

    function handleReportTypeChange(evt) {
        setRows([]);
        setReportType(evt.target.value);
    };

    return (
        <div className="col-12 px-0">
            <div className="input-group input-group-sm mt-2">
                <span className="input-group-text">日期</span>
                <input type="date" className="form-control" value={date} onChange={evt => setDate(evt.target.value)} disabled={isLoading} style={{ maxWidth: '120px' }} />

                <span className="input-group-text">報表種類</span>
                <select className="form-select" value={reportType} onChange={handleReportTypeChange/*evt => setReportType(evt.target.value)*/} disabled={isLoading} style={{ maxWidth: '120px' }} >
                    <option value='day'>生產日報</option>
                    {/* <option value='week'>生產週報</option> */}
                    <option value='month'>生產月報</option>
                </select>

                <button type="button" className="btn btn-primary rounded-end me-2" onClick={queryReport} disabled={isLoading}>
                    <span className="icon bi-search"></span>查詢
                </button>
                <button type="button" className="btn btn-outline-success rounded me-2" onClick={exportExcel} disabled={isLoading}>
                    <span className="icon bi-cloud-download"></span> 匯出
                </button>
            </div>
            {('day' === reportType) ?
                <>
                    <div className="summery-report-table-day w-100 mt-2 mb-2" style={{ minHeight: '26rem' }}>
                        <HotTable
                            data={rows}
                            columns={columns_day}
                            nestedHeaders={colHeaders_day}
                            rowHeaders={false}
                            formulas={formulas}
                            mergeCells={mergeCells}
                            ref={hotTableComponent}
                            licenseKey="non-commercial-and-evaluation"
                        />
                    </div>
                </>
                : null
            }
            {/* {('week' === reportType) ?
                <>
                    <h3>待開發</h3>
                </>
                : null
            } */}
            {('month' === reportType) ?
                <>
                    <div className="summery-report-table-month overflow-auto w-100 mt-2 mb-2" style={{ minHeight: '50rem' }}>
                        <HotTable
                            data={rows}
                            columns={columns_month}
                            nestedHeaders={colHeaders_month}
                            rowHeaders={false}
                            formulas={formulas}
                            /*mergeCells={mergeCells}*/
                            ref={hotTableComponent}
                            licenseKey="non-commercial-and-evaluation"
                        />
                    </div>
                </>
                : null
            }
        </div>
    );
}

export default SummaryReport;