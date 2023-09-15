import React, { useState } from "react";
import { HotTable } from '@handsontable/react';
import axios from 'axios';
import Utils from '../Utils';
import moment from 'moment';
import { toast } from 'react-toastify';

function CrewPerformance() {

    const [isLoading, setIsLoading] = useState(false);

    const [startDate, setStartDate] = useState(moment(new Date()).subtract(7, 'days').format('YYYY-MM-DD'));
    const [endDate, setEndDate] = useState(moment(new Date()).format('YYYY-MM-DD'));

    const [icRows, setIcRows] = useState([]); //領班
    const [controllerRows, setControllerRows] = useState([]); //主控
    const columns = [
        { data: 'NAME', type: 'text', width: 70 },
        { data: 'PRODUCTIVITY', type: 'numeric', numericFormat: { pattern: '##0.0' }, width: 90 },
        { data: 'SCRAP_WEIGHT', type: 'numeric', numericFormat: { pattern: '##0.0' }, width: 90 },
        { data: 'SCRAP_RATIO', type: 'numeric', numericFormat: { pattern: '##0.00' }, width: 90 },
        { data: 'PRODUCTION_TIME', type: 'numeric', numericFormat: { pattern: '##0.0' }, width: 110 },
        { data: 'STOP_TIME', type: 'numeric', numericFormat: { pattern: '##0.0' }, width: 110 },
        { data: 'STOP_RATIO', type: 'numeric', numericFormat: { pattern: '##0.000' }, width: 90 },
        { data: 'PRODUCTIVITY_HR', type: 'numeric', numericFormat: { pattern: '##0.000' }, width: 90 },
    ];
    const colHeader = ['人員', '產量(MT)', '料頭(kg)', '不良率(%)', '生產時數(hr)', '停機時數(hr)', '停機率(%)', '生產力'];

    const query = () => {
        setIsLoading(true);
        setIcRows([]);
        setControllerRows([]);

        const apiUrl = Utils.generateApiUrl('/extrusion/getCrewPerformance', [moment(startDate).format('YYYYMMDD'), moment(endDate).format('YYYYMMDD')]);
        axios.get(apiUrl, {
            ...Utils.pbtAxiosConfig,
        }).then(res => {
            if (!res.data.error) {
                let appendIcArray = [];
                let appendControllerArray = [];

                //領班部分
                res.data.ic.forEach(element => {
                    appendIcArray.push({
                        NAME: element.IC_NAME,
                        PRODUCTIVITY: element.PRODUCTIVITY,
                        SCRAP_WEIGHT: element.SCRAP_WEIGHT,
                        SCRAP_RATIO: element.SCRAP_WEIGHT / (element.PRODUCTIVITY * 1000),
                        PRODUCTION_TIME: element.PRODUCTION_TIME,
                        STOP_TIME: element.STOP_TIME,
                        STOP_RATIO: element.STOP_TIME / element.PRODUCTION_TIME,
                        PRODUCTIVITY_HR: element.PRODUCTIVITY / element.PRODUCTION_TIME,
                    });
                });

                //主控部分
                res.data.controller.forEach(element => {
                    appendControllerArray.push({
                        NAME: element.CONTROLLER_NAME,
                        PRODUCTIVITY: element.PRODUCTIVITY,
                        SCRAP_WEIGHT: element.SCRAP_WEIGHT,
                        SCRAP_RATIO: element.SCRAP_WEIGHT / (element.PRODUCTIVITY * 1000),
                        PRODUCTION_TIME: element.PRODUCTION_TIME,
                        STOP_TIME: element.STOP_TIME,
                        STOP_RATIO: element.STOP_TIME / element.PRODUCTION_TIME,
                        PRODUCTIVITY_HR: element.PRODUCTIVITY / element.PRODUCTION_TIME,
                    });
                });

                setIcRows(appendIcArray);
                setControllerRows(appendControllerArray);
            } else {
                toast.error(`查詢失敗，${res.data.res}`);
            }
        }).catch(err => console.error(err))
            .finally(() => setIsLoading(false));
    }

    return (
        <div className="col-12 px-0">
            <div className='input-group input-group-sm w-50 mt-2 mb-2'>
                <span className='input-group-text'>起始日期</span>
                <input type='date' className='form-control' value={startDate} onChange={evt => setStartDate(evt.target.value)} />

                <span className='input-group-text'>結束日期</span>
                <input type='date' className='form-control' value={endDate} onChange={evt => setEndDate(evt.target.value)} />

                <button type='button' className='btn btn-primary rounded-end me-2' onClick={query} disabled={isLoading}><span className='icon bi-search'></span> 查詢</button>
            </div>

            <h4>領班</h4>
            <div className="mt-2 mb-2">
                <HotTable
                    data={icRows}
                    columns={columns}
                    colHeaders={colHeader}
                    rowHeaders={false}
                    columnSorting={true}
                    readOnly={true}
                    licenseKey="non-commercial-and-evaluation"
                />
            </div>

            <h4>主控</h4>
            <div className="mt-2 mb-2">
                <HotTable
                    data={controllerRows}
                    columns={columns}
                    colHeaders={colHeader}
                    rowHeaders={false}
                    columnSorting={true}
                    readOnly={true}
                    licenseKey="non-commercial-and-evaluation"
                />
            </div>
        </div>
    )
}

export default CrewPerformance;