import React from 'react';
import { HyperFormula } from 'hyperformula';
import { HotTable } from '@handsontable/react';
import { registerAllCellTypes } from 'handsontable/cellTypes';
import { registerAllModules } from 'handsontable/registry';

function MixingMatTable(props) {

    const hyperFormulaInstance = HyperFormula.buildEmpty({
        licenseKey: 'internal-use-in-handsontable',
    });

    const formulas = {
        engine: hyperFormulaInstance,
    }

    registerAllCellTypes();
    registerAllModules();

    const materialRows = props.rows; //原料重量表內容
    const hiddenColumnSetting = {
        columns: (props.weightOnly) ? [2, 4] : false, //MixStockPDA僅顯示原料、重量與單位
    }

    const printReadOnly = props.printReadOnly || false; //Mixing印標籤使否供選擇

    const columns = [
        {
            data: 'MATERIAL',
            type: 'text',
            width: 100,
            readOnly: true,
        },
        {
            data: 'BATCH_WEIGHT',
            type: 'text',
            width: 80,
            readOnly: true,
        },
        {
            data: 'TOTAL_WEIGHT',
            type: 'text',
            width: 80,
            readOnly: true,
        },
        {
            data: 'UNIT',
            type: 'text',
            width: 50,
            readOnly: true,
        },
        {
            data: 'PRINT',
            type: 'checkbox',
            width: 80,
            readOnly: printReadOnly,
        }
    ];
    const colHeader = ['原料名稱', '重量/批', '總重', '單位', '欲列印'];

    return (
        <div className="recipes-detail-table mt-2">
            <HotTable
                data={materialRows}
                columns={columns}
                colHeaders={colHeader}
                rowHeaders={false}
                formulas={formulas}
                licenseKey="non-commercial-and-evaluation"
                hiddenColumns={hiddenColumnSetting}
            />
        </div>
    );
}

export default MixingMatTable;