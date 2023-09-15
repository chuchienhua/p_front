import React, { Component } from 'react';
import axios from 'axios';
import { HotTable } from '@handsontable/react';
import Handsontable from 'handsontable';
import 'handsontable/languages/zh-TW.js';
import PropTypes from 'prop-types';
import Swal from 'sweetalert2';
import { toast } from 'react-toastify';
import Utils from '../Utils';

export default class MaterialInvTraceReportTable extends Component {

    constructor(props) {
        super(props);

        this.state = {
            data: [],
            columns: [
                { data: 'MATERIAL_CODE', type: 'text', width: 100, className: 'htCenter', readOnly: true, },
                { data: 'MAT_STOCK', type: 'numeric', width: 100, className: 'htCenter', readOnly: true, numericFormat: { pattern: '#,##0.00', }, },
                { data: 'BOOKING_STOCK', type: 'numeric', width: 100, className: 'htCenter', readOnly: true, numericFormat: { pattern: '#,##0.00', }, },
                { data: 'MATERIAL_USAGE_QTY', type: 'numeric', width: 100, className: 'htCenter', readOnly: true, numericFormat: { pattern: '#,##0.00', }, },
                { data: 'THIS_MONTH_STOCK', type: 'numeric', width: 100, className: 'htCenter', readOnly: true, numericFormat: { pattern: '#,##0.00', }, },
                { data: 'NEXT_MONTH_STOCK', type: 'numeric', width: 100, className: 'htCenter', readOnly: true, numericFormat: { pattern: '#,##0.00', }, },
                { data: 'NEXT_MONTH_STOCK2', type: 'numeric', width: 100, className: 'htCenter', readOnly: true, numericFormat: { pattern: '#,##0.00', }, },
                { data: 'AVG_USE_QTY', type: 'numeric', width: 100, className: 'htCenter', readOnly: true, },
                { data: 'SAFE_INV_MONTH', type: 'numeric', width: 100, className: 'htCenter', readOnly: true, },
                { data: 'SAFE_INV_QTY', type: 'numeric', width: 100, className: 'htCenter', readOnly: true, },
                { data: 'MIN_INV', type: 'numeric', width: 100, className: 'htCenter', readOnly: true, },
                { data: 'MEET_NOTE', type: 'text', width: 140, className: 'htCenter', readOnly: true, },
                {
                    data: 'SAVE_BTN',
                    width: 70,
                    readOnly: true,
                    renderer: (instance, td, row, col, prop, value, cellProperties) => {
                        const rowData = instance.getSourceDataAtRow(cellProperties.row);

                        const icon = document.createElement('SPAN');
                        icon.className = 'icon bi-pencil-square';
                        icon.innerHTML = ' 儲存';

                        const btn = document.createElement('BUTTON');
                        btn.className = 'btn btn-outline-success btn-sm px-1 py-0 nowrap align-top';
                        btn.disabled = !rowData.__UPDATED;
                        btn.appendChild(icon);
                        //console.log('renderer', rowData.PACKING_SEQ, rowData.EDIT_TIME, rowData.__UPDATED);

                        Handsontable.dom.addEvent(btn, 'click', () => {
                            //console.log(row, col, prop, value, cellProperties);
                            this.saveMaterialInvTraceReport(instance, cellProperties.row);
                        });

                        const div = document.createElement('DIV');
                        div.appendChild(btn);

                        Handsontable.dom.empty(td);
                        td.appendChild(div);
                        td.classList.add('htCenter');
                        td.classList.add('align-middle');
                    },
                },
            ],
            hiddenColumns: { columns: [12] },
            colHeaders: [
                '原料簡碼', '報表庫存', '已請購<br />未到廠量', '已排定<br />未生產用量',
                '本月底<br />預估庫存量', '下月底<br />預估庫存量', '下下月底<br />預估庫存量',
                '近三個月<br />月均用量', '安全庫存<br />月數', '安全庫存量', '最低庫存量', '備註',
                '儲存',
            ],
        };

        this.hotTableComponent = React.createRef();
        this.queryApiCancelToken = null;
    }

    componentDidMount() {
        //加入hook
        const hotInstance = this.hotTableComponent.current.hotInstance;
        if (!hotInstance) {
            console.warn('hotInstance is null');
            return;
        }
        hotInstance.loadData([]);
        hotInstance.addHook('afterChange', this.afterChangeHandler(hotInstance));
    }

