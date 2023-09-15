import React, { useState, useEffect } from 'react';
import { HotTable } from '@handsontable/react';
import Handsontable from 'handsontable';
import { registerAllCellTypes } from 'handsontable/cellTypes';
import Utils from '../Utils';
import axios from 'axios';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import moment from 'moment';
import MaterialQA from '../MaterialQA';

function ExtrusionFeeding(props) {

    const printers = props.printers || []; //所有標籤機
    const feeders = props.feeders || []; //所有入料機
    const orders = props.orders || []; //所有正在生產中的排程
    const isAdmin = props.isAdmin || false; //帳號權限

    registerAllCellTypes();

    const [isLoading, setIsLoading] = useState(false);
    const [auditMode, setAuditMode] = useState(false); //查核模式

    const [selFeederLine, setSelFeederLine] = useState(''); //選擇的入料機線別
    const [selFeeder, setSelFeeder] = useState(''); //選擇的入料機
    const [selPrinter, setSelPrinter] = useState(''); //選擇的標籤機

    const [line, setLine] = useState(orders.length ? orders[0].split('-')[0] : 'E');
    const [sequence, setSequence] = useState(orders.length ? orders[0].split('-')[1] : 1391);
    const [selOrder, setSelOrder] = useState('');
    const [queryReadOnly, setQueryReadOnly] = useState(false); //鎖定搜尋列

    const [createTime, setCreateTime] = useState(''); //開始時間
    const [creator, setCreator] = useState(''); //建立入料管制表人員
    const [startTime, setStartTime] = useState(''); //排程啟動時間
    const [endTime, setEndTime] = useState(''); //排程結束時間
    const [silo, setSilo] = useState(''); //樹脂SILO
    const [siloMaterial, setSiloMaterial] = useState(''); //SILO的原料
    const [reworkSource, setReworkSource] = useState(''); //重工來源
    const [reworkOpno, setReworkOpno] = useState(''); //重工標籤編號
    const [reworkRemainNum, setReworkRemainNum] = useState(''); //重工剩餘包數
    const [reworkPickNum, setReworkPickNum] = useState(''); //重工領用包數(只有回爐品掃包裝棧板標籤會輸入)
    const [remainBagOpno, setRemainBagOpno] = useState(''); //殘包編號
    const [remainBagLotNo, setRemainBagLotNo] = useState(''); //殘包批號
    const [remainBagWeight, setRemainBagWeight] = useState(''); //殘包重量
    const [checked, setChecked] = useState(false); //是否已確認過

    const [rows, setRows] = useState([]);

    const [siloTimer, setSiloTimer] = useState(null); //timer抓M1樹酯入料機重量
    const timerFrequency = 60; //幾秒抓一次

    //原料投料掃碼作業表狀態
    const [switchScanPage, setSwitchScanPage] = useState(false); //切換至掃碼作業表頁面
    const [qrcodeType, setQrcodeType] = useState(''); //掃碼入料分為掃棧板或半成品的QR Code
    const [feederNo, setFeederNo] = useState('');
    const [material, setMaterial] = useState('');
    const [feedWeight, setFeedWeight] = useState(0); //已入料重量
    const [bagWeight, setBagWeight] = useState(0); //切換掃描頁面後的包裝別
    const [currentFeedNum, setCurrentFeedNum] = useState(0); //切換掃描頁面後的入料包數
    const [feedLotNo, setFeedLotNo] = useState(''); //掃到的棧板Lot No
    const [feedBatchNo, setFeedBatchNo] = useState(''); //掃到的棧板編號
    const [feedBatchQA, setFeedBatchQA] = useState(''); //棧板的品檢結果
    const [feedBatchFirstIn, setFeedBatchFirstIn] = useState(''); //棧板的先進先出
    const [batchRemain, setBatchRemain] = useState(0); //棧板剩餘包數

    const columns = [
        { data: 'FEEDER_NO', type: 'text', width: 55 },
        { data: 'MATERIAL', type: 'text', width: 100 },
        { data: 'FEED_NUM', type: 'numeric', width: 40 },
        { data: 'FEED_WEIGHT', type: 'numeric', width: 55 },
        { data: 'NEED_WEIGHT', type: 'numeric', width: 55 },
        { data: 'WEIGHT_DIFF', type: 'numeric', width: 55 },
        {
            data: 'FEED_BTN',
            width: 40,
            renderer: function (instance, td, row, col, prop, value, cellProperties) {
                if (0 !== row && !instance.getDataAtCell(row, 1).includes(',')) {
                    const icon = document.createElement('SPAN');
                    icon.className = "icon bi-camera-fill";

                    const btn = document.createElement('FEED_BTN');
                    btn.className = 'btn btn-outline-success btn-lg px-1 py-0 nowrap align-top';
                    btn.appendChild(icon);
                    if (!checked) {
                        btn.className += ' disabled';
                    }
                    Handsontable.dom.addEvent(btn, 'click', () => {
                        if (checked) {
                            feedingBtn(row, value);
                        }
                    });

                    const div = document.createElement('DIV');
                    div.appendChild(btn);

                    Handsontable.dom.empty(td);
                    td.appendChild(div);
                }
            },
        },
        { data: 'FOREIGN', type: 'checkbox', width: 40 },
        { data: 'AUDIT', type: 'checkbox', width: 40 },
        /*
        {
            data: 'STORAGE_BTN',
            width: 40,
            renderer: function (instance, td, row, col, prop, value, cellProperties) {
                if (0 !== row) {
                    const icon = document.createElement('SPAN');
                    icon.className = "icon bi-lock-fill";

                    const btn = document.createElement('STORAGE_BTN');
                    btn.className = 'btn btn-outline-info btn-lg px-1 py-0 nowrap align-top';
                    btn.appendChild(icon);
                    if (!checked) {
                        btn.className += ' disabled';
                    }

                    Handsontable.dom.addEvent(btn, 'click', () => {
                        if (checked) {
                            storageBtn(row);
                        }
                    });

                    const div = document.createElement('DIV');
                    div.appendChild(btn);

                    Handsontable.dom.empty(td);
                    td.appendChild(div);
                }
            },
        },
        */
    ];
    const colHeader = ['入料機', '原料簡碼', '入料<br>包數', '入料<br>重量', '理論<br>重量', '重量<br>差異', '掃碼', '金屬<br>異物', '查核<br>正常', /*'餘料<br>繳庫'*/];
    const readOnlyRowControll = (row, col) => {
        if ((auditMode && col !== 0 && col !== 1 && col !== 3 && col !== 4 && col !== 5) || col === 7) {
            return { readOnly: false };
        } else {
            return { readOnly: true };
        }
    }

    const feedingBtn = (row, value) => {
        //這邊要先掃依次入料機的QR Code，相符合才切換頁面
        if (feederNo === rows[row].FEEDER_NO) {
            setSwitchScanPage(true);
            setQrcodeType(value);
            setSiloTimer(null);
            setMaterial(rows[row].MATERIAL);
            setFeedWeight(rows[row].FEED_WEIGHT);
            setCurrentFeedNum(0);
            setBagWeight(0);
            setFeedLotNo('');
            setFeedBatchNo('');
            setFeedBatchQA('');
            setFeedBatchFirstIn('');
            setBatchRemain(0);
        } else {
            toast.warning('請先掃碼相符的入料機');
        }
    }

    /*
    //餘料繳庫按鍵
    const storageBtn = row => {

        const callback = res => {
            if (res.isConfirmed) {
                if (res.value < rows[row].FEED_WEIGHT) {
                    console.log(res.value);
                } else {
                    toast.warn('餘料繳庫不得大於等於入料數量');
                }
            }
        }

        Swal.fire({
            title: `請輸入原料${rows[row].MATERIAL}餘料繳庫量`,
            input: 'number',
            inputPlaceholder: '重量(kg)',
            position: 'top',
            showCancelButton: true,
        }).then(callback).catch(error => {
            Swal.showValidationMessage(`Request failed: ${error}`);
        });
    }
    */

    //抓M1樹酯入料機累積的入料量的Timer
    useEffect(() => {

        const getFeederTag = () => {
            let feeders = [1]; //要抓的入料機
            let feederRow; //第幾行的入料機要更新
            rows.forEach((element, index) => {
                //找出幾號入料機有使用中間桶(會有多種粉料，只會有一行)
                if (element.MATERIAL.includes(',')) {
                    feederRow = index;
                    feeders.push(Number(element.FEEDER_NO.slice(-1)));
                }
            });

            const apiUrl = Utils.generateApiUrl('/extrusion/getSiloWeight', [line, sequence]);
            axios.post(apiUrl, {
                feeders: feeders,
            }, {
                ...Utils.pbtAxiosConfig,
            }).then(res => {
                if (!res.data.error && res.data.minWeight.length) {
                    //console.log(res.data);
                    let newRows = [...rows];
                    newRows[0].FEED_WEIGHT = (res.data.maxWeight[0] - res.data.minWeight[0]);
                    newRows[0].WEIGHT_DIFF = newRows[0].NEED_WEIGHT - (res.data.maxWeight[0] - res.data.minWeight[0]);

                    if (1 < res.data.minWeight.length) {
                        newRows[feederRow].FEED_WEIGHT = (res.data.maxWeight[1] - res.data.minWeight[1]);
                        newRows[feederRow].WEIGHT_DIFF = newRows[1].NEED_WEIGHT - (res.data.maxWeight[1] - res.data.minWeight[1]);
                    }
                    setRows(newRows);
                } else {
                    toast.error('更新入料機累計量異常', res.data.errorMessage);
                }
                setStartTime(res.data.startTime ? moment(res.data.startTime).format('YYYY-MM-DD HH:mm:ss') : '尚未開始');
                setEndTime(res.data.endTime ? moment(res.data.endTime).format('YYYY-MM-DD HH:mm:ss') : '尚未結束');
            }).catch(err => console.error(err));
        }

        const timer = setInterval(() => {
            if (0 < siloTimer) {
                setSiloTimer(siloTimer - 1);
            } else if (0 === siloTimer) {
                setSiloTimer(timerFrequency);
                if ('尚未開始' !== startTime) {
                    getFeederTag();
                }
            }
        }, 1000)

        return () => {
            clearInterval(timer);
        }

    }, [siloTimer, rows, line, sequence, startTime])

    //取得押出入料管制表
    const query = () => {
        setIsLoading(true);
        setRows([]);
        setCreateTime('');
        setCreator('');
        setStartTime('');
        setEndTime('');

        const apiUrl = Utils.generateApiUrl('/extrusion/getFeedingForm', [line, sequence]);
        axios.get(apiUrl, {
            ...Utils.pbtAxiosConfig,
        }).then(res => {
            //console.log(res.data);
            if (!res.data.error) {
                let appendData = [];
                res.data.res.forEach((element, index) => {
                    //抓取建立時間
                    if (0 === index) {
                        setCreateTime(element.CREATE_TIME ? moment(element.CREATE_TIME).format('YYYY-MM-DD HH:mm:ss') : '尚未建立');
                        setCreator(element.CREATOR || '未紀錄');
                    }

                    appendData.push({
                        MATERIAL: element.MATERIAL,
                        //FEEDER: (element.FEEDER) ? element.FEEDER : `${line}-630${element.FEEDER_NO.slice(-1)}`, //待修正
                        FEEDER_NO: element.FEEDER_NO, //待修正
                        FEED_NUM: (element.FEED_NUM) ? element.FEED_NUM : 0,
                        FEED_WEIGHT: (element.FEED_WEIGHT) ? element.FEED_WEIGHT : 0,
                        WEIGHT_DIFF: (element.NEED_WEIGHT && element.FEED_WEIGHT) ? element.NEED_WEIGHT - element.FEED_WEIGHT : null,
                        NEED_WEIGHT: element.NEED_WEIGHT,
                        FOREIGN: (1 === element.FOREIGN),
                        AUDIT: (1 === element.AUDIT_STATUS),
                        SEMI_NO: element.SEMI_NO, //用於判別要掃哪一種QR Code，棧板的還是半成品，重工品為null
                        FEED_BTN: element.SEMI_NO,
                    });
                });

                //是否已建立過
                if (res.data.exist) {
                    setChecked(true);
                    setSiloTimer(0);
                } else {
                    setChecked(false);
                    setSiloTimer(null);
                }
                setRows(appendData);
                setSilo(res.data.siloName);
                setSiloMaterial(res.data.siloMaterial);
                setQueryReadOnly(true);
                setStartTime(res.data.startTime ? moment(res.data.startTime).format('YYYY-MM-DD HH:mm:ss') : '尚未開始');
                setEndTime(res.data.endTime ? moment(res.data.endTime).format('YYYY-MM-DD HH:mm:ss') : '尚未結束');
            } else {
                toast.error(`查詢失敗! ${res.data.res.toString()}`, { position: toast.POSITION.TOP_RIGHT });
            }
        }).catch(err => console.error(err))
            .finally(() => setIsLoading(false));
    }

    //確認建立押出入料管制表
    const createExtrusion = () => {
        if ('尚未結束' !== endTime) {
            toast.warning('排程已結束');
        } else {
            setIsLoading(true);

            const apiUrl = Utils.generateApiUrl('/extrusion/createFeedingForm');
            axios.post(apiUrl, {
                line: line,
                sequence: sequence,
                materialArray: rows,
            }, {
                ...Utils.pbtAxiosConfig,
            }).then(res => {
                if (!res.data.error) {
                    toast.success('建立押出管制表成功');
                    query();
                } else {
                    toast.error('建立押出管制表失敗');
                }
            }).catch(err => console.error(err))
                .finally(() => setIsLoading(false));
        }
    }

    //更新押出入料管制/查核表的勾選項目
    const updateExtrusion = () => {
        if ('尚未結束' !== endTime) {
            toast.warning('排程已結束');
        } else {
            setIsLoading(true);

            const apiUrl = Utils.generateApiUrl('/extrusion/updateFeedingForm');
            axios.post(apiUrl, {
                line: line,
                sequence: sequence,
                materialArray: rows,
            }, {
                ...Utils.pbtAxiosConfig,
            }).then(res => {
                if (!res.data.error) {
                    toast.success('更新成功');
                } else {
                    toast.error('更新失敗');
                }
            }).catch(err => console.error(err))
                .finally(() => setIsLoading(false));
        }
    }

    //未入料過的允許刪除入料管制表
    const removeExtrusion = () => {
        if (0 < rows.filter(x => 0 < x.FEED_NUM).length) {
            toast.error('僅允許刪除未入料過的排程');
        } else {
            setIsLoading(true);

            const apiUrl = Utils.generateApiUrl('/extrusion/removeFeedingForm');
            axios.post(apiUrl, {
                line: line,
                sequence: sequence,
            }, {
                ...Utils.pbtAxiosConfig,
            }).then(res => {
                if (!res.data.error) {
                    toast.success('刪除成功');
                    setRows([]);
                    setCreateTime('');
                    setCreator('');
                    setStartTime('');
                    setEndTime('');
                } else {
                    toast.error('刪除失敗');
                }
            }).catch(err => console.error(err))
                .finally(() => setIsLoading(false));
        }
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

    //生成入料機的線別選項
    const generateFeederLine = () => {
        let div = [];
        let existsLine = new Set();
        feeders.forEach((element, index) => {
            if (!existsLine.has(element.LINE)) {
                div.push(
                    <option key={index} value={element.LINE}>{element.LINE}</option>
                );
                existsLine.add(element.LINE);
            }
        });
        return div;
    }

    //生成正在生產中的工令
    const generateOrders = () => {
        let div = [];
        orders.forEach((element, index) => {
            div.push(
                <option key={index} value={element}>{element}</option>
            );
        });
        return div;
    }

    //生成線別對應的入料機選項
    const generateFeeder = () => {
        let div = [];
        feeders.forEach((element, index) => {
            if (selFeederLine === element.LINE) {
                div.push(
                    <option key={index} value={element.FEEDER}>{element.FEEDER}</option>
                );
            }
        });
        return div;
    }

    //根據正在生產中的工令塞入線別與序號
    const onChangeOrders = evt => {
        setSelOrder(evt.target.value);
        setLine(evt.target.value.split('-')[0]);
        setSequence(evt.target.value.split('-')[1]);
    }

    const onChangeSelFeederLine = evt => {
        setSelFeederLine(evt.target.value);
        setSelFeeder('');
    }

    //列印入料機
    const printFeeder = () => {

        const callback = res => {
            if (res.isConfirmed) {
                if (0 < selPrinter.length && 0 < selFeederLine.length && 0 < selFeeder.length) {
                    setIsLoading(true);

                    const apiURL = Utils.generateApiUrl('/printMachine');
                    axios.post(apiURL, {
                        printerIP: selPrinter,
                        printData: selFeederLine + selFeeder,
                    }, {
                        ...Utils.pbtAxiosConfig,
                    }).then(res => {
                        if (!res.data.error) {
                            toast.success('成功!');
                        } else {
                            toast.error('失敗!');
                        }
                    })
                        .catch(err => console.error(err))
                        .finally(() => setIsLoading(false));
                } else {
                    toast.error('請選擇標籤機、線別與入料機');
                }
            }
        }

        Swal.fire({
            title: `確認列印入料機${selFeederLine + selFeeder}嗎`,
            position: 'top',
            showCancelButton: true,
        }).then(callback).catch(error => {
            Swal.showValidationMessage(`Request failed: ${error}`);
        });
    }

    //掃描入料機比對是否相同
    const feederBtn = () => {
        let timerInterval;
        Swal.fire({
            title: '請於10秒內掃描入料機QR Code!',
            input: 'text',
            inputPlaceholder: 'QRCode',
            showConfirmButton: true,
            showCloseButton: true,
            timer: 10000,
            timerProgressBar: true,
            allowOutsideClick: false,
            willClose: () => {
                clearInterval(timerInterval);
            }
        }).then((result) => {
            /* 時間到以後 */
            if (result.dismiss === Swal.DismissReason.timer) {
                toast.error('已過期，請再掃碼一次');
            } else {
                if (feeders.map(x => (x.LINE + x.FEEDER)).includes(result.value)) {
                    if (line === result.value[0]) {
                        setFeederNo(result.value);
                    } else {
                        toast.error('入料機線別異常，請再試一遍')
                    }
                } else {
                    toast.error('無此入料機，請再試一遍');
                    setFeederNo('');
                }
            }
        }).catch(err => console.error('QRCode Error ', err));
    }

    //掃棧板原料QR Code
    const qrcodeBtn = () => {
        let timerInterval;
        Swal.fire({
            title: '請於15秒內掃描領料棧板QR Code!',
            input: 'text',
            inputPlaceholder: 'QRCode',
            showConfirmButton: false,
            showCloseButton: true,
            timer: 15000,
            timerProgressBar: true,
            allowOutsideClick: false,
            willClose: () => {
                clearInterval(timerInterval);
            }
        }).then((result) => {
            /* 時間到以後 */
            if (result.dismiss === Swal.DismissReason.timer) {
                toast.error('已過期，請再掃碼一次');
            } else {
                qrcodePicking(result.value);
            }
        }).catch(err => alert('QRCode Error ', err));
    }

    //原料領料，分為棧板QR Code與半成品QR Code兩種
    const qrcodePicking = value => {
        const decodeQR = Utils.decodeMaterialQrCode(value);
        if (!decodeQR.error) {
            let errorString = '';
            if (decodeQR.material !== material) {
                errorString = '原料不相符';
            }

            if (!errorString.length) {
                setCurrentFeedNum(currentFeedNum + 1);
                setBagWeight(decodeQR.weight);
                setFeedBatchNo(decodeQR.batchNo);
                setFeedLotNo(decodeQR.lotNo);
                setFeedBatchQA('');
                setBatchRemain(0);

                //半成品不需要檢查品檢結果
                if ('M' === qrcodeType) {
                    queryBatchDetail(decodeQR.material, decodeQR.lotNo, decodeQR.batchNo);
                }
            } else {
                toast.error(`領料異常，${errorString}`);
            }

        } else {
            toast.error('QR Code 讀取異常');
        }
    }

    //檢查品檢結果
    const queryBatchDetail = (material, lotNo, batchNo) => {
        setIsLoading(true);

        const apiUrl = Utils.generateApiUrl('/materialBatchDetail', [material, lotNo, batchNo]);
        axios.get(apiUrl, {
            ...Utils.pbtAxiosConfig,
        }).then(res => {
            if (!res.data.error) {
                console.log(res.data)
                setFeedBatchQA(res.data.qa);
                setFeedBatchFirstIn(res.data.firstIn);
                setBatchRemain(res.data.remain);
            } else {
                toast.error(`取得原料棧板資料失敗，${res.data.res}`);
            }
        }).catch(err => console.error(err))
            .finally(() => setIsLoading(false));
    }

    //QR Code全數掃碼成功後處理
    const finishBtn = () => {

        const callback = res => {
            if (res.isConfirmed) {
                setIsLoading(true);

                const apiUrl = Utils.generateApiUrl('/extrusion/powderFeeding');
                axios.post(apiUrl, {
                    line: line,
                    sequence: sequence,
                    material: material,
                    feedNum: currentFeedNum,
                    feedWeight: currentFeedNum * bagWeight,
                    feedLotNo: feedLotNo,
                    feedBatchNo: feedBatchNo,
                    semiNo: qrcodeType, //是否為半成品(半成品不需要檢查品檢)
                }, {
                    ...Utils.pbtAxiosConfig,
                }).then(res => {
                    if (!res.data.error) {
                        toast.success('入料成功');

                        setSwitchScanPage(false);
                        setQrcodeType('');
                        setMaterial('');
                        setFeedWeight(0);
                        setCurrentFeedNum(0);
                        setBagWeight(0);
                        setFeedLotNo('');
                        setFeedBatchNo('');
                        setFeedBatchQA('');
                        setFeedBatchFirstIn('');
                        setBatchRemain(0);

                        query();
                    } else {
                        toast.error(`入料失敗，${res.data.res}`);
                    }
                }).catch(err => console.error(err))
                    .finally(() => setIsLoading(false));
            }
        }

        if (0 < currentFeedNum) {
            Swal.fire({
                title: `確認入料${material}嗎？`,
                text: `包數${currentFeedNum}; 品檢${feedBatchQA}`,
                position: 'top',
                showCancelButton: true,
            }).then(callback).catch(error => {
                Swal.showValidationMessage(`Request failed: ${error}`);
            });
        } else {
            toast.error('領用包數異常!');
        }
    }

    //掃碼做頁表返回管制表處理
    const returnTableBtn = () => {
        setMaterial('');
        setFeedWeight(0);
        setCurrentFeedNum(0);
        setBagWeight(0);
        setFeedLotNo('');
        setFeedBatchNo('');
        setFeedBatchQA('');
        setFeedBatchFirstIn('');
        setBatchRemain(0);
        setQrcodeType('');
        setSwitchScanPage(false);
        query();
    }

    //入料機變更
    const changeFeederNo = () => {

        const callback = res => {
            if (res.isConfirmed) {
                setIsLoading(true);

                const apiUrl = Utils.generateApiUrl('/extrusion/changeFeederNo');
                axios.post(apiUrl, {
                    line: line,
                    sequence: sequence,
                    oldFeederNo: res.value.oldFeederNo,
                    newFeederNo: res.value.newFeederNo,
                    material: res.value.material,
                }, {
                    ...Utils.pbtAxiosConfig,
                }).then(res => {
                    if (!res.data.error) {
                        toast.success('入料機變更成功');
                        query();
                    } else {
                        toast.error(`入料機變更失敗，${res.data.res}`);
                    }
                }).catch(err => console.error(err))
                    .finally(() => setIsLoading(false));
            }
        }

        if ('尚未開始' === startTime) {
            Swal.fire({
                title: '入料機變更作業',
                html: `
                <div style="font-size: 18px">
                    <p>原入料機</p>
                    <input type="text" id="input-oldFeederNo" placeholder="例如:BM3" style="width: 80%; height: 30px" />
                    <p style="margin-top: 30px;">新入料機</p>
                    <input type="text" id="input-newFeederNo" placeholder="例如:BM6" style="width: 80%; height: 30px" />
                    <p style="margin-top: 30px;">原料簡碼(防呆用)</span></p>
                    <input type="text" id="input-material" placeholder="例如:35BA40" style="width: 80%; height: 30px;">
                </div>`,
                preConfirm: () => {
                    let data = {
                        oldFeederNo: document.getElementById('input-oldFeederNo') ? document.getElementById('input-oldFeederNo').value : '',
                        newFeederNo: document.getElementById('input-newFeederNo') ? document.getElementById('input-newFeederNo').value : '',
                        material: document.getElementById('input-material') ? document.getElementById('input-material').value : '',
                    };
                    return data;
                },
                position: 'top',
                showCancelButton: true,
            }).then(callback).catch(error => {
                Swal.showValidationMessage(`Request failed: ${error}`);
            });
        } else {
            toast.error('排程已啟動');
        }
    }

    //粉碎料頭太空袋、前料、包裝棧板掃碼
    const reworkScan = () => {

        const getReworkData = reworkOpno => {
            setIsLoading(true);

            const apiURL = Utils.generateApiUrl('/extrusion/reworkData', [reworkSource]);
            axios.post(apiURL, {
                opno: reworkOpno,
            }, {
                ...Utils.pbtAxiosConfig,
            }).then(res => {
                if (!res.data.error) {
                    setReworkOpno(reworkOpno);
                    setReworkRemainNum(res.data.totalNum - res.data.pickNum);
                    setReworkPickNum(res.data.pickNum);
                } else {
                    toast.error(`失敗，${res.data.res}`);
                }
            })
                .catch(err => console.error(err))
                .finally(() => setIsLoading(false));
        }

        if (feederNo && !rows.filter(x => (feederNo === x.FEEDER_NO && x.SEMI_NO)).length) {
            let timerInterval;
            Swal.fire({
                title: '請於10秒內掃描料頭/前料QR Code!',
                input: 'text',
                inputPlaceholder: 'QRCode',
                showConfirmButton: true,
                showCloseButton: true,
                timer: 10000,
                timerProgressBar: true,
                allowOutsideClick: false,
                willClose: () => {
                    clearInterval(timerInterval);
                }
            }).then((result) => {
                /* 時間到以後 */
                if (result.dismiss === Swal.DismissReason.timer) {
                    toast.error('已過期，請再掃碼一次');
                } else {
                    getReworkData(result.value);
                }
            }).catch(err => console.error('QRCode Error ', err));

        } else {
            toast.warn('請先掃碼入料機或入料機已使用');
        }
    }

    //重工入料確認
    const reworkBtn = () => {
        if (feederNo && !rows.filter(x => (feederNo === x.FEEDER_NO && x.SEMI_NO)).length) {
            setIsLoading(true);

            const apiURL = Utils.generateApiUrl('/extrusion/reworkFeeding');
            axios.post(apiURL, {
                line: line,
                sequence: sequence,
                reworkSource: reworkSource,
                feederNo: feederNo,
                reworkPickNum: reworkPickNum,
                opno: reworkOpno,
            }, {
                ...Utils.pbtAxiosConfig,
            }).then(res => {
                if (!res.data.error) {
                    toast.success('成功!');
                    setReworkOpno('');
                    setReworkRemainNum('');
                    setReworkPickNum('');
                    query();
                } else {
                    toast.error(`失敗，${res.data.res}`);
                }
            })
                .catch(err => console.error(err))
                .finally(() => setIsLoading(false));
        } else {
            toast.warn('請先掃碼入料機或入料機已使用');
        }
    }

    //殘包標籤掃碼，從一樓(包裝區，已出庫)交給二樓押出
    const remainBagScan = () => {

        const queryRemainBag = opno => {
            setIsLoading(true);

            const apiUrl = Utils.generateApiUrl('/remainingBag/getBagData');
            axios.post(apiUrl, {
                OPNO: opno,
            }, {
                ...Utils.pbtAxiosConfig,
            }).then(res => {
                if (!res.data.error && res.data.res.length) {
                    //console.log(res.data.res);
                    setRemainBagOpno(opno);
                    setRemainBagLotNo(res.data.res[0].LOT_NO);
                    setRemainBagWeight(res.data.res[0].WEIGHT);
                } else {
                    toast.error(`殘包查詢失敗，${res.data.res}`);
                }
            }).catch(err => console.error(err))
                .finally(() => setIsLoading(false));
        }

        let timerInterval;
        Swal.fire({
            title: '請於10秒內掃描殘包QR Code!',
            input: 'text',
            inputPlaceholder: 'QRCode',
            showCancelButton: true,
            showConfirmButton: false,
            timer: 10000,
            timerProgressBar: true,
            allowOutsideClick: false,
            willClose: () => {
                clearInterval(timerInterval);
            }
        }).then((result) => {
            if (Swal.DismissReason.timer === result.dismiss) {
                toast.error('已過期，請重新掃碼');
            } else {
                queryRemainBag(result.value);
            }
        }).catch(err => alert('QRCode Error ', err));
    }

    //殘包入料
    const remainBagFeed = type => {
        setIsLoading(true);

        const apiURL = Utils.generateApiUrl('/extrusion/remainBagFeeding');
        axios.post(apiURL, {
            line: line,
            sequence: sequence,
            opno: remainBagOpno,
            type: type,
        }, {
            ...Utils.pbtAxiosConfig,
        }).then(res => {
            if (!res.data.error) {
                toast.success('成功!');
                setRemainBagOpno('');
                setRemainBagLotNo('');
                setRemainBagWeight('');
            } else {
                toast.error(`失敗，${res.data.res}`);
            }
        }).catch(err => console.error(err))
            .finally(() => setIsLoading(false));
    }

    return (
        <div className="extrusion-scrap-page col-12 px-0">

            {(switchScanPage) ?
                <>
                    <div className="input-group input-group-sm mt-2">
                        <span className="input-group-text">入料機編號</span>
                        <input type="text" className="form-control form-control-inline align-baseline" value={feederNo} disabled />
                    </div>

                    <div className="input-group input-group-sm mt-2">
                        <span className="input-group-text">原料簡碼</span>
                        <input type="text" className="form-control form-control-inline align-baseline" value={material} disabled />
                    </div>

                    <div className="input-group input-group-sm mt-2">
                        <span className="input-group-text">已入料重量</span>
                        <input type="number" className="form-control form-control-inline align-baseline" value={feedWeight} disabled />
                    </div>

                    <div className="input-group input-group-sm mt-2">
                        <span className="input-group-text">棧板編號</span>
                        <input type="text" className="form-control form-control-inline align-baseline" value={feedBatchNo} disabled />

                        <button type="button" className="btn btn-warning" onClick={qrcodeBtn}><span className="icon bi-qr-code-scan" disabled={isLoading}></span> 棧板QRCode</button>
                    </div>

                    <div className="input-group input-group-sm mt-2">
                        <span className="input-group-text">Lot No</span>
                        <input type="text" className="form-control form-control-inline align-baseline" value={feedLotNo} disabled />
                    </div>

                    <div className="input-group input-group-sm mt-2">
                        <span className="input-group-text">品檢</span>
                        <input type="text" className={`form-control form-control-inline align-baseline ${('Y' !== feedBatchQA) && 'text-danger'}`} value={feedBatchQA} disabled />

                        <span className="input-group-text ms-2">最先進料</span>
                        <input type="text" className={`form-control form-control-inline align-baseline ${(!feedBatchFirstIn) && 'text-danger'}`} value={feedBatchFirstIn} disabled />
                    </div>

                    <div className="input-group input-group-sm mt-2">
                        <span className="input-group-text">棧板剩餘包數</span>
                        <input type="text" className="form-control form-control-inline align-baseline me-2" value={batchRemain} disabled />
                    </div>

                    <div className="input-group mt-2">
                        <span className="input-group-text">包裝別</span>
                        <input type="number" className="form-control form-control-inline align-baseline me-2" value={bagWeight} disabled />

                        <span className="input-group-text">入料包數</span>
                        <input type="number" className="form-control form-control-inline align-baseline" value={currentFeedNum} onChange={evt => setCurrentFeedNum(evt.target.value)} />
                    </div>

                    <div className="input-group input-group-sm mt-2">
                        <button type="button" className="btn btn-primary mt-2 me-2" onClick={finishBtn} disabled={0 === feedBatchNo.length || isLoading}><span className="icon bi-check2-circle"></span> 確認</button>
                        <button type="button" className="btn btn-outline-secondary mt-2" onClick={returnTableBtn} disabled={isLoading}><span className="icon bi-arrow-left-circle"></span> 返回</button>
                    </div>
                </>
                :
                <>
                    <div className="input-group input-group-sm mt-2">
                        <span className="input-group-text">人員身分</span>
                        <input type="text" className="form-control text-danger font-weight-bold" value={(isAdmin) ? '管理員' : '一般人員'} disabled />

                        {(isAdmin) &&
                            <button type="button" className="btn btn-outline-info" onClick={() => setAuditMode(!auditMode)} disabled={isLoading}><span className="icon bi-card-checklist"></span> {`切換至${auditMode ? '一般' : '查核'}模式`}</button>
                        }
                    </div>

                    <div className="input-group input-group-sm mt-2">
                        <span className="input-group-text">線別</span>
                        <select className="form-select me-2" value={line} onChange={evt => setLine(evt.target.value)} disabled={queryReadOnly} >
                            {generateFeederLine()}
                        </select>

                        <span className="input-group-text">序號</span>
                        <input type="number" className="form-control" value={sequence} onChange={evt => setSequence(evt.target.value)} disabled={queryReadOnly} />
                    </div>

                    <div className="input-group input-group-sm mt-2">
                        <span className="input-group-text">生產中工令</span>
                        <select className="form-select me-2" value={selOrder} onChange={onChangeOrders} disabled={queryReadOnly} >
                            {generateOrders()}
                        </select>
                    </div>

                    <button type="button" className="btn btn-primary mt-2 me-2" onClick={query} disabled={queryReadOnly || isLoading}><span className="icon bi-search"></span> 查詢</button>
                    <button type="button" className="btn btn-outline-secondary mt-2" onClick={() => setQueryReadOnly(false)} disabled={!queryReadOnly || isLoading}><span className="icon bi-arrow-counterclockwise"></span> 重新查詢</button>

                    <hr />

                    {(0 < rows.length) &&
                        <>
                            <div className="input-group input-group-sm mt-2">
                                <span className="input-group-text">SILO</span>
                                <input className="form-control form-control-inline align-baseline me-2" value={silo} disabled />

                                <span className="input-group-text">樹酯</span>
                                <input className={siloMaterial !== rows[0].MATERIAL ? "form-control form-control-inline align-baseline text-danger" : "form-control form-control-inline align-baseline"} value={siloMaterial} disabled />
                            </div>

                            <div className="input-group input-group-sm mt-2">
                                <span className="input-group-text">重工來源</span>
                                <select className="form-select" value={reworkSource} onChange={evt => setReworkSource(evt.target.value)} >
                                    <option value="">---</option>
                                    <option value="scrap" disabled>料頭</option>
                                    <option value="head">前料</option>
                                    <option value="return">不合格/呆滯料</option>
                                    <option value="remainBag">殘包</option>
                                </select>

                                <button type="button" className={`btn btn-outline-success ${'remainBag' === reworkSource && 'd-none'}`} onClick={reworkScan} disabled={isLoading || !checked || !reworkSource.length}><span className="icon bi-qr-code-scan"></span> 重工掃碼</button>
                                <button type="button" className={`btn btn-outline-success ${'remainBag' !== reworkSource && 'd-none'}`} onClick={remainBagScan} disabled={isLoading || !checked}><span className="icon bi-qr-code-scan"></span> 殘包掃碼</button>
                            </div>

                            <div className={`input-group input-group-sm mt-2 ${('return' !== reworkSource && 'head' !== reworkSource) && 'd-none'}`}>
                                <span className="input-group-text">標籤編號</span>
                                <input type="text" className="form-control form-control-inline" value={reworkOpno} disabled />
                            </div>

                            <div className={`input-group input-group-sm mt-2 ${('return' !== reworkSource && 'head' !== reworkSource) && 'd-none'}`}>
                                <span className="input-group-text">剩餘包數(規劃)</span>
                                <input type="number" className="form-control form-control-inline" value={reworkRemainNum} disabled />

                                <span className="input-group-text">重工包數</span>
                                <input type="number" className="form-control form-control-inline" value={reworkPickNum} onChange={evt => setReworkPickNum(evt.target.value)} />

                                <button type="button" className="btn btn-outline-success" onClick={reworkBtn} disabled={isLoading || !checked || !reworkSource.length || reworkRemainNum < reworkPickNum || 1 > reworkPickNum}><span className="icon bi-arrow-return-left"></span> 重工入料</button>
                            </div>

                            <div className={`input-group input-group-sm mt-2 ${'remainBag' !== reworkSource && 'd-none'}`}>
                                <span className="input-group-text">殘包編號</span>
                                <input className="form-control form-control-inline align-baseline" value={remainBagOpno} disabled />

                                <span className="input-group-text">批號</span>
                                <input className="form-control form-control-inline align-baseline" value={remainBagLotNo} disabled />
                            </div>

                            <div className={`input-group input-group-sm mt-2 ${'remainBag' !== reworkSource && 'd-none'}`}>
                                <span className="input-group-text">殘包重量</span>
                                <input className="form-control form-control-inline align-baseline" value={remainBagWeight} disabled />

                                <button type="button" className="btn btn-outline-success" onClick={() => remainBagFeed('pick')} disabled={isLoading || !checked || !remainBagLotNo || !remainBagWeight}><span className="icon bi-arrow-return-left"></span> 回摻</button>
                                <button type="button" className="btn btn-outline-success" onClick={() => remainBagFeed('rework')} disabled={isLoading || !checked || !remainBagLotNo || !remainBagWeight}><span className="icon bi-arrow-return-left"></span> 重工</button>
                            </div>

                            <div className="input-group input-group-sm mt-2">
                                <span className="input-group-text">入料機編號</span>
                                <input type="text" className="form-control form-control-inline align-baseline" value={feederNo} disabled />

                                <button type="button" className="btn btn-success" onClick={feederBtn} disabled={isLoading}><span className="icon bi-qr-code-scan"></span> 機台掃碼</button>
                            </div>

                            <button type="button" className="btn btn-sm btn-info mt-2" onClick={changeFeederNo} disabled={isLoading || !checked || !isAdmin}><span className="icon bi-arrow-repeat"></span> 入料機變更</button>
                            <div className="badge rounded-pill text-bg-warning ms-2">M1、半成品、已入料、主排程已啟動不可換</div>

                            <div className="extrusion-feeding-table mt-2">
                                <HotTable
                                    licenseKey="non-commercial-and-evaluation"
                                    data={rows}
                                    columns={columns}
                                    colHeaders={colHeader}
                                    rowHeaders={false}
                                    rowHeights={40}
                                    cells={(row, col) => readOnlyRowControll(row, col)}
                                    hiddenColumns={{ columns: (auditMode) ? [2, 6, 7, 9] : [4, 5] }}
                                />
                            </div>

                            <div className="input-group input-group-sm mt-2">
                                <span className="input-group-text">建立時間</span>
                                <input type="text" className="form-control" value={createTime} disabled />
                                <button type="button" className="btn btn-outline-success" onClick={createExtrusion} disabled={checked || 0 === rows.length || isLoading}><span className="icon bi-save"></span> 建立</button>
                                <button type="button" className="btn btn-outline-success me-2" onClick={updateExtrusion} disabled={!checked || 0 === rows.length || isLoading}><span className="icon bi-save"></span> 更新</button>
                                <button type="button" className="btn btn-outline-danger" onClick={removeExtrusion} disabled={!checked || 0 === rows.length || isLoading}><span className="icon bi-x-circle"></span> 刪除</button>
                            </div>

                            <div className="input-group input-group-sm mt-2">
                                <span className="input-group-text">建立人員</span>
                                <input type="text" className="form-control" value={creator} disabled />
                            </div>

                            <div className="input-group input-group-sm mt-2">
                                <span className="input-group-text">啟動時間</span>
                                <input type="text" className="form-control" value={startTime} disabled />
                            </div>

                            <div className="input-group input-group-sm mt-2">
                                <span className="input-group-text">結束時間</span>
                                <input type="text" className="form-control" value={endTime} disabled />
                            </div>
                        </>
                    }

                    <MaterialQA />

                    {(isAdmin) &&
                        <div className="accordion mt-2" id="accordionPrint">
                            <div className="accordion-item">
                                <h2 className="accordion-header" id="headingOne">
                                    <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseOne" aria-expanded="true" aria-controls="collapseOne">
                                        入料機標籤列印
                                    </button>
                                </h2>
                                <div id="collapseOne" className="accordion-collapse collapse" aria-labelledby="headingOne" data-bs-parent="#accordionPrint">
                                    <div className="accordion-body">
                                        <div className="input-group input-group-sm mb-1">
                                            <span className="input-group-text">標籤機</span>
                                            <select className="form-select" value={selPrinter} onChange={evt => setSelPrinter(evt.target.value)}>
                                                <option>---請選擇---</option>
                                                {generatePrinter()}
                                            </select>
                                        </div>

                                        <div className="input-group input-group-sm mb-1">
                                            <span className="input-group-text">線別</span>
                                            <select className="form-select" value={selFeederLine} onChange={onChangeSelFeederLine}>
                                                <option>---請選擇---</option>
                                                {generateFeederLine()}
                                            </select>

                                            <span className="input-group-text">入料機</span>
                                            <select className="form-select" value={selFeeder} onChange={evt => setSelFeeder(evt.target.value)}>
                                                <option>---請選擇---</option>
                                                {generateFeeder()}
                                            </select>
                                            <button type="button" className="btn btn-warning" onClick={printFeeder} disabled={isLoading}><span className="icon bi-printer"></span> 列印</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    }
                </>
            }
        </div >
    );
}

export default ExtrusionFeeding;
