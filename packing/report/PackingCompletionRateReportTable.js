import React, { Component } from 'react';
import axios from 'axios';
import { HotTable } from '@handsontable/react';
import Handsontable from 'handsontable';
import 'handsontable/languages/zh-TW.js';
import moment from 'moment';
import PropTypes from 'prop-types';
import Swal from 'sweetalert2';
import { toast } from 'react-toastify';
import Utils from '../../Utils';

export default class PackingCompletionRateReportTable extends Component {

    constructor(props) {
        super(props);

        this.state = {
            data: [],
            columns: [
                {
                    data: 'PACKING_DATE', type: 'text', width: 50, readOnly: true,
                    renderer: (instance, td, row, col, prop, value/*, cellProperties*/) => {
                        Handsontable.dom.empty(td);
                        td.classList.add('htCenter');
                        td.classList.add('htDimmed');
                        // td.classList.add('htMiddle');
                        if (value) {
                            td.innerHTML = moment(value).format('MM/DD');
                            td.title = `排程日期: ${moment(value).format('YYYY/MM/DD')}`;
                        }
                    },
                },
                { data: 'WORK_SHIFT', type: 'text', width: 50, className: 'htCenter', readOnly: true, },
                { data: 'PACKING_LINE_NAME', type: 'text', width: 80, className: 'htCenter', readOnly: true, },
                { data: 'PRO_SCHEDULE_LINE', type: 'text', width: 50, className: 'htCenter', readOnly: true, },
                { data: 'PRO_SCHEDULE_SEQ', type: 'text', width: 60, className: 'htCenter', readOnly: true, },
                { data: 'PRD_PC', type: 'text', width: 100, className: 'htCenter', readOnly: true, },
                { data: 'TARGET_WEIGHT', type: 'numeric', width: 65, className: 'htCenter', readOnly: true, numericFormat: { pattern: '#,##0', }, },
                { data: 'PACKING_WEIGHT', type: 'numeric', width: 65, className: 'htCenter', readOnly: true, numericFormat: { pattern: '#,##0', }, },
                { data: 'ACHIEVEMENT_RATE', type: 'numeric', width: 70, className: 'htCenter', readOnly: true, numericFormat: { pattern: '0.00%' } },
                {
                    data: 'IS_COMPLETED', type: 'text', width: 80, className: 'htCenter', readOnly: true,
                    renderer: (instance, td, row, col, prop, value, cellProperties) => {
                        Handsontable.dom.empty(td);
                        td.classList.add('htCenter');
                        // td.classList.add('htMiddle');
                        const rowData = instance.getSourceDataAtRow(cellProperties.row);
                        if (rowData.IS_COMPLETED) {
                            td.innerHTML = '達標';
                            td.classList.add('text-primary');
                        } else {
                            td.innerHTML = '未達標';
                            td.classList.add('text-danger');
                        }
                    },
                },
                {
                    data: 'NOT_MEET_REASON', type: 'dropdown', width: 140, className: 'htCenter', allowInvalid: false,
                    source: (query, process) => {
                        process(this.props.notMeetReasons.map(row => row.REASON_NAME)); //未達標原因
                    },
                },
                {
                    data: 'FIRST_CONFIRM_TIME', type: 'text', width: 100, readOnly: true,
                    renderer: (instance, td, row, col, prop, value/*, cellProperties*/) => {
                        Handsontable.dom.empty(td);
                        td.classList.add('htCenter');
                        td.classList.add('htDimmed');
                        // td.classList.add('htMiddle');
                        if (value) {
                            td.innerHTML = moment(value).format('MM/DD HH:mm');
                            td.title = `開始確認時間: ${moment(value).format('YYYY/MM/DD HH:mm:ss')}`;
                        }
                    },
                },
                {
                    data: 'LAST_CONFIRM_TIME', type: 'text', width: 100, readOnly: true,
                    renderer: (instance, td, row, col, prop, value/*, cellProperties*/) => {
                        Handsontable.dom.empty(td);
                        td.classList.add('htCenter');
                        td.classList.add('htDimmed');
                        // td.classList.add('htMiddle');
                        if (value) {
                            td.innerHTML = moment(value).format('MM/DD HH:mm');
                            td.title = `最後確認時間: ${moment(value).format('YYYY/MM/DD HH:mm:ss')}`;
                        }
                    },
                },
                { data: 'PACKING_PERIOD', type: 'text', width: 80, className: 'htCenter', readOnly: true, },
                { data: 'MEET_NOTE', type: 'text', width: 140, className: 'htCenter', },
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
                            this.savePackingCompletionRateReport(instance, cellProperties.row);
                        });

                        const div = document.createElement('DIV');
                        div.appendChild(btn);

                        Handsontable.dom.empty(td);
                        td.appendChild(div);
                        td.classList.add('htCenter');
                        td.classList.add('htMiddle');
                    },
                },
            ],
            hiddenColumns: { columns: [] },
            colHeaders: [
                '日期', '班別', '包裝機', '線別', '押出<br />序號',
                '成品簡碼', '預計包<br />裝重量', '實際包<br />裝重量', '達成率', '是否達標',
                '未達標原因', '開始確<br />認時間', '最後確<br />認時間', '包裝時間', '備註',
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
    savePackingCompletionRateReport = async (hotInstance, index) => {
        const rowData = hotInstance.getSourceDataAtRow(index);
        //console.log('savePackingCompletionRateReport', index, rowData);

        //欄位檢查
        if (rowData.MEET_NOTE && (rowData.MEET_NOTE.length > 100)) {
            toast.warn('備註欄位最多輸入100個字');
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
        const apiUrl = Utils.generateApiUrl('/packing/savePackingCompletionRateReport');
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
                        hotInstance.updateData(sourceData, 'savePackingCompletionRateReport');
                    }
                    this.props.updateReportSummary(sourceData);
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
                row = hotInstance.toPhysicalRow(row);

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
                filters={true}
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

PackingCompletionRateReportTable.propTypes = {
    isAdmin: PropTypes.bool,
    data: PropTypes.array,
    lines: PropTypes.array,
    notMeetReasons: PropTypes.array,
    formatPackingPeriod: PropTypes.func,
    updateReportSummary: PropTypes.func,
};

PackingCompletionRateReportTable.defaultProps = {
    isAdmin: false,
    data: [],
    lines: [],
    notMeetReasons: [],
    formatPackingPeriod: () => { },
    updateReportSummary: () => { },
};