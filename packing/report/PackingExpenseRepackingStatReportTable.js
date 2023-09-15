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
                { data: 'REPACKING_P_P', type: 'numeric', width: 120, className: 'htRight htMiddle', readOnly: true, numericFormat: { pattern: '#,##0.0', }, },
                { data: 'REPACKING_P_T', type: 'numeric', width: 120, className: 'htRight htMiddle', readOnly: true, numericFormat: { pattern: '#,##0.0', }, },
                { data: 'REPACKING_P_C', type: 'numeric', width: 120, className: 'htRight htMiddle', readOnly: true, numericFormat: { pattern: '#,##0.0', }, },
                { data: 'REPACKING_T_P', type: 'numeric', width: 120, className: 'htRight htMiddle', readOnly: true, numericFormat: { pattern: '#,##0.0', }, },
                { data: 'REPACKING_T_C', type: 'numeric', width: 120, className: 'htRight htMiddle', readOnly: true, numericFormat: { pattern: '#,##0.0', }, },
                { data: 'REPACKING_C_T', type: 'numeric', width: 120, className: 'htRight htMiddle', readOnly: true, numericFormat: { pattern: '#,##0.0', }, },
                { data: 'OTHER_SEA_BULK_TANK', type: 'numeric', width: 120, className: 'htRight htMiddle', readOnly: true, numericFormat: { pattern: '#,##0.0', }, },
                { data: 'OTHER_FIBC_FILLING_TANK', type: 'numeric', width: 120, className: 'htRight htMiddle', readOnly: true, numericFormat: { pattern: '#,##0.0', }, },
            ],
            hiddenColumns: { columns: [] },
            colHeaders: [
                '日期',
                '紙袋<br />改紙袋(噸)', '紙袋<br />改太空包(包)', '紙袋<br />改八角箱(箱)',
                '太空包<br />改紙袋(噸)', '太空包<br />改八角箱(箱)', '八角箱<br />改太空袋(包)',
                'SEA BULK<br />槽車綁袋<br />(車)', '太空袋<br />灌充槽車<br />(包)',
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