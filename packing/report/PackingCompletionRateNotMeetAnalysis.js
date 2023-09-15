import React, { Component } from 'react';
import { HotTable } from '@handsontable/react';
import 'handsontable/languages/zh-TW.js';
import PropTypes from 'prop-types';

export default class PackingCompletionRateNotMeetAnalysis extends Component {

    constructor(props) {
        super(props);

        this.state = {
            data: [],
            columns: [
                { data: 'reasonName', type: 'text', width: 140, className: 'htCenter', readOnly: true, },
                { data: 'reasonWeight', type: 'numeric', width: 150, className: 'htCenter', readOnly: true, numericFormat: { pattern: '#,##0', }, },
                { data: 'reasonRatio', type: 'text', width: 140, className: 'htCenter', readOnly: true, },
                { data: 'lineName', type: 'text', width: 100, className: 'htCenter', readOnly: true, },
                { data: 'lineWeight', type: 'numeric', width: 150, className: 'htCenter', readOnly: true, numericFormat: { pattern: '#,##0', }, },
                { data: 'lineRatio', type: 'text', width: 140, className: 'htCenter', readOnly: true, },
            ],
            hiddenColumns: { columns: [] },
            colHeaders: [
                '未達標原因', '未達標包裝數量(Kg)', '未達標原因佔比(%)',
                '未達標機台', '未達標包裝數量(Kg)', '未達標機台佔比(%)',
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
                hiddenColumns={this.state.hiddenColumns}
                viewportColumnRenderingOffset={50}
            />
        </>;
    }
}

PackingCompletionRateNotMeetAnalysis.propTypes = {
    isAdmin: PropTypes.bool,
    data: PropTypes.array,
};

PackingCompletionRateNotMeetAnalysis.defaultProps = {
    isAdmin: false,
    data: [],
};