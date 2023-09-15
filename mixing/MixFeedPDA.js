import React, { useState, useEffect } from 'react';
import './MixingPDA.css'
import axios from 'axios';
import { HotTable } from '@handsontable/react';
import Handsontable from 'handsontable';
import { registerAllCellTypes } from 'handsontable/cellTypes';
import moment from 'moment';
import Utils from '../Utils';
import Swal from 'sweetalert2';
import { toast } from 'react-toastify';

function MixFeedPDA() {

    registerAllCellTypes();

    const [date, setDate] = useState(moment(new Date()).format('YYYY-MM-DD')); //領料日期
    const [workShift, setWorkShift] = useState('早'); //領料班別
    const [queryReadOnly, setQueryReadOnly] = useState(false); //鎖定搜尋列

    const [productList, setProductList] = useState([]); //當日班別搜尋到的所有工令
    const [completeList, setCompleteList] = useState([]); //完成的工令
    const [feedDate, setFeedDate] = useState(''); //要掃碼傳送的入廖日期
    const [feedShift, setFeedShift] = useState(''); //要掃碼傳送的班別
    const [productDetailArray, setProductDetailArray] = useState([]); //工令對應的詳細資料
    const [currentProduct, setCurrentProduct] = useState(''); //現在分頁顯示的半成品
    const [currentLine, setCurrentLine] = useState(''); //現在分頁顯示的線別
    const [currentSeq, setCurrentSeq] = useState(''); //現在分頁顯示的序號
    const [currentBatch, setCurrentBatch] = useState(''); //現在分頁顯示的起訖

    const [checkStock, setCheckStock] = useState(false); //備料確認
    const [mixer, setMixer] = useState(''); //機台
    const [checkMixer, setCheckMixer] = useState(false); //機台確認

    const [rows, setRows] = useState([]);
    const [feedFinished, setFeedFinished] = useState(false); //是否全數入料完成

    const columns = [
        { data: 'MATERIAL', type: 'text', width: 80, className: 'align-middle' },
        { data: 'WEIGHT', type: 'text', width: 50, className: 'align-middle' },
        { data: 'UNIT', type: 'text', width: 25, className: 'align-middle' },
        {
            data: 'FEED_BTN',
            width: 40,
            renderer: function (instance, td, row, col, prop, value, cellProperties) {
                const icon = document.createElement('SPAN');
                icon.className = "icon bi-camera-fill";

                const btn = document.createElement('FEED_BTN');
                btn.className = 'btn btn-outline-success btn-lg px-1 py-0 nowrap align-top';
                btn.appendChild(icon);
                if (!queryReadOnly || !checkStock || value) {
                    btn.className += ' disabled';
                }

                Handsontable.dom.addEvent(btn, 'click', () => {
                    //僅在鎖定查詢列時才能入料
                    if (queryReadOnly || checkStock || !value) {
                        feedingBtn(row);
                    }
                });

                const div = document.createElement('DIV');
                div.appendChild(btn);

                Handsontable.dom.empty(td);
                td.appendChild(div);
                td.classList.add('htCenter');
                td.classList.add('align-middle');
            },
        },
        { data: 'FEED_STATUS', type: 'checkbox', width: 40, className: 'htCenter align-middle' },
        { data: 'FEED_DATE', type: 'text', width: 160, className: 'align-middle' },
    ];
    const colHeader = ['原料<br>簡碼', '重量', '單<br>位', '入料', '入料<br>狀況', '入料<br>時間'];

    useEffect(() => {
        //切換(線別序號批數 + 半成品)分頁時，調整表格內容
        if (currentProduct) {
            let appendArray = [];
            let foundProduct = false;
            productDetailArray.forEach(element => {
                if (currentProduct === element.UKEY) {
                    appendArray.push(element);

                    if (!foundProduct) {
                        setCurrentLine(element.LINE);
                        setCurrentSeq(element.SEQUENCE);
                        setCurrentBatch(element.BATCH_SEQ);
                        setMixer(element.MIXER);
                        setCheckStock(element.STOCK_STATUS);
                        setCheckMixer(false);
                        foundProduct = true;
                    }
                }
            });
            setFeedFinished(appendArray.filter(x => (true === x.FEED_STATUS)).length === appendArray.length); //全數入料完畢
            setRows(appendArray);
        } else {
            setCurrentLine('');
            setCurrentSeq('');
            setCurrentBatch('');
            setMixer('');
            setCheckStock(false);
            setFeedFinished(false);
            setRows([]);
        }

    }, [currentProduct, productDetailArray])

    const query = () => {
        setCurrentLine('');
        setCurrentSeq('');
        setCurrentBatch('');
        setMixer('');
        setCheckStock(false);
        setFeedFinished(false);
        setRows([]);

        const apiUrl = Utils.generateApiUrl('/mixing/feedStatus', [date, workShift]);
        //const apiUrl = Utils.generateApiUrl('/feedStatus', [date, workShift, line, sequence, batch]);
        axios.get(apiUrl, {
            ...Utils.pbtAxiosConfig,
        }).then(res => {
            console.log(res.data)
            if (res.data.detail.length && res.data.orders.length) {
                let productDetailArray = [];
                res.data.detail.forEach(element => {
                    let weights = Utils.getMaterialPrecision(element.BATCH_WEIGHT, element.RATIO, 1);

                    productDetailArray.push({
                        UKEY: element.LINE + element.SEQUENCE + '-' + element.BATCH_SEQ + '/' + element.SEMI_NO + element.PRD_PC, //為了勾稽分頁的唯一值
                        LINE: element.LINE,
                        SEQUENCE: element.SEQUENCE,
                        BATCH_SEQ: element.BATCH_SEQ,
                        MATERIAL: element.MATERIAL,
                        WEIGHT: weights.batchWeight,
                        UNIT: (0.01 > weights.totalWeight) ? 'g' : 'kg',
                        FEED_BTN: (1 === element.FEED_STATUS) ? true : false,
                        FEED_STATUS: (1 === element.FEED_STATUS) ? true : false,
                        FEED_DATE: (element.FEED_DATE) ? moment(element.FEED_DATE).format('YYYY-MM-DD HH:mm:ss') : '尚未入料',
                        MIXER: element.MIXER,
                        STOCK_STATUS: element.STOCK_STATUS,
                    });
                });

                setProductList(res.data.orders.filter(x => 1 !== x.FEED_STATUS).map(x => x.LINE + x.SEQUENCE + '-' + x.BATCH_SEQ + '/' + x.SEMI_NO + x.PRD_PC));
                setCompleteList(res.data.orders.filter(x => 1 === x.FEED_STATUS).map(x => x.LINE + x.SEQUENCE + '-' + x.BATCH_SEQ + '/' + x.SEMI_NO + x.PRD_PC));
                setProductDetailArray(productDetailArray);
                setQueryReadOnly(true);
                setFeedDate(date);
                setFeedShift(workShift);
            } else {
                toast.error('無找到工令，請再確認');
            }
        }).catch(err => {
            console.error(err);
            toast.error('查詢異常');
        });
    }

    //掃碼以後代表入料完成
    const feedingBtn = row => {
        if (checkMixer) {
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
                    qrcodeFeeding(row, result.value);
                }
            }).catch(err => alert('QRCode Error ', err));
        } else {
            toast.warn('請先掃拌粉機QR Code');
        }
    }

    //掃QR Code後，進行入料
    const qrcodeFeeding = (row, value) => {
        //範例: 配料日期;班別;拌粉工令LOT_NO;原料簡碼;單批總淨重
        let decodeQR = value.split(';');

        //切換掃碼班別格式
        let workShiftConvert = '';
        switch (workShift) {
            case '早':
                workShiftConvert = 'A';
                break;
            case '中':
                workShiftConvert = 'B';
                break;
            case '晚':
                workShiftConvert = 'C';
                break;
            default:
                break;
        }

        let errorString = '';
        if (decodeQR[0] !== moment(date).format('YYYY/MM/DD')) {
            errorString = '日期不相符';
        } else if (decodeQR[1] !== workShiftConvert) {
            errorString = '班別不相符';
        } else if (decodeQR[2] !== currentLine + currentSeq + '-' + currentBatch) {
            errorString = '工令不相符';
        } else if (decodeQR[3] !== rows[row].MATERIAL) {
            errorString = '原料不相符';
        }

        if (!errorString.length) {
            const apiUrl = Utils.generateApiUrl('/mixing/pdaFeeding', ['powder']);
            axios.post(apiUrl, {
                feedDate: feedDate,
                feedShift: feedShift,
                line: currentLine,
                sequence: currentSeq,
                material: rows[row].MATERIAL,
                batch: currentBatch,
            }, {
                ...Utils.pbtAxiosConfig,
            }).then(res => {
                if (!res.data.error) {
                    toast.success('入料成功');
                    query();
                } else {
                    toast.error(`入料失敗，${res.data.res}`);
                }
            }).catch(err => console.error(err));
        } else {
            toast.error(`入料異常，${errorString}`);
        }
    }

    //掃描拌粉原料棧板QR Code
    const palletQrcodeFeeding = () => {

        const callback = res => {
            if (res.isConfirmed) {
                //範例: 配料日期;班別;拌粉工令LOT_NO;JSON[原料簡碼];單批總淨重
                let decodeQR = res.value.split(';');

                //切換掃碼班別格式
                let workShiftConvert = '';
                switch (workShift) {
                    case '早':
                        workShiftConvert = 'A';
                        break;
                    case '中':
                        workShiftConvert = 'B';
                        break;
                    case '晚':
                        workShiftConvert = 'C';
                        break;
                    default:
                        break;
                }

                let errorString = '';
                if (decodeQR[0] !== moment(date).format('YYYY/MM/DD')) {
                    errorString = '日期不相符';
                } else if (decodeQR[1] !== workShiftConvert) {
                    errorString = '班別不相符';
                } else if (decodeQR[2] !== currentLine + currentSeq + '-' + currentBatch) {
                    errorString = '工令不相符';
                }

                if (!errorString.length) {
                    const apiUrl = Utils.generateApiUrl('/mixing/pdaFeeding', ['pallet']);
                    axios.post(apiUrl, {
                        feedDate: feedDate,
                        feedShift: feedShift,
                        line: currentLine,
                        sequence: currentSeq,
                        batch: currentBatch,
                        qr: res.value,
                    }, {
                        ...Utils.pbtAxiosConfig,
                    }).then(res => {
                        if (!res.data.error) {
                            toast.success('入料成功');
                            query();
                        } else {
                            toast.error(`入料失敗，${res.data.res}`);
                        }
                    }).catch(err => console.error(err));
                } else {
                    toast.error(`入料異常，${errorString}`);
                }
            }
        }

        if (checkMixer && checkStock) {
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
                    callback(result);
                }
            }).catch(err => alert('QRCode Error ', err));
        } else {
            toast.warn('請先掃拌粉機QR Code或備料尚未確認');
        }
    }

    //掃描拌粉機台辨識是否相符
    const mixerBtn = () => {
        let timerInterval;
        Swal.fire({
            title: '請於10秒內掃描拌粉機台QR Code!',
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
                (mixer === result.value) ? setCheckMixer(true) : setCheckMixer(false);
            }
        }).catch(err => alert('QRCode Error ', err))
    }

    //生成半成品分頁的選項
    const generateProductList = type => {
        let div = [];
        const list = type ? completeList : productList;
        list.forEach((element, index) => {
            div.push(
                <option key={index} value={element}>{element}</option>
            );
        });
        return div;
    }

    const checkMixerAlarm = () => {
        if (feedFinished) {
            return '入料完成';
        } else if (checkMixer) {
            return '符合'
        } else {
            return '不符合';
        }
    }

    return (
        <div className="mix-pda-page px-0">
            <div className="input-group input-group-sm mt-2">
                <span className="input-group-text">日期</span>
                <input type="date" className="form-control" value={date} onChange={evt => setDate(evt.target.value)} disabled={queryReadOnly} />
            </div>

            <div className="input-group input-group-sm mt-2">
                <span className="input-group-text">班別</span>
                <select className="form-select" value={workShift} onChange={evt => setWorkShift(evt.target.value)} disabled={queryReadOnly}>
                    <option value="早">早</option>
                    <option value="中">中</option>
                    <option value="晚">晚</option>
                </select>
            </div>

            <button type="button" className="btn btn-primary mt-2 me-2" onClick={query} disabled={queryReadOnly}><span className="icon bi-search"></span> 查詢</button>
            <button type="button" className="btn btn-outline-secondary mt-2" onClick={() => setQueryReadOnly(false)} disabled={!queryReadOnly}><span className="icon bi-arrow-counterclockwise"></span> 重新查詢</button>

            <hr />

            {(0 < productList.length || 0 < completeList.length) &&
                <>
                    <div className="input-group input-group-sm mt-2">
                        <span className="input-group-text">未完成</span>
                        <select className="form-select" value={currentProduct} onChange={evt => setCurrentProduct(evt.target.value)}>
                            <option value="">---請選擇---</option>
                            {generateProductList(false)}
                        </select>
                    </div>

                    <div className="input-group input-group-sm mt-2">
                        <span className="input-group-text">已完成</span>
                        <select className="form-select" value={currentProduct} onChange={evt => setCurrentProduct(evt.target.value)}>
                            <option value="">---請選擇---</option>
                            {generateProductList(true)}
                        </select>
                    </div>

                    <div className="input-group input-group-sm mt-2">
                        <span className="input-group-text">線別</span>
                        <input type="text" className="form-control me-2" value={currentLine} disabled />

                        <span className="input-group-text">序號</span>
                        <input type="number" className="form-control" value={currentSeq} disabled />
                    </div>

                    <div className="input-group input-group-sm mt-2">
                        <span className="input-group-text">批量</span>
                        <input type="number" className="form-control me-2" value={currentBatch} disabled />
                        <span className="input-group-text">備料確認</span>
                        <input type="text" className={(!checkStock) ? "form-control text-danger" : "form-control"} value={(checkStock) ? '正確' : '未確認'} disabled />
                    </div>

                    <div className="input-group input-group-sm mt-2">
                        <span className="input-group-text">機台</span>
                        <input type="text" className="form-control" value={mixer} disabled />
                        <input type="text" className={(checkMixer || feedFinished) ? "form-control" : "form-control text-danger"} value={checkMixerAlarm()} disabled />

                        <button type="button" className="btn btn-success" onClick={mixerBtn}><span className="icon bi-qr-code-scan"></span> 機台掃碼</button>
                    </div>
                </>
            }

            {(0 < rows.length) &&
                <>
                    <div className="mixing-stock-table mt-2">
                        <HotTable
                            licenseKey="non-commercial-and-evaluation"
                            data={rows}
                            columns={columns}
                            colHeaders={colHeader}
                            rowHeaders={true}
                            rowHeaderWidth={20}
                            rowHeights={50}
                            readOnly={true}
                        />
                    </div>

                    <button type="button" className="btn btn-warning mt-2 me-2" onClick={palletQrcodeFeeding} disabled={feedFinished}><span className="icon bi-qr-code-scan"></span> 棧板QRCode</button>
                    {/* 
                    <button type="button" className="btn btn-primary mt-2" onClick={() => alert('開發中，寄信給相關人員')} disabled={!feedFinished}><span className="icon bi-check2-circle"></span> 入料完成寄信</button>
                    */}
                </>
            }
        </div >
    );
}

export default MixFeedPDA;
