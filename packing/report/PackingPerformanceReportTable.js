import React, { Component } from 'react';
import { HotTable } from '@handsontable/react';
import 'handsontable/languages/zh-TW.js';
import PropTypes from 'prop-types';

export default class PackingStatReportTable extends Component {

    constructor(props) {
        super(props);

        this.state = {
            data: [],
            columns: [
                { data: 'FOREMAN', type: 'text', width: 120, className: 'htCenter', readOnly: true, },
            ],
            hiddenColumns: { columns: [] },
            colHeaders: [
                '領班',
            ],
            nestedHeaders: [],
        };

        if (this.props.lines && this.props.lines.length) {
            const nestedHeaders = [this.state.colHeaders.map(() => {
                return { label: '', /*rowspan: 2*/ };
            }), this.state.colHeaders.map(col => {
                return { label: col, /*rowspan: 2*/ };
            })];
            this.props.lines.forEach(line => {
                this.state.columns.push({ data: `${line.LINE_NAME}_TARGET_WEIGHT`, type: 'numeric', width: 80, className: 'htCenter', readOnly: true, numericFormat: { pattern: '#,##0', }, });
                this.state.columns.push({ data: `${line.LINE_NAME}_PACKING_WEIGHT`, type: 'numeric', width: 80, className: 'htCenter', readOnly: true, numericFormat: { pattern: '#,##0', }, });
                this.state.columns.push({ data: `${line.LINE_NAME}_ACHIEVEMENT_RATE`, type: 'numeric', width: 80, className: 'htCenter', readOnly: true, numericFormat: { pattern: '0.00%', }, });
                nestedHeaders[0].push({ label: line.LINE_NAME, colspan: 3 });
                nestedHeaders[1].push('排程量', '包裝量', '達成率');
                this.state.colHeaders.push(
                    `${line.LINE_NAME}<br />排程量`,
                    `${line.LINE_NAME}<br />包裝量`,
                    `${line.LINE_NAME}<br />達成率`,
                );
            });
            this.state.columns.push({ data: 'TOTAL_TARGET_WEIGHT', type: 'numeric', width: 80, className: 'htCenter', readOnly: true, numericFormat: { pattern: '#,##0', }, });
            this.state.columns.push({ data: 'TOTAL_PACKING_WEIGHT', type: 'numeric', width: 80, className: 'htCenter', readOnly: true, numericFormat: { pattern: '#,##0', }, });
            this.state.columns.push({ data: 'TOTAL_ACHIEVEMENT_RATE', type: 'numeric', width: 80, className: 'htCenter', readOnly: true, numericFormat: { pattern: '0.00%' }, });
            nestedHeaders[0].push({ label: '總和', colspan: 3 });
            nestedHeaders[1].push('排程量', '包裝量', '達成率');
            this.state.colHeaders.push(
                '總和<br />排程量',
                '總和<br />包裝量',
                '總和<br />達成率',
            );
            this.state.nestedHeaders = nestedHeaders;
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
                nestedHeaders={this.state.nestedHeaders}
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

PackingStatReportTable.propTypes = {
    isAdmin: PropTypes.bool,
    data: PropTypes.array,
    lines: PropTypes.array,
};

PackingStatReportTable.defaultProps = {
    isAdmin: false,
    data: [],
    lines: [],
};