import React, { useState } from 'react';
import { HotTable } from '@handsontable/react';
import axios from 'axios';
import Utils from '../Utils';
import moment from 'moment';
import { toast } from 'react-toastify';

function Availability(props) {

    const firm = props.firm; //廠別來切分顯示的線別

    const [isLoading, setIsLoading] = useState(false);

    const [month, setMonth] = useState(moment(new Date()).format('YYYY-MM'));

    const [hiddenCols, setHiddenCols] = useState([]); //隱藏

    const [rows, setRows] = useState([]);
    const columns = [
        { data: 'DATE', type: 'text', width: 100 },
        { data: 'A_WT', type: 'numeric', numericFormat: { pattern: '##0.00' }, width: 60 },
        { data: 'A_TIME', type: 'numeric', numericFormat: { pattern: '##0.00' }, width: 60 },
        { data: 'B_WT', type: 'numeric', numericFormat: { pattern: '##0.00' }, width: 60 },
        { data: 'B_TIME', type: 'numeric', numericFormat: { pattern: '##0.00' }, width: 60 },
        { data: 'C_WT', type: 'numeric', numericFormat: { pattern: '##0.00' }, width: 60 },
        { data: 'C_TIME', type: 'numeric', numericFormat: { pattern: '##0.00' }, width: 60 },
        { data: 'D_WT', type: 'numeric', numericFormat: { pattern: '##0.00' }, width: 60 },
        { data: 'D_TIME', type: 'numeric', numericFormat: { pattern: '##0.00' }, width: 60 },
        { data: 'E_WT', type: 'numeric', numericFormat: { pattern: '##0.00' }, width: 60 },
        { data: 'E_TIME', type: 'numeric', numericFormat: { pattern: '##0.00' }, width: 60 },
        { data: 'F_WT', type: 'numeric', numericFormat: { pattern: '##0.00' }, width: 60 },
        { data: 'F_TIME', type: 'numeric', numericFormat: { pattern: '##0.00' }, width: 60 },
        { data: 'G_WT', type: 'numeric', numericFormat: { pattern: '##0.00' }, width: 60 },
        { data: 'G_TIME', type: 'numeric', numericFormat: { pattern: '##0.00' }, width: 60 },
        { data: 'H_WT', type: 'numeric', numericFormat: { pattern: '##0.00' }, width: 60 },
        { data: 'H_TIME', type: 'numeric', numericFormat: { pattern: '##0.00' }, width: 60 },
        { data: 'I_WT', type: 'numeric', numericFormat: { pattern: '##0.00' }, width: 60 }, //漳州
        { data: 'I_TIME', type: 'numeric', numericFormat: { pattern: '##0.00' }, width: 60 }, //漳州
        { data: 'J_WT', type: 'numeric', numericFormat: { pattern: '##0.00' }, width: 60 }, //漳州
        { data: 'J_TIME', type: 'numeric', numericFormat: { pattern: '##0.00' }, width: 60 }, //漳州
        { data: 'K_WT', type: 'numeric', numericFormat: { pattern: '##0.00' }, width: 60 },
        { data: 'K_TIME', type: 'numeric', numericFormat: { pattern: '##0.00' }, width: 60 },
        { data: 'L_WT', type: 'numeric', numericFormat: { pattern: '##0.00' }, width: 60 }, //漳州
        { data: 'L_TIME', type: 'numeric', numericFormat: { pattern: '##0.00' }, width: 60 }, //漳州
        { data: 'M_WT', type: 'numeric', numericFormat: { pattern: '##0.00' }, width: 60 },
        { data: 'M_TIME', type: 'numeric', numericFormat: { pattern: '##0.00' }, width: 60 },
        { data: 'N_WT', type: 'numeric', numericFormat: { pattern: '##0.00' }, width: 60 },
        { data: 'N_TIME', type: 'numeric', numericFormat: { pattern: '##0.00' }, width: 60 },
        { data: 'Q_WT', type: 'numeric', numericFormat: { pattern: '##0.00' }, width: 60 },
        { data: 'Q_TIME', type: 'numeric', numericFormat: { pattern: '##0.00' }, width: 60 },
        { data: 'R_WT', type: 'numeric', numericFormat: { pattern: '##0.00' }, width: 60 },
        { data: 'R_TIME', type: 'numeric', numericFormat: { pattern: '##0.00' }, width: 60 },
        { data: 'T_WT', type: 'numeric', numericFormat: { pattern: '##0.00' }, width: 60 },
        { data: 'T_TIME', type: 'numeric', numericFormat: { pattern: '##0.00' }, width: 60 },
    ];
    const colHeader = [
        '日期', 'A產量<br>稼動率', 'A經時<br>稼動率', 'B產量<br>稼動率', 'B經時<br>稼動率', 'C產量<br>稼動率', 'C經時<br>稼動率', 'D產量<br>稼動率', 'D經時<br>稼動率',
        'E產量<br>稼動率', 'E經時<br>稼動率', 'F產量<br>稼動率', 'F經時<br>稼動率', 'G產量<br>稼動率', 'G經時<br>稼動率', 'H產量<br>稼動率', 'H經時<br>稼動率', 'I產量<br>稼動率', 'I經時<br>稼動率',
        'J產量<br>稼動率', 'J經時<br>稼動率', 'K產量<br>稼動率', 'K經時<br>稼動率', 'L產量<br>稼動率', 'L經時<br>稼動率', 'M產量<br>稼動率', 'M經時<br>稼動率', 'N產量<br>稼動率', 'N經時<br>稼動率',
        'Q產量<br>稼動率', 'Q經時<br>稼動率', 'R產量<br>稼動率', 'R經時<br>稼動率', 'T產量<br>稼動率', 'T經時<br>稼動率',
    ];

    const query = () => {
        setIsLoading(true);
        setRows([]);

        let hidden = [];
        switch (firm) {
            case '7':
                hidden = [17, 18, 19, 20, 23, 24];
                break;
            default:
                break;
        }
        setHiddenCols(hidden);

        const apiUrl = Utils.generateApiUrl('/extrusion/getLineAvability', [moment(month).format('YYYYMM')]);
        axios.get(apiUrl, {
            ...Utils.pbtAxiosConfig,
        }).then(res => {
            if (!res.data.error) {
                let appendArray = [];
                let lastDate = '';
                let dateRow = {};
                res.data.res.forEach(element => {
                    if (lastDate !== element.REPORT_DATE) {
                        dateRow = { DATE: element.REPORT_DATE };
                        appendArray.push(dateRow);
                    }
                    lastDate = element.REPORT_DATE;
                    dateRow[`${element.LINE}_WT`] = element.AVABILITY_WT || 0;
                    dateRow[`${element.LINE}_TIME`] = element.AVABILITY_TIME || 0;
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

            <div className="w-100 overflow-hidden mt-2 mb-2" style={{ minHeight: "45rem" }}>
                <HotTable
                    data={rows}
                    columns={columns}
                    colHeaders={colHeader}
                    rowHeaders={false}
                    readOnly={true}
                    hiddenColumns={{ columns: hiddenCols }}
                    licenseKey="non-commercial-and-evaluation"
                />
            </div>
        </div>
    )
}

export default Availability;