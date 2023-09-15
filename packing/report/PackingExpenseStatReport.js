import React, { Component } from 'react';
import axios from 'axios';
import 'handsontable/languages/zh-TW.js';
import moment from 'moment';
import PropTypes from 'prop-types';
import { toast } from 'react-toastify';
import { exportDataToXlsx } from '../PackingUtils';
import Utils from '../../Utils';
import PackingExpenseStatReportTable from './PackingExpenseStatReportTable';
import PackingExpenseTotalReportTable from './PackingExpenseTotalReportTable';
import PackingExpensePackingStatTable from './PackingExpensePackingStatTable';
import PackingExpenseRepackingStatReportTable from './PackingExpenseRepackingStatReportTable';
import PackingExpenseCleanStatTable from './PackingExpenseCleanStatTable';
import PackingExpenseOtherStatTable from './PackingExpenseOtherStatTable';

export default class PackingExpenseStatReport extends Component {

    constructor(props) {
        super(props);

        this.state = {
            isLoading: false,
            packingDateStart: moment(new Date()).startOf('month').format('YYYY-MM-DD'),
            packingDateEnd: moment(new Date()).format('YYYY-MM-DD'),
            reportIndex: 0,
            statReport: [],
            expenseTotalReport: [],
            packingStatReport: [],
            repackingStatReport: [],
            cleanStatReport: [],
            otherStatReport: [],
        };

        this.packingDateStartComponent = React.createRef();
        this.packingDateEndComponent = React.createRef();
        this.PackingExpenseStatReportTableComponent = React.createRef();
        this.PackingExpenseTotalReportTableComponent = React.createRef();
        this.PackingExpensePackingStatTableComponent = React.createRef();
        this.PackingExpenseRepackingStatReportTableComponent = React.createRef();
        this.PackingExpenseCleanStatTableComponent = React.createRef();
        this.PackingExpenseOtherStatTableComponent = React.createRef();
        this.queryApiCancelToken = null;
    }

    componentDidMount() {
        //this.queryPackingExpenseStatReport();
    }

    componentWillUnmount() {
        this.isUnmount = true;
        if (this.queryApiCancelToken) {
            this.queryApiCancelToken.cancel('componentWillUnmount');
        }
    }

    //報表日期區間條件
    handleQueryDateChange = field => event => {
        let value = event.target.value;

        //如果清空，則自動帶現在時間
        if (('dateType' !== field) && (0 === value.length)) {
            value = moment().format('YYYY-MM-DD');
        }

        this.setState(state => {
            let obj = { [field]: value };
            if ('packingDateEnd' === field) {
                //如果結束時間 < 開始時間，則自動調整開始時間
                if (value < state.packingDateStart) {
                    obj['packingDateStart'] = value.substr(0, 10);
                    if (this.packingDateStartComponent && this.packingDateStartComponent.current) {
                        this.packingDateStartComponent.current.value = obj['packingDateStart'];
                    }
                }
            } else if ('packingDateStart' === field) {
                //如果開始時間 > 結束時間，則自動調整開始時間
                if (value > state.packingDateEnd) {
                    obj['packingDateEnd'] = value.substr(0, 10);
                    if (this.packingDateEndComponent && this.packingDateEndComponent.current) {
                        this.packingDateEndComponent.current.value = obj['packingDateEnd'];
                    }
                }
            }

            return obj;
        });
    }

    //查詢欄位onChange
    handleChange = event => {
        let field = event.target.dataset.field;
        let value = event.target.value;

        if ('checkbox' === event.target.type) {
            value = event.target.checked;
        }
        const oldValue = this.state[field];

        //onChange前處理
        if (oldValue === value) {
            return false;
        }

        const newState = {};

        switch (field) {
            default:
                break;
        }
        //修改值
        newState[field] = value;

        this.setState(newState, () => {
            //後處理
            switch (field) {
                default:
                    break;
            }
        });
    }

