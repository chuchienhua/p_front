import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import './MixingPDA.css';
import axios from 'axios';
import { HotTable } from '@handsontable/react';
import Handsontable from 'handsontable';
import { registerAllCellTypes } from 'handsontable/cellTypes';
import moment from 'moment';
import Utils from '../Utils';
import Swal from 'sweetalert2';
import { toast } from 'react-toastify';
import MaterialQA from '../MaterialQA';

function MixPickAndFeed(props) {

    let auditProductList = props.auditProductList || []; //稽核用產品簡碼

    const firm = useSelector(state => state.firm);

    registerAllCellTypes();

    const [isLoading, setIsLoading] = useState(false);

    const [date, setDate] = useState(moment('2023-05-08').format('YYYY-MM-DD')); //領料日期
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

    const [mixer, setMixer] = useState(''); //機台
    const [checkMixer, setCheckMixer] = useState(false); //機台確認

    //領料介面
    const [switchScanPage, setSwitchScanPage] = useState(false);
    const [material, setMaterial] = useState('');
    const [needWeight, setNeedWeight] = useState(0);
    const [remainderPickWeight, setRemainderPickWeight] = useState(0);
    const [pickNum, setPickNum] = useState(0);
    const [lotNo, setLotNo] = useState([]); //棧板Lot No
    const [batchNo, setBatchNo] = useState([]); //棧板編號
    const [bagWeight, setBagWeight] = useState(0); //棧板包裝別
    const [batchQA, setBatchQA] = useState(''); //棧板品檢結果
    const [batchFirstIn, setBatchFirstIn] = useState(''); //棧板是否為最先進料
    const [batchRemain, setBatchRemain] = useState(0); //棧板剩餘包數

    const [feedFinished, setFeedFinished] = useState(false); //是否全數入料完成

    const [rows, setRows] = useState([]);
    const columns = [
        { data: 'MATERIAL', type: 'text', width: 80, readOnly: true, className: 'align-middle' },
        { data: 'FEED_WEIGHT', type: 'text', width: 50, readOnly: true, className: 'align-middle' },
        { data: 'NEED_WEIGHT', type: 'text', width: 50, readOnly: true, className: 'align-middle' },
        { data: 'REMAIN_WEIGHT', type: 'text', width: 50, readOnly: true, className: 'align-middle' },
        { data: 'REMAIN_PICK', type: 'checkbox', width: 40, className: 'align-middle' },
        { data: 'UNIT', type: 'text', width: 25, readOnly: true, className: 'align-middle' },
        {
            data: 'FEED_BTN',
            width: 40,
            readOnly: true,
            renderer: function (instance, td, row, col, prop, value, cellProperties) {
                const icon = document.createElement('SPAN');
                icon.className = "icon bi-camera-fill";

                const btn = document.createElement('FEED_BTN');
                btn.className = 'btn btn-outline-success btn-lg px-1 py-0 nowrap align-top';
                btn.appendChild(icon);
                if (!queryReadOnly || value) {
                    btn.className += ' disabled';
                }

                Handsontable.dom.addEvent(btn, 'click', () => {
                    //僅在鎖定查詢列時才能入料
                    if ((queryReadOnly || !value) && checkMixer) {
                        feedBtn(row);
                    } else {
                        toast.warn('請確認當下並非重新查詢，並以檢查拌粉機台');
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
        { data: 'FEED_STATUS', type: 'checkbox', width: 40, readOnly: true, className: 'htCenter align-middle' },
        { data: 'FEED_DATE', type: 'text', width: 160, readOnly: true, className: 'align-middle' },
    ];
    const colHeader = ['原料<br>簡碼', '已入<br>重量', '需求<br>重量', '餘料<br>重量', '餘料<br>領料', '單<br>位', '入料', '入料<br>狀況', '入料<br>時間'];

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
            setFeedFinished(false);
            setRows([]);
        }

    }, [currentProduct, productDetailArray])

    const feedBtn = row => {
        setMaterial(rows[row].MATERIAL);
        setLotNo('');
        setBatchNo('');
        setBagWeight(0);
        setPickNum(0);
        setBatchQA('');
        setBatchFirstIn('');
        setBatchRemain(0);

        //棧板需領料算法 = 需求總重 - 檢查是否要領餘料量 - 已領
        if (rows[row].REMAIN_PICK) {
            if (rows[row].REMAIN_WEIGHT >= (rows[row].NEED_WEIGHT - rows[row].FEED_WEIGHT)) {
                setNeedWeight(0);
                setRemainderPickWeight(rows[row].NEED_WEIGHT - rows[row].FEED_WEIGHT);
                setLotNo('餘料');
                setBatchNo('');
            } else {
                setNeedWeight(rows[row].NEED_WEIGHT - rows[row].REMAIN_WEIGHT - rows[row].FEED_WEIGHT);
                setRemainderPickWeight(rows[row].REMAIN_WEIGHT);
            }
        } else {
            setNeedWeight(rows[row].NEED_WEIGHT - rows[row].FEED_WEIGHT);
            setRemainderPickWeight(0);
        }
        setSwitchScanPage(true);
    }

    const query = () => {
        setIsLoading(true);

        const apiUrl = Utils.generateApiUrl('/mixing/mixWorkStatus', [date, workShift]);
        axios.get(apiUrl, {
            ...Utils.pbtAxiosConfig,
        }).then(res => {
            //console.log(res.data)
            if (res.data.detail.length && res.data.orders.length) {
                let productDetailArray = [];
                res.data.detail.forEach(element => {
                    //高雄廠僅允許稽核品使用該功能
                    if ('A' === firm || auditProductList.includes(element.PRD_PC)) {
                        let weights = Utils.getMaterialPrecision(element.NEED_WEIGHT, element.RATIO, 1);

                        productDetailArray.push({
                            UKEY: element.LINE + element.SEQUENCE + '-' + element.BATCH_SEQ + '/' + element.SEMI_NO + element.PRD_PC, //為了勾稽分頁的唯一值
                            LINE: element.LINE,
                            SEQUENCE: element.SEQUENCE,
                            BATCH_SEQ: element.BATCH_SEQ,
                            MATERIAL: element.MATERIAL,
                            FEED_WEIGHT: element.FEED_WEIGHT,
                            NEED_WEIGHT: weights.batchWeight,
                            REMAIN_WEIGHT: element.REMAIN_WEIGHT,
                            UNIT: (0.01 > weights.totalWeight) ? 'g' : 'kg',
                            FEED_BTN: (1 === element.FEED_STATUS) ? true : false,
                            FEED_STATUS: (1 === element.FEED_STATUS) ? true : false,
                            FEED_DATE: (element.FEED_DATE) ? moment(element.FEED_DATE).format('YYYY-MM-DD HH:mm:ss') : '尚未入料',
                            MIXER: element.MIXER,
                            STOCK_STATUS: element.STOCK_STATUS,
                        });
                    }
                });

                setProductList(res.data.orders.filter(x => 1 !== x.FEED_STATUS).map(x => x.LINE + x.SEQUENCE + '-' + x.BATCH_SEQ + '/' + x.SEMI_NO + x.PRD_PC));
                setCompleteList(res.data.orders.filter(x => 1 === x.FEED_STATUS).map(x => x.LINE + x.SEQUENCE + '-' + x.BATCH_SEQ + '/' + x.SEMI_NO + x.PRD_PC));
                setProductDetailArray(productDetailArray);
                setQueryReadOnly(true);
                setFeedDate(date);
                setFeedShift(workShift);
            } else {
                toast.warn('無找到工令，請再確認');
            }
        }).catch(err => console.error(err))
            .finally(() => setIsLoading(false));
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
                //餘料掃碼只需檢查成品簡碼
                if (!needWeight && remainderPickWeight) {
                    if (material === result.value) {
                        setBatchNo('餘料');
                    } else {
                        toast.error('餘料掃碼原料不符');
                    }

                } else {
                    //一般棧板掃碼
                    const decodeQR = Utils.decodeMaterialQrCode(result.value);
                    if (!decodeQR.error) {
                        let errorString = '';
                        if (decodeQR.material !== material) {
                            errorString = '原料不相符';
                        }

                        if (!errorString.length) {
                            setBagWeight(decodeQR.weight);
                            setPickNum(checkIsAuditProduct ? 1 : Math.ceil(needWeight / decodeQR.weight)); //稽核產品只能一包一包掃
                            setBatchNo(decodeQR.batchNo);
                            setLotNo(decodeQR.lotNo);
                            setBatchQA('');
                            setBatchFirstIn('');
                            setBatchRemain(0);
                            queryBatchDetail(decodeQR.material, decodeQR.lotNo, decodeQR.batchNo);
                        } else {
                            toast.error(errorString);
                        }

                    } else {
                        toast.error('QR Code 讀取異常');
                    }
                }
            }
        }).catch(err => alert('QRCode Error ', err));
    }

    //掃描棧板後顯示相關資料
    const queryBatchDetail = (material, lotNo, batchNo) => {
        setIsLoading(true);

        const apiUrl = Utils.generateApiUrl('/materialBatchDetail', [material, lotNo, batchNo]);
        axios.get(apiUrl, {
            ...Utils.pbtAxiosConfig,
        }).then(res => {
            if (!res.data.error) {
                setBatchQA(res.data.qa);
                setBatchFirstIn(res.data.firstIn);
                setBatchRemain(res.data.remain);
            } else {
                toast.error(`取得原料棧板資料失敗，${res.data.res}`);
            }
        }).catch(err => console.error(err))
            .finally(() => setIsLoading(false));
    }

    //確認按鍵
    const finishBtn = () => {
        const callback = res => {
            if (res.isConfirmed) {
                setIsLoading(true);

                const apiUrl = Utils.generateApiUrl('/mixing/pickAndFeed');
                axios.post(apiUrl, {
                    feedDate: feedDate,
                    feedShift: feedShift,
                    line: currentLine,
                    sequence: currentSeq,
                    batch: currentBatch,
                    semiNo: currentProduct.split('/')[1][0], //E1365/P3030104XB
                    material: material,
                    pickLotNo: lotNo,
                    pickBatchNo: batchNo,
                    bagPickWeight: pickNum * bagWeight,
                    bagPickNum: pickNum,
                    remainderPickWeight: remainderPickWeight,
                    totalNeedWeight: needWeight + remainderPickWeight,
                }, {
                    ...Utils.pbtAxiosConfig,
                }).then(res => {
                    if (!res.data.error) {
                        toast.success('領料成功');
                        setSwitchScanPage(false);
                        query();
                    } else {
                        toast.error(`領料失敗，${res.data.res}`);
                    }
                }).catch(err => console.error(err))
                    .finally(() => setIsLoading(false));;
            }
        }

        let errorString = '';
        //是否只需要使用餘料即可
        if (0 !== needWeight) {
            if (!batchNo.length) {
                errorString = '請先掃棧板QR Code碼';
            } else if (!Number.isInteger(Number(pickNum)) || 0 >= Number(pickNum)) {
                errorString = '領用包數僅能輸入正整數';
            } else if (needWeight <= (bagWeight * (pickNum - 1))) {
                errorString = '領用包數過多';
            }
        }

        if (0 === errorString.length) {
            Swal.fire({
                title: `確認備料${material}嗎？`,
                text: `包數${pickNum}; 品檢${batchQA}`,
                position: 'top',
                showCancelButton: true,
            }).then(callback).catch(error => {
                Swal.showValidationMessage(`Request failed: ${error}`);
            });
        } else {
            toast.error(errorString);
        }
    }

    //掃碼做頁表返回查詢頁面
    const returnBtn = () => {
        setMaterial('');
        setNeedWeight(0);
        setLotNo('');
        setBatchNo('');
        setBagWeight(0);
        setPickNum(0);
        setBatchQA('');
        setBatchFirstIn('');
        setBatchRemain(0);
        setSwitchScanPage(false);
        query();
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
        }).catch(err => alert('QRCode Error ', err));
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

    //檢查是否為稽核產品
    const checkIsAuditProduct = () => auditProductList.includes(currentProduct.split('/')[1].substring(1));

    return (
        <div className="mix-pick-and-feed-page px-0">{(switchScanPage) ?
            <>
                <div className="input-group mt-2">
                    <span className="input-group-text">原料簡碼</span>
                    <input type="text" className="form-control form-control-inline align-baseline" value={material} disabled />
                </div>

                <div className="input-group input-group-sm mt-2">
                    <span className="input-group-text">餘料領料</span>
                    <input type="number" className="form-control form-control-inline align-baseline me-2" value={remainderPickWeight} disabled />

                    <span className="input-group-text">棧板需領料</span>
                    <input type="number" className="form-control form-control-inline align-baseline" value={needWeight} disabled />
                </div>

                <div className="input-group input-group-sm mt-2">
                    <span className="input-group-text">棧板編號</span>
                    <input type="text" className="form-control form-control-inline align-baseline" value={batchNo} disabled />

                    <button type="button" className="btn btn-warning" onClick={qrcodeBtn}><span className="icon bi-qr-code-scan"></span> QRCode</button>
                </div>

                <div className="input-group input-group-sm mt-2">
                    <span className="input-group-text">Lot No</span>
                    <input type="text" className="form-control form-control-inline align-baseline" value={lotNo} disabled />
                </div>

                <div className="input-group input-group-sm mt-2">
                    <span className="input-group-text">品檢</span>
                    <input type="text" className={`form-control form-control-inline align-baseline me-2 ${('Y' !== batchQA) && 'text-danger'}`} value={batchQA} disabled />

                    <span className="input-group-text">最先進料</span>
                    <input type="text" className={`form-control form-control-inline align-baseline ${!batchFirstIn && 'text-danger'}`} value={batchFirstIn} disabled />
                </div>

                <div className="input-group input-group-sm mt-2">
                    <span className="input-group-text">棧板剩餘包數</span>
                    <input type="text" className="form-control form-control-inline align-baseline" value={batchRemain} disabled />
                </div>

                <div className="input-group mt-2">
                    <span className="input-group-text">包裝別</span>
                    <input type="number" className="form-control form-control-inline align-baseline me-2" value={bagWeight} disabled />

                    <span className="input-group-text">領用包數</span>
                    <input type="number" className="form-control form-control-inline align-baseline" value={pickNum} onChange={evt => setPickNum(evt.target.value)} disabled={checkIsAuditProduct()} />
                </div>

                <button type="button" className="btn btn-primary mt-2 me-2" onClick={finishBtn} disabled={isLoading || 0 === batchNo.length}><span className="icon bi-check2-circle"></span> 確認</button>
                <button type="button" className="btn btn-outline-secondary mt-2" onClick={returnBtn} disabled={isLoading}><span className="icon bi-arrow-left-circle"></span> 返回</button>

                <div className="badge rounded-pill text-bg-info ms-2">欲領餘料請掃餘料標籤，原料掃收料或供應商標籤</div>
            </>
            :
            <>
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
                            <input type="text" className="form-control" value={currentLine} disabled />

                            <span className="input-group-text">序號</span>
                            <input type="number" className="form-control" value={currentSeq} disabled />

                            <span className="input-group-text">批量</span>
                            <input type="number" className="form-control" value={currentBatch} disabled />
                        </div>

                        <div className="input-group input-group-sm mt-2">
                            <span className="input-group-text">機台</span>
                            <input type="text" className="form-control" value={mixer} disabled />
                            <input type="text" className={(checkMixer || feedFinished) ? "form-control" : "form-control text-danger"} value={checkMixerAlarm()} disabled />

                            <button type="button" className="btn btn-success" onClick={mixerBtn}><span className="icon bi-qr-code-scan"></span> 機台掃碼</button>
                        </div>

                        {('7' === firm) &&
                            <div className="input-group input-group-sm mt-2">
                                <span className="input-group-text">稽核產品(高雄廠在此使用稽核品)</span>
                                <input type="text" className="form-control" value={currentProduct.length ? checkIsAuditProduct() : false} disabled />
                            </div>
                        }
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
                            />
                        </div>
                    </>
                }

                <MaterialQA />
            </>
        }
        </div >
    );
}

export default MixPickAndFeed;
