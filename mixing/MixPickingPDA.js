import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './MixingPDA.css'
import { HotTable } from '@handsontable/react';
import Handsontable from 'handsontable';
import { registerAllCellTypes } from 'handsontable/cellTypes';
import Utils from '../Utils';
import moment from 'moment';
import Swal from 'sweetalert2';
import { toast } from 'react-toastify';
import MaterialQA from '../MaterialQA';

function MixPickingPDA() {

    registerAllCellTypes();

    const [isLoading, setIsLoading] = useState(false);

    const [date, setDate] = useState(moment(new Date()).format('YYYY-MM-DD'));
    const [workShift, setWorkShift] = useState('早');
    const [queryReadOnly, setQueryReadOnly] = useState(false); //鎖定搜尋列

    const [rows, setRows] = useState([]);

    const [productList, setProductList] = useState([]); //生成的分頁
    const [pickDate, setPickDate] = useState(''); //要掃碼傳送的領料日期
    const [pickShift, setPickShift] = useState(''); //要掃碼傳送的班別

    //原料備料領料掃碼作業表狀態
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

    const [productDetailArray, setProductDetailArray] = useState([]); //半成品對應的詳細資料
    const [currentProduct, setCurrentProduct] = useState(''); //現在分頁顯示的半成品
    const [currentLine, setCurrentLine] = useState(''); //現在分頁顯示的線別
    const [currentSeq, setCurrentSeq] = useState(''); //現在分頁顯示的序號
    const [currentBatch, setCurrentBatch] = useState(''); //現在分頁顯示的起訖

    const columns = [
        { data: 'MATERIAL', type: 'text', width: 80, className: 'align-middle' },
        { data: 'TOTAL_WEIGHT', type: 'text', width: 45, className: 'align-middle' },
        { data: 'UNIT', type: 'text', width: 25, className: 'align-middle' },
        { data: 'INVENTORY_WEIGHT', type: 'numeric', width: 45, className: 'align-middle' },
        { data: 'INVENTORY_PICK', type: 'checkbox', width: 40, className: 'htCenter align-middle' },
        { data: 'PICK_WEIGHT', type: 'numeric', width: 45, className: 'align-middle' },
        { data: 'PICK_NUM', type: 'numeric', width: 40, className: 'align-middle' },
        {
            data: 'PICK_BTN',
            width: 40,
            renderer: function (instance, td, row, col, prop, value, cellProperties) {
                const icon = document.createElement('SPAN');
                icon.className = "icon bi-camera-fill";

                const btn = document.createElement('PICK_BTN');
                btn.className = 'btn btn-outline-success btn-lg px-1 py-0 nowrap align-top';
                if (!value) {
                    btn.className += ' disabled';
                }
                btn.appendChild(icon);

                Handsontable.dom.addEvent(btn, 'click', () => {
                    if (value) {
                        pickingBtn(row);
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
        { data: 'PICK_STATUS', type: 'text', width: 90, className: 'align-middle' },
    ];
    const colHeader = ['原料<br>簡碼', '需求<br>總重', '單<br>位', '餘料<br>庫存', '餘料<br>領料', '已領<br>重量', '已領<br>包數', '領料', '領料狀況'];
    const readOnlyRowControll = (row, col) => {
        if (col === 4) {
            return { readOnly: false };
        } else {
            return { readOnly: true };
        }
    }

    const pickingBtn = row => {
        setMaterial(rows[row].MATERIAL);
        setLotNo('');
        setBatchNo('');
        setBagWeight(0);
        setPickNum(0);
        setBatchQA('');
        setBatchFirstIn('');
        setBatchRemain(0);

        //棧板需領料算法 = 需求總重 - 檢查是否要領餘料量 - 已領
        if (rows[row].INVENTORY_PICK) {
            if (rows[row].INVENTORY_WEIGHT >= (rows[row].TOTAL_WEIGHT - rows[row].PICK_WEIGHT)) {
                setNeedWeight(0);
                setRemainderPickWeight(rows[row].TOTAL_WEIGHT - rows[row].PICK_WEIGHT);
                setLotNo('餘料');
                setBatchNo('餘料');
            } else {
                setNeedWeight(rows[row].TOTAL_WEIGHT - rows[row].INVENTORY_WEIGHT - rows[row].PICK_WEIGHT);
                setRemainderPickWeight(rows[row].INVENTORY_WEIGHT);
            }
        } else {
            setNeedWeight(rows[row].TOTAL_WEIGHT - rows[row].PICK_WEIGHT);
            setRemainderPickWeight(0);
        }
        setSwitchScanPage(true);
    }

    useEffect(() => {
        //切換(線別序號 + 半成品)分頁時，調整表格內容
        if (currentProduct) {
            let appendArray = [];
            let foundProduct = false;
            productDetailArray.forEach(element => {
                if (currentProduct === element.UKEY) {
                    appendArray.push(element);

                    if (!foundProduct) {
                        setCurrentLine(element.LINE);
                        setCurrentSeq(element.SEQUENCE);
                        setCurrentBatch(element.BATCH);
                        foundProduct = true;
                    }
                }
            });
            setRows(appendArray);
        } else {
            setCurrentLine('');
            setCurrentSeq('');
            setCurrentBatch('');
        }

    }, [currentProduct, productDetailArray])

    const query = () => {
        setIsLoading(true);
        //setCurrentProduct('');
        setCurrentLine('');
        setCurrentSeq('');
        setCurrentBatch('');
        setRows([]);

        const apiUrl = Utils.generateApiUrl('/mixing/pickingMaterial', [date, workShift]);
        axios.get(apiUrl, {
            ...Utils.pbtAxiosConfig,
        }).then(res => {
            if (0 < res.data.res.length) {
                let productDetailArray = [];
                let appendProductList = [];
                res.data.res.forEach(element => {
                    //每一個(線別序號 + 半成品)建立一個分頁標籤
                    if (!appendProductList.includes(element.LINE + element.SEQUENCE + '/' + element.SEMI_NO + element.PRD_PC)) {
                        appendProductList.push(element.LINE + element.SEQUENCE + '/' + element.SEMI_NO + element.PRD_PC);
                    }

                    let remainWeight = (element.REMAIN_WEIGHT) ? element.REMAIN_WEIGHT : 0;
                    let weights = Utils.getMaterialPrecision(element.TOTAL_WEIGHT, element.RATIO, (element.BATCH_END - element.BATCH_START + 1));

                    //是否已經領料完成
                    //let weightNeed = 0;
                    let allowPicking = true;
                    let pickStatus = '';
                    let remainNeed = false;
                    if (1 === element.PICK_STATUS) {
                        pickStatus = '已領料完成';
                        remainNeed = (0 < element.REMAINDER);
                        allowPicking = false;
                    } else {
                        //需不需要因為"需求總重"為"包裝別(單包重量)"的整數倍數領取餘料(所有包裝別其中一個OK就好)
                        remainNeed = (0 === remainWeight) ? false : true;
                        if (1 <= element.PACK_WT.length && weights.totalWeight) {
                            if (element.PACK_WT.filter(x => (0 === weights.totalWeight % x)).length) {
                                remainNeed = false;
                            }
                        }

                        //處理領料狀態邏輯
                        if (remainNeed) {
                            if (remainWeight + element.PICK_WEIGHT >= parseFloat(weights.totalWeight) || 0 !== element.PICK_STATUS) {
                                pickStatus = '待扣餘料';
                                //weightNeed = 0;
                            } else {
                                pickStatus = '領料未完成';
                                //weightNeed = weights.totalWeight - element.PICK_WEIGHT - remainWeight;
                            }
                        } else {
                            if (element.PICK_WEIGHT >= parseFloat(weights.totalWeight) || 0 !== element.PICK_STATUS) {
                                pickStatus = '待扣餘料';
                                //weightNeed = 0;
                            } else {
                                pickStatus = '領料未完成';
                                //weightNeed = weights.totalWeight - element.PICK_WEIGHT;
                            }
                        }
                    }

                    productDetailArray.push({
                        UKEY: element.LINE + element.SEQUENCE + '/' + element.SEMI_NO + element.PRD_PC, //為了勾稽分頁的唯一值
                        LINE: element.LINE,
                        SEQUENCE: element.SEQUENCE,
                        PRODUCT_NO: element.SEMI_NO + element.PRD_PC,
                        BATCH: element.BATCH_START.toString() + '-' + element.BATCH_END.toString(),
                        MATERIAL: element.MATERIAL,
                        //BATCH_WEIGHT: weights.batchWeight,
                        TOTAL_WEIGHT: weights.totalWeight,
                        UNIT: (0.01 > weights.totalWeight / (element.BATCH_END - element.BATCH_START + 1)) ? 'g' : 'kg',
                        INVENTORY_WEIGHT: remainWeight, //餘料量
                        INVENTORY_PICK: remainNeed,
                        //NEED_WEIGHT: weightNeed, //尚須領料
                        PICK_WEIGHT: element.PICK_WEIGHT, //已領重量
                        PICK_NUM: (element.PICK_NUM) ? element.PICK_NUM : 0,
                        PICK_BTN: allowPicking, //是否開放掃QRCODE領料
                        PICK_STATUS: pickStatus, //這邊要寫邏輯 
                    })
                });

                setProductList(appendProductList);
                setProductDetailArray(productDetailArray);
                setPickDate(date);
                setPickShift(workShift);
                setQueryReadOnly(true);
            } else if (res.data.res.error) {
                toast.error(`查詢失敗，${res.data.res}`);
                setProductList([]);
                setProductDetailArray([]);
            } else {
                toast.warn('此班別未出現需要您備料的排程');
                setProductList([]);
                setProductDetailArray([]);
            }
        })
            .catch(err => console.error(err))
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
                const decodeQR = Utils.decodeMaterialQrCode(result.value);
                if (!decodeQR.error) {
                    let errorString = '';
                    if (decodeQR.material !== material) {
                        errorString = '原料不相符';
                    }

                    if (!errorString.length) {
                        setBagWeight(decodeQR.weight);
                        setPickNum(Math.ceil(needWeight / decodeQR.weight));
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

    //生成半成品分頁的選項
    const generateProductList = () => {
        let div = [];
        productList.forEach((element, index) => {
            div.push(
                <option key={index} value={element}>{element}</option>
            );
        });
        return div;
    }

    //確認按鍵
    const finishBtn = () => {

        const callback = res => {
            if (res.isConfirmed) {
                setIsLoading(true);

                const apiUrl = Utils.generateApiUrl('/mixing/pdaPicking');
                axios.post(apiUrl, {
                    pickDate: pickDate,
                    pickShift: pickShift,
                    line: currentLine,
                    sequence: currentSeq,
                    batchStart: currentBatch.split('-')[0], //1-4
                    batchEnd: currentBatch.split('-')[1],
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
            if (0 === batchNo.length) {
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

    return (
        <div className="mix-pda-page col-12 px-0">

            {(switchScanPage) ?
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

                        <button type="button" className="btn btn-warning" onClick={qrcodeBtn} disabled={0 === needWeight}><span className="icon bi-qr-code-scan"></span> 棧板QRCode</button>
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
                        <input type="text" className="form-control form-control-inline align-baseline me-2" value={batchRemain} disabled />
                    </div>

                    <div className="input-group mt-2">
                        <span className="input-group-text">包裝別</span>
                        <input type="number" className="form-control form-control-inline align-baseline me-2" value={bagWeight} disabled />

                        <span className="input-group-text">領用包數</span>
                        <input type="number" className="form-control form-control-inline align-baseline" value={pickNum} onChange={evt => setPickNum(evt.target.value)} />
                    </div>

                    <button type="button" className="btn btn-primary mt-2 me-2" onClick={finishBtn} disabled={isLoading || 0 === batchNo.length}><span className="icon bi-check2-circle"></span> 確認</button>
                    <button type="button" className="btn btn-outline-secondary mt-2" onClick={returnBtn} disabled={isLoading}><span className="icon bi-arrow-left-circle"></span> 返回</button>
                </>
                :
                <>
                    <div className="input-group input-group-sm mt-2">
                        <span className="input-group-text">日期</span>
                        <input type="date" className="form-control" value={date} onChange={evt => setDate(evt.target.value)} disabled={queryReadOnly} />
                    </div>

                    <div className="input-group input-group-sm mt-2">
                        <span className="input-group-text">班別</span>
                        <select className="form-select" value={workShift} onChange={evt => setWorkShift(evt.target.value)} disabled={queryReadOnly} >
                            <option value="早">早</option>
                            <option value="中">中</option>
                            <option value="晚">晚</option>
                        </select>
                    </div>

                    <button type="button" className="btn btn-primary mt-2 me-2" onClick={query} disabled={isLoading}><span className="icon bi-search"></span> 查詢</button>
                    <button type="button" className="btn btn-outline-secondary mt-2" onClick={() => setQueryReadOnly(false)} disabled={!queryReadOnly}><span className="icon bi-arrow-counterclockwise"></span> 重新查詢</button>

                    <hr />

                    {(0 < productList.length) &&
                        <>
                            <h4>拌粉原料備料作業表</h4>

                            <div className="input-group input-group-sm mt-2">
                                <span className="input-group-text">項目</span>
                                <select className="form-select" value={currentProduct} onChange={evt => setCurrentProduct(evt.target.value)}>
                                    <option>---請選擇---</option>
                                    {generateProductList()}
                                </select>
                            </div>

                            <div className="input-group input-group-sm mt-2">
                                <span className="input-group-text">線別</span>
                                <input type="text" className="form-control" value={currentLine} disabled />

                                <span className="input-group-text">序號</span>
                                <input type="number" className="form-control" value={currentSeq} disabled />

                                <span className="input-group-text">起訖</span>
                                <input type="text" className="form-control" value={currentBatch} disabled />
                            </div>

                            <div className="input-group input-group-sm mt-2 d-none">
                                <span className="input-group-text">備料日期</span>
                                <input type="date" className="form-control me-2" value={pickDate} disabled />

                                <span className="input-group-text">備料班別</span>
                                <input type="text" className="form-control" value={pickShift} disabled />
                            </div>

                            {(0 < rows.length) &&
                                <>
                                    <div className="mixing-picking-table mt-2">
                                        <HotTable
                                            licenseKey="non-commercial-and-evaluation"
                                            data={rows}
                                            columns={columns}
                                            colHeaders={colHeader}
                                            rowHeaders={false}
                                            rowHeights={50}
                                            cells={(row, col) => readOnlyRowControll(row, col)}
                                        />
                                    </div>
                                </>
                            }
                        </>
                    }

                    <MaterialQA />
                </>
            }
        </div >
    );
}

export default MixPickingPDA;
