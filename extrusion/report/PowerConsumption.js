import React from "react";
import { HotTable } from '@handsontable/react';

//每日每班用電量
function PowerConsumption(props) {

    let rows = props.rows;
    let showType = props.showType;
    let hotTableComponent = props.hotTableComponent;

    const columns = [
        { data: 'DATE', type: 'text', width: 100 },
        { data: 'WORK_SHIFT', type: 'text', width: 50 },
        { data: 'LINE', type: 'text', width: 50 },
        { data: 'SEQUENCE', type: 'numeric', width: 70 },
        { data: 'PRODUCT_NO', type: 'text', width: 100 },
        { data: 'PRODUCTIVITY', type: 'numeric', width: 100 },
        { data: 'ACT_STR_TIME', type: 'text', width: 160 },
        { data: 'ACT_END_TIME', type: 'text', width: 160 },
        { data: 'CONSUMPTION', type: 'numeric', numericFormat: { pattern: '#,###0.0' }, width: 100 },
        { data: 'CONSUMPTION_PER_MT', type: 'numeric', numericFormat: { pattern: '#,###0.0' }, width: 160 },
    ];
    const colHeader = ['日期', '班別', '線別', '序號', '產品規格', '實際產量(KG)', '開車時間', '停俥時間', '用電量(KWH)', '用電原單位(KWH/MT)'];

    return (
        <div className="mt-2 mb-2">
            <HotTable
                data={rows}
                columns={columns}
                colHeaders={colHeader}
                rowHeaders={false}
                readOnly={true}
                hiddenColumns={{ columns: ('order' === showType) ? [0, 1] : [] }}
                ref={hotTableComponent}
                licenseKey="non-commercial-and-evaluation"
            />
        </div>
    );
}

export default PowerConsumption;