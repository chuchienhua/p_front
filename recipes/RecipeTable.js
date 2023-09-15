import React, { useRef } from 'react';
import './Recipes.css';
import { HyperFormula } from 'hyperformula';
import { HotTable } from '@handsontable/react';
import Handsontable from 'handsontable';
import { registerAllCellTypes } from 'handsontable/cellTypes';
import { registerAllModules } from 'handsontable/registry';
import { toast } from 'react-toastify';

function RecipeTable(props) {

    const hyperFormulaInstance = HyperFormula.buildEmpty({
        licenseKey: 'internal-use-in-handsontable',
    });

    const formulas = {
        engine: hyperFormulaInstance,
    }

    registerAllCellTypes();
    registerAllModules();

    const recipeRows = props.rows; //配方表內容
    const feeders = props.feeders; //所有的入料機
    const mixers = props.mixers; //所有的拌粉機
    const materialList = props.materialList; //能選擇的原料
    const line = props.line; //生產線別，為了對應到入料機
    const isAdmin = props.isAdmin; //管理員

    const allowFeeders = feeders.filter(feeder => (line === feeder.LINE)).map(feeder => (line + feeder.FEEDER));

    const hotTableComponent = useRef(null);

    const columns = [
        {
            data: 'MATERIAL',
            type: 'autocomplete',
            source: materialList,
            strict: true,
            allowInvalid: false,
            width: 120,
        },
        {
            data: 'RATIO',
            width: 100,
            numericFormat: {
                pattern: '##0.00000'
            },
            renderer: function (instance, td, row, col, prop, value, cellProperties) {
                Handsontable.renderers.NumericRenderer.apply(this, arguments);
                if (100 < value) {
                    td.classList.add('bg-danger');
                    td.classList.add('text-light');
                }
            },
        },
        {
            data: 'FEEDER',
            type: 'autocomplete',
            source: allowFeeders,
            strict: true,
            allowInvalid: false,
            width: 100,
        },
        {
            data: 'AIRINPUT',
            type: 'checkbox',
            width: 40,
        },
        {
            data: 'MIDDLE', //中間桶
            type: 'checkbox',
            width: 60,
        },
        {
            data: 'MIXER',
            type: 'dropdown',
            source: mixers,
            width: 100,
        },
        {
            data: 'SEMI_NO',
            type: 'autocomplete',
            source: ['', 'P', 'G'],
            strict: true,
            allowInvalid: false,
            width: 100,
        },
        {
            data: 'RESIN',
            width: 40,
            type: 'checkbox',
        },
        {
            data: 'FR',
            width: 70,
            type: 'checkbox',
        },
        {
            data: 'GF',
            width: 45,
            type: 'checkbox',
        },
        {
            data: 'DEL_BTN',
            width: 40,
            readOnly: true,
            renderer: function (instance, td, row, col, prop, value, cellProperties) {
                if (0 !== row) {
                    const icon = document.createElement('SPAN');
                    icon.className = "icon bi-x-circle";

                    const btn = document.createElement('DEL_BTN');
                    btn.className = 'btn btn-outline-danger btn-sm px-1 py-0 nowrap align-top';
                    if (!isAdmin) {
                        btn.className += ' disabled';
                    }
                    btn.appendChild(icon);

                    Handsontable.dom.addEvent(btn, 'click', () => {
                        instance.alter('remove_row', row);
                    });

                    const div = document.createElement('DIV');
                    div.appendChild(btn);

                    Handsontable.dom.empty(td);
                    td.appendChild(div);
                    td.classList.add('htCenter');
                    td.classList.add('align-middle');
                }
            },
        },
        {
            data: 'CRE_BTN',
            width: 40,
            readOnly: true,
            renderer: function (instance, td, row, col, prop, value, cellProperties) {
                if (0 !== row) {
                    const icon = document.createElement('SPAN');
                    icon.className = "icon bi-plus-circle";

                    const btn = document.createElement('CRE_BTN');
                    btn.className = 'btn btn-outline-info btn-sm px-1 py-0 nowrap align-top';
                    if (!isAdmin) {
                        btn.className += ' disabled';
                    }
                    btn.appendChild(icon);

                    Handsontable.dom.addEvent(btn, 'click', () => {
                        instance.alter('insert_row_below', row);
                    });

                    const div = document.createElement('DIV');
                    div.appendChild(btn);

                    Handsontable.dom.empty(td);
                    td.appendChild(div);
                    td.classList.add('htCenter');
                    td.classList.add('align-middle');

                }
            },
        }
    ];
    const colHeader = ['原料簡碼', '配方佔比(%)', '入料機', '空輸', '中間桶', '拌粉設備', '半成品簡碼', '樹酯', '耐燃劑', '玻纖', '刪除', '新增'];
    const readOnlyRowControll = row => {
        if (!isAdmin) {
            return { readOnly: true };
        } else {
            if (0 === row && 5 === row) {
                return { readOnly: true };
            }
        }
    }

    const handleRecovery = () => {
        try {
            const undo = hotTableComponent.current.hotInstance.getPlugin("undoRedo");
            // undo.enable();
            undo.undo();
        } catch (error) {
            toast.error('沒有上一步可以復原');
        }

    }

    return (
        <div className="recipes-table mt-2">
            <button type="button" className="btn btn-outline-info btn-sm me-2" onClick={handleRecovery}><span className="icon bi-sign-turn-left"></span>復原</button>
            <div className="badge rounded-pill text-bg-info me-2">欲返回上一步請點選復原鍵或使用快捷鍵Ctrl</div>
            <div className="badge rounded-pill text-bg-info">欲刪除原料直接將欄位Delete清空即可</div>

            <div className='mt-2'>
                <HotTable
                    data={recipeRows}
                    columns={columns}
                    colHeaders={colHeader}
                    rowHeaders={false}
                    formulas={formulas}
                    cells={row => readOnlyRowControll(row)}
                    licenseKey="non-commercial-and-evaluation"
                    ref={hotTableComponent}
                />
            </div>
        </div>
    );
}

export default RecipeTable;