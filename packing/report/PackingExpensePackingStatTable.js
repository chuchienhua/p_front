import React, { Component } from 'react';
import { HotTable } from '@handsontable/react';
import 'handsontable/languages/zh-TW.js';
import PropTypes from 'prop-types';

export default class PackingExpensePackingStatTable extends Component {

    constructor(props) {
        super(props);

        this.state = {
            data: [],
            columns: [
                { data: 'PACKING_DATE', type: 'text', width: 100, className: 'htCenter htMiddle', readOnly: true, },
                { data: 'PACKING_P_L1', type: 'numeric', width: 110, className: 'htRight htMiddle', readOnly: true, numericFormat: { pattern: '#,##0.0', }, },
                { data: 'PACKING_P_L2', type: 'numeric', width: 110, className: 'htRight htMiddle', readOnly: true, numericFormat: { pattern: '#,##0.0', }, },
                { data: 'PACKING_P_L3', type: 'numeric', width: 110, className: 'htRight htMiddle', readOnly: true, numericFormat: { pattern: '#,##0.0', }, },
                { data: 'PACKING_P_L4', type: 'numeric', width: 110, className: 'htRight htMiddle', readOnly: true, numericFormat: { pattern: '#,##0.0', }, },
                { data: 'PACKING_P_L5', type: 'numeric', width: 110, className: 'htRight htMiddle', readOnly: true, numericFormat: { pattern: '#,##0.0', }, },
                { data: 'PACKING_P_L6', type: 'numeric', width: 110, className: 'htRight htMiddle', readOnly: true, numericFormat: { pattern: '#,##0.0', }, },
                { data: 'PACKING_T_MANUAL', type: 'numeric', width: 100, className: 'htRight htMiddle', readOnly: true, numericFormat: { pattern: '#,##0.0', }, },
                { data: 'PACKING_T_ALUMINUM', type: 'numeric', width: 100, className: 'htRight htMiddle', readOnly: true, numericFormat: { pattern: '#,##0.0', }, },
                { data: 'PACKING_T_AUTO', type: 'numeric', width: 100, className: 'htRight htMiddle', readOnly: true, numericFormat: { pattern: '#,##0.0', }, },
                { data: 'PACKING_C_ALL', type: 'numeric', width: 100, className: 'htRight htMiddle', readOnly: true, numericFormat: { pattern: '#,##0.0', }, },
            ],
            hiddenColumns: { columns: [] },
            colHeaders: [
                '日期',
                '自動包裝(噸)<br />A台', '自動包裝(噸)<br />B台',
                '手動包裝(噸)<br />A台', '手動包裝(噸)<br />B台', '手動包裝(噸)<br />C台', '手動包裝(噸)<br />D台',
                '太空包(包)<br />一般', '太空包(包)<br />鋁箔', '太空包(包)<br />半自動', '八角箱(箱)'
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

PackingExpensePackingStatTable.propTypes = {
    isAdmin: PropTypes.bool,
    data: PropTypes.array,
};

PackingExpensePackingStatTable.defaultProps = {
    isAdmin: false,
    data: [],
};