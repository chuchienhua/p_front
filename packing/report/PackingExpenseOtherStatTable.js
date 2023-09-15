import React, { Component } from 'react';
import { HotTable } from '@handsontable/react';
import 'handsontable/languages/zh-TW.js';
import PropTypes from 'prop-types';

export default class PackingExpenseOtherStatTable extends Component {

    constructor(props) {
        super(props);

        this.state = {
            data: [],
            columns: [
                { data: 'PACKING_DATE', type: 'text', width: 100, className: 'htCenter htMiddle', readOnly: true, },
                { data: 'OTHER_PACKING_MATERIAL_CARRY', type: 'numeric', width: 120, className: 'htRight htMiddle', readOnly: true, numericFormat: { pattern: '#,##0.0', }, },
                { data: 'OTHER_OFF_LINE_BAG_PRINT', type: 'numeric', width: 120, className: 'htRight htMiddle', readOnly: true, numericFormat: { pattern: '#,##0.0', }, },
                { data: 'OTHER_BAG_ATTACH_LABEL', type: 'numeric', width: 120, className: 'htRight htMiddle', readOnly: true, numericFormat: { pattern: '#,##0.0', }, },
                { data: 'OTHER_BAG_STAMP', type: 'numeric', width: 120, className: 'htRight htMiddle', readOnly: true, numericFormat: { pattern: '#,##0.0', }, },
                { data: 'OTHER_BAG_RESTACK', type: 'numeric', width: 120, className: 'htRight htMiddle', readOnly: true, numericFormat: { pattern: '#,##0.0', }, },
                { data: 'OTHER_BULK_WRAPPING', type: 'numeric', width: 130, className: 'htRight htMiddle', readOnly: true, numericFormat: { pattern: '#,##0.0', }, },
            ],
            hiddenColumns: { columns: [] },
            colHeaders: [
                '日期',
                '包材入廠<br />搬運歸位(次)', 'OFF-LINE<br />紙袋印製(噸)',
                '紙袋專用<br />標籤張貼(噸)', '紙袋蓋專用章<br />(噸)',
                '紙袋重新<br />自動堆疊(噸)', '太空包/八角箱<br />捆膜(板)',
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

PackingExpenseOtherStatTable.propTypes = {
    isAdmin: PropTypes.bool,
    data: PropTypes.array,
};

PackingExpenseOtherStatTable.defaultProps = {
    isAdmin: false,
    data: [],
};