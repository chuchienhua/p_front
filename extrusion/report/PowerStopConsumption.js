import React from "react";
import { HotTable } from '@handsontable/react';

//停車耗時用電量
function PowerStopConsumption(props) {

    let rows = props.rows;
    let sumStop = props.sumStop;
    let sumConsumption = props.sumConsumption;
    let hotTableComponent = props.hotTableComponent;

    const columns = [
        { data: 'DATE', type: 'text', width: 90 },
        { data: 'LINE', type: 'text', width: 50 },
        { data: 'SEQ_END', type: 'numeric', width: 70 },
        { data: 'SEQ_START', type: 'numeric', width: 70 },
        { data: 'STOP_START_TIME', type: 'text', width: 160 },
        { data: 'STOP_END_TIME', type: 'text', width: 160 },
        { data: 'CONSUMPTION', type: 'numeric', numericFormat: { pattern: '##0.0' }, width: 100 },
    ];
    const colHeader = ['日期', '線別', '結束序號', '開始序號', '停俥開始時間', '停俥結束時間', '用電量(KWH)'];

    return (
        <div className="mt-2">
            <div className="input-group input-group-sm w-50">
                <span className="input-group-text">合計停俥時間(hr)</span>
                <input type="numeric" className="form-control" value={sumStop} disabled />

                <span className="input-group-text">合計停車消耗</span>
                <input type="numeric" className="form-control" value={sumConsumption} disabled />
            </div>

            <HotTable
                className="mt-2 mb-2"
                data={rows}
                columns={columns}
                colHeaders={colHeader}
                rowHeaders={false}
                readOnly={true}
                ref={hotTableComponent}
                licenseKey="non-commercial-and-evaluation"
            />
        </div>
    );
}

export default PowerStopConsumption;