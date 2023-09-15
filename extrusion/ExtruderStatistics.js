import React, { useState, useCallback, useEffect } from 'react';
import { HotTable } from '@handsontable/react';
import Handsontable from 'handsontable';
import { registerAllCellTypes } from 'handsontable/cellTypes';
import axios from 'axios';
import Utils from '../Utils';
import moment from 'moment';
import { toast } from 'react-toastify';
import StatisticsChart from './StatisticsChart';
import ExtruderTrendChart from './ExtruderTrendChart';

function ExtruderStatistics(props) {

    const feeders = props.feeders || []; //所有入料機

    let params = new URLSearchParams(window.location.search);

    registerAllCellTypes();

    const [mounted, setMounted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const [line, setLine] = useState(params.get('line') || 'A');
    const [sequence, setSequence] = useState('*');
    const [productNo, setProductNo] = useState(params.get('prd') || '*');
    const [startDate, setStartDate] = useState(moment(new Date()).subtract(3, 'month').format('YYYY-MM-DD'));
    const [endDate, setEndDate] = useState(moment(new Date()).add(1, 'day').format('YYYY-MM-DD'));
    //const [chartType, setChartType] = useState('all'); //現在查看的圖表種類

    const [showLine, setShowLine] = useState('');
    const [showSequence, setShowSequence] = useState('');

    const [ecArray, setEcArray] = useState([]); //特定工令的電流值
    const [rpmArray, setRpmArray] = useState([]); //特定工令的轉速
    const [timeArray, setTimeArray] = useState([]); //工令每個點的時間
    const [ecAverage, setEcAverage] = useState(0); //特定工令的平均電流
    const [rpmAverage, setRpmAverage] = useState(0); //特定工令的轉速電流

    const [rows, setRows] = useState([]);
    const columns = [
        { data: 'LINE', type: 'text', width: 40 },
        { data: 'SEQUENCE', type: 'text', width: 45 },
        { data: 'LOT_NO', type: 'text', width: 120 },
        { data: 'PRD_PC', type: 'text', width: 120 },
        { data: 'ACT_STR_TIME', type: 'text', width: 160 },
        { data: 'ACT_END_TIME', type: 'text', width: 160 },
        {
            data: 'CHART_BTN',
            width: 70,
            renderer: function (instance, td, row, col, prop, value, cellProperties) {
                const icon = document.createElement('SPAN');
                icon.className = "icon bi-graph-up";
                icon.innerHTML = ' 顯示';

                const btn = document.createElement('CHART_BTN');
                btn.className = 'btn btn-outline-info btn-sm px-1 py-0 nowrap align-top';
                btn.appendChild(icon);

                Handsontable.dom.addEvent(btn, 'click', () => {
                    if (!isLoading) {
                        chartBtn(row);
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
        { data: 'EC_UCL', type: 'numeric', numericFormat: { pattern: '##0.00' }, width: 70 },
        {
            data: 'EC_AVG',
            type: 'numeric',
            numericFormat: { pattern: '##0.00' },
            width: 70,
            renderer: function (instance, td, row, col, prop, value, cellProperties) {
                Handsontable.renderers.NumericRenderer.apply(this, arguments);
                if (0 === value) {
                    td.classList.add('bg-danger');
                    td.classList.add('text-light');
                }
            },
        },
        { data: 'EC_LCL', type: 'numeric', numericFormat: { pattern: '##0.00' }, width: 70 },
        { data: 'EC_STD', type: 'numeric', numericFormat: { pattern: '##0.00' }, width: 70 },
        { data: 'EC_CPK', type: 'numeric', numericFormat: { pattern: '##0.00' }, width: 70 },
        { data: 'RPM_UCL', type: 'numeric', numericFormat: { pattern: '##0.00' }, width: 70 },
        {
            data: 'RPM_AVG',
            type: 'numeric',
            numericFormat: { pattern: '##0.00' },
            width: 70,
            renderer: function (instance, td, row, col, prop, value, cellProperties) {
                Handsontable.renderers.NumericRenderer.apply(this, arguments);
                if (0 === value) {
                    td.classList.add('bg-danger');
                    td.classList.add('text-light');
                }
            },
        },
        { data: 'RPM_LCL', type: 'numeric', numericFormat: { pattern: '##0.00' }, width: 70 },
        { data: 'RPM_STD', type: 'numeric', numericFormat: { pattern: '##0.00' }, width: 70 },
        { data: 'RPM_CPK', type: 'numeric', numericFormat: { pattern: '##0.00' }, width: 70 },
    ];
    const colHeader = [
        [
            '線別', '序號', '批號', '產品簡碼', '開機時間', '完成時間', '趨勢圖',
            { label: '押出機電流', colspan: 5 },
            { label: '押出機轉速', colspan: 5 }
        ],
        [
            '', '', '', '', '', '', '',
            '上限', '平均', '下限', '標準差', 'Cpk',
            '上限', '平均', '下限', '標準差', 'Cpk',
        ],
    ];

    //取得特定工令Vision Tags的趨勢圖
    const chartBtn = useCallback(async row => {

        //若未指定那一列，則抓網址參數，TODO:這段要再調整
        if (params.has('line') && params.has('seq')) {
            row = rows.findIndex(x => (x.SEQUENCE.toString() === params.get('seq')));
            params.delete('line');
            params.delete('seq');
            params.delete('prd');
            window.history.pushState(null, null, '/pbtc/extrusion?tabName=extruder');
        }

        setIsLoading(true);

        const apiUrl = Utils.generateApiUrl('/extrusion/getExtruderTags');
        axios.post(apiUrl, {
            line: rows[row].LINE,
            startTime: moment(rows[row].ACT_STR_TIME).toDate(),
            endTime: moment(rows[row].ACT_END_TIME).toDate(),
        }, {
            ...Utils.pbtAxiosConfig,
        }).then(res => {
            if (!res.data.error) {
                setEcArray(res.data.ec);
                setRpmArray(res.data.rpm);
                setShowLine(rows[row].LINE);
                setShowSequence(rows[row].SEQUENCE);
                setEcAverage(rows[row].EC_AVG);
                setRpmAverage(rows[row].RPM_AVG);
                setTimeArray(res.data.time.map(x => moment(x).format('MM-DD HH:mm')));
            } else {
                toast.error(`查詢失敗，${res.data.error}`);
            }
        }).catch(err => console.error(err))
            .finally(() => setIsLoading(false));
        //eslint-disable-next-line
    }, [rows])

    //查詢符合條件的所有工令
    const query = useCallback(async () => {
        setIsLoading(true);
        setEcArray([]);
        setRpmArray([]);

        const apiUrl = Utils.generateApiUrl('/extrusion/getExtruderStatistics', [
            line,
            sequence,
            productNo,
            moment(startDate).format('YYYYMMDD'),
            moment(endDate).format('YYYYMMDD'),
        ]);
        axios.get(apiUrl, {
            ...Utils.pbtAxiosConfig,
        }).then(res => {
            if (!res.data.error) {
                let appendArray = [];
                let orderData = {};
                let lastOrder = '';
                res.data.res.forEach(element => {
                    if (lastOrder !== element.LINE + element.SEQUENCE) {
                        orderData = {
                            LINE: element.LINE,
                            SEQUENCE: element.SEQUENCE,
                            LOT_NO: element.LOT_NO,
                            PRD_PC: element.PRD_PC,
                            ACT_STR_TIME: moment(element.ACT_STR_TIME).format('YYYY-MM-DD HH:mm:ss'),
                            ACT_END_TIME: moment(element.ACT_END_TIME).format('YYYY-MM-DD HH:mm:ss'),
                        };
                    }

                    if ('ec' === element.TAG_TYPE) {
                        orderData.EC_UCL = element.UCL;
                        orderData.EC_AVG = element.AVERAGE;
                        orderData.EC_LCL = element.LCL;
                        orderData.EC_STD = element.STD;
                        orderData.EC_CPK = element.CPK;
                    } else if ('rpm' === element.TAG_TYPE) {
                        orderData.RPM_UCL = element.UCL;
                        orderData.RPM_AVG = element.AVERAGE;
                        orderData.RPM_LCL = element.LCL;
                        orderData.RPM_STD = element.STD;
                        orderData.RPM_CPK = element.CPK;
                    }

                    if (lastOrder === element.LINE + element.SEQUENCE) {
                        appendArray.push(orderData);
                    }

                    lastOrder = element.LINE + element.SEQUENCE;
                });
                setRows(appendArray);
            } else {
                toast.error(`查詢失敗，${res.data.res}`);
            }
        }).catch(err => console.error(err))
            .finally(() => setIsLoading(false));
    }, [line, sequence, productNo, startDate, endDate])

    useEffect(() => {
        if (!mounted && params.has('line') && params.has('seq')) {
            query();
            setMounted(true);
        }
    }, [mounted, params, query])

    useEffect(() => {
        if (1 <= rows.length) {
            chartBtn(rows.length - 1);
        }
    }, [rows, chartBtn])

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
        <div className='col-12 px-0'>
            <div className='input-group input-group-sm mt-2'>
                <span className="input-group-text">線別</span>
                <select className="form-select" value={line} onChange={evt => setLine(evt.target.value)} style={{ maxWidth: '70px' }}>
                    {generateFeederLine()}
                </select>

                <span className='input-group-text'>序號</span>
                <input type='text' className='form-control' value={sequence} onChange={evt => setSequence(evt.target.value)} style={{ maxWidth: '70px' }} />

                <span className='input-group-text'>產品簡碼</span>
                <input type='text' className='form-control me-2' value={productNo} onChange={evt => setProductNo(evt.target.value)} style={{ maxWidth: '130px' }} />

                <span className='input-group-text'>起始日期</span>
                <input type='date' className='form-control' value={startDate} onChange={evt => setStartDate(evt.target.value)} style={{ maxWidth: '120px' }} />

                <span className='input-group-text'>結束日期</span>
                <input type='date' className='form-control' value={endDate} onChange={evt => setEndDate(evt.target.value)} style={{ maxWidth: '120px' }} />

                <button type='button' className='btn btn-primary rounded-end me-2' onClick={query} disabled={isLoading}><span className='icon bi-search'></span> 查詢</button>
            </div>

            <div className="extruder-statistics-table w-100 overflow-hidden mt-2 mb-2" style={{ minHeight: "15rem" }}>
                <HotTable
                    data={rows}
                    columns={columns}
                    nestedHeaders={colHeader}
                    rowHeaders={false}
                    readOnly={true}
                    licenseKey="non-commercial-and-evaluation"
                />
            </div>

            <hr />

            <h2 className='text-center'>歷史電流及轉速趨勢圖</h2>
            <StatisticsChart rows={rows.filter(x => (0 !== x.EC_AVG && 0 !== x.RPM_AVG))} />

            <hr />

            <h2 className='text-center'>工令電流及轉速趨勢圖</h2>
            {rows.length ?
                <h4 className='text-center'>工令{showLine}-{showSequence}</h4>
                :
                <h4 className='text-center'>工令</h4>
            }
            <ExtruderTrendChart ecArray={ecArray} ecAverage={ecAverage} rpmArray={rpmArray} rpmAverage={rpmAverage} timeArray={timeArray} />
        </div>
    );
}

export default ExtruderStatistics;
