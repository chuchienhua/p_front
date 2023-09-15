import React, { useState, useEffect } from 'react';
import { useSelector } from "react-redux";
import axios from 'axios';
import { toast } from 'react-toastify';
import { HotTable } from '@handsontable/react';
import Handsontable from 'handsontable';
import { registerAllCellTypes } from 'handsontable/cellTypes';
import Utils from '../Utils';
import moment from 'moment';
import Swal from 'sweetalert2';
import MixingMatTable from './MixingMatTable';
import LoadingPage from '../LoadingPage';

function Mixing() {

    const authRoute = useSelector(state => state.authRoute);

    registerAllCellTypes();

    const [mounted, setMounted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false); //是否為管理員

    const [rows, setRows] = useState([]);
    const [startDate, setStartDate] = useState(moment(new Date()).format('YYYY-MM-DD'));
    const [endDate, setEndDate] = useState(moment(new Date()).format('YYYY-MM-DD'));
    const [searchLine, setSearchLine] = useState('*');
    const [searchSequence, setSearchSequence] = useState('*');
    const [searchProductNo, setSearchProductNo] = useState('*');

    const [printers, setPrinters] = useState([]); //所有標籤機
    const [mixers, setMixers] = useState([]); //拌粉機清單
    const [lines, setLines] = useState([]); //線別
    const [operator, setOperator] = useState([]); //作業人員名單

    const [selMixer, setSelMixer] = useState(''); //選擇的拌粉機
    const [selPrinter, setSelPrinter] = useState(''); //選擇的標籤機

    const [disableReadOnly, setDisableReadOnly] = useState([]); //新增的列數，用於控制readOnly

    const [labelType, setLabelType] = useState(''); //列印標籤明細(申請表)種類
    const [labelLine, setLabelLine] = useState('');
    const [labelSeq, setLabelSeq] = useState('');
    const [labelBagWeight, setLabelBagWeight] = useState(18); //包重
    const [labelDate, setLabelDate] = useState(new Date()); //配料日期
    const [labelWorkShift, setLabelWorkShift] = useState(''); //班別
    const [labelBatchStart, setLabelBatchStart] = useState(''); //拌粉LotNo始
    const [labelBatchEnd, setLabelBatchEnd] = useState(''); //拌粉LotNo終
    const [labelSemiCode, setLabelSemiCode] = useState(''); //列印拌粉半成品簡碼標籤
    const [labelSemiWeight, setLabelSemiWeight] = useState(''); //列印拌粉半成品重量
    const [labelNumPowder, setLabelNumPowder] = useState(0); //合計原料標籤數量
    const [labelNumSemi, setLabelNumSemi] = useState(0); //每批半成品標籤數量
    const [labelBag, setLabelBag] = useState(''); //半成品標籤種類
    const [labelMaterialRows, setLabelMaterialRows] = useState([]); //要列印的拌粉原料

    const columns = [
        { data: 'DATE', type: 'text', width: 100, readOnly: true },
        { data: 'WORK_SHIFT', type: 'autocomplete', source: ['早', '中', '晚'], strict: true, allowInvalid: false, width: 50, className: 'bg-light' },
        { data: 'LINE', type: 'autocomplete', source: lines, strict: true, allowInvalid: false, width: 50, className: 'bg-light' },
        { data: 'SEQUENCE', type: 'text', width: 50, className: 'bg-light' },
        { data: 'SEMI_NO', type: 'autocomplete', source: ['P', 'G'], strict: true, allowInvalid: false, width: 60, className: 'bg-light' },
        { data: 'PRD_PC', type: 'text', width: 100, readOnly: true },
        { data: 'MIXER', type: 'autocomplete', source: mixers, strict: true, allowInvalid: false, width: 100, className: 'bg-info' },
        { data: 'BATCH_START', type: 'numeric', width: 70, className: 'bg-light' },
        { data: 'BATCH_END', type: 'numeric', width: 70, className: 'bg-light' },
        { data: 'BATCH_WEIGHT', type: 'numeric', width: 95, readOnly: true, numericFormat: { pattern: '##0.00' } },
        { data: 'TOTAL_WEIGHT', type: 'numeric', width: 80, readOnly: true, numericFormat: { pattern: '##0.00' } },
        { data: 'PICKED', type: 'checkbox', width: 50, readOnly: true },
        { data: 'LABEL', type: 'checkbox', width: 70, readOnly: true },
        {
            data: 'SAVE_BTN',
            width: 70,
            readOnly: true,
            renderer: function (instance, td, row, col, prop, value, cellProperties) {
                const icon = document.createElement('SPAN');
                icon.className = "icon bi-save";
                icon.innerHTML = ' 儲存';

                const btn = document.createElement('SAVE_BTN');
                btn.className = 'btn btn-outline-success btn-sm px-1 py-0 nowrap align-top';
                if (instance.getDataAtCell(row, col + 1)) {
                    btn.className += ' disabled';
                }
                btn.appendChild(icon);

                Handsontable.dom.addEvent(btn, 'click', () => {
                    if (!isLoading && !instance.getDataAtCell(row, col + 1)) {
                        saveBtn(row, value);
                    }
                });

                const div = document.createElement('DIV');
                div.appendChild(btn);

                Handsontable.dom.empty(td);
                td.appendChild(div);
            },
        },
        {
            data: 'DEL_BTN',
            width: 70,
            readOnly: true,
            renderer: function (instance, td, row, col, prop, value, cellProperties) {
                const icon = document.createElement('SPAN');
                icon.className = "icon bi-x-circle";
                icon.innerHTML = ' 刪除';

                const btn = document.createElement('DEL_BTN');
                btn.className = 'btn btn-outline-danger btn-sm px-1 py-0 nowrap align-top';
                if (value) {
                    btn.className += ' disabled';
                }
                btn.appendChild(icon);

                Handsontable.dom.addEvent(btn, 'click', () => {
                    //已領過料則無法刪除排程
                    if (!value) {
                        delBtn(row);
                    }
                });

                const div = document.createElement('DIV');
                div.appendChild(btn);

                Handsontable.dom.empty(td);
                td.appendChild(div);
            },
        },
        {
            data: 'LABEL_BTN',
            width: 70,
            readOnly: true,
            renderer: function (instance, td, row, col, prop, value, cellProperties) {
                const icon = document.createElement('SPAN');
                icon.className = "icon bi-printer";
                icon.innerHTML = ' 列印';

                const btn = document.createElement('LABEL_BTN');
                btn.className = 'btn btn-outline-secondary btn-sm px-1 py-0 nowrap align-top';
                if (!value) {
                    btn.className += ' disabled';
                }
                btn.appendChild(icon);

                Handsontable.dom.addEvent(btn, 'click', () => {
                    if (value && !isLoading) {
                        labelBtn(row, value);
                    }
                });

                const div = document.createElement('DIV');
                div.appendChild(btn);

                Handsontable.dom.empty(td);
                td.appendChild(div);
            },
        },
        {
            data: 'OPERATOR',
            source: operator,
            strict: true,
            allowInvalid: false,
            width: 80,
            validator: Handsontable.validators.AutocompleteValidator,
            editor: Handsontable.editors.AutocompleteEditor,
            renderer: function (instance, td, row, col, prop, value, cellProperties) {
                Handsontable.renderers.AutocompleteRenderer.apply(this, arguments);
                td.classList.add('bg-light');
            },
        },
        { data: 'NOTE', type: 'text', width: 200 },
    ];
    const colHeader = [
        '日期', '班別', '線別', '序號', '半成品', '成品簡碼', '混合設備', '起始批數', '結束批數', '單批淨重(kg)', '總淨重(kg)',
        '已領', '標籤列印', '儲存', '刪除', '列印', '作業人員', '備註'
    ];
    const readOnlyRowControll = (row, col) => {
        if (!disableReadOnly.includes(row) && col !== 6 && col !== 7 && col !== 8 && col !== 15 && col !== 16 && col !== 17) {
            return { readOnly: true };
        }
    }

    useEffect(() => {
        if (!mounted) {
            //抓取權限是否為管理員
            if (authRoute) {
                let routeSetting = authRoute.filter(x => (window.location.pathname.split('/').pop() === x.ROUTE))[0];
                if (routeSetting.ISADMIN) {
                    setIsAdmin(('1' === routeSetting.ISADMIN));
                }
            }

            //取得標籤機
            const getPrinter = async () => {
                const apiUrl = Utils.generateApiUrl('/printer');
                let res = await axios.get(apiUrl, {
                    ...Utils.pbtAxiosConfig,
                });
                if (!res.data.error && 0 < res.data.res.length) {
                    setPrinters(res.data.res);
                }
            }

            //取得拌粉設備清單
            const getMixer = async () => {
                const apiUrl = Utils.generateApiUrl('/mixing/mixer');
                let res = await axios.get(apiUrl, {
                    ...Utils.pbtAxiosConfig,
                })
                if (!res.data.error && 0 < res.data.res.length) {
                    setMixers(res.data.res.map(x => x.MIXER_NAME));
                }
            }

            //取得生產線別
            const getLines = async () => {
                const apiUrl = Utils.generateApiUrl('/feeder');
                let res = await axios.get(apiUrl, {
                    ...Utils.pbtAxiosConfig,
                })
                if (!res.data.error && 0 < res.data.res.length) {
                    let appendArray = [];
                    res.data.res.forEach(element => {
                        if (!appendArray.includes(element.LINE)) {
                            appendArray.push(element.LINE);
                        }
                    })
                    setLines(appendArray);
                }
                return true;
            }

            //取得拌粉人員名單
            const getMixOperator = async () => {
                const apiUrl = Utils.generateApiUrl('/mixing/mixOperator');
                let res = await axios.get(apiUrl, {
                    ...Utils.pbtAxiosConfig,
                })
                if (!res.data.error && 0 < res.data.res.length) {
                    setOperator(res.data.res.map(x => x.NAME));
                }
            }

            const loadAPI = async () => {
                try {
                    await getPrinter();
                    await getMixOperator();
                    await getMixer();
                    await getLines();
                    setMounted(true);
                } catch (err) {
                    toast.error('載入異常', err.toString());
                }
            }
            loadAPI();
        }
    }, [mounted, authRoute])

    //包種切換
    useEffect(() => {
        if ('paper' === labelBag) {
            //小數半成品
            let batchRatio = 1;
            if (Number(labelBatchStart) === Number(labelBatchEnd) && !Number.isInteger(labelBatchEnd)) {
                batchRatio = labelBatchEnd % 1;
            }
            setLabelNumSemi(Math.ceil((labelSemiWeight * batchRatio / labelBagWeight))); // 預設規則 = 單批淨重 / 15 => 18

        } else if ('fibc' === labelBag) {
            //setLabelNumSemi(Math.ceil(labelBatch)); //預設規則=每一批一張
            setLabelNumSemi(1); //預設規則=每一批一張
        } else if ('' === labelBag) {
            setLabelNumSemi(0); //不列印
        }
    }, [labelBag, labelSemiWeight, labelBagWeight, labelBatchStart, labelBatchEnd])

    //選擇要列印、補印原料、補印半成品原料標籤
    const labelBtn = (row, value) => {
        if (value) {
            const callback = respond => {
                if (respond.isConfirmed) {

                    if ('normal' === respond.value && rows[row].LABEL) {
                        toast.warn('已列印完成，請使用補印');
                        return;
                    }

                    setIsLoading(true);
                    setLabelMaterialRows([]);

                    const apiUrl = Utils.generateApiUrl('/mixing/labelMaterial', [rows[row].DATE, rows[row].WORK_SHIFT, rows[row].LINE, rows[row].SEQUENCE, rows[row].SEMI_NO]);
                    axios.get(apiUrl, {
                        ...Utils.pbtAxiosConfig,
                    }).then(res => {
                        if (res.data.res.length) {
                            //console.log(res.data.res)

                            //批數可能會是小數點處理，若起始與結束批數相同，則批數為小數點
                            let batchNum;
                            let batchRatio = 1;
                            if ((value[0] === value[1]) && !Number.isInteger(value[0])) {
                                batchNum = Math.round((value[0] % 1) * 100) / 100;
                                batchRatio = value[0];
                            } else {
                                batchNum = value[1] - value[0] + 1;
                            }

                            let lowestRatio = 100; //最低比例，用來處理加總的位數
                            let batchTotal = 0;
                            let total = 0;
                            let appendArray = [];
                            res.data.res.forEach(element => {
                                let weights = Utils.getMaterialPrecision(element.TOTAL_WEIGHT, element.RATIO, batchNum);

                                appendArray.push({
                                    MATERIAL: element.MATERIAL,
                                    BATCH_WEIGHT: weights.batchWeight,
                                    TOTAL_WEIGHT: weights.totalWeight,
                                    UNIT: (0.01 > weights.totalWeight / batchNum) ? 'g' : 'kg',
                                    PRINT: ('normal' === respond.value || 'pallet' === respond.value) ? true : false,
                                });

                                batchTotal += parseFloat(weights.batchWeight);
                                total += parseFloat(weights.totalWeight);

                                if (element.RATIO < lowestRatio) {
                                    lowestRatio = element.RATIO;
                                }
                            });

                            //整理加總的小數點位數
                            if (5 <= lowestRatio) {
                                batchTotal = batchTotal.toFixed(0);
                                total = total.toFixed(0);
                            } else if (0.1 <= lowestRatio && 5 > lowestRatio) {
                                batchTotal = batchTotal.toFixed(1);
                                total = total.toFixed(1);
                            } else {
                                batchTotal = batchTotal.toFixed(4);
                                total = total.toFixed(4);
                            }
                            appendArray.push({ MATERIAL: '加總', BATCH_WEIGHT: batchTotal, TOTAL_WEIGHT: total, UNIT: 'kg' });
                            setLabelMaterialRows(appendArray);

                            setLabelType(respond.value);
                            setLabelLine(rows[row].LINE);
                            setLabelSeq(rows[row].SEQUENCE);
                            setLabelBagWeight(res.data.bagWeight || 18);
                            setLabelDate(rows[row].DATE);
                            setLabelWorkShift(rows[row].WORK_SHIFT);
                            setLabelBatchStart(value[0]);
                            setLabelBatchEnd(value[1]);
                            setLabelSemiCode(rows[row].SEMI_NO + rows[row].PRD_PC);
                            setLabelSemiWeight(batchTotal * batchRatio);
                            setLabelNumPowder(res.data.res.length * Math.ceil(batchNum));

                            //計算半成品標籤數量
                            setLabelBag('fibc');
                        } else {
                            toast.error('取得原料失敗');
                        }
                    })
                        .catch(err => console.error(err))
                        .finally(() => setIsLoading(false));
                }
            }

            Swal.fire({
                title: '<strong>列印種類選擇</strong>',
                input: 'radio',
                inputOptions: { 'normal': '原料&半成品', 'pallet': '棧板&半成品', 'powder': '補印原料標籤', 'semi': '補印半成品標籤' },
                inputValidator: (value) => {
                    if (!value) {
                        return '請選擇列印種類!';
                    }
                },
                confirmButtonText: '確定',
                position: 'top',
                width: 750,
                showCloseButton: true,
                focusConfirm: false,
            }).then(callback).catch(error => {
                Swal.showValidationMessage(`Request failed: ${error}`);
            });
        } else {
            toast.error('列印前請先儲存');
        }
    }

    //列印標籤
    const printLabel = () => {

        if (0 < selPrinter.length) {
            setIsLoading(true);

            //只列印打勾的原料 & 加總
            let materials = [...labelMaterialRows];
            materials = materials.filter(material => (material.PRINT));

            const apiUrl = Utils.generateApiUrl('/mixing/printLabel');
            axios.post(apiUrl, {
                type: labelType,
                date: labelDate,
                workShift: labelWorkShift,
                line: labelLine,
                sequence: labelSeq,
                paperBagWeight: labelBagWeight,
                batchStart: labelBatchStart,
                batchEnd: labelBatchEnd,
                materials: materials,
                semiProductNo: labelSemiCode,
                semiProductWeight: labelSemiWeight,
                semiNum: labelNumSemi,
                semiType: labelBag,
                printerIP: selPrinter,
            }, {
                ...Utils.pbtAxiosConfig,
            }).then(res => {
                if (!res.data.error) {
                    toast.success('列印完成');
                    setLabelType('');
                    setLabelMaterialRows([]);
                    query();
                } else {
                    toast.error('列印失敗');
                }
            }).catch(err => console.error(err))
                .finally(() => setIsLoading(false));
        } else {
            toast.warn('請先選擇欲列印的標籤機');
        }
    }

    //儲存或更新一行
    const saveBtn = (row, value) => {
        let errorString = '';
        if (!rows[row].BATCH_START || !rows[row].BATCH_END) {
            errorString = '請輸入批數';
        } else if (rows[row].BATCH_START > rows[row].BATCH_END) {
            errorString = '批數設定異常';
        } else if (!rows[row].SEMI_NO) {
            errorString = '請輸入半成品簡碼';
        } else if ((!Number.isInteger(rows[row].BATCH_START) || !Number.isInteger(rows[row].BATCH_END)) && rows[row].BATCH_START !== rows[row].BATCH_END) {
            errorString = '起始與結束批數小數點需相同';
        } else if (!rows[row].OPERATOR) {
            errorString = '請輸入作業人員';
        }

        if (0 === errorString.length) {
            setIsLoading(true);
            //新增無value，update才有(領料數量，可能為0)
            if (null !== value) {
                //更新僅能更新機台、批次、操作人員
                const apiUrl = Utils.generateApiUrl('/mixing/updateSchedule');
                axios.post(apiUrl, {
                    date: rows[row].DATE,
                    workShift: rows[row].WORK_SHIFT,
                    line: rows[row].LINE,
                    sequence: rows[row].SEQUENCE,
                    semiNo: rows[row].SEMI_NO,
                    mixer: rows[row].MIXER,
                    batchStart: rows[row].BATCH_START,
                    batchEnd: rows[row].BATCH_END,
                    operator: rows[row].OPERATOR,
                    note: rows[row].NOTE,
                }, {
                    ...Utils.pbtAxiosConfig,
                }).then(res => {
                    if (!res.data.error) {
                        toast.success('更新成功');
                        query();
                    } else {
                        toast.error(`更新失敗，${res.data.res}`);
                    }
                })
                    .catch(err => console.error(err))
                    .finally(() => setIsLoading(false));
            } else {
                const apiUrl = Utils.generateApiUrl('/mixing/saveSchedule');
                axios.post(apiUrl, {
                    date: rows[row].DATE,
                    workShift: rows[row].WORK_SHIFT,
                    line: rows[row].LINE,
                    sequence: rows[row].SEQUENCE,
                    semiNo: rows[row].SEMI_NO,
                    batchStart: rows[row].BATCH_START,
                    batchEnd: rows[row].BATCH_END,
                    operator: rows[row].OPERATOR,
                    note: rows[row].NOTE,
                }, {
                    ...Utils.pbtAxiosConfig,
                }).then(res => {
                    if (!res.data.error) {
                        toast.success('儲存成功');
                        query();
                    } else {
                        toast.error(`儲存失敗，${res.data.res}`);
                    }
                })
                    .catch(err => console.error(err))
                    .finally(() => setIsLoading(false));
            }
        } else {
            toast.warn(errorString);
        }
    }

    //刪除一行
    const delBtn = (row) => {
        setIsLoading(true);

        const apiUrl = Utils.generateApiUrl('/mixing/removeSchedule');
        axios.post(apiUrl, {
            date: rows[row].DATE,
            workShift: rows[row].WORK_SHIFT,
            line: rows[row].LINE,
            sequence: rows[row].SEQUENCE,
            semiNo: rows[row].SEMI_NO,
        }, {
            ...Utils.pbtAxiosConfig,
        }).then(res => {
            if (!res.data.error) {
                toast.success('刪除成功');
                query();
            } else {
                toast.error('刪除失敗');
            }
        })
            .catch(err => console.error(err))
            .finally(() => setIsLoading(false));
    }

    //搜尋日期範圍內的原料領用排程表
    const query = () => {
        //相差天數限制10天內
        const days = moment(endDate).diff(startDate, 'days');

        if (days <= 10) {
            setIsLoading(true);
            setRows([]);
            setLabelType('');

            const apiUrl = Utils.generateApiUrl('/mixing/getSchedule', [moment(startDate).format('YYYYMMDD'), moment(endDate).format('YYYYMMDD')]);
            axios.post(apiUrl, {
                line: searchLine,
                sequence: searchSequence,
                productNo: searchProductNo,
            }, {
                ...Utils.pbtAxiosConfig,
            }).then(res => {
                let appendRows = [];
                if (res.data.res.length) {
                    res.data.res.forEach(element => {
                        appendRows.push({
                            DATE: moment(element.MIX_DATE).format('YYYY-MM-DD'),
                            WORK_SHIFT: element.WORK_SHIFT,
                            LINE: element.LINE,
                            SEQUENCE: element.SEQUENCE,
                            SEMI_NO: element.SEMI_NO,
                            PRD_PC: element.PRD_PC,
                            MIXER: element.MIXER,
                            BATCH_START: element.BATCH_START,
                            BATCH_END: element.BATCH_END,
                            BATCH_WEIGHT: element.TOTAL_WEIGHT / (element.BATCH_END - element.BATCH_START + 1),
                            TOTAL_WEIGHT: element.TOTAL_WEIGHT,
                            PICKED: (element.PICK_WEIGHT) ? true : false,
                            LABEL: (1 === element.LABEL_STATUS),
                            NOTE: element.NOTE,
                            OPERATOR: element.OPERATOR,
                            SAVE_BTN: element.PICK_WEIGHT, //已領過料無法修改排程
                            DEL_BTN: (element.PICK_WEIGHT) ? true : false, //已領過料無法刪除排程
                            LABEL_BTN: [element.BATCH_START, element.BATCH_END],
                        });
                    });
                } else {
                    toast.warn('未找到已儲存的排程，請新增');
                }

                //再生成每日各1個
                let disabledRows = [];
                for (let i = 0; i <= days; i++) {
                    let Date = moment(startDate).add(i, 'day').format('YYYY-MM-DD');
                    appendRows.push({
                        DATE: Date, WORK_SHIFT: '早', LINE: null, SEQUENCE: null, PRD_PC: '自動帶出', MIXER: '自動帶出',
                        BATCH_START: null, BATCH_END: null, BATCH_WEIGHT: '自動帶出', TOTAL_WEIGHT: '自動帶出', SAVE_BTN: null, NOTE: ''
                    })
                    disabledRows.push(appendRows.length - 1);
                }
                setRows(appendRows);
                setDisableReadOnly(disabledRows);
            })
                .catch(err => console.error(err))
                .finally(() => setIsLoading(false));
        } else {
            toast.warn('日期相差請勿大於10天');
        }
    }

    //列印拌料機
    const printMixer = () => {

        const callback = res => {
            if (res.isConfirmed) {
                if (selPrinter.length && selMixer.length) {
                    setIsLoading(true);

                    const apiURL = Utils.generateApiUrl('/printMachine');
                    axios.post(apiURL, {
                        printerIP: selPrinter,
                        printData: selMixer,
                    }, {
                        ...Utils.pbtAxiosConfig,
                    }).then(res => {
                        if (!res.data.error) {
                            toast.success('成功!');
                        } else {
                            toast.error('失敗!');
                        }
                    }).catch(err => {
                        console.error(err);
                        toast.error(err);
                    })
                        .finally(() => setIsLoading(false));
                } else {
                    toast.error('請選擇標籤機或拌粉機');
                }
            }
        }

        Swal.fire({
            title: `確認列印拌粉機${selMixer}嗎`,
            position: 'top',
            showCancelButton: true,
        }).then(callback).catch(error => {
            Swal.showValidationMessage(`Request failed: ${error}`);
        });
    }

    //生成標籤機的選項
    const generatePrinter = () => {
        let div = [];
        printers.forEach((element, index) => {
            div.push(
                <option key={index} value={element.PRINTER_IP}>{element.PRINTER_NAME}</option>
            );
        });
        return div;
    }

    //生成拌粉機的選項
    const generateMixer = () => {
        let div = [];
        mixers.forEach((element, index) => {
            div.push(
                <option key={index} value={element}>{element}</option>
            );
        });
        return div;
    }

    if (!mounted) {
        return (<LoadingPage />);
    }

    return (
        <div className="mixing-page m-2">
            <div className="accordion mt-2" id="accordionMix">
                <div className="accordion-item">
                    <h2 className="accordion-header" id="headingMix">
                        <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseMix" aria-expanded="true" aria-controls="collapseMix">
                            拌粉設備標籤列印
                        </button>
                    </h2>
                    <div id="collapseMix" className="accordion-collapse collapse" aria-labelledby="headingOne" data-bs-parent="#accordionMix">
                        <div className="accordion-body">
                            <div className="input-group input-group-sm">
                                <span className="input-group-text">標籤</span>
                                <select className="form-select" value={selPrinter} onChange={evt => setSelPrinter(evt.target.value)}>
                                    <option>---請選擇---</option>
                                    {generatePrinter()}
                                </select>

                                <span className="input-group-text">拌粉</span>
                                <select className="form-select" value={selMixer} onChange={evt => setSelMixer(evt.target.value)}>
                                    <option>---請選擇---</option>
                                    {generateMixer()}
                                </select>
                                <button type="button" className="btn btn-warning" onClick={printMixer} disabled={isLoading}><span className="icon bi-printer"></span> 列印</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div >

            <div className="input-group input-group-sm mt-2">
                <span className="input-group-text">日期</span>
                <input type="date" className="form-control" defaultValue={startDate} onChange={evt => setStartDate(evt.target.value)} />
                <span className="input-group-text">-</span>
                <input type="date" className="form-control" defaultValue={endDate} onChange={evt => setEndDate(evt.target.value)} />
            </div>

            <div className="input-group input-group-sm mt-2">
                <span className="input-group-text">線別</span>
                <input type="text" className="form-control" defaultValue={searchLine} onChange={evt => setSearchLine(evt.target.value)} />

                <span className="input-group-text">序號</span>
                <input type="text" className="form-control" defaultValue={searchSequence} onChange={evt => setSearchSequence(evt.target.value)} />
            </div>

            <div className="input-group input-group-sm mt-2">
                <span className="input-group-text">成品簡碼</span>
                <input type="text" className="form-control" defaultValue={searchProductNo} onChange={evt => setSearchProductNo(evt.target.value)} />
                <button type="button" className="btn btn-primary" onClick={query} disabled={isLoading}><span className="icon bi-search"></span> 查詢</button>
            </div>

            <div className="mixing-schedule-table w-100 overflow-hidden mt-2 mb-2" style={{ minHeight: "20rem" }}>
                <HotTable
                    licenseKey="non-commercial-and-evaluation"
                    data={rows}
                    columns={columns}
                    colHeaders={colHeader}
                    rowHeaders={true}
                    rowHeights={22}
                    cells={(row, col) => readOnlyRowControll(row, col)}
                    readOnly={(!isAdmin)}
                    hiddenColumns={{ columns: (isAdmin) ? [] : [12, 13, 14] }}
                />
            </div>

            <hr />

            {('' !== labelType) &&
                <div className="label">
                    <h4>拌粉原料列印明細表</h4>
                    <div className="input-group input-group-sm w-50 mb-1">
                        <span className="input-group-text">線別</span>
                        <input type="text" className="form-control me-2" value={labelLine} disabled />

                        <span className="input-group-text">序號</span>
                        <input type="number" className="form-control me-2" value={labelSeq} disabled />

                        <span className="input-group-text">紙袋包重</span>
                        <input type="number" className="form-control" value={labelBagWeight} disabled />
                    </div>

                    <div className="input-group input-group-sm w-50 mb-1">
                        <span className="input-group-text">配料日期</span>
                        <input type="date" className="form-control me-2" value={labelDate} disabled />

                        <span className="input-group-text">班別</span>
                        <input type="text" className="form-control" value={labelWorkShift} disabled />
                    </div>

                    <div className="input-group input-group-sm w-50 mb-1">
                        <span className="input-group-text">批數</span>
                        <input type="numeric" className="form-control" value={labelBatchStart} onChange={evt => setLabelBatchStart(evt.target.value)} disabled={('normal' === labelType)} />
                        <span className="input-group-text">-</span>
                        <input type="numeric" className="form-control me-2" value={labelBatchEnd} onChange={evt => setLabelBatchEnd(evt.target.value)} disabled={('normal' === labelType)} />
                    </div>

                    <MixingMatTable rows={labelMaterialRows} printReadOnly={('powder' !== labelType)} />

                    <div className="input-group input-group-sm mt-2 mb-1">
                        {('normal' === labelType) &&
                            <>
                                <span className="input-group-text">合計原料標籤數量(張)</span>
                                <input type="number" className="form-control me-2" value={labelNumPowder} disabled />
                            </>
                        }
                        {('powder' !== labelType) &&
                            <>
                                <span className="input-group-text">半成品簡碼</span>
                                <input type="text" className="form-control me-2" value={labelSemiCode} disabled />

                                <span className="input-group-text">半成品標籤種類</span>
                                <select className="form-select me-2" value={labelBag} onChange={evt => setLabelBag(evt.target.value)}>
                                    <option value="">不列印</option>
                                    <option value="paper">紙袋</option>
                                    <option value="fibc">太空袋</option>
                                </select>

                                <span className="input-group-text">每批半成品標籤數量(張)</span>
                                <input type="number" className="form-control" value={labelNumSemi} onChange={evt => setLabelNumSemi(evt.target.value)} disabled />
                            </>
                        }

                        <button type="button" className="btn btn-sm btn-primary" onClick={printLabel} disabled={isLoading}><span className="icon bi-printer"></span> 確認列印</button>
                    </div>
                </div>
            }
        </div >
    );
}

export default Mixing;
