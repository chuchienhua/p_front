import React from 'react';
import { HotTable } from '@handsontable/react';
import Handsontable from 'handsontable';
import { registerAllCellTypes } from 'handsontable/cellTypes';

function QATable(props) {

    registerAllCellTypes();

    const rows = props.rows;
    const creatingRow = props.creatingRow; //正在建立中的線別

    const columns = [
        {
            data: '0',
            width: 160,
            renderer: function (instance, td, row, col, prop, value, cellProperties) {
                Handsontable.renderers.TextRenderer.apply(this, arguments);
                if (instance.getDataAtCell(row, 21)) {
                    td.classList.add('bg-danger');
                    td.classList.add('text-light');
                }
            },
        },
        { data: '1', type: 'numeric', width: 45 },
        { data: '2', type: 'numeric', width: 45 },
        { data: '3', type: 'numeric', width: 45 },
        { data: '4', type: 'numeric', width: 45 },
        { data: '5', type: 'numeric', width: 45 },
        { data: '6', type: 'numeric', width: 45 },
        { data: '7', type: 'numeric', width: 45 },
        { data: '8', type: 'numeric', width: 55 }, //黑點數
        { data: '9', type: 'numeric', width: 45 },
        { data: '10', type: 'numeric', width: 45 },
        { data: '11', type: 'numeric', width: 45 },
        { data: '12', type: 'numeric', width: 45 },
        { data: '13', type: 'numeric', width: 55 },
        { data: '14', type: 'numeric', width: 70 },
        { data: '15', type: 'numeric', width: 55 },
        { data: '16', type: 'numeric', width: 55 },
        { data: '17', type: 'numeric', width: 70 },
        { data: '18', type: 'numeric', width: 55 },
        { data: '19', type: 'numeric', width: 45 },
        { data: '20', type: 'text', width: 60 },
        { data: '21', type: 'text', width: 100 },
    ];
    const colHeader = [
        [
            '時間', { label: 'M1', colspan: 2 }, '灰份', { label: '色差', colspan: 4 },
            '黑點數', { label: '表面黑點數', colspan: 3 },
            '模垢', '異色粒', '外來異物', '長條粒', '多胞粒', '玻纖外露', '含水量', 'YI', '人員', '超時原因',
        ],
        [
            '', 'P2', 'QA', '%', 'L*', 'a*', 'b*', 'E*',
            '', 'A', 'B', 'C',
            '', '', '', '', '', '', '', '',
        ],
    ];
    const readOnlyRowControll = (row, col) => {
        if (creatingRow === row) {
            if (0 === col || 20 === col || 21 === col) {
                return { readOnly: true, className: 'text-danger bg-light' };
            } else {
                return { readOnly: false, className: 'bg-light' };
            }
        } else {
            return { readOnly: true };
        }
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

export default QATable;