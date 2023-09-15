import React from 'react';
import { HotTable } from '@handsontable/react';
import Handsontable from 'handsontable';
import { registerAllCellTypes } from 'handsontable/cellTypes';
import axios from 'axios';
import Utils from '../Utils';
import { toast } from 'react-toastify';

function RecordTable(props) {

    registerAllCellTypes();

    const rows = props.rows;
    const packingSilos = props.packingSilos; //所有包裝SILO
    const creatingRow = props.creatingRow; //正在建立中的線別
    const line = props.line;
    const sequence = props.sequence;
    const isAdmin = props.isAdmin;
    const pbrSilos = [
        { SILO: 'C01', RESIN: '1100XX' },
        { SILO: 'C02', RESIN: '1200D' },
        { SILO: 'C03', RESIN: '1200M' },
        { SILO: 'C04', RESIN: '1100H' },
        { SILO: 'C05', RESIN: '1100M' },
        { SILO: 'C06', RESIN: '1100L' },
    ]; //PBR入料

    const columns = [
        {
            data: '0',
            width: 160,
            renderer: function (instance, td, row, col, prop, value, cellProperties) {
                Handsontable.renderers.TextRenderer.apply(this, arguments);
                if (instance.getDataAtCell(row, 32)) {
                    td.classList.add('bg-danger');
                    td.classList.add('text-light');
                }
            },
        },
        { data: '1', type: 'text', width: 45 },
        { data: '2', type: 'text', width: 45 },
        { data: '3', type: 'text', width: 45 },
        { data: '4', type: 'text', width: 45 },
        { data: '5', type: 'text', width: 45 },
        { data: '6', type: 'text', width: 45 },
        { data: '7', type: 'text', width: 45 },
        { data: '8', type: 'text', width: 45 },
        { data: '9', type: 'numeric', width: 45 },
        { data: '10', type: 'numeric', width: 45 },
        { data: '11', type: 'numeric', width: 45 },
        { data: '12', type: 'numeric', width: 45 },
        { data: '13', type: 'numeric', width: 45 },
        { data: '14', type: 'numeric', width: 45 },
        { data: '15', type: 'numeric', width: 45 },
        { data: '16', type: 'numeric', width: 45 },
        { data: '17', type: 'numeric', width: 45 },
        { data: '18', type: 'numeric', width: 45 }, //真空開始沒有TAGS
        { data: '19', type: 'numeric', width: 45 },
        { data: '20', type: 'numeric', width: 45 },
        { data: '21', type: 'numeric', width: 45 },
        { data: '22', type: 'numeric', width: 45 },
        { data: '23', type: 'numeric', width: 45 },
        { data: '24', type: 'numeric', width: 45 },
        { data: '25', type: 'dropdown', source: packingSilos, strict: true, width: 75 },
        { data: '26', type: 'dropdown', source: pbrSilos.map(x => x.SILO), strict: true, width: 70 },
        {
            data: '27',
            type: 'dropdown',
            source: pbrSilos.map(x => x.RESIN),
            strict: true,
            width: 80,
            renderer: function (instance, td, row, col, prop, value, cellProperties) {
                Handsontable.renderers.AutocompleteRenderer.apply(this, arguments);
                const siloFilter = pbrSilos.filter(x => value === x.RESIN)
                if (siloFilter.length) {
                    if (siloFilter[0].SILO !== instance.getDataAtCell(row, 26)) {
                        td.classList.add('text-danger');
                    }
                } else {
                    td.classList.add('text-danger');
                }
            },
        },
        { data: '28', type: 'numeric', width: 45 },
        { data: '29', type: 'numeric', width: 45 },
        { data: '30', type: 'text', width: 60 },
        { data: '31', type: 'text', width: 180 },
        { data: '32', type: 'text', width: 180 },
        {
            data: 'SAVE_BTN',
            width: 70,
            renderer: function (instance, td, row, col, prop, value, cellProperties) {
                const icon = document.createElement('SPAN');
                icon.className = "icon bi-search";
                icon.innerHTML = ' 儲存';

                const btn = document.createElement('QA_BTN');
                btn.className = 'btn btn-outline-success btn-sm px-1 py-0 nowrap align-top';
                if (!isAdmin) {
                    btn.className += ' disabled';
                }
                btn.appendChild(icon);

                Handsontable.dom.addEvent(btn, 'click', () => {
                    if (isAdmin) {
                        saveBtn(row);
                    }
                });

                const div = document.createElement('DIV');
                div.appendChild(btn);

                Handsontable.dom.empty(td);
                td.appendChild(div);
            },
        },
    ];
    const colHeader = [
        [
            '時間', { label: '押出機溫度', colspan: 15 },
            { label: '押出機', colspan: 4 }, '水槽', { label: '切粒機', colspan: 2 }, { label: '熔融樹酯', colspan: 2 },
            '輸送', { label: 'PBR入料', colspan: 2 }, '前料', '料頭', '人員', '異常備註', '超時原因', '修改',
        ],
        [
            '', '1段', '2段', '3段', '4段', '5段', '6段', '7段', '8段', '9段', '10段', '11段', '12段', '13段', 'DIE1', 'DIE2',
            '轉速', '負載', '真空', '模孔', '水溫', 'Hz', '壓力', '溫度', '壓力',
            'SILO', 'SILO', '規格', '', '', '', '', '', '',
        ],
        [
            '', '°C', '°C', '°C', '°C', '°C', '°C', '°C', '°C', '°C', '°C', '°C', '°C', '°C', '°C', '°C',
            'rpm', 'Amp', 'torr', '', '°C', 'm/min', 'Bar', '°C', 'Bar',
            '', '', '', 'kg', 'kg', '', '', '', '',
        ],
    ];
    const readOnlyRowControll = (row, col) => {
        if (creatingRow === row) {
            if (0 === col || 30 === col || 32 === col) {
                return { readOnly: true, className: 'text-danger bg-light' };
            } else if (17 < col) {
                return { readOnly: false, className: 'bg-light' };
            } else {
                return { readOnly: true, className: 'bg-light' };
            }

        } else if (isAdmin) {
            if (17 < col) {
                return { readOnly: false };
            } else {
                return { readOnly: true };
            }

        } else {
            return { readOnly: true };
        }
    }

    const saveBtn = row => {
        const apiUrl = Utils.generateApiUrl('/extrusion/updateForm', ['EXTR', line, sequence]);
        axios.post(apiUrl, {
            stdArray: rows[row],
        }, {
            ...Utils.pbtAxiosConfig,
        }).then(res => {
            if (!res.data.error) {
                toast.success('修改成功');
            } else {
                toast.warn(`修改失敗，${res.data.res}`);
            }
        }).catch(err => console.error(err));
    }

    return (
        <HotTable
            data={rows}
            columns={columns}
            nestedHeaders={colHeader}
            rowHeaders={false}
            cells={(row, col) => readOnlyRowControll(row, col)}
            licenseKey='non-commercial-and-evaluation'
        />
    );
}

export default RecordTable;