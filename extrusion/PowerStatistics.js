import React, { useState, useRef } from "react";
import axios from 'axios';
import moment from 'moment';
import Utils from '../Utils';
import { toast } from 'react-toastify';
import PowerConsumption from './report/PowerConsumption.js';
import LoadingPage from '../LoadingPage';
import PowerStopConsumption from "./report/PowerStopConsumption";

//用電統計
function PowerStatistics() {

    const [isLoading, setIsLoading] = useState(false);

    const [queryType, setQueryType] = useState('date');
    const [searchDate, setSearchDate] = useState(moment(new Date()).format('YYYY-MM-DD'));
    const [workShift, setWorkShift] = useState('早');
    const [line, setLine] = useState('F');
    const [seqStart, setSeqStart] = useState(1500);
    const [seqEnd, setSeqEnd] = useState(1502);
    const [startDate, setStartDate] = useState(moment(new Date()).subtract(1, 'week').format('YYYY-MM-DD'));
    const [endDate, setEndDate] = useState(moment(new Date()).format('YYYY-MM-DD'));

    const [rows, setRows] = useState([]);
    const [showType, setShowType] = useState('date');

    const [sumStop, setSumStop] = useState(0);
    const [sumConsumption, setSumConsumption] = useState(0);

    const hotTableComponent = useRef(null);

    const query = () => {
        let errorString = '';
        if ('stop' === queryType && 15 < moment(endDate).diff(startDate, 'days')) {
            errorString = '開始日期與結束日期不可差距超過15天';
        }

        if (errorString) {
            toast.error(errorString);
            return;
        }

        setIsLoading(true);
        setRows([]);
        setShowType(queryType);

        const apiUrl = Utils.generateApiUrl('/extrusion/getAmmeterStatistics');
        axios.post(apiUrl, { queryType, searchDate, workShift, line, seqStart, seqEnd, startDate, endDate }, { ...Utils.pbtAxiosConfig })
            .then(res => {
                if (!res.data.error) {
                    let appendArray = [];
                    if ('stop' === queryType) {
                        let sumStop = 0;
                        let sumConsumption = 0;
                        res.data.res.forEach(element => {
                            sumStop += (new Date(element.STOP_END_TIME) - new Date(element.STOP_START_TIME));
                            sumConsumption += element.CONSUMPTION ? element.CONSUMPTION : 0;
                            appendArray.push({
                                DATE: moment(element.STOP_START_TIME).format('YYYY/MM/DD'),
                                LINE: element.LINE,
                                SEQ_END: element.SEQ_END,
                                SEQ_START: element.SEQ_START,
                                STOP_START_TIME: moment(element.STOP_START_TIME).format('YYYY-MM-DD HH:mm:ss'),
                                STOP_END_TIME: moment(element.STOP_END_TIME).format('YYYY-MM-DD HH:mm:ss'),
                                CONSUMPTION: element.CONSUMPTION,
                            });
                        });
                        setSumStop(parseFloat(sumStop / (60 * 60 * 1000)).toFixed(2));
                        setSumConsumption(parseFloat(sumConsumption).toFixed(2));

                    } else {
                        res.data.res.forEach(element => {
                            const payWeight = ('order' === queryType) ? element.PACK_WEIGHT + element.HEAD_WEIGHT + element.SCRAP_WEIGHT + element.REMAIN_BAG_WEIGHT - element.REWORK_FEED : element.PAY_WEIGHT;
                            appendArray.push({
                                DATE: element.DATE,
                                WORK_SHIFT: element.WORK_SHIFT,
                                LINE: element.LINE,
                                SEQUENCE: element.SEQ,
                                PRODUCT_NO: element.PRD_PC,
                                PRODUCTIVITY: payWeight,
                                ACT_STR_TIME: element.ACT_STR_TIME ? moment(element.ACT_STR_TIME).format('YYYY-MM-DD HH:mm:ss') : '尚未開始',
                                ACT_END_TIME: element.ACT_END_TIME ? moment(element.ACT_END_TIME).format('YYYY-MM-DD HH:mm:ss') : '尚未結束',
                                CONSUMPTION: element.POWER_CONSUMPTION,
                                CONSUMPTION_PER_MT: (element.POWER_CONSUMPTION && payWeight) ? parseFloat(element.POWER_CONSUMPTION / (payWeight * 0.001)).toFixed(1) : 0,
                            });
                        });
                    }

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
                filename: `${('stop' === showType) ? '停俥' : '生產'}用電統計`,
                mimeType: 'text/csv',
                rowDelimiter: '\r\n',
            });
        } else {
            toast.warn('請先查詢，再做匯出');
        }
    }

    return (
        <div className="ammeter-statistics-page col-12 px-0 mt-2">
            <div className="input-group input-group-sm w-75">
                <span className="input-group-text">查詢方式</span>
                <select className="form-select" value={queryType} onChange={evt => setQueryType(evt.target.value)}>
                    <option value="date">日期班別</option>
                    <option value="order">工令</option>
                    <option value="stop">停俥耗電</option>
                </select>

                <span className={`input-group-text ${'date' === queryType ? '' : 'd-none'}`}>日期</span>
                <input type="date" className={`form-control ${'date' === queryType ? '' : 'd-none'}`} defaultValue={searchDate} onChange={evt => setSearchDate(evt.target.value)} />

                <span className={`input-group-text ${'date' === queryType ? '' : 'd-none'}`}>班別</span>
                <select className={`form-select ${'date' === queryType ? '' : 'd-none'}`} value={workShift} onChange={evt => setWorkShift(evt.target.value)}>
                    <option value="早">早</option>
                    <option value="中">中</option>
                    <option value="晚">晚</option>
                    <option value="*">*</option>
                </select>

                <span className={`input-group-text ${'order' === queryType ? '' : 'd-none'}`}>線別</span>
                <input type="text" className={`form-control ${'order' === queryType ? '' : 'd-none'}`} value={line} onChange={evt => setLine(evt.target.value)} />

                <span className={`input-group-text ${'order' === queryType ? '' : 'd-none'}`}>起始序號</span>
                <input type="number" className={`form-control ${'order' === queryType ? '' : 'd-none'}`} value={seqStart} onChange={evt => setSeqStart(evt.target.value)} />

                <span className={`input-group-text ${'order' === queryType ? '' : 'd-none'}`}>結束序號</span>
                <input type="number" className={`form-control ${'order' === queryType ? '' : 'd-none'}`} value={seqEnd} onChange={evt => setSeqEnd(evt.target.value)} />

                <span className={`input-group-text ${'stop' === queryType ? '' : 'd-none'}`}>開始日期</span>
                <input type="date" className={`form-control ${'stop' === queryType ? '' : 'd-none'}`} value={startDate} onChange={evt => setStartDate(evt.target.value)} />

                <span className={`input-group-text ${'stop' === queryType ? '' : 'd-none'}`}>結束日期</span>
                <input type="date" className={`form-control ${'stop' === queryType ? '' : 'd-none'}`} value={endDate} onChange={evt => setEndDate(evt.target.value)} />

                <button type="button" className="btn btn-primary btn-sm rounded-end" onClick={() => query()} disabled={isLoading}><span className="icon bi-search"></span> 查詢</button>
                <button type="button" className="btn btn-outline-success rounded ms-2" onClick={exportCSV} disabled={!rows.length || isLoading}><span className="icon bi-cloud-download"></span> 匯出</button>
            </div>

            {('stop' === showType) ?
                <PowerStopConsumption rows={rows} sumStop={sumStop} sumConsumption={sumConsumption} hotTableComponent={hotTableComponent} />
                :
                <PowerConsumption rows={rows} showType={showType} hotTableComponent={hotTableComponent} />
            }
            {(isLoading) &&
                <LoadingPage />
            }
        </div>
    );
}

export default PowerStatistics;