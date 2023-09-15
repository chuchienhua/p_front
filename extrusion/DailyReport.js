import React, { useState, useRef, useEffect } from 'react';
import { HyperFormula } from 'hyperformula';
import { HotTable } from '@handsontable/react';
import { registerAllCellTypes } from 'handsontable/cellTypes';
import Handsontable from 'handsontable';
import axios from 'axios';
import Utils from '../Utils';
import moment from 'moment';
import * as XLSX from 'xlsx-js-style';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import LoadingPage from '../LoadingPage';

function DailyReport() {

    const hyperFormulaInstance = HyperFormula.buildEmpty({
        licenseKey: 'internal-use-in-handsontable',
    });

    const formulas = {
        engine: hyperFormulaInstance,
    }

    registerAllCellTypes();

    const [isLoading, setIsLoading] = useState(false);

    const [queryType, setQueryType] = useState('workShift'); //班別輸入/整日查詢

    const [date, setDate] = useState(moment(new Date()).format('YYYY-MM-DD'));
    const [workShift, setWorkShift] = useState('早'); //領料班別
    const [queryReadOnly, setQueryReadOnly] = useState(false); //鎖定搜尋列

    const [handover, setHandover] = useState(''); //交接事項
    const [waterDeionized, setWaterDeionized] = useState(0); //純水用量
    const [waterWaste, setWaterWaste] = useState(0); //廢水產生量
    const [air, setAir] = useState(0); //AIR用量
    const [getDataTime, setGetDataTime] = useState(''); //取得資料日期
    const [saveReportTime, setSaveReportTime] = useState(''); //儲存日期

    const [updateTimer, setUpdateTimer] = useState(null); //持續更新Tag值的Timer
    const timerFrequency = 30; //幾秒抓一次

    const [rows, setRows] = useState([]);
    const [mergeRows, setMergeRows] = useState([]);
    const columns = [
        { data: 'LINE', type: 'text', width: 50, className: 'align-middle', readOnly: true },
        { data: 'WORK_SHIFT', type: 'text', width: 50, readOnly: true },
        { data: 'SEQ', type: 'text', width: 60, readOnly: true },
        { data: 'PRD_PC', type: 'text', width: 100, readOnly: true },
        { data: 'WT_PER_HR', type: 'numeric', width: 90, readOnly: true },
        { data: 'WT_PER_HR_ACT', type: 'numeric', numericFormat: { pattern: '##0.00' }, width: 90, readOnly: true },
        { data: 'PRODUCTION_TIME', type: 'numeric', numericFormat: { pattern: '##0.00' }, width: 70, readOnly: true },
        { data: 'WT_PER_SHIFT', type: 'numeric', numericFormat: { pattern: '##0.00' }, width: 70, readOnly: true },
        { data: 'PRODUCTIVITY', type: 'numeric', numericFormat: { pattern: '##0.00' }, width: 70, readOnly: true },
        { data: 'TOTAL_WT', type: 'numeric', numericFormat: { pattern: '##0.00' }, width: 100, className: 'align-middle', readOnly: true },
        { data: 'TOTAL_WT_ACT', type: 'numeric', numericFormat: { pattern: '##0.00' }, width: 100, className: 'align-middle', readOnly: true },
        { data: 'AVABILITY_WT', type: 'numeric', numericFormat: { pattern: '##0.00' }, width: 100, className: 'align-middle', readOnly: true },
        { data: 'AVABILITY_TIME', type: 'numeric', numericFormat: { pattern: '##0.00' }, width: 90, className: 'align-middle', readOnly: true }, //經時稼動率
        { data: 'DISCONNECT_TIME', type: 'numeric', numericFormat: { pattern: '##0.00' }, width: 70 },
        {
            data: 'STOP_TIME',
            type: 'numeric',
            numericFormat: { pattern: '##0.00' },
            width: 70,
            readOnly: true,
            renderer: function (instance, td, row, col, prop, value, cellProperties) {
                Handsontable.renderers.NumericRenderer.apply(this, arguments);
                if (parseFloat(value).toFixed(2) !== parseFloat(
                    instance.getDataAtCell(row, 16) + instance.getDataAtCell(row, 17) + instance.getDataAtCell(row, 18) +
                    instance.getDataAtCell(row, 19) + instance.getDataAtCell(row, 20) + instance.getDataAtCell(row, 21) + instance.getDataAtCell(row, 22) +
                    instance.getDataAtCell(row, 13)
                ).toFixed(2)) {
                    td.classList.add('bg-danger');
                    td.classList.add('text-light');
                }
            },
        },
        { data: 'TOTAL_STOP_TIME', type: 'numeric', numericFormat: { pattern: '##0.00' }, width: 70, className: 'align-middle', readOnly: true },
        { data: 'STOP_1', type: 'numeric', numericFormat: { pattern: '##0.00' }, width: 60 },
        { data: 'STOP_2', type: 'numeric', numericFormat: { pattern: '##0.00' }, width: 60 },
        { data: 'STOP_3', type: 'numeric', numericFormat: { pattern: '##0.00' }, width: 60 },
        { data: 'STOP_4', type: 'numeric', numericFormat: { pattern: '##0.00' }, width: 70 },
        { data: 'STOP_5', type: 'numeric', numericFormat: { pattern: '##0.00' }, width: 70 },
        { data: 'STOP_6', type: 'numeric', numericFormat: { pattern: '##0.00' }, width: 90 },
        { data: 'STOP_7', type: 'numeric', numericFormat: { pattern: '##0.00' }, width: 50 },
        { data: 'IC_NAME', type: 'text', width: 70, readOnly: true }, //領班
        { data: 'CONTROLLER_NAME', type: 'text', width: 70, readOnly: true },
        { data: 'WEIGHT_RESTART', type: 'numeric', numericFormat: { pattern: '##0' }, width: 60, readOnly: true },
        { data: 'WEIGHT_BREAK', type: 'numeric', numericFormat: { pattern: '##0' }, width: 60, readOnly: true },
        { data: 'WEIGHT_ABNORMAL', type: 'numeric', numericFormat: { pattern: '##0' }, width: 70, readOnly: true },
        { data: 'RATIO_SCRAP', type: 'numeric', numericFormat: { pattern: '##0.00' }, width: 60, readOnly: true },
        { data: 'TOTAL_SCRAP', type: 'numeric', numericFormat: { pattern: '##0' }, className: 'align-middle', width: 70, readOnly: true },
        { data: 'TOTAL_RATIO_SCRAP', type: 'numeric', numericFormat: { pattern: '##0.000' }, className: 'align-middle', width: 70, readOnly: true },
        { data: 'WEIGHT_HEAD', type: 'numeric', numericFormat: { pattern: '##0' }, width: 60, readOnly: true },
        { data: 'RATIO_HEAD', type: 'numeric', numericFormat: { pattern: '##0.00' }, width: 60, readOnly: true },
        { data: 'TOTAL_HEAD', type: 'numeric', numericFormat: { pattern: '##0' }, className: 'align-middle', width: 70, readOnly: true },
        { data: 'TOTAL_RATIO_HEAD', type: 'numeric', numericFormat: { pattern: '##0.000' }, className: 'align-middle', width: 70, readOnly: true },
        { data: 'AMMETER', type: 'numeric', numericFormat: { pattern: '##0.0' }, width: 60, readOnly: true },
        { data: 'NOTE', type: 'text', width: 500 },
    ];
    const colHeader = [
        [
            '線別', '班別', '序號', '產品規格', '標準押出量', '實際押出量', '生產經時', '標準產量', '實際產量', '合計標準產量', '合計實際產量',
            '日產量稼動率', '經時稼動率', '通訊異常', '停機時間', '合計停機', { label: '停機項目時數hr', colspan: 7 },
            '領班', '主控', { label: '料頭產出項目kg', colspan: 3 }, '料頭率', '總料頭量', '總料頭率', '前料量', '前料率', '總前料量', '總前料率', '用電量', '降載及停機原因',
        ],
        [
            '', '', '', '', 'kg/hr', 'kg/hr', 'hr', 'MT', 'MT', 'MT', 'MT',
            '%', '%', 'hr', 'hr', 'hr', '準備', '等待', '清機', '現場排除', '工務維修', '計畫性停機', '其他',
            '人員', '人員', '開關機', '斷條', '設備異常', '%', 'kg', '%', 'kg', '%', 'kg', '%', '', '',
        ],
    ];
    const hotTableComponent = useRef(null);

    //查詢後持續更新Tag相關資料
    useEffect(() => {
        const getTagsValue = () => {
            const apiUrl = Utils.generateApiUrl('/extrusion/getDailyForm', [moment(date).format('YYYYMMDD'), workShift, 'update']);
            axios.get(apiUrl, {
                ...Utils.pbtAxiosConfig,
            }).then(res => {
                if (res.data.res.length && !res.data.error && rows.length && hotTableComponent.current) {
                    //未在編輯中，才刷新
                    if (!hotTableComponent.current.hotInstance.getSelected()) {
                        res.data.res.forEach(element => {
                            let row = rows.map(x => x.LINE).indexOf(element.LINE);
                            if (0 <= row) {
                                //hotTableComponent.current.hotInstance.setDataAtCell(row, 5, element.PRODUCTIVITY * 1000 / element.PRODUCTION_TIME || 0);
                                hotTableComponent.current.hotInstance.setDataAtCell(row, 6, element.PRODUCTION_TIME);
                                //hotTableComponent.current.hotInstance.setDataAtCell(row, 8, element.PRODUCTIVITY);
                                hotTableComponent.current.hotInstance.setDataAtCell(row, 14, parseFloat((8 - element.PRODUCTION_TIME).toFixed(2)));
                                //hotTableComponent.current.hotInstance.setDataAtCell(row, 25, element.WEIGHT_RESTART);
                                //hotTableComponent.current.hotInstance.setDataAtCell(row, 26, element.WEIGHT_BREAK);
                                //hotTableComponent.current.hotInstance.setDataAtCell(row, 27, element.WEIGHT_ABNORMAL);
                                //hotTableComponent.current.hotInstance.setDataAtCell(row, 28, element.WEIGHT_RESTART + element.WEIGHT_BREAK + element.WEIGHT_ABNORMAL);
                                //hotTableComponent.current.hotInstance.setDataAtCell(row, 31, element.WEIGHT_HEAD);
                            }
                        });
                        //console.log('Table Refreshing');
                    } else {
                        //console.log('Table Editing');
                    }
                }
            }).catch(err => console.error(err));
        }

        const timer = setInterval(() => {
            if (0 < updateTimer) {
                setUpdateTimer(updateTimer - 1);
            } else if (0 === updateTimer && queryReadOnly && 'workShift' === queryType && false) {
                //現場規則調整，不再更新
                setUpdateTimer(timerFrequency);
                getTagsValue();
            }
        }, 1000);

        return () => {
            clearInterval(timer);
        }

    }, [updateTimer, queryReadOnly, queryType, date, workShift, rows]);

    const queryEdit = () => {
        setIsLoading(true);
        setQueryReadOnly(true);
        setQueryType('workShift');
        setRows([]);
        setMergeRows([]);
        setHandover('');
        setWaterDeionized(0);
        setWaterWaste(0);
        setAir(0);
        setGetDataTime('');
        setSaveReportTime('');

        const apiUrl = Utils.generateApiUrl('/extrusion/getDailyForm', [moment(date).format('YYYYMMDD'), workShift, 'query']);
        axios.get(apiUrl, {
            ...Utils.pbtAxiosConfig,
        }).then(res => {
            if (!res.data.error) {
                let appendArray = [];
                res.data.res.forEach(element => {
                    const sumTotalStop = element.STOP_1 + element.STOP_2 + element.STOP_3 + element.STOP_4 + element.STOP_5 + element.STOP_6 + element.STOP_7;
                    const sumTotalScrap = element.WEIGHT_RESTART + element.WEIGHT_BREAK + element.WEIGHT_ABNORMAL;

                    appendArray.push({
                        LINE: element.LINE,
                        SEQ: element.SEQ,
                        WORK_SHIFT: element.WORK_SHIFT,
                        PRD_PC: element.PRD_PC,
                        WT_PER_HR: element.WT_PER_HR,
                        WT_PER_HR_ACT: element.PRODUCTIVITY * 1000 / element.PRODUCTION_TIME || 0,
                        PRODUCTION_TIME: element.PRODUCTION_TIME,
                        //WT_PER_SHIFT: element.WT_PER_HR * 8 / 1000, //每個班別多少產量
                        WT_PER_SHIFT: element.WT_PER_SHIFT,
                        PRODUCTIVITY: element.PRODUCTIVITY,
                        DISCONNECT_TIME: element.DISCONNECT_TIME || 0,
                        STOP_TIME: parseFloat(element.STOP_TIME).toFixed(2),
                        TOTAL_STOP_TIME: sumTotalStop,
                        STOP_1: (0 < element.STOP_1) ? element.STOP_1 : null,
                        STOP_2: (0 < element.STOP_2) ? element.STOP_2 : null,
                        STOP_3: (0 < element.STOP_3) ? element.STOP_3 : null,
                        STOP_4: (0 < element.STOP_4) ? element.STOP_4 : null,
                        STOP_5: (0 < element.STOP_5) ? element.STOP_5 : null,
                        STOP_6: (0 < element.STOP_6) ? element.STOP_6 : null,
                        STOP_7: (0 < element.STOP_7) ? element.STOP_7 : null,
                        IC_NAME: element.IC_NAME,
                        CONTROLLER_NAME: element.CONTROLLER_NAME,
                        WEIGHT_RESTART: element.WEIGHT_RESTART,
                        WEIGHT_BREAK: element.WEIGHT_BREAK,
                        WEIGHT_ABNORMAL: element.WEIGHT_ABNORMAL,
                        RATIO_SCRAP: sumTotalScrap ? sumTotalScrap / (element.PRODUCTIVITY * 1000) : 0,
                        WEIGHT_HEAD: element.WEIGHT_HEAD,
                        RATIO_HEAD: element.WEIGHT_HEAD ? element.WEIGHT_HEAD / (element.PRODUCTIVITY * 1000) : 0,
                        AMMETER: element.AMMETER || 0,
                        NOTE: element.NOTE,
                    });
                });
                setRows(appendArray);
                setHandover(res.data.handoverNote || '');
                setWaterDeionized(res.data.waterDeionized || 0);
                setWaterWaste(res.data.waterWaste || 0);
                setAir(res.data.air || 0);
                setGetDataTime(res.data.res.length ? moment(res.data.res[0].GET_DATA_TIME).format('YYYY-MM-DD HH:mm:ss') : moment().format('YYYY-MM-DD HH:mm:ss'));
                setSaveReportTime(res.data.res.length ? moment(res.data.res[0].CREATE_TIME).format('YYYY-MM-DD HH:mm:ss') : '');
                setUpdateTimer(0); //持續更新Tag值
            } else {
                toast.error(`查詢失敗，${res.data.res}`);
            }
        }).catch(err => console.error(err))
            .finally(() => setIsLoading(false));
    }

    //整天查詢，到時候把兩個整在一起
    const queryDaily = () => {
        setIsLoading(true);
        setQueryReadOnly(true);
        setQueryType('daily');
        setRows([]);
        setHandover('');
        setWaterDeionized(0);
        setWaterWaste(0);
        setAir(0);
        setGetDataTime('');
        setSaveReportTime('');
        setMergeRows([]);

        const apiUrl = Utils.generateApiUrl('/extrusion/getDailyForm', [moment(date).format('YYYYMMDD'), '*', 'query']);
        axios.get(apiUrl, {
            ...Utils.pbtAxiosConfig,
        }).then(res => {
            if (!res.data.error && res.data.sumDayRows?.length) {
                let appendArray = [];
                let previousLine = '';
                let mergeSettings = [];
                //console.log(res.data)

                res.data.res.forEach((element, index) => {
                    let sumDayRow = [];
                    if (previousLine !== element.LINE) {
                        sumDayRow = res.data.sumDayRows.filter(x => x.LINE === element.LINE)[0];
                        mergeSettings.push(
                            { row: index, col: 0, rowspan: sumDayRow.COUNT, colspan: 1 },
                            { row: index, col: 9, rowspan: sumDayRow.COUNT, colspan: 1 },
                            { row: index, col: 10, rowspan: sumDayRow.COUNT, colspan: 1 },
                            { row: index, col: 11, rowspan: sumDayRow.COUNT, colspan: 1 },
                            { row: index, col: 12, rowspan: sumDayRow.COUNT, colspan: 1 },
                            { row: index, col: 15, rowspan: sumDayRow.COUNT, colspan: 1 },
                            { row: index, col: 29, rowspan: sumDayRow.COUNT, colspan: 1 },
                            { row: index, col: 30, rowspan: sumDayRow.COUNT, colspan: 1 },
                            { row: index, col: 33, rowspan: sumDayRow.COUNT, colspan: 1 },
                            { row: index, col: 34, rowspan: sumDayRow.COUNT, colspan: 1 },
                        )
                    }
                    previousLine = element.LINE;

                    const sumTotalScrap = element.WEIGHT_RESTART + element.WEIGHT_BREAK + element.WEIGHT_ABNORMAL;

                    appendArray.push({
                        LINE: element.LINE,
                        SEQ: element.SEQ,
                        WORK_SHIFT: element.WORK_SHIFT,
                        PRD_PC: element.PRD_PC,
                        WT_PER_HR: element.WT_PER_HR,
                        WT_PER_HR_ACT: element.PRODUCTIVITY * 1000 / element.PRODUCTION_TIME || 0,
                        PRODUCTION_TIME: element.PRODUCTION_TIME,
                        //WT_PER_SHIFT: element.WT_PER_HR * 8 / 1000, //每個班別多少產量
                        WT_PER_SHIFT: element.WT_PER_SHIFT,
                        PRODUCTIVITY: element.PRODUCTIVITY,
                        TOTAL_WT: sumDayRow.TOTAL_WT || 0,
                        TOTAL_WT_ACT: sumDayRow.TOTAL_WT_ACT || 0,
                        AVABILITY_WT: sumDayRow.AVABILITY_WT || 0,
                        AVABILITY_TIME: sumDayRow.AVABILITY_TIME || 0,
                        DISCONNECT_TIME: element.DISCONNECT_TIME || 0,
                        STOP_TIME: parseFloat(element.STOP_TIME).toFixed(2),
                        TOTAL_STOP_TIME: sumDayRow.TOTAL_STOP_TIME,
                        STOP_1: (0 < element.STOP_1) ? element.STOP_1 : null,
                        STOP_2: (0 < element.STOP_2) ? element.STOP_2 : null,
                        STOP_3: (0 < element.STOP_3) ? element.STOP_3 : null,
                        STOP_4: (0 < element.STOP_4) ? element.STOP_4 : null,
                        STOP_5: (0 < element.STOP_5) ? element.STOP_5 : null,
                        STOP_6: (0 < element.STOP_6) ? element.STOP_6 : null,
                        STOP_7: (0 < element.STOP_7) ? element.STOP_7 : null,
                        IC_NAME: element.IC_NAME,
                        CONTROLLER_NAME: element.CONTROLLER_NAME,
                        WEIGHT_RESTART: element.WEIGHT_RESTART,
                        WEIGHT_BREAK: element.WEIGHT_BREAK,
                        WEIGHT_ABNORMAL: element.WEIGHT_ABNORMAL,
                        WEIGHT_SCRAP: element.WEIGHT_RESTART + element.WEIGHT_BREAK + element.WEIGHT_ABNORMAL,
                        RATIO_SCRAP: sumTotalScrap ? sumTotalScrap / (element.PRODUCTIVITY * 1000) : 0,
                        TOTAL_SCRAP: sumDayRow.TOTAL_SCRAP || 0,
                        TOTAL_RATIO_SCRAP: sumDayRow.TOTAL_RATIO_SCRAP || 0,
                        WEIGHT_HEAD: element.WEIGHT_HEAD,
                        RATIO_HEAD: element.WEIGHT_HEAD ? element.WEIGHT_HEAD / (element.PRODUCTIVITY * 1000) : 0,
                        TOTAL_HEAD: sumDayRow.TOTAL_HEAD || 0,
                        TOTAL_RATIO_HEAD: sumDayRow.TOTAL_RATIO_HEAD || 0,
                        AMMETER: element.AMMETER || 0,
                        NOTE: element.NOTE,
                        /*
                        WEIGHT_SCRAP: element.WEIGHT_RESTART + element.WEIGHT_BREAK + element.WEIGHT_ABNORMAL,
                        TOTAL_SCRAP: sumDayRow.TOTAL_SCRAP || 0,
                        RATIO_SCRAP: sumDayRow.RATIO_SCRAP || 0,
                        WEIGHT_HEAD: element.WEIGHT_HEAD,
                        AMMETER: element.AMMETER || 0,
                        NOTE: element.NOTE,
                        */
                    });
                });
                setRows(appendArray);
                setHandover(res.data.handoverNote || '');
                setWaterDeionized(res.data.waterDeionized || 0);
                setWaterWaste(res.data.waterWaste || 0);
                setAir(res.data.air || 0);
                setMergeRows(mergeSettings);
            } else {
                toast.error(`查詢失敗，${res.data.res}`);
            }
        }).catch(err => console.error(err))
            .finally(() => setIsLoading(false));
    }

    const save = () => {
        const callback = res => {
            if (res.isConfirmed) {
                setIsLoading(true);
                const apiUrl = Utils.generateApiUrl('/extrusion/saveDailyForm', [moment(date).format('YYYYMMDD'), workShift]);
                axios.post(apiUrl, {
                    formArray: rows,
                    waterDeionized: waterDeionized,
                    waterWaste: waterWaste,
                    air: air,
                    getDataTime: moment(getDataTime).toDate(),
                    handover: handover,
                }, {
                    ...Utils.pbtAxiosConfig,
                }).then(res => {
                    if (!res.data.error) {
                        toast.success('儲存成功');
                    } else {
                        toast.error(`儲存失敗，${res.data.res}`);
                    }
                }).catch(err => console.error(err))
                    .finally(() => setIsLoading(false));
            }
        }

        const errorRows = rows.filter(x => parseFloat(x.STOP_TIME).toFixed(2) !== parseFloat(x.DISCONNECT_TIME + x.STOP_1 + x.STOP_2 + x.STOP_3 + x.STOP_4 + x.STOP_5 + x.STOP_6 + x.STOP_7).toFixed(2));
        if (!errorRows.length) {
            Swal.fire({
                title: `確認儲存${moment(date).format('YYYYMMDD')}, ${workShift}班的生產日報嗎(到時會寄信)？`,
                position: 'top',
                showCancelButton: true,
            }).then(callback).catch(error => {
                Swal.showValidationMessage(`Request failed: ${error}`);
            });

        } else {
            toast.warn(`${errorRows[0].LINE}線，停機項目時數要等於停機時間-通訊異常`);
            console.error(errorRows[0]);
        }
    }

    //輸出表格
    const exportXLSX = () => {
        if (rows.length) {
            if ('daily' === queryType) {

            }
            let colNames = [
                '線別', '班別', '序號', '產品規格', '標準押出量', '實際押出量', '生產經時', '標準產量', '實際產量',
                '合計標準產量', '合計實際產量', '日產量稼動率', '經時稼動率',
                '通訊異常', '停機時間', '合計停機',
                '停機-準備', '停機-等待', '停機-清機', '停機-現場排除', '停機-工務維修', '停機-計畫性停機', '停機-其他',
                '領班', '主控', '料頭-開關機', '料頭-斷條', '料頭-設備異常', '總料頭重',
                '合計料頭', '料頭比', '前料量', '電表讀數', '降載及停機原因'
            ];
            const colUnits = [
                '', '', '', '', 'kg/hr', 'kg/hr', 'hr', 'MT', 'MT',
                'MT', 'MT', '%', '%',
                'hr', 'hr', 'hr',
                'hr', 'hr', 'hr', 'hr', 'hr', 'hr', 'hr',
                '', '', 'kg', 'kg', 'kg', 'kg',
                'MT', '%', 'kg', '', '',
            ];
            const colWidth = [
                5, 5, 6, 12, 18, 18, 12, 15, 15,
                18, 18, 18, 18,
                12, 12, 12,
                15, 15, 15, 20, 20, 20, 12,
                8, 8, 15, 15, 20, 12,
                15, 10, 10, 18, 30,
            ];
            colNames = colNames.map((x, index) => colUnits[index].length ? x += `(${colUnits[index]})` : x);

            let wb = XLSX.utils.book_new();
            let ws = XLSX.utils.aoa_to_sheet([colNames]);

            //欄位寬度
            ws['!cols'] = colWidth.map(width => ({ wch: width }));

            let rowCount = 0;
            rows.forEach((array, rowIndex) => {
                rowCount++;
                let cells = [
                    array.LINE, array.WORK_SHIFT, array.SEQ, array.PRD_PC, array.WT_PER_HR, array.WT_PER_HR_ACT, array.PRODUCTION_TIME, array.WT_PER_SHIFT, array.PRODUCTIVITY,
                    array.TOTAL_WT, array.TOTAL_WT_ACT, array.AVABILITY_WT, array.AVABILITY_TIME,
                    array.DISCONNECT_TIME, array.STOP_TIME, array.TOTAL_STOP_TIME,
                    array.STOP_1, array.STOP_2, array.STOP_3, array.STOP_4, array.STOP_5, array.STOP_6, array.STOP_7,
                    array.IC_NAME, array.CONTROLLER_NAME, array.WEIGHT_RESTART, array.WEIGHT_BREAK, array.WEIGHT_ABNORMAL, array.WEIGHT_SCRAP,
                    array.TOTAL_SCRAP, array.RATIO_SCRAP, array.WEIGHT_HEAD, array.AMMETER, array.NOTE,
                ];

                //將每個cell存到sheet中
                cells.forEach((col, colIndex) => {
                    if (null === col || undefined === col) {
                        col = '';
                    }

                    let value;
                    if ('number' === typeof col && 2 !== colIndex) {
                        value = parseFloat(col).toFixed(2);
                    } else {
                        value = col.toString().trim().replace(/\n/g, '\r\n');
                    }

                    let cell = {
                        v: value,
                        t: 's',
                        s: {
                            alignment: { vertical: 'top', horizontal: 'right', wrapText: true },
                        },
                    };
                    const addr = XLSX.utils.encode_cell({ c: colIndex, r: rowIndex + 1 });
                    ws[addr] = cell;
                });
            })

            let lastAddr = XLSX.utils.encode_cell({ c: Math.max(colNames.length - 1, 0), r: Math.max(rowCount, 1) });
            ws['!ref'] = `A1:${lastAddr}`;

            XLSX.utils.book_append_sheet(wb, ws, 'report_1');
            XLSX.writeFile(wb, '生產日報.xlsx');

        } else {
            toast.warn('請先查詢，再做匯出');
        }
    }

    return (
        <div className='col-12 px-0'>
            <div className='input-group input-group-sm mt-2'>
                <span className='input-group-text'>日期</span>
                <input type='date' className='form-control' value={date} onChange={evt => setDate(evt.target.value)} disabled={queryReadOnly} style={{ maxWidth: '120px' }} />

                <span className="input-group-text">班別</span>
                <select className="form-select" value={workShift} onChange={evt => setWorkShift(evt.target.value)} disabled={queryReadOnly} style={{ maxWidth: '70px' }}>
                    <option value="早">早</option>
                    <option value="中">中</option>
                    <option value="晚">晚</option>
                </select>

                <button type='button' className='btn btn-primary rounded-end me-2' onClick={queryEdit} disabled={isLoading || queryReadOnly}><span className='icon bi-search'></span> 班別查詢(編輯)</button>
                <button type='button' className='btn btn-primary rounded me-2' onClick={queryDaily} disabled={isLoading || queryReadOnly}><span className='icon bi-search'></span> 整日查詢</button>
                <button type="button" className="btn btn-outline-success rounded me-2" onClick={save} disabled={isLoading || !rows.length || 'workShift' !== queryType || !queryReadOnly}><span className="icon bi-save"></span> 儲存</button>
                <button type="button" className="btn btn-outline-secondary rounded me-2" onClick={() => setQueryReadOnly(false)} disabled={!queryReadOnly || isLoading}><span className="icon bi-arrow-counterclockwise"></span> 重新查詢</button>
                <button type="button" className="btn btn-outline-success rounded" onClick={exportXLSX} disabled={!rows.length || isLoading}><span className="icon bi-cloud-download"></span> 匯出</button>
            </div>

            <div className="badge rounded-pill text-bg-info">下方純水、廢水用量等等從電錶抄表取得，班別時間為07:30~15:30~23:30~07:30</div>

            {(isLoading) ?
                <LoadingPage />
                :
                <>
                    <div className="daily-report-table w-100 overflow-hidden mt-2 mb-2" style={{ minHeight: "26rem" }}>
                        <HotTable
                            data={rows}
                            columns={columns}
                            nestedHeaders={colHeader}
                            rowHeaders={false}
                            formulas={formulas}
                            mergeCells={mergeRows}
                            ref={hotTableComponent}
                            readOnly={('daily' === queryType)}
                            hiddenColumns={{ columns: ('workShift' === queryType) ? [9, 10, 11, 12, 15, 29, 30, 33, 34] : [] }}
                            licenseKey="non-commercial-and-evaluation"
                        />
                    </div>

                    <div className='input-group input-group-sm w-50 mt-2'>
                        <span className='input-group-text'>純水用量(MT)</span>
                        <input type='number' className='form-control' value={waterDeionized} disabled />

                        <span className='input-group-text'>廢水產生量(MT)</span>
                        <input type='number' className='form-control' value={waterWaste} disabled />

                        <span className='input-group-text'>AIR用量(NM3)</span>
                        <input type='number' className='form-control' value={air} disabled />
                    </div>

                    <div className='input-group input-group-sm w-50 mt-2'>
                        <span className='input-group-text'>取得資料時間</span>
                        <input type='text' className='form-control' value={getDataTime} disabled />

                        <span className='input-group-text'>儲存時間</span>
                        <input type='text' className='form-control' value={saveReportTime} disabled />
                    </div>

                    <div className='input-group w-50 mt-2'>
                        <span className='input-group-text'>交接事項</span>
                        <textarea rows={3} className='form-control' value={handover} onChange={evt => setHandover(evt.target.value)} />
                    </div>
                </>
            }
        </div>
    );
}

export default DailyReport;
