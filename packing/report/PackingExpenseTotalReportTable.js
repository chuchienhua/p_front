import React, { Component } from 'react';
import { HotTable } from '@handsontable/react';
import 'handsontable/languages/zh-TW.js';
import PropTypes from 'prop-types';

export default class PackingExpenseTotalReportTable extends Component {

    constructor(props) {
        super(props);

        this.state = {
            data: [],
            columns: [
                { data: 'LABEL_1', type: 'text', width: 120, className: 'htCenter htMiddle', readOnly: true, },
                { data: 'LABEL_2', type: 'text', width: 110, className: 'htCenter htMiddle', readOnly: true, },
                { data: 'LABEL_3', type: 'text', width: 60, className: 'htCenter htMiddle', readOnly: true, },
                { data: 'QTY', type: 'numeric', width: 100, className: 'htRight htMiddle', readOnly: true, numericFormat: { pattern: '#,##0.0', }, },
                { data: 'UNIT_PRICE', type: 'numeric', width: 60, className: 'htRight htMiddle', readOnly: true, },
                { data: 'SUBTOTAL', type: 'numeric', width: 100, className: 'htRight htMiddle', readOnly: true, numericFormat: { pattern: '#,##0', }, },
            ],
            hiddenColumns: { columns: [] },
            colHeaders: [
                '包裝項目', '設備', '',
                '總量/次數', '單價', '合計費用',
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
            if (Array.isArray(this.props.data)) {
                //包裝項目
                mergeCells.push({ row: 0, col: 0, rowspan: 2, colspan: 1 });
                mergeCells.push({ row: 2, col: 0, rowspan: 8, colspan: 1 });
                mergeCells.push({ row: 10, col: 0, rowspan: 3, colspan: 1 });
                mergeCells.push({ row: 13, col: 0, rowspan: 2, colspan: 1 });
                mergeCells.push({ row: 18, col: 0, rowspan: 10, colspan: 1 });
                mergeCells.push({ row: 28, col: 0, rowspan: 3, colspan: 1 });
                mergeCells.push({ row: 31, col: 0, rowspan: 1, colspan: 3 });
                mergeCells.push({ row: 32, col: 0, rowspan: 1, colspan: 3 });
                mergeCells.push({ row: 33, col: 0, rowspan: 1, colspan: 3 });
                mergeCells.push({ row: 34, col: 0, rowspan: 1, colspan: 3 });
                mergeCells.push({ row: 35, col: 0, rowspan: 1, colspan: 3 });
                mergeCells.push({ row: 36, col: 0, rowspan: 1, colspan: 3 });
                if (this.props.data.length >= 39) {
                    mergeCells.push({ row: 38, col: 0, rowspan: 1, colspan: 3 }); //手動包裝罰款金額
                }
                //設備
                mergeCells.push({ row: 0, col: 1, rowspan: 1, colspan: 2 });
                mergeCells.push({ row: 1, col: 1, rowspan: 1, colspan: 2 });
                mergeCells.push({ row: 2, col: 1, rowspan: 1, colspan: 2 });
                mergeCells.push({ row: 3, col: 1, rowspan: 1, colspan: 2 });
                mergeCells.push({ row: 4, col: 1, rowspan: 1, colspan: 2 });
                mergeCells.push({ row: 5, col: 1, rowspan: 1, colspan: 2 });
                mergeCells.push({ row: 9, col: 1, rowspan: 1, colspan: 2 });
                mergeCells.push({ row: 10, col: 1, rowspan: 1, colspan: 2 });
                mergeCells.push({ row: 11, col: 1, rowspan: 1, colspan: 2 });
                mergeCells.push({ row: 12, col: 1, rowspan: 1, colspan: 2 });
                mergeCells.push({ row: 13, col: 1, rowspan: 1, colspan: 2 });
                mergeCells.push({ row: 14, col: 1, rowspan: 1, colspan: 2 });
                mergeCells.push({ row: 15, col: 1, rowspan: 1, colspan: 2 });
                mergeCells.push({ row: 16, col: 0, rowspan: 1, colspan: 3 });
                mergeCells.push({ row: 17, col: 0, rowspan: 1, colspan: 3 });
                mergeCells.push({ row: 18, col: 1, rowspan: 2, colspan: 1 });
                mergeCells.push({ row: 20, col: 1, rowspan: 2, colspan: 1 });
                mergeCells.push({ row: 22, col: 1, rowspan: 2, colspan: 1 });
                mergeCells.push({ row: 24, col: 1, rowspan: 2, colspan: 1 });
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

PackingExpenseTotalReportTable.propTypes = {
    isAdmin: PropTypes.bool,
    data: PropTypes.array,
};

PackingExpenseTotalReportTable.defaultProps = {
    isAdmin: false,
    data: [],
};