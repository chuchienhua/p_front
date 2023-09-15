import React, { useState } from 'react';
import { HotTable } from '@handsontable/react';
import { registerAllCellTypes } from 'handsontable/cellTypes';
import Handsontable from 'handsontable';
import axios from 'axios';
import Utils from '../Utils';
import moment from 'moment';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import LoadingPage from '../LoadingPage';

function ExtrusionHandover(props) {

    const operators = props.operators || []; //所有作業人員
    const reasons = props.reasons || []; //所有停機原因

    registerAllCellTypes();

    const [isLoading, setIsLoading] = useState(false);

    const [date, setDate] = useState(moment(new Date()).format('YYYY-MM-DD'));
    const [workShift, setWorkShift] = useState('早'); //領料班別

    const [rows, setRows] = useState([]);
    const columns = [
        { data: 'LINE', type: 'text', width: 60, readOnly: true },
        {
            data: 'IC_NAME',
            type: 'dropdown',
            width: 80,
            source: operators,
            strict: true,
            renderer: function (instance, td, row, col, prop, value, cellProperties) {
                Handsontable.renderers.DropdownRenderer.apply(this, arguments);
                switch (instance.getDataAtCell(row, 0)) {
                    case '領班':
                        cellProperties.source = operators.filter(x => '帶班領班' === x.JOB).map(x => x.CNAME);
                        break;
                    case '入料3':
                    case '入料4':
                        cellProperties.source = operators.filter(x => ('入料助手' === x.JOB || '押出主控' === x.JOB)).map(x => x.CNAME);
                        break;
                    case '拌粉':
                        cellProperties.source = operators.filter(x => '拌粉人員' === x.JOB).map(x => x.CNAME);
                        break;
                    case '檢驗':
                        cellProperties.source = operators.filter(x => '品檢人員' === x.JOB).map(x => x.CNAME);
                        break;
                    case '包裝':
                        cellProperties.source = operators.filter(x => '包裝人員' === x.JOB).map(x => x.CNAME);
                        break;
                    default:
                        cellProperties.source = operators.filter(x => '押出主控' === x.JOB).map(x => x.CNAME);
                        break;
                }
            },
        },
        {
            data: 'EXTRUDER_STATUS',
            type: 'dropdown',
            width: 80,
            source: ['停俥', '開俥'],
            strict: true,
            renderer: function (instance, td, row, col, prop, value, cellProperties) {
                Handsontable.renderers.DropdownRenderer.apply(this, arguments);
                if ('停俥' === value) {
                    td.classList.add('text-danger');
                }
            },
        },
        { data: 'STOP_REASON', type: 'dropdown', source: reasons, strict: true, width: 200 },
        { data: 'SEQ', type: 'text', width: 60, readOnly: true },
        { data: 'PRD_PC', type: 'text', width: 120, readOnly: true },
        { data: 'PRODUCTION_TIME', type: 'numeric', numericFormat: { pattern: '##0.00' }, width: 80, readOnly: true },
        { data: 'EXTRUDED_TIME', type: 'numeric', numericFormat: { pattern: '##0.00' }, width: 80, readOnly: true },
        { data: 'SILO', type: 'text', width: 60, readOnly: true },
        { data: 'PRODUCTIVITY', type: 'numeric', numericFormat: { pattern: '##0' }, width: 80, readOnly: true },
        { data: 'UNPACK', type: 'numeric', numericFormat: { pattern: '##0' }, width: 80, readOnly: true },
        {
            data: 'STOP_TIME',
            width: 250,
            readOnly: true,
            renderer: function (instance, td, row, col, prop, value, cellProperties) {
                const englishRegex = /^[A-Za-z0-9]*$/;
                if (englishRegex.test(instance.getDataAtCell(row, 0))) {
                    const input = document.createElement('input');
                    input.type = 'datetime-local';
                    input.value = value;
                    if (value) {
                        input.classList.add('text-danger');
                    }

                    Handsontable.dom.addEvent(input, 'change', evt => {
                        //console.log(evt.target.value)
                        instance.setDataAtCell(row, col, evt.target.value);
                    });
                    const div = document.createElement('DIV');
                    div.appendChild(input);

                    Handsontable.dom.empty(td);
                    td.appendChild(div);
                }
            },
        },
        { data: 'TOTAL_STOP_TIME', type: 'numeric', numericFormat: { pattern: '##0.00' }, width: 100 },
        { data: 'NOTE', type: 'text', width: 150 },
    ];
    const colHeader = ['線別', '負責人', '設備狀態', '停機事由', '序號', '生產規格', '生產經時', '押完經時', 'SILO', '已生產量', '未包裝量', '停機時間(西元)', '停機待機累計', '備註'];

    const query = () => {
        setIsLoading(true);
        setRows([]);

        const apiUrl = Utils.generateApiUrl('/extrusion/getHandoverRecord', [moment(date).format('YYYYMMDD'), workShift]);
        axios.get(apiUrl, {
            ...Utils.pbtAxiosConfig,
        }).then(res => {
            if (!res.data.error) {
                let appendArray = [];
                res.data.res.forEach(element => {
                    appendArray.push({
                        LINE: element.LINE,
                        IC_NAME: element.IC_NAME,
                        EXTRUDER_STATUS: element.EXTRUDER_STATUS,
                        STOP_REASON: element.STOP_REASON,
                        SEQ: element.SEQ,
                        PRD_PC: element.PRD_PC,
                        PRODUCTION_TIME: element.PRODUCTION_TIME,
                        EXTRUDED_TIME: element.EXTRUDED_TIME,
                        //PRODUCTION_TIME: (0 <= element.PRODUCTION_TIME) ? parseFloat(element.PRODUCTION_TIME).toFixed(2) : '',
                        //EXTRUDED_TIME: (0 <= element.EXTRUDED_TIME) ? parseFloat(element.EXTRUDED_TIME).toFixed(2) : '',
                        SILO: element.SILO,
                        PRODUCTIVITY: element.PRODUCTIVITY,
                        UNPACK: element.UNPACK,
                        STOP_TIME: element.STOP_TIME,
                        TOTAL_STOP_TIME: element.TOTAL_STOP_TIME,
                        NOTE: element.NOTE,
                    });
                });
                setRows(appendArray);
            } else {
                toast.error(`查詢失敗，${res.data.res}`);
            }
        }).catch(err => console.error(err))
            .finally(() => setIsLoading(false));
    }

    const save = () => {
        const callback = res => {
            if (res.isConfirmed) {
                setIsLoading(true);
                const apiUrl = Utils.generateApiUrl('/extrusion/saveHandoverRecord', [moment(date).format('YYYYMMDD'), workShift]);
                axios.post(apiUrl, {
                    recordArray: rows,
                }, {
                    ...Utils.pbtAxiosConfig,
                }).then(res => {
                    if (!res.data.error) {
                        toast.success('儲存成功');
                    } else {
                        toast.warn(`儲存失敗，${res.data.res}`);
                    }
                }).catch(err => console.error(err))
                    .finally(() => setIsLoading(false));
            }
        }

        Swal.fire({
            title: `確認儲存${moment(date).format('YYYYMMDD')}, ${workShift}班的交接紀錄表嗎(會寄信)？`,
            position: 'top',
            showCancelButton: true,
        }).then(callback).catch(error => {
            Swal.showValidationMessage(`Request failed: ${error}`);
        });
    }

    return (
        <div className='col-12 px-0'>
            <div className='input-group input-group-sm w-50 mt-2'>
                <span className='input-group-text'>日期</span>
                <input type='date' className='form-control' value={date} onChange={evt => setDate(evt.target.value)} />

                <span className="input-group-text">班別</span>
                <select className="form-select" value={workShift} onChange={evt => setWorkShift(evt.target.value)}>
                    <option value="早">早</option>
                    <option value="中">中</option>
                    <option value="晚">晚</option>
                </select>

                <button type='button' className='btn btn-primary rounded-end me-2' onClick={query} disabled={isLoading}><span className='icon bi-search'></span> 查詢</button>
                <button type="button" className="btn btn-outline-success rounded" onClick={save} disabled={isLoading || !rows.length}><span className="icon bi-save"></span> 儲存</button>
            </div>

            {(isLoading) ?
                <LoadingPage />
                :
                <div className="handover-table mt-2 mb-2">
                    <HotTable
                        data={rows}
                        columns={columns}
                        colHeaders={colHeader}
                        rowHeaders={false}
                        hiddenColumns={{ columns: [11, 12] }} //這兩行先取消不用
                        licenseKey="non-commercial-and-evaluation"
                    />
                </div>
            }
        </div>
    );
}

export default ExtrusionHandover;