    //查詢包裝費用統計表
    queryPackingExpenseStatReport = () => {
        this.setState({ isLoading: true });

        const apiUrl = Utils.generateApiUrl('/packing/getPackingExpenseStatReport');
        const apiData = {
            packingDateStart: this.state.packingDateStart,
            packingDateEnd: this.state.packingDateEnd,
        };
        this.queryApiCancelToken = axios.CancelToken.source();
        return axios.post(apiUrl, apiData, {
            ...Utils.pbtAxiosConfig,
            cancelToken: this.queryApiCancelToken.token,
            timeout: 10000,
        }).then(res => {
            if (!res.data.error) {
                const statReport = Array.isArray(res.data.statReport) ? res.data.statReport : [];
                const expenseTotalReport = Array.isArray(res.data.expenseTotalReport) ? res.data.expenseTotalReport : [];
                const packingStatReport = Array.isArray(res.data.packingStatReport) ? res.data.packingStatReport : [];
                const newState = {
                    statReport,
                    expenseTotalReport,
                    packingStatReport,
                };
                this.setState(newState);
            } else {
                toast.error(`包裝報表查詢失敗，${res.data.error}`);
            }
        }).catch(err => {
            //除了api取消以外都要顯示錯誤訊息
            if (!axios.isCancel(err)) {
                console.error(err);
                toast.error(`包裝報表查詢失敗。\n錯誤訊息: ${err.toString()}`);
            }
        }).then(() => {
            this.setState({ isLoading: false });
        });
    }

    //匯出報表
    exportReport = () => {
        if (!this.state.statReport || !this.state.statReport.length) {
            toast.warn('畫面上無資料，請先查詢');
            return;
        }

        exportDataToXlsx([
            {
                sheetName: '費用明細表',
                columns: this.PackingExpenseStatReportTableComponent.current.state.columns,
                colHeaders: this.PackingExpenseStatReportTableComponent.current.state.colHeaders,
                data: this.state.statReport,
                hotTableComponent: this.PackingExpenseStatReportTableComponent.current.hotTableComponent,
                mergeCells: true,
            },
            {
                sheetName: '費用總表',
                columns: this.PackingExpenseTotalReportTableComponent.current.state.columns,
                colHeaders: this.PackingExpenseTotalReportTableComponent.current.state.colHeaders,
                data: this.state.expenseTotalReport,
                hotTableComponent: this.PackingExpenseTotalReportTableComponent.current.hotTableComponent,
                mergeCells: true,
            },
            {
                sheetName: '包裝量統計表',
                columns: this.PackingExpensePackingStatTableComponent.current.state.columns,
                colHeaders: this.PackingExpensePackingStatTableComponent.current.state.colHeaders,
                data: this.state.packingStatReport,
                hotTableComponent: this.PackingExpensePackingStatTableComponent.current.hotTableComponent,
                mergeCells: true,
            },
            {
                sheetName: '改包量統計表',
                columns: this.PackingExpenseRepackingStatReportTableComponent.current.state.columns,
                colHeaders: this.PackingExpenseRepackingStatReportTableComponent.current.state.colHeaders,
                data: this.state.packingStatReport,
                hotTableComponent: this.PackingExpenseRepackingStatReportTableComponent.current.hotTableComponent,
                mergeCells: true,
            },
            {
                sheetName: '清機統計表',
                columns: this.PackingExpenseCleanStatTableComponent.current.state.columns,
                colHeaders: this.PackingExpenseCleanStatTableComponent.current.state.colHeaders,
                data: this.state.packingStatReport,
                hotTableComponent: this.PackingExpenseCleanStatTableComponent.current.hotTableComponent,
                mergeCells: true,
            },
            {
                sheetName: '其他事務統計表',
                columns: this.PackingExpenseOtherStatTableComponent.current.state.columns,
                colHeaders: this.PackingExpenseOtherStatTableComponent.current.state.colHeaders,
                data: this.state.packingStatReport,
                hotTableComponent: this.PackingExpenseOtherStatTableComponent.current.hotTableComponent,
                mergeCells: true,
            },
        ], 'PBTC包裝費用統計表.xlsx');
    }

    getBtnClass = reportIndex => reportIndex === this.state.reportIndex ? 'btn btn-secondary btn-sm' : 'btn btn-outline-secondary btn-sm';

    switchTab = reportIndex => event => {
        event.nativeEvent.preventDefault();
        this.setState({ reportIndex });
    }

