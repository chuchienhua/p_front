import React, { useState, useEffect, useRef } from 'react';
import { HotTable } from '@handsontable/react';
import Handsontable from 'handsontable';
import { registerAllCellTypes } from 'handsontable/cellTypes';
import axios from 'axios';
import Utils from '../Utils';
import moment from 'moment';
import { toast } from 'react-toastify';

function TraceRecord() {

    registerAllCellTypes();

    const [isLoading, setIsLoading] = useState(false);

    const [queryType, setQueryType] = useState('date');
    const [searchDate, setSearchDate] = useState(moment(new Date()).format('YYYY-MM-DD'));
    const [line, setLine] = useState('H');
    const [sequence, setSequence] = useState(1745);
    const [lotNo, setLotNo] = useState('');
    const [productNo, setProductNo] = useState('');
    const [startDate, setStartDate] = useState(moment(new Date()).subtract(1, 'month').format('YYYY-MM-DD'));
    const [endDate, setEndDate] = useState(moment(new Date()).format('YYYY-MM-DD'));
    const [pickStage, setPickStage] = useState('ALL');

    const [lotNoList, setLotNoList] = useState([]); //所有批號列表
    const [showLotNo, setShowLotNo] = useState(''); //欲顯示的批號

    const [rowsTemp, setRowsTemp] = useState([]); //根據選擇的PRO_LOT_NO切換顯示表格內容
    const [rows, setRows] = useState([]);
    const columns = [
        { data: 'LINE', type: 'text', width: 55, className: 'htCenter' },
        { data: 'SEQUENCE', type: 'text', width: 55, className: 'htCenter' },
        { data: 'STAGE', type: 'text', width: 70 },
        { data: 'BATCH_SEQ_START', type: 'numeric', width: 70 },
        { data: 'BATCH_SEQ_END', type: 'numeric', width: 70 },
        { data: 'MATERIAL', type: 'text', width: 110 },
        { data: 'LOT_NO', type: 'text', width: 150 },
        { data: 'BATCH_NO', type: 'text', width: 150 },
        { data: 'QA_RESULT', type: 'text', width: 75 },
        { data: 'WEIGHT', type: 'numeric', width: 75 },
        { data: 'PICK_NUM', type: 'numeric', width: 75 },
        { data: 'PICK_DATE', type: 'text', width: 170 },
        { data: 'PPS_CODE', type: 'text', width: 70 },
        { data: 'NAME', type: 'text', width: 60 },
    ];
    const colHeader = ['線別', '序號', '使用階段', '起始批號', '結束批號', '原料簡碼', '原料批號', '棧板編號', '品檢值', '領用重量', '領用包數', '領用時間', '員工編號', '人員'];
    const hotTableComponent = useRef(null);

    useEffect(() => {
        if (showLotNo.length) {
            if ('*' !== showLotNo) {
                setRows(rowsTemp.filter(x => x.PRO_LOT_NO === showLotNo));
            } else {
                setRows(rowsTemp);
            }
        }
    }, [showLotNo, rowsTemp])

    //原料追包裝成品
    const query = () => {
        setIsLoading(true);
        setRows([]);
        setShowLotNo('');

        const apiUrl = Utils.generateApiUrl('/trace/palletPicked');
        axios.post(apiUrl, {
            queryType: queryType,
            searchDate: searchDate,
            line: line,
            sequence: sequence,
            lotNo: lotNo,
            productNo: productNo,
            startDate: startDate,
            endDate: endDate,
            pickStage: pickStage,
        }, {
            ...Utils.pbtAxiosConfig,
        }).then(res => {
            if (!res.data.error) {
                let appendArray = [];
                let lotNoSet = new Set([]);
                //console.log(res.data.res);
                res.data.res.forEach(element => {
                    appendArray.push({
                        LINE: element.LINE,
                        SEQUENCE: element.SEQUENCE,
                        STAGE: ('MIX' === element.STAGE) ? '拌粉' : '押出',
                        BATCH_SEQ_START: element.BATCH_SEQ_START,
                        BATCH_SEQ_END: element.BATCH_SEQ_END,
                        BATCH_NO: element.BATCH_NO, //棧板編號(掃馬上那一個)
                        LOT_NO: element.LOT_NO || element.LOC_LOT_NO, //原料批號(再去儲位勾稽的)
                        MATERIAL: element.MATERIAL,
                        QA_RESULT: ('Y' === element.QA_RESULT || 'RE' === element.QA_RESULT) ? 'Y' : element.QA_RESULT,
                        WEIGHT: element.WEIGHT,
                        PICK_NUM: element.PICK_NUM,
                        PICK_DATE: element.PICK_DATE ? moment(element.PICK_DATE).format('YYYY-MM-DD HH:mm:ss') : '',
                        PPS_CODE: element.PPS_CODE,
                        NAME: element.NAME,
                        PRO_LOT_NO: element.PRO_LOT_NO,
                    });

                    if (!lotNoSet.has(element.PRO_LOT_NO)) {
                        lotNoSet.add(element.PRO_LOT_NO);
                    }
                });
                setRows(appendArray);

                if ('productNo' === queryType) {
                    setLotNoList([...lotNoSet]);
                    setRowsTemp(appendArray);
                }
            } else {
                toast.error(`查詢失敗，${res.data.res}`);
            }
        }).catch(err => console.error(err))
            .finally(() => setIsLoading(false));
    }

    //輸出表格
    const exportFile = () => {
        //FIXME:沒Import Handsontable可能會跳出Cannot read properties of undefined (reading 'downloadFile')
        if (Handsontable.Core.length) {
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
                filename: '領用原料棧板表',
                mimeType: 'text/csv',
                rowDelimiter: '\r\n',
            });
        }
    }

    const generateLotNoList = () => {
        let div = [];
        lotNoList.forEach((element, index) => {
            div.push(
                <option key={index} value={element}>{element}</option>
            );
        });
        return div;
    }

    return (
        <div className='trace-record-page col-12 px-0'>
            <div className='input-group input-group-sm mt-2'>
                <span className="input-group-text">查詢方式</span>
                <select className="form-select me-2" value={queryType} onChange={evt => setQueryType(evt.target.value)} style={{ maxWidth: '120px' }}>
                    <option value="order">工令</option>
                    <option value="lotNo">批號</option>
                    <option value="productNo">成品簡碼</option>
                    <option value="date">日期</option>
                </select>

                <span className="input-group-text">階段</span>
                <select className="form-select me-2" value={pickStage} onChange={evt => setPickStage(evt.target.value)} style={{ maxWidth: '100px' }}>
                    <option value="ALL">全部</option>
                    <option value="MIX">拌粉</option>
                    <option value="EXTRUSION">押出</option>
                    <option value="scrap">料頭</option>
                    <option value="head">前料</option>
                    <option value="return">回爐品</option>
                    <option value="REMAINBAG">殘包</option>
                </select>

                <span className={`input-group-text ${'date' === queryType ? '' : 'd-none'}`}>日期</span>
                <input type="date" className={`form-control ${'date' === queryType ? '' : 'd-none'}`} value={searchDate} onChange={evt => setSearchDate(evt.target.value)} style={{ maxWidth: '120px' }} />

                <span className={`input-group-text ${'order' === queryType ? '' : 'd-none'}`}>線別</span>
                <input type='text' className={`form-control ${'order' === queryType ? '' : 'd-none'}`} value={line} onChange={evt => setLine(evt.target.value)} style={{ maxWidth: '50px' }} />

                <span className={`input-group-text ${'order' === queryType ? '' : 'd-none'}`}>序號</span>
                <input type='number' className={`form-control ${'order' === queryType ? '' : 'd-none'}`} value={sequence} onChange={evt => setSequence(evt.target.value)} style={{ maxWidth: '70px' }} />

                <span className={`input-group-text ${'lotNo' === queryType ? '' : 'd-none'}`}>批號</span>
                <input type='text' className={`form-control ${'lotNo' === queryType ? '' : 'd-none'}`} value={lotNo} onChange={evt => setLotNo(evt.target.value)} style={{ maxWidth: '100px' }} />

                <span className={`input-group-text ${'productNo' === queryType ? '' : 'd-none'}`}>成品簡碼</span>
                <input type='text' className={`form-control ${'productNo' === queryType ? '' : 'd-none'}`} value={productNo} onChange={evt => setProductNo(evt.target.value)} style={{ maxWidth: '120px' }} />

                <span className={`input-group-text ${'productNo' === queryType ? '' : 'd-none'}`}>日期</span>
                <input type='date' className={`form-control ${'productNo' === queryType ? '' : 'd-none'}`} value={startDate} onChange={evt => setStartDate(evt.target.value)} style={{ maxWidth: '120px' }} />

                <span className={`input-group-text ${'productNo' === queryType ? '' : 'd-none'}`}>-</span>
                <input type='date' className={`form-control ${'productNo' === queryType ? '' : 'd-none'}`} value={endDate} onChange={evt => setEndDate(evt.target.value)} style={{ maxWidth: '120px' }} />

                <button type='button' className='btn btn-primary rounded-end me-2' onClick={query} disabled={isLoading}><span className='icon bi-search'></span> 查詢</button>
                <button type="button" className="btn btn-outline-success rounded" onClick={exportFile} disabled={isLoading || !rows.length}><span className="icon bi-cloud-download"></span> 匯出</button>
            </div>

            <div className="badge rounded-pill text-bg-warning">空輸樹酯原料因每十分鐘自動扣儲位，將整併為一筆</div>

            {('productNo' === queryType) &&
                <div className="input-group input-group-sm w-25 mt-2">
                    <span className="input-group-text">顯示Lot No</span>
                    <select className="form-select" value={showLotNo} onChange={evt => setShowLotNo(evt.target.value)}>
                        <option value='*'>全選</option>
                        {generateLotNoList()}
                    </select>
                </div>
            }

            <div className="trace-record-table mt-2 mb-2">
                <HotTable
                    licenseKey="non-commercial-and-evaluation"
                    data={rows}
                    columns={columns}
                    colHeaders={colHeader}
                    rowHeaders={false}
                    readOnly={true}
                    ref={hotTableComponent}
                />
            </div>
        </div>
    );
}

export default TraceRecord;