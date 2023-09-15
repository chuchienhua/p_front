import React, { Component } from 'react';
import axios from 'axios';
import 'handsontable/languages/zh-TW.js';
import moment from 'moment';
import PropTypes from 'prop-types';
import queryString from 'query-string';
import { toast } from 'react-toastify';
import { exportDataToXlsx } from '../PackingUtils';
import Utils from '../../Utils';
import PackingPerformanceReportTable from './PackingPerformanceReportTable';

export default class PackingPerformanceReport extends Component {

    constructor(props) {
        super(props);

        this.state = {
            isLoading: false,
            packingDateStart: moment(new Date()).format('YYYY-MM-DD'),
            packingDateEnd: moment(new Date()).format('YYYY-MM-DD'),
            statReport: [],
        };

        this.packingDateStartComponent = React.createRef();
        this.packingDateEndComponent = React.createRef();
        this.PackingPerformanceReportTableComponent = React.createRef();
        this.queryApiCancelToken = null;
    }

    componentDidMount() {
        //網址帶入參數
        const parsed = queryString.parse(window.location.search);
        if (parsed.packing_date) {
            this.setState({
                packingDateStart: parsed.packing_date,
                packingDateEnd: parsed.packing_date,
            }, this.queryPackingPerformanceReport);
            if (this.packingDateStartComponent && this.packingDateStartComponent.current) {
                this.packingDateStartComponent.current.value = parsed.packing_date;
            }
            if (this.packingDateEndComponent && this.packingDateEndComponent.current) {
                this.packingDateEndComponent.current.value = parsed.packing_date;
            }
        } else {
            this.queryPackingPerformanceReport();
        }
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

    //查詢包裝報表
    queryPackingPerformanceReport = () => {
        this.setState({ isLoading: true });

        const apiUrl = Utils.generateApiUrl('/packing/getPackingPerformanceReport');
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
                const newState = {
                    statReport,
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
                sheetName: '包裝個人績效表',
                columns: this.PackingPerformanceReportTableComponent.current.state.columns,
                colHeaders: this.PackingPerformanceReportTableComponent.current.state.colHeaders,
                data: this.state.statReport,
                hotTableComponent: this.PackingPerformanceReportTableComponent.current.hotTableComponent,
                mergeCells: true,
            },
        ], 'PBTC包裝個人績效表.xlsx');
    }

    render() {
        const { isLoading } = this.state;
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
                    onClick={this.queryPackingPerformanceReport} disabled={isLoading}><span className="icon bi-search"></span> 查詢</button>
                <button type="button" className="btn btn-outline-success btn-sm"
                    title="將畫面上的資料匯出成.xlsx檔案"
                    onClick={this.exportReport} disabled={isLoading}><span className="icon bi-file-earmark-text"></span> 匯出</button>
            </div>

            <div className="packing-handsontable-container flex-grow-1">
                <PackingPerformanceReportTable
                    ref={this.PackingPerformanceReportTableComponent}
                    isAdmin={this.props.isAdmin}
                    data={this.state.statReport}
                    lines={this.props.lines}
                />
            </div>
        </div>;
    }
}

PackingPerformanceReport.propTypes = {
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
};

PackingPerformanceReport.defaultProps = {
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
};