    render() {
        const { isLoading, reportIndex } = this.state;
        return <div className="packing-stat-report">
            <div className="packing-query-container mb-2">
                <div className="input-group input-group-sm me-2">
                    <span className="input-group-text">日期</span>
                    <input type="date"
                        className="form-control"
                        ref={this.packingDateStartComponent}
                        defaultValue={this.state.packingDateStart}
                        onChange={this.handleQueryDateChange('packingDateStart')} />
                    <span className="input-group-text">~</span>
                    <input type="date"
                        className="form-control"
                        ref={this.packingDateEndComponent}
                        defaultValue={this.state.packingDateEnd}
                        onChange={this.handleQueryDateChange('packingDateEnd')} />
                </div>

                <button type="button"
                    className="btn btn-outline-primary btn-sm me-2"
                    onClick={this.queryPackingExpenseStatReport} disabled={isLoading}><span className="icon bi-search"></span> 查詢</button>
                <button type="button" className="btn btn-outline-success btn-sm me-2"
                    title="將畫面上的資料匯出成.xlsx檔案"
                    onClick={this.exportReport} disabled={isLoading}><span className="icon bi-file-earmark-text"></span> 匯出</button>

                <div className="btn-group w-fit-content" role="group" aria-label="Basic radio toggle button group">
                    <button type="button" className={this.getBtnClass(0)} onClick={this.switchTab(0)}>費用明細表</button>
                    <button type="button" className={this.getBtnClass(1)} onClick={this.switchTab(1)}>費用總表</button>
                    <button type="button" className={this.getBtnClass(2)} onClick={this.switchTab(2)}>包裝量統計表</button>
                    <button type="button" className={this.getBtnClass(3)} onClick={this.switchTab(3)}>改包量統計表</button>
                    <button type="button" className={this.getBtnClass(4)} onClick={this.switchTab(4)}>清機統計表</button>
                    <button type="button" className={this.getBtnClass(5)} onClick={this.switchTab(5)}>其他事務統計表</button>
                </div>
            </div>

            <div className={'packing-handsontable-container flex-grow-1' + (0 === reportIndex ? '' : ' d-none')}>
                <PackingExpenseStatReportTable
                    ref={this.PackingExpenseStatReportTableComponent}
                    isAdmin={this.props.isAdmin}
                    data={this.state.statReport}
                />
            </div>
            <div className={'packing-handsontable-container flex-grow-1' + (1 === reportIndex ? '' : ' d-none')}>
                <PackingExpenseTotalReportTable
                    ref={this.PackingExpenseTotalReportTableComponent}
                    isAdmin={this.props.isAdmin}
                    data={this.state.expenseTotalReport}
                />
            </div>
            <div className={'packing-handsontable-container flex-grow-1' + (2 === reportIndex ? '' : ' d-none')}>
                <PackingExpensePackingStatTable
                    ref={this.PackingExpensePackingStatTableComponent}
                    isAdmin={this.props.isAdmin}
                    data={this.state.packingStatReport}
                />
            </div>
            <div className={'packing-handsontable-container flex-grow-1' + (3 === reportIndex ? '' : ' d-none')}>
                <PackingExpenseRepackingStatReportTable
                    ref={this.PackingExpenseRepackingStatReportTableComponent}
                    isAdmin={this.props.isAdmin}
                    data={this.state.packingStatReport}
                />
            </div>
            <div className={'packing-handsontable-container flex-grow-1' + (4 === reportIndex ? '' : ' d-none')}>
                <PackingExpenseCleanStatTable
                    ref={this.PackingExpenseCleanStatTableComponent}
                    isAdmin={this.props.isAdmin}
                    data={this.state.packingStatReport}
                />
            </div>
            <div className={'packing-handsontable-container flex-grow-1' + (5 === reportIndex ? '' : ' d-none')}>
                <PackingExpenseOtherStatTable
                    ref={this.PackingExpenseOtherStatTableComponent}
                    isAdmin={this.props.isAdmin}
                    data={this.state.packingStatReport}
                />
            </div>

        </div>;
    }
}

PackingExpenseStatReport.propTypes = {
    isAdmin: PropTypes.bool,
    lines: PropTypes.array,
    materials: PropTypes.array,
    notes: PropTypes.array,
    pallets: PropTypes.array,
    printers: PropTypes.array,
    prints: PropTypes.array,
    prodLines: PropTypes.array,
    shifts: PropTypes.array,
    silos: PropTypes.array,
    weightSpecs: PropTypes.array,
    setSelectedSchedule: PropTypes.func,
};

PackingExpenseStatReport.defaultProps = {
    isAdmin: false,
    lines: [],
    materials: [],
    notes: [],
    pallets: [],
    printers: [],
    prints: [],
    prodLines: [],
    shifts: [],
    silos: [],
    weightSpecs: [],
    setSelectedSchedule: () => { },
};