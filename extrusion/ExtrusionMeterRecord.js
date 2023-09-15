import React, { useState } from "react";
import { HotTable } from '@handsontable/react';
import { HyperFormula } from 'hyperformula';
import axios from 'axios';
import Utils from '../Utils';
import moment from 'moment';
import { toast } from 'react-toastify';

function ExtrusionMeterRecord() {

    const hyperFormulaInstance = HyperFormula.buildEmpty({
        licenseKey: 'internal-use-in-handsontable',
    });

    const formulas = {
        engine: hyperFormulaInstance,
    }

    const [isLoading, setIsLoading] = useState(false);

    const [date, setDate] = useState(moment(new Date()).format('YYYY-MM-DD'));
    const [workShift, setWorkShift] = useState('早');

    const [creator, setCreator] = useState('');
    const [recordTime, setRecordTime] = useState('');

    const [rows, setRows] = useState([]);
    const columns = [
        { data: 'METER_NO', type: 'text', width: 80, readOnly: true },
        { data: 'MULTIPLE', type: 'numeric', width: 50, readOnly: true },
        { data: 'METER_VALUE', type: 'numeric', numericFormat: { pattern: '##0.0' }, width: 80 },
        { data: 'ACTUAL_VALUE', type: 'numeric', numericFormat: { pattern: '##0.0' }, width: 80, readOnly: true },
        { data: 'METER_LINE', type: 'text', width: 50, readOnly: true },
    ];
    const colHeader = ['電錶編號', '倍數', '電錶數據', '實際數據', '線別'];

    const query = () => {
        setIsLoading(true);
        setRows([]);
        setCreator('');
        setRecordTime('');

        const apiUrl = Utils.generateApiUrl('/extrusion/getMeterRecord', [moment(date).format('YYYYMMDD'), workShift]);
        axios.get(apiUrl, {
            ...Utils.pbtAxiosConfig,
        }).then(res => {
            if (!res.data.error) {
                let appendArray = [];
                if (res.data.res.length) {
                    setCreator(res.data.res[0].CREATOR_NAME);
                    setRecordTime(moment(res.data.res[0].CREATE_TIME).format('YYYY-MM-DD HH:mm:ss'));

                    res.data.res.forEach((element, index) => {
                        appendArray.push({
                            METER_NO: element.METER_NO,
                            MULTIPLE: element.MULTIPLE,
                            METER_VALUE: element.METER_VALUE,
                            ACTUAL_VALUE: `=B${index + 1}*C${index + 1}`,
                            METER_LINE: element.METER_LINE,
                        })
                    });

                } else {
                    toast.warn('尚未抄表過，帶入空白表格');
                    appendArray.push(
                        { METER_NO: '406', MULTIPLE: 10, METER_VALUE: 0, ACTUAL_VALUE: '=B1*C1', METER_LINE: 'C' },
                        { METER_NO: '407', MULTIPLE: 10, METER_VALUE: 0, ACTUAL_VALUE: '=B2*C2', METER_LINE: 'A' },
                        { METER_NO: '408', MULTIPLE: 10, METER_VALUE: 0, ACTUAL_VALUE: '=B3*C3', METER_LINE: 'B' },
                        { METER_NO: '409', MULTIPLE: 10, METER_VALUE: 0, ACTUAL_VALUE: '=B4*C4', METER_LINE: 'K' },
                        { METER_NO: '410', MULTIPLE: 10, METER_VALUE: 0, ACTUAL_VALUE: '=B5*C5', METER_LINE: 'E' },
                        { METER_NO: '411', MULTIPLE: 10, METER_VALUE: 0, ACTUAL_VALUE: '=B6*C6', METER_LINE: 'F' },
                        { METER_NO: '412', MULTIPLE: 10, METER_VALUE: 0, ACTUAL_VALUE: '=B7*C7', METER_LINE: 'C' },
                        { METER_NO: '413', MULTIPLE: 10, METER_VALUE: 0, ACTUAL_VALUE: '=B8*C8', METER_LINE: 'G' },
                        { METER_NO: '414', MULTIPLE: 10, METER_VALUE: 0, ACTUAL_VALUE: '=B9*C9', METER_LINE: 'M' },
                        { METER_NO: '415', MULTIPLE: 10, METER_VALUE: 0, ACTUAL_VALUE: '=B10*C10', METER_LINE: 'B' },
                        { METER_NO: '416', MULTIPLE: 10, METER_VALUE: 0, ACTUAL_VALUE: '=B11*C11', METER_LINE: 'K' },
                        { METER_NO: '418', MULTIPLE: 10, METER_VALUE: 0, ACTUAL_VALUE: '=B12*C12', METER_LINE: 'E' },
                        { METER_NO: '419', MULTIPLE: 10, METER_VALUE: 0, ACTUAL_VALUE: '=B13*C13', METER_LINE: 'F' },
                        { METER_NO: '423', MULTIPLE: 10, METER_VALUE: 0, ACTUAL_VALUE: '=B14*C14', METER_LINE: 'H' },
                        { METER_NO: '425', MULTIPLE: 30, METER_VALUE: 0, ACTUAL_VALUE: '=B15*C15', METER_LINE: 'R' },
                        { METER_NO: '426', MULTIPLE: 24, METER_VALUE: 0, ACTUAL_VALUE: '=B16*C16', METER_LINE: 'H' },
                        { METER_NO: '427', MULTIPLE: 100, METER_VALUE: 0, ACTUAL_VALUE: '=B17*C17', METER_LINE: 'D' },
                        { METER_NO: '441', MULTIPLE: 1, METER_VALUE: 0, ACTUAL_VALUE: '=B18*C18', METER_LINE: 'A' },
                        { METER_NO: '450', MULTIPLE: 1000, METER_VALUE: 0, ACTUAL_VALUE: '=B19*C19', METER_LINE: 'N' },
                        { METER_NO: '451', MULTIPLE: 1000, METER_VALUE: 0, ACTUAL_VALUE: '=B20*C20', METER_LINE: 'Q' },
                        { METER_NO: '452', MULTIPLE: 1000, METER_VALUE: 0, ACTUAL_VALUE: '=B21*C21', METER_LINE: 'T' },
                        { METER_NO: '純水', MULTIPLE: 1, METER_VALUE: 0, ACTUAL_VALUE: '=B22*C22', METER_LINE: '純水' },
                        { METER_NO: 'AIR', MULTIPLE: 1, METER_VALUE: 0, ACTUAL_VALUE: '=B23*C23', METER_LINE: 'AIR' },
                        { METER_NO: '廢水', MULTIPLE: 0.001, METER_VALUE: 0, ACTUAL_VALUE: '=B24*C24', METER_LINE: '廢水' },
                    )
                }

                setRows(appendArray);
            } else {
                toast.error(`查詢失敗，${res.data.res}`);
            }
        }).catch(err => console.error(err))
            .finally(() => setIsLoading(false));
    }

    const save = () => {
        setIsLoading(true);

        const apiUrl = Utils.generateApiUrl('/extrusion/saveMeterRecord', [moment(date).format('YYYYMMDD'), workShift]);
        axios.post(apiUrl, {
            recordArray: rows,
        }, {
            ...Utils.pbtAxiosConfig,
        }).then(res => {
            if (!res.data.error) {
                toast.success('儲存成功');
            } else {
                toast.error(`查詢失敗，${res.data.res}`);
            }
        }).catch(err => console.error(err))
            .finally(() => setIsLoading(false));
    }

    return (
        <div className="col-12 px-0">
            <div className='input-group input-group-sm mt-2'>
                <span className='input-group-text'>日期</span>
                <input type='date' className='form-control' value={date} onChange={evt => setDate(evt.target.value)} />
            </div>

            <div className='input-group input-group-sm mt-2'>
                <span className="input-group-text">班別</span>
                <select className="form-select" value={workShift} onChange={evt => setWorkShift(evt.target.value)}>
                    <option value="早">早</option>
                    <option value="中">中</option>
                    <option value="晚">晚</option>
                </select>

                <button type='button' className='btn btn-primary rounded-end me-2' onClick={query} disabled={isLoading}><span className='icon bi-search'></span> 查詢</button>
                <button type="button" className="btn btn-outline-success rounded" onClick={save} disabled={isLoading || !rows.length}><span className="icon bi-save"></span> 儲存</button>
            </div>

            <div className='input-group input-group-sm w-50 mt-2'>
                <span className='input-group-text'>抄表人員</span>
                <input type='text' className='form-control' value={creator} disabled />

                <span className='input-group-text'>抄表時間</span>
                <input type='text' className='form-control' value={recordTime} disabled />
            </div>

            <div className="mt-2 mb-2">
                <HotTable
                    data={rows}
                    columns={columns}
                    colHeaders={colHeader}
                    rowHeaders={false}
                    formulas={formulas}
                    licenseKey="non-commercial-and-evaluation"
                />
            </div>
        </div>
    )
}

export default ExtrusionMeterRecord;