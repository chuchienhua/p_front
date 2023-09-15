import React, { useState } from "react";
import { HyperFormula } from 'hyperformula';
import { HotTable } from '@handsontable/react';
import axios from 'axios';
import Utils from '../Utils';
import moment from 'moment';
import { toast } from 'react-toastify';

function ProductionSummary(props) {

    const firm = props.firm; //廠別來切分顯示的線別

    const hyperFormulaInstance = HyperFormula.buildEmpty({
        licenseKey: 'internal-use-in-handsontable',
    });

    const formulas = {
        engine: hyperFormulaInstance,
    }

    const [isLoading, setIsLoading] = useState(false);

    const [month, setMonth] = useState(moment(new Date()).format('YYYY-MM'));

    const [hiddenCols, setHiddenCols] = useState([]); //隱藏

    const [rows, setRows] = useState([]);
    const columns = [
        { data: 'DATE', type: 'text', width: 100 },
        { data: 'PRODUCTIVITY', type: 'numeric', numericFormat: { pattern: '##0.00' }, width: 100 },
        { data: 'SCRAP', type: 'numeric', numericFormat: { pattern: '##0.00' }, width: 105 },
        { data: 'SCRAP_RATIO', type: 'numeric', numericFormat: { pattern: '##0.00' }, width: 100 },
        { data: 'A', type: 'numeric', numericFormat: { pattern: '##0.000' }, width: 60 },
        { data: 'B', type: 'numeric', numericFormat: { pattern: '##0.000' }, width: 60 },
        { data: 'C', type: 'numeric', numericFormat: { pattern: '##0.000' }, width: 60 },
        { data: 'D', type: 'numeric', numericFormat: { pattern: '##0.000' }, width: 60 },
        { data: 'E', type: 'numeric', numericFormat: { pattern: '##0.000' }, width: 60 },
        { data: 'F', type: 'numeric', numericFormat: { pattern: '##0.000' }, width: 60 },
        { data: 'G', type: 'numeric', numericFormat: { pattern: '##0.000' }, width: 60 },
        { data: 'H', type: 'numeric', numericFormat: { pattern: '##0.000' }, width: 60 },
        { data: 'I', type: 'numeric', numericFormat: { pattern: '##0.000' }, width: 60 }, //漳州
        { data: 'J', type: 'numeric', numericFormat: { pattern: '##0.000' }, width: 60 }, //漳州
        { data: 'K', type: 'numeric', numericFormat: { pattern: '##0.000' }, width: 60 },
        { data: 'L', type: 'numeric', numericFormat: { pattern: '##0.000' }, width: 60 }, //漳州
        { data: 'M', type: 'numeric', numericFormat: { pattern: '##0.000' }, width: 60 },
        { data: 'N', type: 'numeric', numericFormat: { pattern: '##0.000' }, width: 60 },
        { data: 'Q', type: 'numeric', numericFormat: { pattern: '##0.000' }, width: 60 },
        { data: 'R', type: 'numeric', numericFormat: { pattern: '##0.000' }, width: 60 },
        { data: 'T', type: 'numeric', numericFormat: { pattern: '##0.000' }, width: 60 },
    ];
    const colHeader = ['日期', '生產量(MT)', '料頭產出(MT)', '料頭占比(%)', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'Q', 'R', 'T'];
    const readOnlyRowControll = (row, col) => {
        if (0 === row && col > 3) {
            return { readOnly: false };
        }
    }

    const query = () => {
        setIsLoading(true);
        setRows([]);

        let hidden = [];
        switch (firm) {
            case '7':
                hidden = [12, 13, 15];
                break;
            default:
                break;
        }
        setHiddenCols(hidden);

        const apiUrl = Utils.generateApiUrl('/extrusion/getProductionSummary', [moment(month).format('YYYYMM')]);
        axios.get(apiUrl, {
            ...Utils.pbtAxiosConfig,
        }).then(res => {
            if (!res.data.error) {
                let appendArray = [
                    {
                        DATE: '生產目標', PRODUCTIVITY: res.data.goal, SCRAP: 15, SCRAP_RATIO: 0.5,
                        A: 220, B: 280, C: 900, D: 800, E: 300, F: 300, G: 160, H: 260,
                        I: 0, J: 0, K: 250, L: 0, M: 230, N: 230, Q: 230, R: 300, T: 300,
                    },
                    {
                        DATE: '累計實績', PRODUCTIVITY: '=SUM(E2:Z2)', SCRAP: '=SUM(C4:C100)', SCRAP_RATIO: '=C2/B2',
                        A: '=SUM(E4:E100)', B: '=SUM(F4:F100)', C: '=SUM(G4:G100)', D: '=SUM(H4:H100)', E: '=SUM(I4:I100)', F: '=SUM(J4:J100)',
                        G: '=SUM(K4:K100)', H: '=SUM(L4:L100)', I: '=SUM(M4:M100)', J: '=SUM(N4:N100)', K: '=SUM(O4:O100)', L: '=SUM(P4:P100)',
                        M: '=SUM(Q4:Q100)', N: '=SUM(R4:R100)', Q: '=SUM(S4:S100)', R: '=SUM(T4:T100)', T: '=SUM(U4:U100)',
                    },
                    {
                        DATE: '達成率(%)', PRODUCTIVITY: '=100*B2/B1', SCRAP: '=100*C2/C1', SCRAP_RATIO: '=100*D2/D1',
                        A: '=100*E2/E1', B: '=100*F2/F1', C: '=100*G2/G1', D: '=100*H2/H1', E: '=100*I2/I1', F: '=100*J2/J1',
                        G: '=100*K2/K1', H: '=100*L2/L1', I: '=100*M2/M1', J: '=100*N2/N1', K: '=100*O2/O1', L: '=100*P2/P1',
                        M: '=100*Q2/Q1', N: '=100*R2/R1', Q: '=100*S2/S1', R: '=100*T2/T1', T: '=100*U2/U1',
                    },
                ];
                let dateRow = { SCRAP: 0, SCRAP_RATIO: 0 };
                let lastDate = '';
                res.data.res.forEach(element => {
                    if (lastDate !== element.REPORT_DATE) {
                        dateRow = {
                            DATE: element.REPORT_DATE,
                            PRODUCTIVITY: `=SUM(E${appendArray.length + 1}:Z${appendArray.length + 1})`,
                            SCRAP: element.WEIGHT_SCRAP,
                            SCRAP_RATIO: `=C${appendArray.length + 1}/B${appendArray.length + 1}`,
                        };
                        appendArray.push(dateRow);
                    }
                    lastDate = element.REPORT_DATE;
                    dateRow[element.LINE] = element.PRODUCTIVITY;
                    dateRow['SCRAP'] = dateRow['SCRAP'] + element.WEIGHT_SCRAP;
                });
                setRows(appendArray);
            } else {
                toast.error(`查詢失敗，${res.data.res}`);
            }
        }).catch(err => console.error(err))
            .finally(() => setIsLoading(false));
    }

    return (
        <div className="col-12 px-0">
            <div className='input-group input-group-sm w-25 mt-2'>
                <span className='input-group-text'>月份</span>
                <input type='month' className='form-control' value={month} onChange={evt => setMonth(evt.target.value)} />

                <button type='button' className='btn btn-primary rounded-end me-2' onClick={query} disabled={isLoading}><span className='icon bi-search'></span> 查詢</button>
            </div>

            <div className="mt-2 mb-2">
                <HotTable
                    data={rows}
                    columns={columns}
                    colHeaders={colHeader}
                    rowHeaders={false}
                    formulas={formulas}
                    cells={(row, col) => readOnlyRowControll(row, col)}
                    readOnly={true}
                    hiddenColumns={{ columns: hiddenCols }}
                    licenseKey="non-commercial-and-evaluation"
                />
            </div>
        </div>
    )
}

export default ProductionSummary;