import React, { useState, useRef } from 'react';
import { HotTable } from '@handsontable/react';
import Handsontable from 'handsontable';
import { registerAllCellTypes } from 'handsontable/cellTypes';
import axios from 'axios';
import Utils from '../Utils';
import moment from 'moment';
import { toast } from 'react-toastify';

function TraceMaterials() {

    registerAllCellTypes();

    const [isLoading, setIsLoading] = useState(false);

    const [queryType, setQueryType] = useState('lotNo');

    /* 成品追原料參數 */
    const [packPalletNo, setPackPalletNo] = useState('20230803PT018555'); //欲查詢的包裝棧板編號
    const [lotNo, setLotNo] = useState('K230807D21');
    const [productNo, setProductNo] = useState('3020104X');
    const [startDate, setStartDate] = useState(moment(new Date()).subtract(1, 'month').format('YYYY-MM-DD'));
    const [endDate, setEndDate] = useState(moment(new Date()).format('YYYY-MM-DD'));

    const [seqStart, setSeqStart] = useState('');
    const [seqEnd, setSeqEnd] = useState('');
    const [showProductNo, setShowProductNo] = useState('');
    const [showLotNo, setShowLotNo] = useState('');
    const [line, setLine] = useState('');
    const [sequence, setSequence] = useState('');
    const [totalWeight, setTotalWeight] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [weightStart, setWeightStart] = useState('');
    const [weightEnd, setWeightEnd] = useState('');

    const [rows, setRows] = useState([]);
    const columns = [
        { data: 'LINE', type: 'text', width: 50 },
        { data: 'SEQUENCE', type: 'text', width: 50 },
        { data: 'MATERIAL', type: 'text', width: 150 },
        { data: 'LOT_NO', type: 'text', width: 150 },
        { data: 'BATCH_NO', type: 'text', width: 150 },
        { data: 'WEIGHT', type: 'numeric', numericFormat: { pattern: '#,###' }, width: 90 },
    ];
    const colHeader = ['線別', '序號', '原料簡碼', '原料Lot No', '原料棧板編號', '領用重量'];
    const hotTableComponent = useRef(null);

    //成品追原料
    const queryMaterial = () => {
        setIsLoading(true);
        setSeqStart('');
        setSeqEnd('');
        setShowProductNo('');
        setShowLotNo('');
        setLine('');
        setSequence('');
        setTotalWeight('');
        setStartTime('');
        setEndTime('');
        setWeightStart('');
        setWeightEnd('');
        setRows([]);

        const apiUrl = Utils.generateApiUrl('/trace/materials');
        axios.post(apiUrl, {
            queryType: queryType,
            packPalletNo: packPalletNo,
            lotNo: lotNo,
            productNo: productNo,
            startDate: startDate,
            endDate: endDate,
        }, {
            ...Utils.pbtAxiosConfig,
        }).then(res => {
            if (!res.data.error) {
                //console.log(res.data)
                let appendArray = [];
                res.data.res.forEach(element => {
                    appendArray.push({
                        LINE: res.data?.line ? res.data?.line : element.LINE,
                        SEQUENCE: res.data?.sequence ? res.data?.sequence : element.SEQUENCE,
                        MATERIAL: element.MATERIAL,
                        LOT_NO: element.LOT_NO || element.LOC_LOT_NO,
                        BATCH_NO: element.BATCH_NO,
                        WEIGHT: element.WEIGHT,
                        //QC_RESULT: ('Y' === element.QC_RESULT || 'RE' === element.QC_RESULT) ? 'Y' : element.QC_RESULT,
                    });
                });

                if ('packPallet' === queryType) {
                    setSeqStart(res.data.seqStart);
                    setSeqEnd(res.data.seqEnd);
                    setShowProductNo(res.data.productNo);
                    setShowLotNo(res.data.lotNo);
                    setLine(res.data.line);
                    setSequence(res.data.sequence);
                    setTotalWeight(res.data.totalWeight);
                    setStartTime(moment(res.data.startTime).format('YYYY-MM-DD HH:mm:ss'));
                    setEndTime(moment(res.data.endTime).format('YYYY-MM-DD HH:mm:ss'));
                    setWeightStart(res.data.weightStart);
                    setWeightEnd(res.data.weightEnd);
                }

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
                filename: '成品追原料',
                mimeType: 'text/csv',
                rowDelimiter: '\r\n',
            });
        }
    }

    return (
        <div className='trace-materials-page col-12 px-0'>
            <div className='input-group input-group-sm mt-2'>
                <span className="input-group-text">查詢方式</span>
                <select className="form-select me-2" value={queryType} onChange={evt => setQueryType(evt.target.value)} style={{ maxWidth: '150px' }}>
                    <option value="packPallet">包裝棧板編號</option>
                    <option value="lotNo">批號</option>
                    <option value="productNo">成品簡碼</option>
                </select>

                <span className={`input-group-text ${'lotNo' === queryType ? '' : 'd-none'}`}>批號</span>
                <input type='text' className={`form-control ${'lotNo' === queryType ? '' : 'd-none'}`} value={lotNo} onChange={evt => setLotNo(evt.target.value)} style={{ maxWidth: '100px' }} />

                <span className={`input-group-text ${'productNo' === queryType ? '' : 'd-none'}`}>成品簡碼</span>
                <input type='text' className={`form-control ${'productNo' === queryType ? '' : 'd-none'}`} value={productNo} onChange={evt => setProductNo(evt.target.value)} style={{ maxWidth: '120px' }} />

                <span className={`input-group-text ${'productNo' === queryType ? '' : 'd-none'}`}>日期</span>
                <input type='date' className={`form-control ${'productNo' === queryType ? '' : 'd-none'}`} value={startDate} onChange={evt => setStartDate(evt.target.value)} style={{ maxWidth: '120px' }} />

                <span className={`input-group-text ${'productNo' === queryType ? '' : 'd-none'}`}>-</span>
                <input type='date' className={`form-control ${'productNo' === queryType ? '' : 'd-none'}`} value={endDate} onChange={evt => setEndDate(evt.target.value)} style={{ maxWidth: '120px' }} />

                <span className={`input-group-text ${'packPallet' === queryType ? '' : 'd-none'}`}>包裝棧板編號</span>
                <input type='text' className={`form-control ${'packPallet' === queryType ? '' : 'd-none'}`} value={packPalletNo} onChange={evt => setPackPalletNo(evt.target.value)} style={{ maxWidth: '150px' }} />

                <button type='button' className='btn btn-primary rounded-end me-2' onClick={queryMaterial} disabled={isLoading}><span className='icon bi-search'></span> 查詢</button>
                <button type="button" className="btn btn-outline-success rounded" onClick={exportFile} disabled={isLoading || !rows.length}><span className="icon bi-cloud-download"></span> 匯出</button>
            </div>

            {('packPallet' === queryType) &&
                <>
                    <div className='input-group input-group-sm mt-2'>
                        <span className='input-group-text'>包裝起始序號</span>
                        <input type='text' className='form-control me-2' value={seqStart} disabled={true} style={{ maxWidth: '50px' }} />

                        <span className='input-group-text'>包裝結束序號</span>
                        <input type='text' className='form-control me-2' value={seqEnd} disabled={true} style={{ maxWidth: '50px' }} />

                        <span className='input-group-text'>成品簡碼</span>
                        <input type='text' className='form-control me-2' value={showProductNo} disabled={true} style={{ maxWidth: '120px' }} />

                        <span className='input-group-text'>批號</span>
                        <input type='text' className='form-control me-2' value={showLotNo} disabled={true} style={{ maxWidth: '100px' }} />
                    </div>

                    <div className='input-group input-group-sm mt-2'>
                        <span className='input-group-text'>線別</span>
                        <input type='text' className='form-control' value={line} disabled={true} style={{ maxWidth: '50px' }} />

                        <span className='input-group-text'>序號</span>
                        <input type='text' className='form-control me-2' value={sequence} disabled={true} style={{ maxWidth: '50px' }} />

                        <span className='input-group-text'>總量</span>
                        <input type='text' className='form-control' value={totalWeight} disabled={true} style={{ maxWidth: '100px' }} />
                    </div>

                    <div className='input-group input-group-sm mt-2 d-none'>
                        <span className='input-group-text'>押出時段</span>
                        <input type='text' className='form-control' value={startTime} disabled={true} style={{ maxWidth: '160px' }} />
                        <span className='input-group-text'>~</span>
                        <input type='text' className='form-control' value={endTime} disabled={true} style={{ maxWidth: '160px' }} />
                    </div>

                    <div className='input-group input-group-sm mt-2'>
                        <span className='input-group-text'>領料區間</span>
                        <input type='text' className='form-control' value={weightStart} disabled={true} style={{ maxWidth: '120px' }} />
                        <span className='input-group-text'>~</span>
                        <input type='text' className='form-control' value={weightEnd} disabled={true} style={{ maxWidth: '120px' }} />
                    </div>
                </>
            }

            <div className="trace-materials-table mt-2 mb-2">
                <HotTable
                    data={rows}
                    columns={columns}
                    colHeaders={colHeader}
                    rowHeaders={false}
                    readOnly={true}
                    ref={hotTableComponent}
                    licenseKey="non-commercial-and-evaluation"
                />
            </div>
        </div>
    );
}

export default TraceMaterials;