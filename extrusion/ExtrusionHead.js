import React, { useState, useRef } from "react";
import { HotTable } from '@handsontable/react';
import { registerAllCellTypes } from 'handsontable/cellTypes';
import Utils from '../Utils';
import axios from 'axios';
import { toast } from 'react-toastify';
import moment from 'moment';

function ExtrusionHead(props) {

    const printers = props.printers || []; //所有標籤機
    const feeders = props.feeders || []; //所有入料機

    registerAllCellTypes();

    const [isLoading, setIsLoading] = useState(false);

    const [line, setLine] = useState(() => {
        const loadLocal = localStorage.getItem('extrusionHead');
        return loadLocal ? JSON.parse(loadLocal)['line'] : 'C';
    });
    const [sequence, setSequence] = useState(() => {
        const loadLocal = localStorage.getItem('extrusionHead');
        return loadLocal ? JSON.parse(loadLocal)['sequence'] : 6703;
    });

    const [productNo, setProductNo] = useState('');
    const [lotNo, setLotNo] = useState('');
    const [weight, setWeight] = useState('');
    const [scheduleStartTime, setScheduleStartTime] = useState('');
    const [scheduleEndTime, setScheduleEndTime] = useState('');
    const [selPrinter, setSelPrinter] = useState('');
    const [productReason, setProductReason] = useState('');  //產出說明
    const [remark, setRemark] = useState('');  //備註

    const [lineSearch, setLineSearch] = useState('*');  //查詢表-線別
    const [seqSearch, setSeqSearch] = useState('*');  //查詢表-序號
    const [productNoSearch, setProductNoSearch] = useState('*');  //查詢表-成品簡碼
    const [lotNoSearch, setLotNoSearch] = useState('*');  //查詢表-主排程批號

    const [startDate, setStartDate] = useState(moment(new Date()).format('YYYY-MM-DD'));
    const [endDate, setEndDate] = useState(moment(new Date()).format('YYYY-MM-DD'));
    const [rows, setRows] = useState([]);

    const columns = [
        { data: 'LINE', type: 'text', width: 50 },
        { data: 'SEQUENCE', type: 'text', width: 50 },
        { data: 'LOT_NO', type: 'text', width: 110 },
        { data: 'PRD_PC', type: 'text', width: 90 },
        { data: 'WEIGHT', type: 'numeric', width: 50 },
        { data: 'CREATOR', type: 'text', width: 80 },
        { data: 'CREATOR_NAME', type: 'text', width: 80 },
        { data: 'CREATE_TIME', type: 'text', width: 160 },
        { data: 'PRD_REASON', type: 'text', width: 120 },
        { data: 'REMARK', type: 'text', width: 200 },
    ];
    const colHeader = ['線別', '序號', 'Lot No', '成品簡碼', '重量', '員工編號', '名字', '標籤列印時間', '產出說明', '備註'];
    const hotTableComponent = useRef(null);

    //線別+序號查詢排程的成品簡碼與啟動/結束時間
    const querySchedule = () => {
        setProductNo('');
        setLotNo('');
        setScheduleStartTime('');
        setScheduleEndTime('');
        setIsLoading(false);

        if (line && sequence) {
            localStorage.setItem('extrusionHead', JSON.stringify({ line: line, sequence: sequence }));

            const apiUrl = Utils.generateApiUrl('/schedules', [line, sequence]);
            axios.get(apiUrl, {
                ...Utils.pbtAxiosConfig,
            }).then(res => {
                if (!res.data.error && res.data.res.length) {
                    setProductNo(res.data.res[0].PRD_PC || '');
                    setLotNo(res.data.res[0].LOT_NO || '');
                    setScheduleStartTime(res.data.res[0].ACT_STR_TIME ? moment(res.data.res[0].ACT_STR_TIME).format('YYYY-MM-DD HH:mm:ss') : '');
                    setScheduleEndTime(res.data.res[0].ACT_END_TIME ? moment(res.data.res[0].ACT_END_TIME).format('YYYY-MM-DD HH:mm:ss') : '');
                } else {
                    toast.error(`查詢失敗，${res.data.res}`);
                }
            }).catch(err => console.error(err))
                .finally(() => setIsLoading(false));

        } else {
            toast.error('請輸入線別與序號');
        }
    }

    //紀錄與列印前料標籤
    const createLabel = () => {
        if (scheduleStartTime.length && !scheduleEndTime.length) {
            setIsLoading(true);

            const apiUrl = Utils.generateApiUrl('/extrusion/createHeadMaterial', [line, sequence]);
            axios.post(apiUrl, {
                weight: weight,
                productNo: productNo,
                lotNo: lotNo,
                printer: selPrinter,
                productreason: productReason,
                remark: remark,
            }, {
                ...Utils.pbtAxiosConfig,
            }).then(res => {
                if (!res.data.error) {
                    toast.success('列印前料成功');
                    setProductNo('');
                    setLotNo('');
                    setWeight('');
                    setScheduleStartTime('');
                    setScheduleEndTime('');
                } else {
                    toast.error(`列印前料失敗，${res.data.res}`);
                }
            }).catch(err => console.error(err))
                .finally(() => setIsLoading(false));
        } else {
            toast.error('該排程尚未開始或已結束');
        }
    }

    const query = () => {
        setRows([]);
        setIsLoading(false);

        const apiUrl = Utils.generateApiUrl('/extrusion/getHeadMaterial');
        axios.post(apiUrl, {
            startdate: moment(startDate).format('YYYYMMDD'),
            enddate: moment(endDate).format('YYYYMMDD'),
            lineSearch: lineSearch,
            seqSearch: seqSearch,
            productNoSearch: productNoSearch,
            lotNoSearch: lotNoSearch,
        }, {
            ...Utils.pbtAxiosConfig,
        }).then(res => {
            if (res.data.res.length) {
                let appendArray = [];
                res.data.res.forEach(element => {
                    appendArray.push({
                        LINE: element.LINE,
                        SEQUENCE: element.SEQUENCE,
                        LOT_NO: element.LOT_NO,
                        PRD_PC: element.PRD_PC,
                        WEIGHT: element.WEIGHT,
                        CREATOR: element.CREATOR,
                        CREATOR_NAME: element.CREATOR_NAME,
                        CREATE_TIME: moment(element.CREATE_TIME).format('YYYY-MM-DD HH:mm:ss'),
                        PRD_REASON: element.PRD_REASON,
                        REMARK: element.REMARK,
                    });
                });
                setRows(appendArray);
            } else {
                toast.warn('未查詢到符合的紀錄');
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
                filename: '前料產出紀錄表',
                mimeType: 'text/csv',
                rowDelimiter: '\r\n',
            });
        } else {
            toast.warn('請先查詢，再做匯出');
        }
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

    return (
        <div className="extrusion-head-page col-12 px-0">
            <h3>前料產出申請表</h3>
            <div className="input-group input-group-sm">
                <span className="input-group-text">線別</span>
                <select className="form-select me-2" value={line} onChange={evt => setLine(evt.target.value)} >
                    {generateFeederLine()}
                </select>

                <span className="input-group-text">序號</span>
                <input type="number" className="form-control" value={sequence} onChange={evt => setSequence(evt.target.value)} />
            </div>

            <div className="input-group input-group-sm mt-2">
                <span className="input-group-text">成品簡碼</span>
                <input type="text" className="form-control me-2" value={productNo} disabled />

                <span className="input-group-text">Lot No</span>
                <input type="text" className="form-control" value={lotNo} disabled />
            </div>

            <div className="input-group input-group-sm mt-2">
                <span className="input-group-text">重量(kg)</span>
                <input type="number" className="form-control" value={weight} onChange={evt => setWeight(evt.target.value)} />
            </div>

            <div className="input-group input-group-sm mt-2">
                <span className="input-group-text">排程啟動</span>
                <input type="text" className="form-control me-2" value={scheduleStartTime} disabled />

                <span className="input-group-text">排程結束</span>
                <input type="text" className="form-control" value={scheduleEndTime} disabled />
            </div>

            <div className="input-group input-group-sm mt-2">
                <span className="input-group-text">標籤機</span>
                <select className="form-select" value={selPrinter} onChange={evt => setSelPrinter(evt.target.value)}>
                    <option>---請選擇---</option>
                    {generatePrinter()}
                </select>
            </div>

            <div className="input-group input-group-sm mt-2">
                <span className="input-group-text">產出說明</span>
                <select className="form-select" value={productReason} onChange={evt => setProductReason(evt.target.value)}>
                    <option value={"---請選擇---"}>---請選擇---</option>
                    <option value={"正常開機產出"}>正常開機產出</option>
                    <option value={"取樣產出"}>取樣產出</option>
                    <option value={"特別洗料"}>特別洗料</option>
                    <option value={"其他(異常產出)"}>其他(異常產出)</option>
                </select>

                <span className="input-group-text">備註</span>
                <input type="text" className="form-control" value={remark} onChange={evt => setRemark(evt.target.value)} />
            </div>

            <button type="button" className="btn btn-primary mt-2 me-2" onClick={querySchedule} disabled={isLoading}><span className="icon bi-search"></span> 帶出</button>
            <button type="button" className="btn btn-secondary mt-2" onClick={createLabel} disabled={isLoading || !productNo.length || !lotNo.length || 0 >= weight}><span className="icon bi-printer"></span> 列印</button>

            <hr />

            <h3>前料產出紀錄查詢表</h3>
            <div className="input-group input-group-sm mt-2">
                <span className="input-group-text">開始日期</span>
                <input type="date" className="form-control me-2" value={startDate} onChange={evt => setStartDate(evt.target.value)} />

                <span className="input-group-text">截止日期</span>
                <input type="date" className="form-control" value={endDate} onChange={evt => setEndDate(evt.target.value)} />
            </div>

            <div className="input-group input-group-sm mt-2">
                <span className="input-group-text">線別</span>
                <input type="text" className="form-control" value={lineSearch} onChange={evt => setLineSearch(evt.target.value)} />

                <span className="input-group-text">序號</span>
                <input type="text" className="form-control" value={seqSearch} onChange={evt => setSeqSearch(evt.target.value)} />

                <span className="input-group-text">成品簡碼</span>
                <input type="text" className="form-control" value={productNoSearch} onChange={evt => setProductNoSearch(evt.target.value)} />

                <span className="input-group-text">Lot No</span>
                <input type="text" className="form-control" value={lotNoSearch} onChange={evt => setLotNoSearch(evt.target.value)} />
            </div>

            <button type="button" className="btn btn-primary btn-sm mt-2 me-2" onClick={query} disabled={isLoading}><span className="icon bi-search"></span> 查詢</button>
            <button type="button" className="btn btn-success btn-sm mt-2" onClick={exportCSV} disabled={isLoading}><span className="icon bi-cloud-download"></span> 匯出</button>

            <div className="extursion-head-table mt-2" style={{ minHeight: "20rem" }}>
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
        </div>
    )
}

export default ExtrusionHead;