import React, { Component } from 'react';
import axios from 'axios';
import { HotTable } from '@handsontable/react';
import Handsontable from 'handsontable';
import 'handsontable/languages/zh-TW.js';
import PropTypes from 'prop-types';
import Swal from 'sweetalert2';
import { toast } from 'react-toastify';
import Utils from '../../Utils';

export default class PackingDailyAttendanceReport extends Component {

    constructor(props) {
        super(props);

        this.state = {
            data: [],
            columns: [
                { data: 'PACKING_DATE', type: 'text', width: 80, readOnly: true, },
                { data: 'PACKING_SHIFT', type: 'text', width: 40, className: 'htCenter', readOnly: true, },
                {
                    data: 'FOREMAN1', type: 'dropdown', width: 90, className: 'htCenter', allowInvalid: false,
                    source: (query, process) => {
                        process(this.props.foremen.map(row => row.FOREMAN_NAME)); //帶班人員
                    },
                },
                {
                    data: 'FOREMAN2', type: 'dropdown', width: 90, className: 'htCenter', allowInvalid: false,
                    source: (query, process) => {
                        process(this.props.foremen.map(row => row.FOREMAN_NAME)); //帶班人員
                    },
                },
                { data: 'AUTO_PACKING_HEADCOUNT', type: 'numeric', width: 80, className: 'htCenter', },
                { data: 'MANUAL_PACKING_HEADCOUNT', type: 'numeric', width: 80, className: 'htCenter', },
                { data: 'OVERTIME_HEADCOUNT', type: 'numeric', width: 80, className: 'htCenter', },
                { data: 'FILLING_QUANTITY1', type: 'numeric', width: 90, className: 'htCenter', },
                { data: 'FILLING_QUANTITY2', type: 'numeric', width: 90, className: 'htCenter', },
                { data: 'SEA_BULK_TANK', type: 'numeric', width: 80, className: 'htCenter', },
                { data: 'FIBC_FILLING_TANK', type: 'numeric', width: 80, className: 'htCenter', },
                { data: 'PACKING_MATERIAL_CARRY', type: 'numeric', width: 80, className: 'htCenter', },
                { data: 'OFF_LINE_BAG_PRINT', type: 'numeric', width: 80, className: 'htCenter', },
                { data: 'BAG_ATTACH_LABEL', type: 'numeric', width: 80, className: 'htCenter', },
                { data: 'BAG_STAMP', type: 'numeric', width: 80, className: 'htCenter', },
                { data: 'BAG_RESTACK', type: 'numeric', width: 80, className: 'htCenter', },
                { data: 'NOTE', type: 'text', width: 200, className: 'htCenter', },
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
                            this.savePackingDailyAttendanceReport(instance, cellProperties.row);
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
            hiddenColumns: { columns: [0] },
            colHeaders: [
                '排程日期',
                '班別', '帶班1', '帶班2', '自動包裝<br />外包人數', '手動包裝<br />外包人數',
                '包裝加班<br />人數', '灌充數量1<br />(Kg)', '灌充數量2<br />(Kg)',
                'SEA BULK<br />槽車綁帶<br />(次)', '太空袋<br />灌充槽車<br />(包)',
                '包材入廠<br />搬運歸位<br />(次)', 'OFF-Line<br />紙袋印刷<br />(噸)',
                '紙袋專用<br />標籤張貼<br />(噸)', '紙袋蓋<br />專用章<br />(噸)',
                '紙袋重新<br />自動堆疊<br />(噸)', '備註',
                '儲存',
            ],
        };

        if (this.props.isAdmin) {
            //排程人員
        } else {
            //包裝人員
            //this.state.hiddenColumns.columns = [this.state.columns.length - 1];
        }

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
    savePackingDailyAttendanceReport = async (hotInstance, index) => {
        const rowData = hotInstance.getSourceDataAtRow(index);
        //console.log('savePackingDailyAttendanceReport', index, rowData);

        //欄位檢查
        if (rowData.NOTE && (rowData.NOTE.length > 100)) {
            toast.warn('備註欄位最多輸入100個字');
            return;
        }

        const confirmResult = await Swal.fire({
            title: '請確認是否要儲存?',
            text: `第${index + 1}筆，班別:${rowData.PACKING_SHIFT}`,
            showCancelButton: true,
            confirmButtonText: '確認',
            cancelButtonText: '取消',
        });
        if (!confirmResult.isConfirmed) {
            return;
        }

        //呼叫後端儲存
        this.setState({ isLoading: true });
        const apiUrl = Utils.generateApiUrl('/packing/savePackingDailyAttendanceReport');
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
                    //將新增或修改的資料更新到前端，此處暫時不處理回傳多筆資料
                    const sourceData = hotInstance.getSourceData();
                    if (sourceData[index]) {
                        sourceData[index] = res.data.res[0];
                        hotInstance.updateData(sourceData, 'savePackingDailyAttendanceReport');
                    }
                    //更新報表總計
                    this.props.updateReportSummary();
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

PackingDailyAttendanceReport.propTypes = {
    isAdmin: PropTypes.bool,
    data: PropTypes.array,
    foremen: PropTypes.array,
    updateReportSummary: PropTypes.func,
};

PackingDailyAttendanceReport.defaultProps = {
    isAdmin: false,
    data: [],
    foremen: [],
    updateReportSummary: () => { },
};