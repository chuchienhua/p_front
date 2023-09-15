import React, { Component } from 'react';
import axios from 'axios';
import 'handsontable/languages/zh-TW.js';
import moment from 'moment';
import PropTypes from 'prop-types';
import { toast } from 'react-toastify';
import { exportDataToXlsx } from '../packing/PackingUtils';
import Utils from '../Utils';
import MaterialInvTraceReportTable from './MaterialInvTraceReportTable';

export default class MaterialInvTraceReport extends Component {

    constructor(props) {
        super(props);

        this.state = {
            isLoading: false,
            reportDateStart: moment(new Date()).format('YYYY-MM-DD'),
            reportDateEnd: moment(new Date()).format('YYYY-MM-DD'),
            data: [],
        };

        this.reportDateStartComponent = React.createRef();
        this.reportDateEndComponent = React.createRef();
        this.MaterialInvTraceReportTableComponent = React.createRef();
        this.queryApiCancelToken = null;
    }

    componentDidMount() {
        //網址帶入參數
        // const parsed = queryString.parse(window.location.search);
        // if (parsed.report_date) {
        //     this.setState({
        //         reportDateStart: parsed.report_date,
        //         reportDateEnd: parsed.report_date,
        //     }, this.queryMaterialInvTraceReport);
        //     if (this.reportDateStartComponent && this.reportDateStartComponent.current) {
        //         this.reportDateStartComponent.current.value = parsed.report_date;
        //     }
        //     if (this.reportDateEndComponent && this.reportDateEndComponent.current) {
        //         this.reportDateEndComponent.current.value = parsed.report_date;
        //     }
        // } else {
        //     this.queryMaterialInvTraceReport();
        // }
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
            if ('reportDateEnd' === field) {
                //如果結束時間 < 開始時間，則自動調整開始時間
                if (value < state.reportDateStart) {
                    obj['reportDateStart'] = value.substr(0, 10);
                    if (this.reportDateStartComponent && this.reportDateStartComponent.current) {
                        this.reportDateStartComponent.current.value = obj['reportDateStart'];
                    }
                }
            } else if ('reportDateStart' === field) {
                //如果開始時間 > 結束時間，則自動調整開始時間
                if (value > state.reportDateEnd) {
                    obj['reportDateEnd'] = value.substr(0, 10);
                    if (this.reportDateEndComponent && this.reportDateEndComponent.current) {
                        this.reportDateEndComponent.current.value = obj['reportDateEnd'];
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

    //查詢原料庫存追蹤表
    queryMaterialInvTraceReport = () => {
        this.setState({ isLoading: true });

        const apiUrl = Utils.generateApiUrl('/managementReport/getMaterialInvTraceReport');
        const apiData = {
            reportDate: this.state.reportDateStart,
        };
        this.queryApiCancelToken = axios.CancelToken.source();
        return axios.post(apiUrl, apiData, {
            ...Utils.pbtAxiosConfig,
            cancelToken: this.queryApiCancelToken.token,
            timeout: 10000,
        }).then(res => {
            if (!res.data.error) {
                const report = Array.isArray(res.data.report) ? res.data.report : [];
                const newState = {
                    data: report,
                };
                this.setState(newState);
            } else {
                toast.error(`原料庫存追蹤表查詢失敗，${res.data.error}`);
            }
        }).catch(err => {
            //除了api取消以外都要顯示錯誤訊息
            if (!axios.isCancel(err)) {
                console.error(err);
                toast.error(`原料庫存追蹤表查詢失敗。\n錯誤訊息: ${err.toString()}`);
            }
        }).then(() => {
            this.setState({ isLoading: false });
        });
    }

    //匯出報表
    exportReport = () => {
        if (!this.state.data || !this.state.data.length) {
            toast.warn('畫面上無資料，請先查詢');
            return;
        }

        exportDataToXlsx([
            {
                sheetName: '原料庫存追蹤表',
                columns: this.MaterialInvTraceReportTableComponent.current.state.columns,
                colHeaders: this.MaterialInvTraceReportTableComponent.current.state.colHeaders,
                data: this.state.data,
            },
        ], 'PBTC原料庫存追蹤表.xlsx');
    }

    render() {
        const { isLoading } = this.state;

        return <div className="material-inv-trace-report">
            <div className="management-query-container mb-2">
                <div className="input-group input-group-sm me-2">
                    <span className="input-group-text">日期</span>
                    <input type="date"
                        className="form-control"
                        ref={this.reportDateStartComponent}
                        defaultValue={this.state.reportDateStart}
                        onChange={this.handleQueryDateChange('reportDateStart')}
                        readOnly={true}
                        disabled={true} />
                </div>

                <button type="button"
                    className="btn btn-outline-primary btn-sm me-2"
                    onClick={this.queryMaterialInvTraceReport} disabled={isLoading}><span className="icon bi-search"></span> 查詢</button>
                <button type="button" className="btn btn-outline-success btn-sm"
                    title="將畫面上的資料匯出成.xlsx檔案"
                    onClick={this.exportReport} disabled={isLoading}><span className="icon bi-file-earmark-text"></span> 匯出</button>
            </div>

            <div className="h5">原料庫存追蹤表</div>
            <div className="management-handsontable-container flex-grow-1 min-height-15em">
                <MaterialInvTraceReportTable
                    ref={this.MaterialInvTraceReportTableComponent}
                    isAdmin={this.props.isAdmin}
                    data={this.state.data}
                />
            </div>
        </div>;
    }
}

MaterialInvTraceReport.propTypes = {
    isAdmin: PropTypes.bool,
};

MaterialInvTraceReport.defaultProps = {
    isAdmin: false,
};