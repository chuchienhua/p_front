import React from 'react';
import './Recipes.css';
import { HyperFormula } from 'hyperformula';
import { HotTable } from '@handsontable/react';
import { registerAllCellTypes } from 'handsontable/cellTypes';
import { registerAllModules } from 'handsontable/registry';

function RecipeStandard(props) {

    const hyperFormulaInstance = HyperFormula.buildEmpty({
        licenseKey: 'internal-use-in-handsontable',
    });

    const formulas = {
        engine: hyperFormulaInstance,
    }

    registerAllCellTypes();
    registerAllModules();

    const standardRows = props.rows; //押出製造規範表內容
    /*
    const columns = [
        {
            data: 'TEMP_1',
            type: 'numeric',
            width: 60,
        },
        {
            data: 'TEMP_2',
            type: 'numeric',
            width: 60,
        },
        {
            data: 'TEMP_3',
            type: 'numeric',
            width: 60,
        },
        {
            data: 'TEMP_4',
            type: 'numeric',
            width: 60,
        },
        {
            data: 'TEMP_5',
            type: 'numeric',
            width: 60,
        },
        {
            data: 'TEMP_6',
            type: 'numeric',
            width: 60,
        },
        {
            data: 'TEMP_7',
            type: 'numeric',
            width: 60,
        },
        {
            data: 'TEMP_8',
            type: 'numeric',
            width: 60,
        },
        {
            data: 'TEMP_9',
            type: 'numeric',
            width: 60,
        },
        {
            data: 'TEMP_10',
            type: 'numeric',
            width: 60,
        },
        {
            data: 'TEMP_11',
            type: 'numeric',
            width: 60,
        },
        {
            data: 'TEMP_12',
            type: 'numeric',
            width: 60,
        },
        {
            data: 'TEMP_13',
            type: 'numeric',
            width: 60,
        },
        {
            data: 'TEMP_DIE1',
            type: 'numeric',
            width: 60,
        },
        {
            data: 'TEMP_DIE2',
            type: 'numeric',
            width: 60,
        },
        {
            data: 'RPM',
            type: 'numeric',
            width: 60,
        },
        {
            data: 'AMP',
            type: 'numeric',
            width: 60,
        },
        {
            data: 'TORR',
            type: 'numeric',
            width: 60,
        },
        {
            data: 'HOLE',
            type: 'numeric',
            width: 60,
        },
        {
            data: 'TEMP_WATER',
            type: 'numeric',
            width: 60,
        },
        {
            data: 'HZ',
            type: 'numeric',
            width: 60,
        },
        {
            data: 'PRESSURE',
            type: 'numeric',
            width: 60,
        },
        {
            data: 'TEMP_RESIN',
            type: 'numeric',
            width: 60,
        },
        {
            data: 'PRESSURE_RESIN',
            type: 'numeric',
            width: 60,
        },
    ];
    const colHeader = [
        '溫度1段', '溫度2段', '溫度3段', '溫度4段', '溫度5段', '溫度6段', '溫度7段', '溫度8段', '溫度9段', '溫度10段', '溫度11段', '溫度12段', '溫度13段',
        '溫度DIE2', '溫度DIE2',
        '轉速', '負載', '真空', '模孔', '水溫', 'Hz', '壓力', '溫度', '壓力',
    ];
    */

    const columns = [
        {
            data: 'SEQUENCE',
            type: 'text',
            width: 50,
            readOnly: true,
        },
        {
            data: 'TYPE',
            type: 'text',
            width: 150,
            readOnly: true,
        },
        {
            data: 'TOLERANCE',
            type: 'numeric',
            width: 60,
        },
        {
            data: 'BASE',
            type: 'numeric',
            width: 60,
        },
    ];
    const colHeader = ['序號', '標準名稱', '公差', '基準值'];

    return (
        <div className="recipes-table mt-2">
            <HotTable
                data={standardRows}
                columns={columns}
                colHeaders={colHeader}
                rowHeaders={false}
                formulas={formulas}
                licenseKey="non-commercial-and-evaluation"
            />
        </div>
    );
}

export default RecipeStandard;