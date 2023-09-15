import React, { Component } from 'react';
import { HotTable } from '@handsontable/react';
import 'handsontable/languages/zh-TW.js';
import PropTypes from 'prop-types';

export default class PackingExpenseStatReportTable extends Component {

    constructor(props) {
        super(props);

        this.state = {
            data: [],
            columns: [
                { data: 'PACKING_DATE', type: 'text', width: 100, className: 'htCenter htMiddle', readOnly: true, },
                { data: 'PACKING_SHIFT', type: 'text', width: 60, className: 'htCenter htMiddle', readOnly: true, },
                { data: 'LABEL_1_1', type: 'text', width: 60, className: 'htCenter htMiddle', readOnly: true, },
                { data: 'LABEL_1_2', type: 'text', width: 80, className: 'htCenter htMiddle', readOnly: true, },
                { data: 'LABEL_1_3', type: 'text', width: 80, className: 'htCenter htMiddle', readOnly: true, },
                { data: 'QTY_0', type: 'numeric', width: 110, className: 'htRight htMiddle', readOnly: true, numericFormat: { pattern: '#,##0.0', thousandSeparated: true, mantissa: 0 }, },
                { data: 'EXPENSE_0', type: 'numeric', width: 80, className: 'htRight htMiddle', readOnly: true, numericFormat: { pattern: { thousandSeparated: true, mantissa: 0, } }, },
                { data: 'LABEL_2_1', type: 'text', width: 80, className: 'htCenter htMiddle', readOnly: true, },
                { data: 'LABEL_2_2', type: 'text', width: 100, className: 'htCenter htMiddle', readOnly: true, },
                { data: 'QTY_1', type: 'numeric', width: 110, className: 'htRight htMiddle', readOnly: true, numericFormat: { pattern: '#,##0.0', }, },
                { data: 'EXPENSE_1', type: 'numeric', width: 80, className: 'htRight htMiddle', readOnly: true, numericFormat: { pattern: { thousandSeparated: true, mantissa: 0, } }, },
                { data: 'LABEL_3_1', type: 'text', width: 60, className: 'htCenter htMiddle', readOnly: true, },
                { data: 'LABEL_3_2', type: 'text', width: 60, className: 'htCenter htMiddle', readOnly: true, },
                { data: 'LABEL_3_3', type: 'text', width: 60, className: 'htCenter htMiddle', readOnly: true, },
                { data: 'QTY_2', type: 'numeric', width: 80, className: 'htRight htMiddle', readOnly: true, numericFormat: { pattern: '#,##0.0', }, },
                { data: 'EXPENSE_2', type: 'numeric', width: 80, className: 'htRight htMiddle', readOnly: true, numericFormat: { pattern: { thousandSeparated: true, mantissa: 0, } }, },
                { data: 'LABEL_4_1', type: 'text', width: 60, className: 'htCenter htMiddle', readOnly: true, },
                { data: 'LABEL_4_2', type: 'text', width: 140, className: 'htCenter htMiddle', readOnly: true, },
                { data: 'QTY_3', type: 'numeric', width: 80, className: 'htRight htMiddle', readOnly: true, numericFormat: { pattern: '#,##0.0', }, },
                { data: 'EXPENSE_3', type: 'numeric', width: 80, className: 'htRight htMiddle', readOnly: true, numericFormat: { pattern: { thousandSeparated: true, mantissa: 0, } }, },
            ],
            hiddenColumns: { columns: [] },
            colHeaders: [
                '日期', '班別',
                '包裝', '線別', '', '(噸/包/箱)數', '費用',
                '改包', '', '(噸/包/箱)數', '費用',
                '清機', '(紙袋)', '', '次數', '費用',
                '清機', '(太空袋/八角箱)', '次數', '費用',
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
                for (let i = 0, shiftIndex = 1; i < this.props.data.length; i += 10, shiftIndex++) {
                    mergeCells.push({ row: i, col: 0, rowspan: 10, colspan: 1 }); //日期
                    mergeCells.push({ row: i, col: 1, rowspan: 10, colspan: 1 }); //班別
                    //包裝
                    mergeCells.push({ row: i, col: 2, rowspan: 2, colspan: 1 });
                    mergeCells.push({ row: i + 2, col: 2, rowspan: 8, colspan: 1 });
                    mergeCells.push({ row: i + 6, col: 3, rowspan: 3, colspan: 1 });
                    mergeCells.push({ row: i + 9, col: 3, rowspan: 1, colspan: 2 });
                    //改包
                    mergeCells.push({ row: i, col: 7, rowspan: 3, colspan: 1 });
                    mergeCells.push({ row: i + 3, col: 7, rowspan: 2, colspan: 1 });
                    mergeCells.push({ row: i + 6, col: 7, rowspan: 2, colspan: 2 });
                    mergeCells.push({ row: i + 8, col: 7, rowspan: 2, colspan: 2 });
                    //清機
                    mergeCells.push({ row: i, col: 11, rowspan: 4, colspan: 1 });
                    mergeCells.push({ row: i + 4, col: 11, rowspan: 6, colspan: 1 });
                    mergeCells.push({ row: i, col: 12, rowspan: 2, colspan: 1 });
                    mergeCells.push({ row: i + 2, col: 12, rowspan: 2, colspan: 1 });
                    mergeCells.push({ row: i + 4, col: 12, rowspan: 2, colspan: 1 });
                    mergeCells.push({ row: i + 6, col: 12, rowspan: 2, colspan: 1 });
                    //其他
                    mergeCells.push({ row: i, col: 16, rowspan: 3, colspan: 1 });
                    mergeCells.push({ row: i + 3, col: 16, rowspan: 1, colspan: 2 });
                    mergeCells.push({ row: i + 4, col: 16, rowspan: 1, colspan: 2 });
                    mergeCells.push({ row: i + 5, col: 16, rowspan: 1, colspan: 2 });
                    mergeCells.push({ row: i + 6, col: 16, rowspan: 1, colspan: 2 });
                    mergeCells.push({ row: i + 7, col: 16, rowspan: 1, colspan: 2 });
                    mergeCells.push({ row: i + 8, col: 16, rowspan: 1, colspan: 2 });
                    mergeCells.push({ row: i + 9, col: 16, rowspan: 1, colspan: 2 });

                    //當日總和
                    if (!(shiftIndex % 3)) {
                        mergeCells.push({ row: i + 10, col: 0, rowspan: 1, colspan: 2 });
                        mergeCells.push({ row: i + 10, col: 2, rowspan: 1, colspan: 4 });
                        mergeCells.push({ row: i + 10, col: 7, rowspan: 1, colspan: 3 });
                        mergeCells.push({ row: i + 10, col: 11, rowspan: 1, colspan: 4 });
                        mergeCells.push({ row: i + 10, col: 16, rowspan: 1, colspan: 3 });
                        i++;
                    }
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

PackingExpenseStatReportTable.propTypes = {
    isAdmin: PropTypes.bool,
    data: PropTypes.array,
};

PackingExpenseStatReportTable.defaultProps = {
    isAdmin: false,
    data: [],
};