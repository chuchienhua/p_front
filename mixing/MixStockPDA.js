import React, { useState } from 'react';
import axios from 'axios';
import './MixingPDA.css'
import { HotTable } from '@handsontable/react';
import Handsontable from 'handsontable';
import { registerAllCellTypes } from 'handsontable/cellTypes';
import moment from 'moment';
import Utils from '../Utils';
import { toast } from 'react-toastify';
import Compressor from 'compressorjs';
import MixingMatTable from './MixingMatTable';

function MixStockPDA() {

    registerAllCellTypes();

    const [date, setDate] = useState(moment(new Date()).format('YYYY-MM-DD')); //領料日期
    const [workShift, setWorkShift] = useState('早'); //領料班別
    const [queryReadOnly, setQueryReadOnly] = useState(false); //鎖定搜尋列

    const [rows, setRows] = useState([]);

    const [materialRows, setMaterialRows] = useState([]); //明細表資料
    const [line, setLine] = useState('');
    const [sequence, setSequence] = useState('');
    const [semiNo, setSemiNo] = useState('');
    const [stockDate, setStockDate] = useState(''); //確認的日期
    const [stockShift, setStockShift] = useState(''); //確認人員的班別
    const [batch, setBatch] = useState(''); //明細表的批量
    const [productNo, setProductNo] = useState('');
    const [image, setImage] = useState([]); //上傳的影像
    const [prevImage, setPrevImage] = useState([]); //預覽的影像
    const [imageEnsured, setImageEnsured] = useState([]); //過去拍照的影像

    const columns = [
        { data: 'LINE', type: 'text', width: 40, className: 'align-middle' },
        { data: 'SEQUENCE', type: 'numeric', width: 40, className: 'align-middle' },
        { data: 'SEMI_NO', type: 'numeric', width: 55, className: 'align-middle' },
        { data: 'PRODUCT_NO', type: 'text', width: 90, className: 'align-middle' },
        { data: 'BATCH', type: 'numeric', width: 40, className: 'align-middle' },
        { data: 'DEDUCT_STATUS', type: 'checkbox', width: 40, className: 'htCenter align-middle' },
        { data: 'CHECK_STATUS', type: 'checkbox', width: 40, className: 'htCenter align-middle' },
        {
            data: 'LIST_BTN',
            width: 80,
            renderer: function (instance, td, row, col, prop, value, cellProperties) {
                const icon = document.createElement('SPAN');
                icon.className = "icon bi-search";
                icon.innerHTML = ' 檢視';

                const btn = document.createElement('LIST_BTN');
                btn.className = 'btn btn-outline-success px-1 py-0 nowrap align-top';
                btn.appendChild(icon);

                //如果已確認成功或未完成備料，不能按按鍵
                if (value[2] || !value[3]) {
                    btn.className += ' disabled';
                }

                Handsontable.dom.addEvent(btn, 'click', () => {
                    if (!value[2] && value[3]) {
                        listBtn(row, value);
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
        {
            data: 'LIST_MERGE_BTN',
            width: 80,
            renderer: function (instance, td, row, col, prop, value, cellProperties) {
                const icon = document.createElement('SPAN');
                icon.className = "icon bi-search";
                icon.innerHTML = ' 檢視';

                const btn = document.createElement('LIST_BTN');
                btn.className = 'btn btn-outline-success px-1 py-0 nowrap align-top';
                btn.appendChild(icon);

                //如果已確認成功或未完成備料，不能按按鍵
                if (value[2] || !value[3]) {
                    btn.className += ' disabled';
                }

                Handsontable.dom.addEvent(btn, 'click', () => {
                    if (!value[2] && value[3]) {
                        listBtn(row, value, true);
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
        {
            data: 'IMG_BTN',
            width: 80,
            renderer: function (instance, td, row, col, prop, value, cellProperties) {
                const icon = document.createElement('SPAN');
                icon.className = "icon bi-camera";
                icon.innerHTML = ' 檢視';

                const btn = document.createElement('LIST_BTN');
                btn.className = 'btn btn-outline-info px-1 py-0 nowrap align-top';
                btn.appendChild(icon);

                Handsontable.dom.addEvent(btn, 'click', () => {
                    if (instance.getDataAtCell(row, 6)) {
                        showImage(row);
                    } else {
                        toast.warn('尚未拍照確認');
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
    ];
    const colHeader = ['線別', '序號', '半成品', '成品簡碼', '批量', '備料<br>狀況', '確認<br>狀況', '明細表', '合併<br>明細表', '檢視照片'];

    const query = () => {
        setRows([]);

        const apiUrl = Utils.generateApiUrl('/mixing/stockMixing', [date, workShift]);
        axios.get(apiUrl, {
            ...Utils.pbtAxiosConfig,
        }).then(res => {
            if (res.data.res.length) {
                //console.log(res.data)
                let appendArray = [];
                res.data.res.forEach(element => {
                    appendArray.push({
                        LINE: element.LINE,
                        SEQUENCE: element.SEQUENCE,
                        SEMI_NO: element.SEMI_NO,
                        PRODUCT_NO: element.PRD_PC,
                        BATCH: element.BATCH_SEQ,
                        DEDUCT_STATUS: (1 === element.PICK_STATUS) ? true : false,
                        CHECK_STATUS: (1 === element.STOCK_STATUS) ? true : false,
                        LIST_BTN: [date, workShift, (1 === element.STOCK_STATUS) ? true : false, (1 === element.PICK_STATUS) ? true : false],
                        LIST_MERGE_BTN: [date, workShift, (1 === element.STOCK_STATUS) ? true : false, (1 === element.PICK_STATUS) ? true : false],
                    });
                });
                setRows(appendArray);
                setStockDate(date);
                setStockShift(workShift);
                setQueryReadOnly(true);
            } else {
                toast.warn('未找到工令');
            }
        })
            .catch(err => console.error(err));
    }

    //顯示拌粉批量原料明細表，merge=同班別之工令C6630-1~C6630-5是否合併一起
    const listBtn = (row, value, merge = false) => {
        setMaterialRows([]);

        //共用API，再視狀況調整
        const apiUrl = Utils.generateApiUrl('/mixing/stockMixingMaterial', [value[0], value[1], rows[row].LINE, rows[row].SEQUENCE, rows[row].SEMI_NO, merge ? '*' : rows[row].BATCH]);
        axios.get(apiUrl, {
            ...Utils.pbtAxiosConfig,
        }).then(res => {
            if (res.data.res.length) {
                let appendArray = [];
                res.data.res.forEach(element => {
                    let weights = Utils.getMaterialPrecision(element.BATCH_WEIGHT, element.RATIO, 1);

                    appendArray.push({
                        MATERIAL: element.MATERIAL,
                        BATCH_WEIGHT: weights.batchWeight,
                        UNIT: (0.01 > weights.totalWeight) ? 'g' : 'kg',
                    });
                });
                setLine(rows[row].LINE);
                setSequence(rows[row].SEQUENCE);
                setSemiNo(rows[row].SEMI_NO);
                setProductNo(rows[row].PRODUCT_NO);
                setBatch(merge ? '*' : rows[row].BATCH);
                setMaterialRows(appendArray);
            } else {
                toast.error('取得原料失敗');
            }
        }).catch(err => console.error(err));
    }

    const onChangeImage = async evt => {
        try {
            new Compressor(evt.target.files[0], {
                maxWidth: 128,
                maxHeight: 256,
                quality: 0.7, // 0.6 can also be used, but its not recommended to go below.
                success: (result) => {
                    setImage(result);
                    setPrevImage(URL.createObjectURL(result)); //預覽欲上傳的照片
                },
            });
        } catch (err) {
            toast.error(err);
        }
    }

    //拍照上傳確認
    const uploadImage = () => {
        let formData = new FormData();
        formData.append('image', image);

        const apiUrl = Utils.generateApiUrl('/mixing/stockEnsure', [stockDate, stockShift, line, sequence, semiNo, batch]);
        axios.post(apiUrl, formData, {
            ...Utils.pbtAxiosConfig,
            headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${Utils.getTokenFromLocalStorage()}` },
        }).then(res => {
            if (!res.data.error) {
                toast.success('備料確認成功');
                query();

                //清空
                setImage([]);
                setPrevImage([]);
                setStockDate('');
                setStockShift('');
                setLine('');
                setSequence('');
                setBatch('');
                setMaterialRows([]);
            } else {
                toast.error(`備料確認失敗，${res.data.res}`);
            }
        }).catch(err => toast.error(err));
    }

    //顯示拍過的照片
    const showImage = (row) => {
        //共用API，再視狀況調整
        const apiUrl = Utils.generateApiUrl('/mixing/getEnsureImage', [rows[row].LINE, rows[row].SEQUENCE, date, workShift]);
        axios.get(apiUrl, {
            ...Utils.pbtAxiosConfig,
        }).then(res => {
            if (!res.data.error && res.data.image) {
                setImageEnsured(res.data.image);
            } else {
                toast.error('取得失敗');
            }
        }).catch(err => console.error(err));
    }

    return (
        <div className="mix-pda-page col-12 px-0">
            <div className="input-group input-group-sm mt-2">
                <span className="input-group-text">備料日期</span>
                <input type="date" className="form-control" value={date} onChange={evt => setDate(evt.target.value)} disabled={queryReadOnly} />
            </div>

            <div className="input-group input-group-sm mt-2">
                <span className="input-group-text">備料班別</span>
                <select className="form-select" value={workShift} onChange={evt => setWorkShift(evt.target.value)} disabled={queryReadOnly}>
                    <option value="早">早</option>
                    <option value="中">中</option>
                    <option value="晚">晚</option>
                </select>
            </div>

            <button type="button" className="btn btn-primary me-2 mt-2" onClick={query}><span className="icon bi-search" disabled={queryReadOnly}></span> 查詢</button>
            <button type="button" className="btn btn-outline-secondary mt-2" onClick={() => setQueryReadOnly(false)} disabled={!queryReadOnly}><span className="icon bi-arrow-counterclockwise"></span> 重新查詢</button>

            <div className="mixing-stock-table w-100 overflow-hidden mt-2 mb-2" style={{ minHeight: "15rem" }}>
                <HotTable
                    licenseKey="non-commercial-and-evaluation"
                    data={rows}
                    columns={columns}
                    colHeaders={colHeader}
                    rowHeaders={false}
                    rowHeights={40}
                    readOnly={true}
                />
            </div>

            <hr />

            {(0 < imageEnsured.length) &&
                <>
                    <h4>備料確認照片</h4>
                    <img src={"data:image/jpg;base64," + imageEnsured} alt='未找到'></img>
                </>
            }

            <hr />

            {(0 < materialRows.length) &&
                <div className="mt-2">
                    <h4>拌粉批量原料明細表</h4>

                    <div className="input-group input-group-sm">
                        <span className="input-group-text">線別</span>
                        <input type="text" className="form-control me-2" defaultValue={line} disabled />

                        <span className="input-group-text">序號</span>
                        <input type="number" className="form-control me-2" defaultValue={sequence} disabled />

                        <span className="input-group-text">批量</span>
                        <input type="text" className="form-control" defaultValue={batch} disabled />
                    </div>

                    <div className="input-group input-group-sm mt-2 d-none">
                        <span className="input-group-text">確認日期</span>
                        <input type="text" className="form-control me-2" value={stockDate} disabled />

                        <span className="input-group-text">確認班別</span>
                        <input type="text" className="form-control" value={stockShift} disabled />
                    </div>

                    <div className="input-group input-group-sm col-12  mt-2">
                        <span className="input-group-text">半成品</span>
                        <input type="text" className="form-control me-2" defaultValue={semiNo} disabled />

                        <span className="input-group-text">成品簡碼</span>
                        <input type="text" className="form-control" defaultValue={productNo} disabled />
                    </div>

                    <MixingMatTable rows={materialRows} weightOnly={true} />

                    <div className="input-group input-group mt-2">
                        <span className="input-group-text">拍照</span>
                        <input type="file" className="form-control" accept="image/*" capture="camera" defaultValue={image} onChange={onChangeImage} />

                        <button type="button" className="btn btn-primary" onClick={uploadImage} disabled={!line || 0 === image.length}><span className="icon bi-check2-circle"></span> 確認正確</button>
                    </div>

                    {(0 < prevImage.length) &&
                        <img className='mt-2' src={prevImage} alt="上傳照片" />
                    }
                </div>

            }
        </div>
    );
}

export default MixStockPDA;
