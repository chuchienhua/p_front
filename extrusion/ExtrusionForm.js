import React, { useState, useEffect } from 'react';
import './Extrusion.css'
import { HotTable } from '@handsontable/react';
import Handsontable from 'handsontable';
import { registerAllCellTypes } from 'handsontable/cellTypes';
import axios from 'axios';
import Utils from '../Utils';
import moment from 'moment';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import RecordTable from './RecordTable';
import QATable from './QATable';

function ExtrusionForm(props) {

    const feeders = props.feeders || []; //所有入料機
    const packingSilos = props.packingSilos || []; //所有包裝SILO
    const user = props.user;
    const isAdmin = props.isAdmin;

    registerAllCellTypes();

    const [isLoading, setIsLoading] = useState(false);

    const [searchProductLine, setSearchProductLine] = useState('A');
    const [searchProductNo, setSearchProductNo] = useState('*');
    const [startDate, setStartDate] = useState(moment(new Date()).subtract(1, 'month').format('YYYY-MM-DD'));
    const [endDate, setEndDate] = useState(moment(new Date()).format('YYYY-MM-DD'));

    const [searchLine, setSearchLine] = useState('E');
    const [searchSeq, setSearchSeq] = useState(1396);
    const [line, setLine] = useState('');
    const [sequence, setSequence] = useState('');
    const [productNo, setProductNo] = useState(''); //排程產品簡碼
    const [lotNo, setLotNo] = useState(''); //排程LOT_NO
    const [silo, setSilo] = useState(''); //排程SILO
    const [startTime, setStartTime] = useState(''); //排程啟動時間
    const [endTime, setEndTime] = useState(''); //排程結束時間
    const [remainBagLono, setRemainBagLono] = useState(''); //殘包格位
    const [remainBagWeight, setRemainBagWeight] = useState(0); //殘包重量

    const [rows, setRows] = useState([]);

    const [searchTable, setSearchTable] = useState('EXTR');
    const [recordRows, setRecordRows] = useState([]);
    const [qaRows, setQARows] = useState([]);
    const [creatingRow, setCreatingRow] = useState(null); //正在新增哪一列，到時候只存這一列

    const [remainTimer, setRemainTimer] = useState(null); //timer抓成品簡碼殘包格位
    const timerFrequency = 5 * 60; //幾秒抓一次

    const columns = [
        { data: 'LINE', type: 'text', width: 40 },
        { data: 'SEQUENCE', type: 'text', width: 50 },
        { data: 'PRD_PC', type: 'text', width: 120 },
        { data: 'LOT_NO', type: 'text', width: 120 },
        {
            data: 'RECORD_BTN',
            width: 90,
            renderer: function (instance, td, row, col, prop, value, cellProperties) {
                const icon = document.createElement('SPAN');
                icon.className = "icon bi-search";
                icon.innerHTML = ' 查詢';

                const btn = document.createElement('RECORD_BTN');
                btn.className = 'btn btn-outline-primary btn-sm px-1 py-0 nowrap align-top';
                btn.appendChild(icon);

                Handsontable.dom.addEvent(btn, 'click', () => {
                    setLine(rows[row].LINE);
                    setSequence(rows[row].SEQUENCE);
                    queryRecord(rows[row].LINE, rows[row].SEQUENCE, 'EXTR');
                });

                const div = document.createElement('DIV');
                div.appendChild(btn);

                Handsontable.dom.empty(td);
                td.appendChild(div);
            },
        },
        { data: 'START_TIME', type: 'text', width: 160 },
        { data: 'END_TIME', type: 'text', width: 160 },
        {
            data: 'QA_BTN',
            width: 90,
            renderer: function (instance, td, row, col, prop, value, cellProperties) {
                const icon = document.createElement('SPAN');
                icon.className = "icon bi-search";
                icon.innerHTML = ' 查詢';

                const btn = document.createElement('QA_BTN');
                btn.className = 'btn btn-outline-primary btn-sm px-1 py-0 nowrap align-top';
                btn.appendChild(icon);

                Handsontable.dom.addEvent(btn, 'click', () => {
                    setSearchLine(rows[row].LINE);
                    setSearchSeq(rows[row].SEQUENCE);
                    queryRecord(rows[row].LINE, rows[row].SEQUENCE, 'QA');
                });

                const div = document.createElement('DIV');
                div.appendChild(btn);

                Handsontable.dom.empty(td);
                td.appendChild(div);
            },
        },
    ];
    const colHeader = ['線別', '序號', '產品簡碼', 'LOT NO', '製造紀錄表', '啟動時間', '結束時間', '製程檢驗表'];

    useEffect(() => {
        //定期根據產品簡碼查詢格位
        const getRemainLono = () => {
            const apiUrl = Utils.generateApiUrl('/remainingBag/getProductLono', [productNo]);
            axios.get(apiUrl, {
                ...Utils.pbtAxiosConfig,
            }).then(res => {
                if (!res.data.error && res.data.res.length) {
                    setRemainBagLono(res.data.res[0].LONO);
                    setRemainBagWeight(res.data.res[0].WEIGHT);
                }
            }).catch(err => console.error(err));
        }

        const timer = setInterval(() => {
            if (0 < remainTimer) {
                setRemainTimer(remainTimer - 1);
            } else if (0 === remainTimer) {
                setRemainTimer(timerFrequency);
                if (productNo.length) {
                    getRemainLono();
                }
            }
        }, 1000)

        return () => {
            clearInterval(timer);
        }
    }, [remainTimer, timerFrequency, productNo])

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

    //查詢產品簡碼與日期區間的公令
    const queryOrder = () => {
        setIsLoading(true);
        setRows([]);

        const apiUrl = Utils.generateApiUrl('/extrusion/getOrder', [
            searchProductLine,
            searchProductNo,
            moment(startDate).format('YYYYMMDD'),
            moment(endDate).format('YYYYMMDD')
        ]);
        axios.get(apiUrl, {
            ...Utils.pbtAxiosConfig,
        }).then(res => {
            if (!res.data.error) {
                let appendArray = [];
                if (res.data.res.length) {
                    res.data.res.forEach(element => {
                        appendArray.push({
                            LINE: element.LINE,
                            SEQUENCE: element.SEQ,
                            PRD_PC: element.PRD_PC,
                            LOT_NO: element.LOT_NO,
                            START_TIME: moment(element.ACT_STR_TIME).format('YYYY-MM-DD HH:mm:ss'),
                            END_TIME: element.ACT_END_TIME ? moment(element.ACT_END_TIME).format('YYYY-MM-DD HH:mm:ss') : '尚未結束',
                        });
                    });
                } else {
                    toast.warn('未找到相符的排程');
                }
                setRows(appendArray);
            } else {
                toast.error(`查詢失敗，${res.data.res}`);
            }
        }).catch(err => console.error(err))
            .finally(() => setIsLoading(false));
    }

    //查詢排程時間與押出製造紀錄/製程檢驗表
    const queryRecord = (searchLine, searchSequence, type) => {
        setIsLoading(true);
        setLine(searchLine);
        setSequence(searchSequence);
        setSearchTable(type);
        setRecordRows([]);
        setQARows([]);
        setProductNo('');
        setLotNo('');
        setSilo('');
        setStartTime('');
        setEndTime('');
        setRemainBagLono('');
        setRemainBagWeight(0);
        setRemainTimer(null);
        setCreatingRow(null);

        const apiUrl = Utils.generateApiUrl('/extrusion/getForm', [type, searchLine, searchSequence]);
        axios.get(apiUrl, {
            ...Utils.pbtAxiosConfig,
        }).then(res => {
            if (!res.data.error) {
                let appendArray = [];
                if (res.data.res.length) {
                    res.data.res.forEach(element => {
                        appendArray.push([moment(element.CREATE_TIME).format('YYYY-MM-DD HH:mm:ss')].concat(element.STD_VALUE.split(',')));
                    });
                } else {
                    toast.warn(`未找到此工令的製造紀錄，${(!res.data.endTime && res.data.startTime) ? '請再新增' : '排程尚未啟動或已結束'}`);
                }

                //如果已開始，則加入預計下一筆紀錄時間
                if (res.data.startTime && !res.data.endTime) {
                    let nextRecordTime = '';
                    if ('EXTR' === type) {
                        if (appendArray.length) {
                            nextRecordTime = getNextRecordTime(moment(appendArray.at(-1)[0]));
                            //nextRecordTime = moment(appendArray.at(-1)[0]).add(4, 'hours').format('YYYY-MM-DD HH:mm:ss');
                        } else {
                            nextRecordTime = moment(res.data.startTime).add(1, 'hours').format('YYYY-MM-DD HH:mm:ss');
                        }
                        appendArray.push([
                            nextRecordTime, '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-',
                            0, 0, 0, 0, 0, 0, 0,
                            'S2001', 'C01', '1100XX', 0, 0, user.PPS_CODE, '-',
                        ]);

                    } else {
                        if (appendArray.length) {
                            nextRecordTime = moment(appendArray.at(-1)[0]).add(4, 'hours').format('YYYY-MM-DD HH:mm:ss');
                        } else {
                            nextRecordTime = moment(res.data.startTime).add(30, 'minutes').format('YYYY-MM-DD HH:mm:ss');
                        }
                        appendArray.push([
                            nextRecordTime, 0, 0, 0, 0, 0, 0, 0,
                            0, 0, 0, 0,
                            0, 0, 0, 0, 0, 0, 0, 0, user.PPS_CODE,
                        ]);
                    }
                    setCreatingRow(appendArray.length - 1);
                }

                if ('EXTR' === type) {
                    setRecordRows(appendArray);
                } else {
                    setQARows(appendArray);
                }
                setProductNo(res.data.productNo);
                setLotNo(res.data.lotNo);
                setSilo(res.data.silo ? res.data.silo.replace('-', '') : '');
                setStartTime(res.data.startTime ? moment(res.data.startTime).format('YYYY-MM-DD HH:mm:ss') : '');
                setEndTime(res.data.endTime ? moment(res.data.endTime).format('YYYY-MM-DD HH:mm:ss') : '');
                setRemainTimer(0);
                //setRemainBagLono(res.data.remainBagLoNo);
                //setRemainBagWeight(res.data.remainBagWeight || 0);
            } else {
                toast.error(`查詢失敗，${res.data.res}`);
            }
        }).catch(err => console.error(err))
            .finally(() => setIsLoading(false));
    }

    //管理員回補資料
    const newRow = () => {
        if ('EXTR' === searchTable) {
            if (null === creatingRow) {
                let oldRecordRows = [...recordRows];
                oldRecordRows.push([
                    moment().format('YYYY-MM-DD HH:mm:ss'), '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-',
                    0, 0, 0, 0, 0, 0, 0,
                    'S2001', 'C01', '1100XX', 0, 0, user.PPS_CODE, '-',
                ]);
                setRecordRows(oldRecordRows);
                setCreatingRow(oldRecordRows.length - 1);
            } else {
                toast.warn(`已在新增中，第${creatingRow}行`);
            }
        }
    }

    //儲存欲新的列
    const save = () => {
        let saveArray = [];
        if ('EXTR' === searchTable) {
            saveArray = [...recordRows[creatingRow]];
        } else {
            saveArray = [...qaRows[creatingRow]];
        }
        let rowDate = saveArray.shift();

        const callback = respond => {
            if (respond.isConfirmed) {
                setIsLoading(true);

                //如果SILO不符合，則在異常備註新增異常字串
                if (silo !== saveArray[24] && 'EXTR' === searchTable) {
                    saveArray[30] += '(SILO不符)';
                }

                //如果超過時間，則多儲存原因
                if ('string' === typeof respond.value) {
                    saveArray.push(respond.value);
                }

                const apiUrl = Utils.generateApiUrl('/extrusion/saveForm', [searchTable, line, sequence]);
                axios.post(apiUrl, {
                    stdArray: saveArray,
                }, {
                    ...Utils.pbtAxiosConfig,
                }).then(res => {
                    if (!res.data.error) {
                        toast.success('儲存成功');
                        setCreatingRow(null);
                        queryRecord(line, sequence, searchTable);
                    } else {
                        toast.warn(`儲存失敗，${res.data.res}`);
                    }
                }).catch(err => console.error(err))
                    .finally(() => setIsLoading(false));
            }
        }

        if (moment(new Date()).isAfter(moment(rowDate).add(30, 'minutes')) && 'EXTR' === searchTable) {
            Swal.fire({
                title: `輸入時間超過規定，請輸入原因(Silo${(silo === saveArray[24] && 'EXTR' === searchTable) ? '相符' : '不符'})`,
                input: 'text',
                inputPlaceholder: '在此輸入',
                showCancelButton: true,
                inputValidator: (value) => {
                    if (!value) {
                        return '請確實輸入原因';
                    } else if (20 < value.length) {
                        return '字數請勿超過20';
                    }
                },
                confirmButtonText: '確定',
                position: 'top',
            }).then(callback).catch(error => {
                Swal.showValidationMessage(`Request failed: ${error}`);
            });
        } else {
            Swal.fire({
                title: `確定儲存嗎？(Silo${(silo === saveArray[24] && 'EXTR' === searchTable) ? '相符' : '不符'})`,
                showCancelButton: true,
                confirmButtonText: '確定',
                position: 'top',
            }).then(callback).catch(error => {
                Swal.showValidationMessage(`Request failed: ${error}`);
            });
        }
    }

    //取得下一次輸入紀錄的時間
    const getNextRecordTime = lastTime => {
        const lastTimeHours = moment({
            hour: lastTime.hour(),
            minute: lastTime.minute(),
            second: lastTime.second()
        });
        const hoursFormat = 'HH:mm:ss';
        let nextRecordTime = '';

        if (lastTimeHours.isBetween(moment('03:45:00', hoursFormat), moment('07:45:00', hoursFormat))) {
            nextRecordTime = moment(lastTime).set({ hour: 8, minutes: 0, seconds: 0 });

        } else if (lastTimeHours.isBetween(moment('07:45:00', hoursFormat), moment('11:45:00', hoursFormat))) {
            nextRecordTime = moment(lastTime).set({ hour: 12, minutes: 0, seconds: 0 });

        } else if (lastTimeHours.isBetween(moment('11:45:00', hoursFormat), moment('15:45:00', hoursFormat))) {
            nextRecordTime = moment(lastTime).set({ hour: 16, minutes: 0, seconds: 0 });

        } else if (lastTimeHours.isBetween(moment('15:45:00', hoursFormat), moment('19:45:00', hoursFormat))) {
            nextRecordTime = moment(lastTime).set({ hour: 20, minutes: 0, seconds: 0 });

        } else if (lastTimeHours.isBetween(moment('19:45:00', hoursFormat), moment('23:45:00', hoursFormat))) {
            nextRecordTime = moment(lastTime).set({ hour: 20, minutes: 0, seconds: 0 }).add(4, 'hours');

        } else {
            //lastTimeHours.isBetween(moment('23:45:00', hoursFormat), moment('03:45:00', hoursFormat))
            nextRecordTime = moment(lastTime).set({ hour: 4, minutes: 0, seconds: 0 });
        }

        return moment(nextRecordTime).format('YYYY-MM-DD HH:mm:ss');
    }

    return (
        <div className='extrusion-form-page col-12 px-0'>
            <div className='input-group input-group-sm mt-2'>
                <span className='input-group-text'>線別</span>
                <select className='form-select me-2' value={searchProductLine} onChange={evt => setSearchProductLine(evt.target.value)} style={{ maxWidth: '70px' }} >
                    <option value="*">*</option>
                    {generateFeederLine()}
                </select>

                <span className='input-group-text'>產品簡碼</span>
                <input type='text' className='form-control me-2' value={searchProductNo} onChange={evt => setSearchProductNo(evt.target.value)} style={{ maxWidth: '120px' }} />

                <span className='input-group-text'>開始時間</span>
                <input type='date' className='form-control' defaultValue={startDate} onChange={evt => setStartDate(evt.target.value)} style={{ maxWidth: '120px' }} />

                <span className='input-group-text'>截止時間</span>
                <input type='date' className='form-control' defaultValue={endDate} onChange={evt => setEndDate(evt.target.value)} style={{ maxWidth: '120px' }} />

                <button type='button' className='btn btn-primary rounded-end me-2' onClick={queryOrder} disabled={isLoading}><span className='icon bi-search'></span> 產品查詢</button>
            </div>

            <div className='order-table w-100 overflow-hidden mt-2' style={{ minHeight: "12rem" }}>
                <HotTable
                    data={rows}
                    columns={columns}
                    colHeaders={colHeader}
                    rowHeaders={false}
                    readOnly={true}
                    licenseKey='non-commercial-and-evaluation'
                />
            </div>

            <hr />

            <div className='input-group input-group-sm mt-2'>
                <span className='input-group-text'>查詢線別</span>
                <select className='form-select me-2' value={searchLine} onChange={evt => setSearchLine(evt.target.value)} style={{ maxWidth: '70px' }} >
                    {generateFeederLine()}
                </select>

                <span className='input-group-text'>查詢序號</span>
                <input type='number' className='form-control' value={searchSeq} onChange={evt => setSearchSeq(evt.target.value)} style={{ maxWidth: '80px' }} />

                <button type='button' className='btn btn-primary rounded-end me-2' onClick={() => queryRecord(searchLine, searchSeq, 'EXTR')} disabled={isLoading}><span className='icon bi-search'></span> 製造紀錄</button>
                <button type='button' className='btn btn-primary rounded' onClick={() => queryRecord(searchLine, searchSeq, 'QA')} disabled={isLoading}><span className='icon bi-search'></span> 製程檢驗</button>
            </div>

            <div className='input-group input-group-sm mt-2'>
                <span className='input-group-text'>線別</span>
                <input type='text' className='form-control' value={line} disabled={true} style={{ maxWidth: '50px' }} />

                <span className='input-group-text'>序號</span>
                <input type='number' className='form-control me-2' value={sequence} disabled={true} style={{ maxWidth: '100px' }} />

                <span className='input-group-text'>產品簡碼</span>
                <input type='text' className='form-control' value={productNo} disabled={true} style={{ maxWidth: '150px' }} />

                <span className='input-group-text'>Lot No</span>
                <input type='text' className='form-control me-2' value={lotNo} disabled={true} style={{ maxWidth: '120px' }} />

                <span className='input-group-text'>Silo</span>
                <input type='text' className='form-control me-2' value={silo} disabled={true} style={{ maxWidth: '100px' }} />

                <span className='input-group-text'>殘包格位</span>
                <input type='text' className='form-control text-danger' value={remainBagLono} disabled={true} style={{ maxWidth: '80px' }} />

                <span className='input-group-text'>殘包重量</span>
                <input type='number' className='form-control' value={remainBagWeight} disabled={true} style={{ maxWidth: '70px' }} />
            </div>

            <div className='input-group input-group-sm w-50 mt-2'>
                <span className='input-group-text'>啟動時間</span>
                <input type='text' className='form-control me-2' value={startTime} disabled={true} />

                <span className='input-group-text'>結束時間</span>
                <input type='text' className='form-control' value={endTime} disabled={true} />
            </div>

            {(isAdmin && 'EXTR' === searchTable) &&
                <button type='button' className='btn btn-outline-info btn-sm d-none mt-2 me-2' onClick={newRow} disabled={isLoading || !isAdmin || !recordRows.length}><span className='icon bi-plus-circle'></span> 補紀錄</button>
            }
            <button type='button' className='btn btn-outline-success btn-sm mt-2 me-2' onClick={save} disabled={isLoading || null === creatingRow}><span className='icon bi-save'></span> 儲存</button>

            <div className='extrusion-form-table w-100 overflow-hidden mt-2' style={{ minHeight: "30rem" }}>
                {('EXTR' === searchTable) ?
                    <RecordTable rows={recordRows} packingSilos={packingSilos} creatingRow={creatingRow} line={line} sequence={sequence} isAdmin={isAdmin} />
                    :
                    <QATable rows={qaRows} creatingRow={creatingRow} />
                }
            </div>
        </div>
    );
}

export default ExtrusionForm;