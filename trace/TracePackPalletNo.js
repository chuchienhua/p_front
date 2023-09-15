import React, { useState, useRef } from 'react';
import { HotTable } from '@handsontable/react';
import Handsontable from 'handsontable';
import { registerAllCellTypes } from 'handsontable/cellTypes';
import axios from 'axios';
import Utils from '../Utils';
import moment from 'moment';
import { toast } from 'react-toastify';

function TracePackPalletNo() {

    registerAllCellTypes();

    const [isLoading, setIsLoading] = useState(false);

    const [material, setMaterial] = useState('CCP187');
    const [lotNo, setLotNo] = useState('23040093C'); //空輸 230521AUR
    const [queryType, setQueryType] = useState('powder');
    const [showPackPallet, setShowPackPallet] = useState(true);

    const [rows, setRows] = useState([]);
    const [hiddenCols, setHiddenCols] = useState([0]);
    const columns = [
        { data: 'SILO_NO', type: 'text', width: 85 },
        //{ data: 'BATCH_NO', type: 'text', width: 150 },
        //{ data: 'BAG_WEIGHT', type: 'numeric', width: 80 },
        //{ data: 'INVENTORY', type: 'numeric', width: 60 },
        { data: 'MIX', type: 'checkbox', width: 80, className: 'htCenter align-middle' },
        { data: 'MIX_LOT_NO', type: 'text', width: 100 },
        //{ data: 'PICK_DATE', type: 'text', width: 160 },
        { data: 'LINE', type: 'text', width: 50 },
        { data: 'SEQUENCE', type: 'text', width: 60 },
        { data: 'PRODUCT_NO', type: 'text', width: 110 },
        { data: 'PACK_PALLET_NO', type: 'text', width: 150 },
    ];
    const colHeader = ['SILO NO', /*'原料棧板編號', '單包淨重', '庫存量',*/ '拌粉作業', '拌粉LOT NO', /*'入料時間',*/ '線別', '序號', '成品簡碼', '成品棧板編號'];
    const hotTableComponent = useRef(null);

    //原料追包裝成品
    const queryPackPalletNo = () => {
        setIsLoading(true);
        setHiddenCols(('powder' === queryType) ? [0] : [1, 2]);
        setRows([]);

        const apiUrl = Utils.generateApiUrl('/trace/packPalletNo', [queryType, lotNo]);
        axios.get(apiUrl, {
            ...Utils.pbtAxiosConfig,
        }).then(res => {
            if (!res.data.error) {
                let orderSet = new Set();
                let appendArray = [];
                res.data.res.forEach(element => {
                    if (orderSet.has(element.LINE + element.SEQUENCE) && !showPackPallet) {
                        return;
                    }
                    appendArray.push({
                        SILO_NO: element.SILO,
                        BATCH_NO: element.BATCH_NO,
                        //BAG_WEIGHT: element.PCK_KIND,
                        //INVENTORY: element.QTY,
                        MIX: ('MIX' === element.STAGE),
                        MIX_LOT_NO: ('MIX' === element.STAGE) ? element.LINE + element.SEQUENCE + '-' + element.BATCH_SEQ_START + '~' + element.BATCH_SEQ_END : '',
                        PICK_DATE: element.PICK_DATE ? moment(element.PICK_DATE).format('YYYY-MM-DD HH:mm:ss') : '',
                        LINE: element.LINE,
                        SEQUENCE: element.SEQUENCE,
                        PRODUCT_NO: element.PRD_PC,
                        PACK_PALLET_NO: element.PALLET_NO,
                    });
                    orderSet.add(element.LINE + element.SEQUENCE);
                });
                setRows(appendArray);
            } else {
                toast.error(`查詢失敗，${res.data.res}`);
            }
        }).catch(err => console.error(err))
            .finally(() => setIsLoading(false));
    }

    //輸出表格
    const exportFile = () => {
        //FIXME:沒Import Handsontable可能會跳出Cannot read properties of undefined (reading 'downloadFile')
        if (Handsontable.Core.length) {
            const hot = hotTableComponent.current.hotInstance;
            const exportPlugin = hot.getPlugin('exportFile');
            exportPlugin.downloadFile('csv', {
                bom: true,
                columnDelimiter: ',',
                columnHeaders: true,
                exportHiddenColumns: false,
                rowHeaders: false,
                exportHiddenRows: true,
                fileExtension: 'csv',
                filename: '原料追成品',
                mimeType: 'text/csv',
                rowDelimiter: '\r\n',
            });
        }
    }

    return (
        <div className='trace-pack-pallet-page col-12 px-0'>
            <div className='input-group input-group-sm mt-2'>
                <span className='input-group-text'>原料品名</span>
                <input type='text' className='form-control me-2' value={material} onChange={evt => setMaterial(evt.target.value)} style={{ maxWidth: '100px' }} />

                <span className='input-group-text'>原料Lot No</span>
                <input type='text' className='form-control me-2' value={lotNo} onChange={evt => setLotNo(evt.target.value)} style={{ maxWidth: '120px' }} />

                <span className='input-group-text'>原料類別</span>
                <select className="form-select me-2" onChange={evt => setQueryType(evt.target.value)} style={{ maxWidth: '140px' }}>
                    <option value="powder">固定包裝原料</option>
                    <option value="silo">空輸原料</option>
                </select>

                <div className="input-group-text">
                    <input className="form-check-input" type="checkbox" aria-label="trace-pack-pallet-show-checkbox" defaultChecked={showPackPallet} onChange={evt => setShowPackPallet(evt.target.checked)} />
                </div>
                <input type="text" className="form-control" aria-label="trace-pack-pallet-show-checkbox" value={"顯示重複工令"} disabled style={{ maxWidth: '110px' }} />

                <button type='button' className='btn btn-primary rounded-end me-2' onClick={queryPackPalletNo} disabled={isLoading}><span className='icon bi-search'></span> 查詢</button>
                <button type="button" className="btn btn-outline-success rounded" onClick={exportFile} disabled={isLoading || !rows.length}><span className="icon bi-cloud-download"></span> 匯出</button>
            </div>

            <div className="badge rounded-pill text-bg-warning me-2">固定包裝範例: M2305091101, 11112607</div>
            <div className="badge rounded-pill text-bg-warning">空輸範例: 2306067CT, 230614446</div>
            <div className="trace-pack-pallet-table mt-2 mb-2">
                <HotTable
                    data={rows}
                    columns={columns}
                    colHeaders={colHeader}
                    rowHeaders={false}
                    readOnly={true}
                    hiddenColumns={{ columns: hiddenCols }}
                    ref={hotTableComponent}
                    licenseKey="non-commercial-and-evaluation"
                />
            </div>
        </div>
    );
}

export default TracePackPalletNo;