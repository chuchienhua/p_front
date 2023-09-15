import React, { Component } from 'react';
import axios from 'axios';
import { HotTable } from '@handsontable/react';
import Handsontable from 'handsontable';
import 'handsontable/languages/zh-TW.js';
import moment from 'moment';
import PropTypes from 'prop-types';
import { toast } from 'react-toastify';
import Utils from '../Utils';

export default class PackingExpenseItemsReportTable extends Component {

    constructor(props) {
        super(props);

        this.state = {
            data: [],
            columns: [
                { data: 'ITEM_ID', type: 'text', width: 100, className: 'htCenter', readOnly: true, },
                { data: 'ITEM_NAME', type: 'text', width: 200, className: 'htCenter', readOnly: true, },
                { data: 'UNIT_PRICE', type: 'numeric', width: 80, className: 'htRight', },
                { data: 'NOTE', type: 'text', width: 100, className: 'htCenter', },
                { data: 'EDIT_USER_NAME', type: 'text', width: 80, className: 'htCenter', readOnly: true, },
                {
                    data: 'EDIT_TIME', type: 'text', width: 140, readOnly: true,
                    renderer: (instance, td, row, col, prop, value/*, cellProperties*/) => {
                        Handsontable.dom.empty(td);
                        td.classList.add('htCenter');
                        td.classList.add('htDimmed');
                        // td.classList.add('align-middle');
                        if (value) {
                            td.innerHTML = moment(value).format('YYYY/MM/DD HH:mm');
                            td.title = `修改時間: ${moment(value).format('YYYY/MM/DD HH:mm:ss')}`;
                        }
                    },
                },
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
                            this.savePackingExpenseItemsReport(instance, cellProperties.row);
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
            hiddenColumns: { columns: [] },
            colHeaders: [
                '項目ID', '項目名稱', '單價', '備註',
                '修改人員', '修改時間',
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
    savePackingExpenseItemsReport = async (hotInstance, index) => {
        const rowData = hotInstance.getSourceDataAtRow(index);
        //console.log('savePackingExpenseItemsReport', index, rowData);

        //欄位檢查
        if (rowData.NOTE && (rowData.NOTE.length > 40)) {
            toast.warn('備註欄位最多輸入40個字');
            return;
        }

        //呼叫後端儲存
        const apiUrl = Utils.generateApiUrl('/packing/savePackingExpenseItemsReport');
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
                        hotInstance.updateData(sourceData, 'savePackingExpenseItemsReport');
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
            return res;
        });
    }

    //處理欄位連動
    afterChangeHandler = hotInstance => async (changes, source) => {
        console.log(changes, source);
        if (['edit', 'CopyPaste.paste'].indexOf(source) > -1 && Array.isArray(changes)) {
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

PackingExpenseItemsReportTable.propTypes = {
    isAdmin: PropTypes.bool,
    data: PropTypes.array,
};

PackingExpenseItemsReportTable.defaultProps = {
    isAdmin: false,
    data: [],
};