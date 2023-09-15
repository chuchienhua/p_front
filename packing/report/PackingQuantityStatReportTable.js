import React, { Component } from 'react';
import { HotTable } from '@handsontable/react';
import 'handsontable/languages/zh-TW.js';
import PropTypes from 'prop-types';

export default class PackingQuantityStatReportTable extends Component {

    constructor(props) {
        super(props);

        this.state = {
            data: [],
            columns: [
                { data: 'PACKING_DATE', type: 'text', width: 100, className: 'htCenter htMiddle', readOnly: true, },
                { data: 'PACKING_SHIFT', type: 'text', width: 60, className: 'htCenter', readOnly: true, },
                { data: 'FOREMAN', type: 'text', width: 120, className: 'htCenter', readOnly: true, },
                { data: 'AUTO_PACKING_HEADCOUNT', type: 'numeric', width: 80, className: 'htCenter', readOnly: true, },
                { data: 'MANUAL_PACKING_HEADCOUNT', type: 'numeric', width: 80, className: 'htCenter', readOnly: true, },
                { data: 'OVERTIME_HEADCOUNT', type: 'numeric', width: 80, className: 'htCenter', readOnly: true, },
                { data: 'AUTO_PACKING_QUANTITY', type: 'numeric', width: 80, className: 'htCenter', readOnly: true, numericFormat: { pattern: '#,##0', }, },
                { data: 'MANUAL_PACKING_QUANTITY', type: 'numeric', width: 80, className: 'htCenter', readOnly: true, numericFormat: { pattern: '#,##0', }, },
                { data: 'TOTAL_FILLING_QUANTITY', type: 'numeric', width: 80, className: 'htCenter', readOnly: true, numericFormat: { pattern: '#,##0', }, },
                { data: 'TOTAL_PACKING_QUANTITY', type: 'numeric', width: 80, className: 'htCenter', readOnly: true, numericFormat: { pattern: '#,##0', }, },
            ],
            hiddenColumns: { columns: [] },
            colHeaders: [
                '日期', '班別', '領班', '自動包裝<br />外包人數', '手動包裝<br />外包人數',
                '包裝加<br />班人數', '自動包<br />裝總量', '手動包<br />裝總量', '槽車<br />灌充量', '總包裝量<br />(含灌充)',
            ],
        };

        if (this.props.lines && this.props.lines.length) {
            this.props.lines.forEach(line => {
                this.state.columns.push({ data: `${line.LINE_NAME}_PACKING_WEIGHT`, type: 'numeric', width: 80, className: 'htCenter', readOnly: true, numericFormat: { pattern: '#,##0', }, });
                this.state.colHeaders.push(
                    `${line.LINE_NAME}<br />包裝量`,
                );
            });
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
        // hotInstance.addHook('afterChange', this.afterChangeHandler(hotInstance));
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
                for (let i = 0; i < this.props.data.length; i += 4) {
                    mergeCells.push({ row: i, col: 0, rowspan: 4, colspan: 1 });
                }
            }
            hotInstance.updateSettings({
                mergeCells: mergeCells,
            });
        }
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

PackingQuantityStatReportTable.propTypes = {
    isAdmin: PropTypes.bool,
    data: PropTypes.array,
    lines: PropTypes.array,
};

PackingQuantityStatReportTable.defaultProps = {
    isAdmin: false,
    data: [],
    lines: [],
};