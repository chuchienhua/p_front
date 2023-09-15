import React, { useState, useRef } from "react";
import { useSelector } from "react-redux";
import { HotTable } from '@handsontable/react';
import Handsontable from 'handsontable';
import { registerAllCellTypes } from 'handsontable/cellTypes';
import Utils from '../Utils';
import axios from 'axios';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import moment from 'moment';
import ScrapRecordTable from "./ScrapRecordTable";

function ExtrusionScrap(props) {

    const printers = props.printers || []; //所有標籤機
    const feeders = props.feeders || []; //所有入料機
    const bags = props.bags || []; //所有入料機
    const isAdmin = props.isAdmin; //是否為管理員

    const user = useSelector(state => state.user);

    registerAllCellTypes();

    const [isLoading, setIsLoading] = useState(false);

    //回收料頭太空袋標籤製作部分
    const [selPrinter, setSelPrinter] = useState(''); //選擇的標籤機
    const [selBag, setSelBag] = useState(''); //選擇的太空包種

    //料頭產出紀錄查詢表部分
    const [startDate, setStartDate] = useState(moment(new Date()).format('YYYY-MM-DD')); //開始日期
    const [endDate, setEndDate] = useState(moment(new Date()).format('YYYY-MM-DD')); //截止時間
    const [queryBagSeries, setQueryBagSeries] = useState('*'); //查詢表的太空袋種類
    const [lineSearch, setLineSearch] = useState('*'); //查詢表線別
    const [seqSearch, setSeqSearch] = useState('*'); //查詢表序號
    const [lotNoSearch, setLotNoSearch] = useState('*'); //查詢表批號
    const [prdPCSearch, setPRDPCSearch] = useState('*'); //查詢表規格
    const [rows, setRows] = useState([]);

    //料頭產出紀錄
    const [scrapBatchNo, setScrapBatchNo] = useState(''); //欲搜尋的太空袋批號
    const [scrapRows, setScrapRows] = useState([]);
    const [scrapBagSeries, setScrapBagSeries] = useState(''); //查詢內容物的太空袋種類
    const [scrapBagCreator, setScrapBagCreator] = useState(''); //此太空袋的建立者
    const [readOnlyRows, setReadOnlyRows] = useState([]); //僅有新增的列能編輯

    const columns = [
        { data: 'BAG_SERIES', type: 'text', width: 110 },
        { data: 'BATCH_NO', type: 'text', width: 110 },
        { data: 'CREATOR', type: 'text', width: 60 },
        { data: 'LINE', type: 'text', width: 60 },
        { data: 'SEQUENCE', type: 'numeric', width: 60 },
        { data: 'PRD_PC', type: 'text', width: 100 },
        { data: 'LOT_NO', type: 'text', width: 110 },
        { data: 'CREATOR_NAME', type: 'text', width: 60 },
        { data: 'WEIGHT', type: 'numeric', width: 80 },
        { data: 'CREATE_TIME', type: 'text', width: 160 },
        /*{ data: 'TOTAL_WEIGHT', type: 'numeric', width: 80 },*/
        {
            data: 'DETAIL_BTN',
            width: 70,
            renderer: function (instance, td, row, col, prop, value, cellProperties) {
                const icon = document.createElement('SPAN');
                icon.className = "icon bi-search";
                icon.innerHTML = ' 顯示';

                const btn = document.createElement('DETAIL_BTN');
                btn.className = 'btn btn-outline-success btn-sm px-1 py-0 nowrap align-top';
                btn.appendChild(icon);
                Handsontable.dom.addEvent(btn, 'click', () => {
                    detailBtn(value);
                });

                const div = document.createElement('DIV');
                div.appendChild(btn);

                Handsontable.dom.empty(td);
                td.appendChild(div);
            },
        },
        /*
        {
            data: 'DEL_BTN',
            width: 70,
            renderer: function (instance, td, row, col, prop, value, cellProperties) {
                const icon = document.createElement('SPAN');
                icon.className = "icon bi-x-circle";
                icon.innerHTML = ' 刪除';

                const btn = document.createElement('DEL_BTN');
                btn.className = 'btn btn-outline-danger btn-sm px-1 py-0 nowrap align-top';
                btn.appendChild(icon);
                Handsontable.dom.addEvent(btn, 'click', () => {
                    deleteBtn(value);
                });

                const div = document.createElement('DIV');
                div.appendChild(btn);

                Handsontable.dom.empty(td);
                td.appendChild(div);
            },
        },
        */
    ];
    const colHeader = ['回收料頭<br>太空袋種類', '太空袋批號', '建立者', '線別', '序號', '產品簡碼', '排程批號', '人員', '料頭重量<br>(kg)', '建立時間', /*'合計重量<br>(kg)',*/'明細', /*'刪除'*/];
    const hotTableComponent = useRef(null);

    //查詢指定太空袋下的料頭
    const detailBtn = batchNo => {
        window.scrollTo(0, document.body.scrollHeight); //頁面太長，直接拉到下方產出紀錄表

        setIsLoading(true);
        setScrapBatchNo('');
        setScrapBagCreator('');
        setScrapBagSeries('');
        setScrapRows([]);

        const apiUrl = Utils.generateApiUrl('/extrusion/getBagDetail', [batchNo])
        axios.get(apiUrl, {
            ...Utils.pbtAxiosConfig,
        }).then(res => {
            let appendArray = [{
                LINE: '', SEQUENCE: '', PRD_PC: '加總',
                WEIGHING_WEIGHT: 0,
                WEIGHT: '=SUM(G2:G100)', WEIGHT_RESTART: '=SUM(H2:H100)', WEIGHT_BREAK: '=SUM(I2:I100)', WEIGHT_ABNORMAL: '=SUM(J2:J100)',
                CREATOR: '', CREATOR_NAME: '',
            }]; //Formula前面欄位不能為空

            if (!res.data.error) {
                if (res.data.res.length) {
                    res.data.res.forEach((element, index) => {
                        appendArray.push({
                            LINE: element.LINE,
                            SEQUENCE: element.SEQUENCE,
                            PRD_PC: element.PRD_PC,
                            //WEIGHT: element.WEIGHT || `=SUM(G${index + 1}:I${index + 1})`,
                            WEIGHING_WEIGHT_BEFORE: `=E${index + 1}`,
                            WEIGHING_WEIGHT: element.WEIGHING_WEIGHT || 0,
                            WEIGHING_DIFF: `=E${index + 2}-D${index + 2}`,
                            WEIGHT: `=SUM(H${index + 2}:J${index + 2})`,
                            WEIGHT_RESTART: element.WEIGHT_RESTART || 0,
                            WEIGHT_BREAK: element.WEIGHT_BREAK || 0,
                            WEIGHT_ABNORMAL: element.WEIGHT_ABNORMAL || 0,
                            CREATOR: element.CREATOR,
                            CREATOR_NAME: element.CREATOR_NAME,
                            CREATE_TIME: moment(element.CREATE_TIME).format('YYYY-MM-DD HH:mm:ss'),
                            LAST_WORK_SHIFT: element.LAST_WORK_SHIFT?.length ? element.LAST_WORK_SHIFT : '',
                            EDITOR: element.EDITOR_NAME,
                            EDIT_TIME: element.EDIT_TIME ? moment(element.EDIT_TIME).format('YYYY-MM-DD HH:mm:ss') : '',
                        });
                    });
                } else {
                    toast.warn('此太空袋尚無回收料頭，請再新增');
                }

                setScrapBatchNo(batchNo);
                setScrapBagCreator(res.data.creatorName || '');
                setScrapBagSeries(res.data.bagSeries || '');
            } else {
                toast.error(`查詢失敗，${res.data.res}`);
            }

            setReadOnlyRows([...Array(res.data.res.length + 1).keys()]); //讀取的無法編輯
            setScrapRows(appendArray);
        }).catch(err => console.error(err))
            .finally(() => setIsLoading(false));
    }

    //刪除沒有料頭的太空袋
    /*
    const deleteBtn = batchNo => {
        setIsLoading(true);

        const apiUrl = Utils.generateApiUrl('/extrusion/removeBag', [batchNo])
        axios.get(apiUrl, {
            ...Utils.pbtAxiosConfig,
        }).then(res => {
            if (!res.data.error) {
                toast.success('刪除成功');
                queryAllBags();
            } else {
                toast.error(`刪除失敗，僅能刪除完全沒有料頭的太空袋`);
            }
        }).catch(err => console.error(err))
            .finally(() => setIsLoading(false));
    }
    */

    //列印粉碎料頭標籤
    const printCrush = () => {

        const callback = res => {
            if (res.isConfirmed && 0 < Number(res.value)) {
                setIsLoading(true);

                const apiURL = Utils.generateApiUrl('/extrusion/printCrushScrap');
                axios.post(apiURL, {
                    printer: selPrinter,
                    bagSeries: selBag,
                    weight: res.value,
                }, {
                    ...Utils.pbtAxiosConfig,
                }).then(res => {
                    if (!res.data.error) {
                        toast.success('列印成功!');
                    } else {
                        toast.error(`列印失敗，${res.data.res}`);
                    }
                }).catch(err => console.error(err))
                    .finally(() => setIsLoading(false));
            }
        }

        if (selPrinter.length && selBag.length) {
            Swal.fire({
                title: `列印${selBag}粉碎料頭成品標籤，請輸入粉碎料頭重量(kg)`,
                input: 'number',
                inputPlaceholder: '重量(kg)',
                position: 'top',
                showCancelButton: true,
            }).then(callback).catch(error => {
                Swal.showValidationMessage(`Request failed: ${error}`);
            });
        } else {
            toast.warn('請先選擇欲列印的標籤機與太空袋');
        }
    }

    //建立全新的太空袋標籤
    const createBag = () => {
        setIsLoading(true);

        if (selPrinter && selBag) {
            const apiUrl = Utils.generateApiUrl('/extrusion/createScrapBag');
            axios.post(apiUrl, {
                printer: selPrinter,
                bagSeries: selBag,
            }, {
                ...Utils.pbtAxiosConfig,
            }).then(res => {
                if (!res.data.error) {
                    toast.success('列印與建立成功!');
                } else {
                    toast.error('列印與建立失敗!');
                }
            }).catch(err => console.error(err))
                .finally(() => setIsLoading(false));
        } else {
            toast.error('請選擇標籤機與回收太空袋種類');
        }
    }

    //開始/截止日期與太空袋種類查詢已建立的太空袋
    const queryAllBags = () => {
        setIsLoading(false);
        setRows([]);

        const apiUrl = Utils.generateApiUrl('/extrusion/getScrapBag', [moment(startDate).format('YYYYMMDD'), moment(endDate).format('YYYYMMDD')]);
        axios.post(apiUrl, {
            queryBagSeries: queryBagSeries,
            lineSearch: lineSearch,
            lotNoSearch: lotNoSearch,
            seqSearch: seqSearch,
            prdPCSearch: prdPCSearch
        }, {
            ...Utils.pbtAxiosConfig,
        }).then(res => {
            if (res.data.res.length) {
                let appendArray = [];
                res.data.res.forEach(element => {
                    appendArray.push({
                        BAG_SERIES: element.BAG_SERIES,
                        BATCH_NO: element.BATCH_NO,
                        CREATOR: element.CREATOR,
                        LINE: element.LINE,
                        SEQUENCE: element.SEQUENCE,
                        PRD_PC: element.PRD_PC,
                        LOT_NO: element.LOT_NO,
                        CREATOR_NAME: element.CREATOR_NAME,
                        WEIGHT: element.WEIGHT,
                        CREATE_TIME: moment(element.CREATE_TIME).format('YYYY-MM-DD HH:mm:ss'),
                        //TOTAL_WEIGHT: element.TOTAL_WEIGHT || 0,
                        DETAIL_BTN: element.BATCH_NO,
                        LABEL_BTN: element.BATCH_NO,
                        DEL_BTN: element.BATCH_NO,
                    });
                });
                setRows(appendArray);
                /*
                setRows([
                    { BAG_SERIES: '1000/3000(W)', CREATOR: '17805', CREATE_TIME: moment(new Date()).format('YYYY-MM-DD HH:mm:ss'), TOTAL_WEIGHT: 50 },
                    { BAG_SERIES: '5000', CREATOR: '17805', CREATE_TIME: moment(new Date()).format('YYYY-MM-DD HH:mm:ss'), TOTAL_WEIGHT: 800 },
                    { BAG_SERIES: '2000/4000(B)', CREATOR: '17805', CREATE_TIME: moment(new Date()).format('YYYY-MM-DD HH:mm:ss'), TOTAL_WEIGHT: 70 },
                ]);
                */
            } else {
                toast.warn('未查詢到符合的的太空袋');
            }
        }).catch(err => console.error(err))
            .finally(() => setIsLoading(false));
    }

    //輸出表格
    const exportCSV = () => {
        if (rows.length) {
            const hot = hotTableComponent.current.hotInstance;
            const exportPlugin = hot.getPlugin('exportFile');
            exportPlugin.downloadFile('csv', {
                bom: true,
                columnDelimiter: ',',
                columnHeaders: true,
                exportHiddenColumns: true,
                rowHeaders: false,
                exportHiddenRows: true,
                fileExtension: 'csv',
                filename: '料頭產出紀錄表',
                mimeType: 'text/csv',
                rowDelimiter: '\r\n',
            });
        } else {
            toast.warn('請先查詢，再做匯出');
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

    //掃料頭QR Code帶出內容物
    const qrcodeBtn = () => {
        let timerInterval;
        Swal.fire({
            title: '請於10秒內掃描領料棧板QR Code!',
            input: 'text',
            inputPlaceholder: 'QRCode',
            showConfirmButton: false,
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
                //setScrapBatchNo(result.value);
                detailBtn(result.value);
            }
        }).catch(err => alert('QRCode Error ', err));
    }

    //生成太空包種類的選項
    const generateBag = () => {
        let div = [];
        bags.forEach((element, index) => {
            div.push(
                <option key={index} value={element}>{element}</option>
            );
        });
        return div;
    }

    //更新儲存料頭產出紀錄表
    const updateScraps = () => {
        if (!scrapRows.filter(x => (x.DISALLOW)).length && !scrapRows.filter(x => (x.SCHEDULE_ERR)).length) {
            setIsLoading(true);

            const apiUrl = Utils.generateApiUrl('/extrusion/updateBags', [scrapBatchNo]);
            axios.post(apiUrl, {
                scrapList: [...scrapRows].filter(x => ('AUTO' === x.CREATE_TIME && 'AUTO' !== x.PRD_PC)), //只儲存允許新增的
                type: 'create',
            }, {
                ...Utils.pbtAxiosConfig,
            }).then(res => {
                if (!res.data.error) {
                    toast.success('新增儲存成功');
                    detailBtn(scrapBatchNo);
                } else {
                    toast.error(`儲存失敗，${res.data.res}`);
                }
            }).catch(err => console.error(err))
                .finally(() => setIsLoading(false));
        } else {
            toast.error('儲存失敗，有異常的品番或時間');
        }
    }

    //料頭產出紀錄表新增一行
    const newRow = () => {
        let oldRow = [...scrapRows];
        oldRow.push({
            LINE: '', SEQUENCE: '', PRD_PC: 'AUTO',
            WEIGHING_WEIGHT_BEFORE: `=E${oldRow.length}`, WEIGHING_WEIGHT: 0, WEIGHING_DIFF: `=E${oldRow.length + 1}-D${oldRow.length + 1}`,
            WEIGHT: `=SUM(H${oldRow.length + 1}:J${oldRow.length + 1})`, WEIGHT_RESTART: 0, WEIGHT_BREAK: 0, WEIGHT_ABNORMAL: 0,
            CREATOR: user.PPS_CODE, CREATOR_NAME: user.NAME, CREATE_TIME: 'AUTO',
        });
        setScrapRows(oldRow);
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

    return (
        <div className="extrusion-scrap-page col-12 px-0">

            <div className="input-group input-group-sm mt-2">
                <span className="input-group-text">標籤機</span>
                <select className="form-select" value={selPrinter} onChange={evt => setSelPrinter(evt.target.value)}>
                    <option>---請選擇---</option>
                    {generatePrinter()}
                </select>
            </div>

            <div className="input-group input-group-sm mt-2">
                <span className="input-group-text">太空袋</span>
                <select className="form-select" value={selBag} onChange={evt => setSelBag(evt.target.value)}>
                    <option>---請選擇---</option>
                    {generateBag()}
                </select>
            </div>

            <button type="button" className="btn btn-sm btn-warning mt-2 me-2" onClick={printCrush} disabled={isLoading}><span className="icon bi-printer"></span> 粉碎料頭列印</button>
            <button type="button" className="btn btn-sm btn-warning mt-2" onClick={createBag} disabled={isLoading}><span className="icon bi-printer"></span> 回收太空袋列印</button>

            <hr />

            <h3>料頭產出記錄查詢表</h3>
            <div className="input-group input-group-sm">
                <span className="input-group-text">開始</span>
                <input type="date" className="form-control me-2" defaultValue={startDate} onChange={evt => setStartDate(evt.target.value)} />

                <span className="input-group-text">截止</span>
                <input type="date" className="form-control" defaultValue={endDate} onChange={evt => setEndDate(evt.target.value)} />
            </div>

            <div className="input-group input-group-sm mt-2">
                <span className="input-group-text">太空袋種類</span>
                <select className="form-select" value={queryBagSeries} onChange={evt => setQueryBagSeries(evt.target.value)}>
                    <option value='*'>全部</option>
                    {generateBag()}
                </select>
            </div>

            <div className="input-group input-group-sm mt-2">
                <span className="input-group-text">線別</span>
                <select className="form-select" value={lineSearch} onChange={evt => setLineSearch(evt.target.value)}>
                    <option value={"*"}>*</option>
                    {generateFeederLine()}
                </select>

                <span className="input-group-text">序號</span>
                <input type="text" className="form-control" value={seqSearch} onChange={evt => setSeqSearch(evt.target.value)} />
            </div>

            <div className="input-group input-group-sm mt-2">
                <span className="input-group-text">產品簡碼</span>
                <input type="text" className="form-control" value={prdPCSearch} onChange={evt => setPRDPCSearch(evt.target.value)} />

                <span className="input-group-text">排程批號</span>
                <input type="text" className="form-control" value={lotNoSearch} onChange={evt => setLotNoSearch(evt.target.value)} />
            </div>

            <button type="button" className="btn btn-sm btn-primary mt-2 me-2" onClick={queryAllBags} disabled={isLoading}><span className="icon bi-search"></span> 查詢</button>
            <button type="button" className="btn btn-sm btn-success mt-2" onClick={exportCSV} disabled={isLoading}><span className="icon bi-cloud-download"></span> 匯出</button>

            <div className="extursion-scrap-table w-100 overflow-hidden mt-2" style={{ minHeight: "16rem" }}>
                <HotTable
                    data={rows}
                    columns={columns}
                    colHeaders={colHeader}
                    rowHeaders={false}
                    readOnly={true}
                    ref={hotTableComponent}
                    licenseKey="non-commercial-and-evaluation"
                />
            </div>

            <hr />

            <h3>料頭產出紀錄表</h3>
            <div className="input-group input-group-sm mt-2">
                <span className="input-group-text">太空袋</span>
                <input type="text" className="form-control" value={scrapBatchNo} disabled />
                <button type="button" className="btn btn-success me-2" onClick={qrcodeBtn} disabled={isLoading}><span className="icon bi-qr-code-scan"></span> QR Code</button>
                <button type="button" className="btn btn-primary" onClick={() => detailBtn(scrapBatchNo)} disabled={isLoading || !scrapBatchNo.length}><span className="icon bi-search"></span> 查詢</button>
            </div>

            <div className="input-group input-group-sm mt-2">
                <span className="input-group-text">建立人員</span>
                <input type="text" className="form-control" value={scrapBagCreator} disabled />
            </div>

            <div className="input-group input-group-sm mt-2">
                <span className="input-group-text">料頭回收太空袋種類</span>
                <input type="text" className="form-control" value={scrapBagSeries} disabled />
            </div>

            <button type="button" className="btn btn-outline-success btn-sm mt-2 me-2" onClick={updateScraps} disabled={isLoading || !scrapBatchNo}><span className="icon bi-save"></span> 儲存</button>
            <button type="button" className="btn btn-outline-info btn-sm mt-2" onClick={newRow} disabled={isLoading || !scrapBatchNo}><span className="icon bi-plus-circle"></span> 新增一列</button>
            <ScrapRecordTable
                rows={scrapRows}
                feeders={feeders}
                bagSeries={scrapBagSeries}
                batchNo={scrapBatchNo}
                isAdmin={isAdmin}
                readOnlyRows={readOnlyRows} />
        </div >
    )
}

export default ExtrusionScrap;