import React, { useState, useRef } from 'react';
import { HotTable } from '@handsontable/react';
import { registerAllCellTypes } from 'handsontable/cellTypes';
import axios from 'axios';
import Utils from '../Utils';
import moment from 'moment';
import { toast } from 'react-toastify';
import ShutdownChart from './ShutdownChart';

function ShutdownAnalyze() {

    registerAllCellTypes();

    const [isLoading, setIsLoading] = useState(false);

    const [startDate, setStartDate] = useState(moment(new Date()).subtract(2, 'month').format('YYYY-MM-DD'));
    const [endDate, setEndDate] = useState(moment(new Date()).format('YYYY-MM-DD'));

    const [rows, setRows] = useState([]);
    const [sumArray, setSumArray] = useState([]);
    const columns = [
        { data: 'DATE', type: 'text', width: 100 },
        { data: 'STOP_1', type: 'numeric', numericFormat: { pattern: '##0.00' }, width: 70 },
        { data: 'STOP_2', type: 'numeric', numericFormat: { pattern: '##0.00' }, width: 70 },
        { data: 'STOP_3', type: 'numeric', numericFormat: { pattern: '##0.00' }, width: 70 },
        { data: 'STOP_4', type: 'numeric', numericFormat: { pattern: '##0.00' }, width: 90 },
        { data: 'STOP_5', type: 'numeric', numericFormat: { pattern: '##0.00' }, width: 90 },
        { data: 'STOP_6', type: 'numeric', numericFormat: { pattern: '##0.00' }, width: 100 },
        { data: 'STOP_7', type: 'numeric', numericFormat: { pattern: '##0.00' }, width: 80 },
        { data: 'STOP_TIME', type: 'numeric', numericFormat: { pattern: '##0.00' }, width: 110 },
    ];
    const colHeader = [
        ['', { label: '停機項目時數(Hr)', colspan: 7 }, ''],
        ['日期', '準備', '等待', '清機', '現場排除', '工務維修', '計畫性停機', '其他', '合計停機(Hr)'],
    ];
    const hotTableComponent = useRef(null);

    const query = () => {
        setIsLoading(true);
        setRows([]);

        const apiUrl = Utils.generateApiUrl('/extrusion/getShutdown', [moment(startDate).format('YYYYMMDD'), moment(endDate).format('YYYYMMDD')]);
        axios.get(apiUrl, {
            ...Utils.pbtAxiosConfig,
        }).then(res => {
            if (!res.data.error) {
                let sumArray = [0, 0, 0, 0, 0, 0, 0];
                let sumTotal = 0; //額外處理因合計停機不會等於前幾項加總(可能沒輸入完整)
                let appendArray = [];
                res.data.res.forEach(element => {
                    sumArray[0] += element.STOP_1;
                    sumArray[1] += element.STOP_2;
                    sumArray[2] += element.STOP_3;
                    sumArray[3] += element.STOP_4;
                    sumArray[4] += element.STOP_5;
                    sumArray[5] += element.STOP_6;
                    sumArray[6] += element.STOP_7;
                    sumTotal += element.STOP_TIME;
                    appendArray.push({
                        DATE: moment(element.REPORT_DATE).format('YYYY-MM-DD'),
                        STOP_1: element.STOP_1,
                        STOP_2: element.STOP_2,
                        STOP_3: element.STOP_3,
                        STOP_4: element.STOP_4,
                        STOP_5: element.STOP_5,
                        STOP_6: element.STOP_6,
                        STOP_7: element.STOP_7,
                        STOP_TIME: element.STOP_TIME,
                    });
                });
                appendArray.push({
                    DATE: '加總',
                    STOP_1: sumArray[0],
                    STOP_2: sumArray[1],
                    STOP_3: sumArray[2],
                    STOP_4: sumArray[3],
                    STOP_5: sumArray[4],
                    STOP_6: sumArray[5],
                    STOP_7: sumArray[6],
                    STOP_TIME: sumTotal,
                })
                setSumArray(sumArray);
                setRows(appendArray);
            } else {
                toast.error(`查詢失敗，${res.data.res}`);
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
                filename: '停機分析',
                mimeType: 'text/csv',
                rowDelimiter: '\r\n',
            });
        } else {
            toast.warn('請先查詢，再做匯出');
        }
    }

    return (
        <div className='col-12 px-0'>
            <div className='input-group input-group-sm w-50 mt-2'>
                <span className='input-group-text'>起始日期</span>
                <input type='date' className='form-control' value={startDate} onChange={evt => setStartDate(evt.target.value)} />

                <span className='input-group-text'>結束日期</span>
                <input type='date' className='form-control' value={endDate} onChange={evt => setEndDate(evt.target.value)} />

                <button type='button' className='btn btn-primary rounded-end me-2' onClick={query} disabled={isLoading}><span className='icon bi-search'></span> 查詢</button>
                <button type="button" className="btn btn-outline-success rounded" onClick={exportCSV} disabled={!rows.length || isLoading}><span className="icon bi-cloud-download"></span> 匯出</button>
            </div>

            <div className="d-flex">
                <div className="shutdown-table overflow-hidden mt-2 mb-2" style={{ width: '800px', minHeight: '70vh' }}>
                    <HotTable
                        data={rows}
                        columns={columns}
                        nestedHeaders={colHeader}
                        rowHeaders={false}
                        columnSorting={true}
                        readOnly={true}
                        ref={hotTableComponent}
                        licenseKey="non-commercial-and-evaluation"
                    />
                </div>

                {sumArray.length ?
                    <ShutdownChart rows={sumArray} />
                    :
                    <></>
                }
            </div>
        </div>
    );
}

export default ShutdownAnalyze;