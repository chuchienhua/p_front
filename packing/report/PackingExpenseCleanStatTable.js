import React, { Component } from 'react';
import { HotTable } from '@handsontable/react';
import 'handsontable/languages/zh-TW.js';
import PropTypes from 'prop-types';

export default class PackingExpenseCleanStatTable extends Component {

    constructor(props) {
        super(props);

        this.state = {
            data: [],
            columns: [
                { data: 'PACKING_DATE', type: 'text', width: 100, className: 'htCenter htMiddle', readOnly: true, },
                { data: 'CLEAN_P_L1_1', type: 'numeric', width: 100, className: 'htRight htMiddle', readOnly: true, numericFormat: { pattern: '#,##0.0', }, },
                { data: 'CLEAN_P_L1_2', type: 'numeric', width: 100, className: 'htRight htMiddle', readOnly: true, numericFormat: { pattern: '#,##0.0', }, },
                { data: 'CLEAN_P_L2_1', type: 'numeric', width: 100, className: 'htRight htMiddle', readOnly: true, numericFormat: { pattern: '#,##0.0', }, },
                { data: 'CLEAN_P_L2_2', type: 'numeric', width: 100, className: 'htRight htMiddle', readOnly: true, numericFormat: { pattern: '#,##0.0', }, },
                { data: 'CLEAN_P_L3_1', type: 'numeric', width: 100, className: 'htRight htMiddle', readOnly: true, numericFormat: { pattern: '#,##0.0', }, },
                { data: 'CLEAN_P_L3_2', type: 'numeric', width: 100, className: 'htRight htMiddle', readOnly: true, numericFormat: { pattern: '#,##0.0', }, },
                { data: 'CLEAN_P_L4_1', type: 'numeric', width: 100, className: 'htRight htMiddle', readOnly: true, numericFormat: { pattern: '#,##0.0', }, },
                { data: 'CLEAN_P_L4_2', type: 'numeric', width: 100, className: 'htRight htMiddle', readOnly: true, numericFormat: { pattern: '#,##0.0', }, },
                { data: 'CLEAN_P_L5_1', type: 'numeric', width: 100, className: 'htRight htMiddle', readOnly: true, numericFormat: { pattern: '#,##0.0', }, },
                { data: 'CLEAN_P_L6_1', type: 'numeric', width: 100, className: 'htRight htMiddle', readOnly: true, numericFormat: { pattern: '#,##0.0', }, },
                { data: 'CLEAN_T_C_L3', type: 'numeric', width: 130, className: 'htRight htMiddle', readOnly: true, numericFormat: { pattern: '#,##0.0', }, },
                { data: 'CLEAN_T_C_L4', type: 'numeric', width: 130, className: 'htRight htMiddle', readOnly: true, numericFormat: { pattern: '#,##0.0', }, },
                { data: 'CLEAN_T_C_L5', type: 'numeric', width: 130, className: 'htRight htMiddle', readOnly: true, numericFormat: { pattern: '#,##0.0', }, },
            ],
            hiddenColumns: { columns: [] },
            colHeaders: [
                '日期',
                '紙袋<br />自動A台<br />1F', '紙袋<br />自動A台<br />2F', '紙袋<br />自動B台<br />1F', '紙袋<br />自動B台<br />2F',
                '紙袋<br />手動A台<br />1F', '紙袋<br />手動A台<br />2F', '紙袋<br />手動B台<br />1F', '紙袋<br />手動B台<br />2F',
                '紙袋<br />手動C台<br />1F', '紙袋<br />手動D台<br />1F',
                '太空包/八角箱<br />手動A台<br />1F', '太空包/八角箱<br />手動B台<br />1F', '太空包/八角箱<br />手動C台<br />1F',
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

            const mergeCells = [];
            if (Array.isArray(this.props.data) && this.props.data.length) {
                //合計欄位
                mergeCells.push({ row: this.props.data.length - 1, col: 1, rowspan: 1, colspan: this.state.columns.length - 1 });
            }
            hotInstance.updateSettings({
                mergeCells: mergeCells,
            });
        }
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

PackingExpenseCleanStatTable.propTypes = {
    isAdmin: PropTypes.bool,
    data: PropTypes.array,
};

PackingExpenseCleanStatTable.defaultProps = {
    isAdmin: false,
    data: [],
};