    componentWillUnmount() {
        this.isUnmount = true;
        if (this.queryApiCancelToken) {
            this.queryApiCancelToken.cancel('componentWillUnmount');
        }
    }

    componentDidUpdate(prevProps) {
        if (this.props.data !== prevProps.data) {
            const hotInstance = this.hotTableComponent.current.hotInstance;
            if (!hotInstance) {
                console.warn('hotInstance is null');
                return;
            }
            hotInstance.loadData(this.props.data);
        }
    }

    //儲存報表資料
    saveMaterialInvTraceReport = async (hotInstance, index) => {
        const rowData = hotInstance.getSourceDataAtRow(index);
        //console.log('saveMaterialInvTraceReport', index, rowData);

        //欄位檢查
        if (rowData.MEET_NOTE && (rowData.MEET_NOTE.length > 30)) {
            toast.warn('備註欄位最多輸入30位');
            return;
        }

        const confirmResult = await Swal.fire({
            title: '請確認是否要儲存?',
            text: `第${index + 1}筆，班別:${rowData.WORK_SHIFT}、線別:${rowData.PRO_SCHEDULE_LINE}、序號:${rowData.PRO_SCHEDULE_SEQ}`,
            showCancelButton: true,
            confirmButtonText: '確認',
            cancelButtonText: '取消',
        });
        if (!confirmResult.isConfirmed) {
            return;
        }

        //呼叫後端儲存
        this.setState({ isLoading: true });
        const apiUrl = Utils.generateApiUrl('/packing/saveMaterialInvTraceReport');
        const apiData = {
            rows: [
                { ...rowData },
            ],
        };
        this.queryApiCancelToken = axios.CancelToken.source();
        return axios.post(apiUrl, apiData, {
            ...Utils.pbtAxiosConfig,
            cancelToken: this.queryApiCancelToken.token,
            timeout: 10000,
        }).then(res => {
            if (!res.data.error) {
                if (Array.isArray(res.data.res) && res.data.res.length) {
                    toast.success('儲存成功');
                    const sourceData = hotInstance.getSourceData();
                    if (sourceData[index]) {
                        //sourceData[index] = res.data.res[0];
                        delete sourceData[index].__UPDATED; //後端不回傳新的資料，前端只需要更新用到的狀態
                        hotInstance.updateData(sourceData, 'saveMaterialInvTraceReport');
                    }
                } else {
                    toast.error('儲存失敗');
                }
            } else {
                toast.error(`儲存失敗，${res.data.error}`);
            }
        }).catch(err => {
            //除了api取消以外都要顯示錯誤訊息
            if (!axios.isCancel(err)) {
                console.error(err);
                toast.error(`儲存失敗。\n錯誤訊息: ${err.toString()}`);
            }
        }).then(res => {
            this.setState({ isLoading: false });
            return res;
        });
    }

    //處理欄位連動
    afterChangeHandler = hotInstance => async (changes, source) => {
        console.log(changes, source);
        if ('edit' === source && Array.isArray(changes)) {
            const data = hotInstance.getSourceData();
            let updated = false;
            //此處只處理畫面上需要看到的欄位，其餘欄位會在儲存時再檢查一次
            for (let i = 0; i < changes.length; i++) {
                let [row, prop, oldValue, newValue] = changes[i];

                const rowData = data[row];
                if (oldValue !== newValue) {
                    rowData.__UPDATED = true;
                    updated = true;
                }
                //console.log('afterChangeHandler', rowData.PACKING_SEQ, rowData.__UPDATED);
                switch (prop) {
                    default:
                        break;
                }
            }
            if (updated) {
                hotInstance.updateData(data, 'afterChangeHandler');
            }
        } //end of if 'edit'
    }

    render() {
        return <>
            <HotTable ref={this.hotTableComponent}
                licenseKey="non-commercial-and-evaluation"
                columns={this.state.columns}
                colHeaders={this.state.colHeaders}
                // data={this.state.data}
                rowHeaders={true}
                manualRowResize={true}
                manualColumnResize={true}
                language="zh-TW"
                renderAllRows={true}
                autoColumnSize={false}
                minSpareRows={0}
                rowHeights={25}
                hiddenColumns={this.state.hiddenColumns}
                viewportColumnRenderingOffset={50}
            />
        </>;
    }
}

MaterialInvTraceReportTable.propTypes = {
    isAdmin: PropTypes.bool,
    data: PropTypes.array,
};

MaterialInvTraceReportTable.defaultProps = {
    isAdmin: false,
    data: [],
};