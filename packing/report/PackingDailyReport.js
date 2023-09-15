import React, { Component } from 'react';
import axios from 'axios';
import 'handsontable/languages/zh-TW.js';
import moment from 'moment';
import PropTypes from 'prop-types';
import queryString from 'query-string';
import { toast } from 'react-toastify';
import { exportDataToXlsx } from '../PackingUtils';
import Utils from '../../Utils';
import PackingDailyAttendanceReport from './PackingDailyAttendanceReport';
import PackingDailyDetailReport from './PackingDailyDetailReport';

//計算報表總計
function calcReportSummary(attendanceReport, detailReport, packingLines) {
    if (!attendanceReport || !detailReport || !packingLines) {
        return {};
    }
    const newState = {
        fillingQuantity: 0,
        lineWeight: 0,
        lines: [],
    };
    //計算灌充重量
    newState.fillingQuantity = attendanceReport.reduce((qty, row) => {
        return qty + Number(row.FILLING_QUANTITY1) + Number(row.FILLING_QUANTITY2);
    }, 0);
    //計算包裝線重量
    newState.lineWeight = 0;
    const lineMap = new Map(packingLines.map(line => {
        return [line.LINE_NAME, { name: line.LINE_NAME, weight: 0 }];
    }));
    detailReport.forEach(row => {
        newState.lineWeight += row.PACKING_TOTAL_WEIGHT;
        if (lineMap.has(row.LINE_NAME)) {
            lineMap.get(row.LINE_NAME).weight += row.PACKING_TOTAL_WEIGHT;
        }
    });
    newState.lines = [...lineMap.values()];
    // console.log(newState);
    return newState;
}

export default class PackingDailyReport extends Component {

    constructor(props) {
        super(props);

        this.state = {
            isLoading: false,
            packingDateStart: moment(new Date()).format('YYYY-MM-DD'),
            packingDateEnd: moment(new Date()).format('YYYY-MM-DD'),
            attendanceReport: [],
            detailReport: [],
            lines: [],
            fillingQuantity: 0,
            lineWeight: 0,
        };

        this.packingDateStartComponent = React.createRef();
        this.PackingDailyAttendanceReportComponent = React.createRef();
        this.PackingDailyDetailReportComponent = React.createRef();
        this.queryApiCancelToken = null;
    }

    componentDidMount() {
        //網址帶入參數
        const parsed = queryString.parse(window.location.search);
        if (parsed.packing_date) {
            this.setState({ packingDateStart: parsed.packing_date });
            if (this.packingDateStartComponent && this.packingDateStartComponent.current) {
                this.packingDateStartComponent.current.value = parsed.packing_date;
            }
        }
        this.queryPackingDailyReport();
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
                }
            } else if ('packingDateStart' === field) {
                //如果開始時間 > 結束時間，則自動調整開始時間
                if (value > state.packingDateEnd) {
                    obj['packingDateEnd'] = value.substr(0, 10);
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
    queryPackingDailyReport = () => {
        this.setState({ isLoading: true });

        const apiUrl = Utils.generateApiUrl('/packing/getPackingDailyReport');
        const apiData = {
            packingDateStart: this.state.packingDateStart,
            packingDateEnd: this.state.packingDateStart,
        };
        this.queryApiCancelToken = axios.CancelToken.source();
        return axios.post(apiUrl, apiData, {
            ...Utils.pbtAxiosConfig,
            cancelToken: this.queryApiCancelToken.token,
            timeout: 10000,
        }).then(res => {
            if (!res.data.error) {
                const attendanceReport = Array.isArray(res.data.attendanceReport) ? res.data.attendanceReport : [];
                const detailReport = Array.isArray(res.data.detailReport) ? res.data.detailReport : [];
                const newState = {
                    attendanceReport,
                    detailReport,
                };
                //調整日期欄位格式
                attendanceReport.forEach(row => {
                    row.PACKING_DATE = moment(row.PACKING_DATE).format('YYYY-MM-DD');
                });
                detailReport.forEach(row => {
                    row.PACKING_DATE = moment(row.PACKING_DATE).format('YYYY-MM-DD');
                });
                this.setState(newState, () => {
                    this.updateReportSummary();
                });
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

    //更新報表總計
    updateReportSummary = () => {
        const reportSummary = calcReportSummary(this.state.attendanceReport, this.state.detailReport, this.props.lines);
        this.setState(reportSummary);
    }

    //匯出報表
    exportReport = () => {
        if (!this.state.attendanceReport || !this.state.attendanceReport.length) {
            toast.warn('畫面上無資料，請先查詢');
            return;
        }

        exportDataToXlsx([
            {
                sheetName: '包裝出勤表',
                columns: this.PackingDailyAttendanceReportComponent.current.state.columns,
                colHeaders: this.PackingDailyAttendanceReportComponent.current.state.colHeaders,
                data: this.state.attendanceReport,
            },
            {
                sheetName: '包裝明細表',
                columns: this.PackingDailyDetailReportComponent.current.state.columns,
                colHeaders: this.PackingDailyDetailReportComponent.current.state.colHeaders,
                data: this.state.detailReport,
            },
        ], 'PBTC包裝日報表.xlsx');
    }

    render() {
        const { isLoading } = this.state;
        return <div className="packing-daily-report">
            <div className="packing-query-container mb-2">
                <div className="input-group input-group-sm me-2">
                    <span className="input-group-text">日期</span>
                    <input type="date"
                        className="form-control"
                        ref={this.packingDateStartComponent}
                        defaultValue={this.state.packingDateStart}
                        onChange={this.handleQueryDateChange('packingDateStart')} />
                </div>

                <button type="button"
                    className="btn btn-outline-primary btn-sm me-2"
                    onClick={this.queryPackingDailyReport} disabled={isLoading}><span className="icon bi-search"></span> 查詢</button>
                <button type="button" className="btn btn-outline-success btn-sm"
                    title="將畫面上的資料匯出成.xlsx檔案"
                    onClick={this.exportReport} disabled={isLoading}><span className="icon bi-file-earmark-text"></span> 匯出</button>
            </div>

            <div className="packing-work-group-row">
                {this.state.lines.map(line => {
                    return <div key={line.name} className="form-group">
                        <label className="w-6em">{line.name}</label>
                        <input type="text"
                            className="form-control form-control-sm text-end"
                            value={line.weight}
                            readOnly={true}
                            disabled={true} />&nbsp;Kg
                    </div>;
                })}
                <div className="form-group">
                    <label>槽車灌充量</label>
                    <input type="text"
                        className="form-control form-control-sm text-end"
                        value={this.state.fillingQuantity}
                        readOnly={true}
                        disabled={true} />&nbsp;Kg
                </div>
                <div className="form-group">
                    <label>合計包裝</label>
                    <input type="text"
                        className="form-control form-control-sm text-end"
                        value={this.state.lineWeight}
                        readOnly={true}
                        disabled={true} />&nbsp;Kg
                </div>
            </div >

            <div className="h5">每日包裝出勤及槽車灌充作業</div>
            <div className="packing-handsontable-container flex-shrink-1">
                <PackingDailyAttendanceReport
                    ref={this.PackingDailyAttendanceReportComponent}
                    isAdmin={this.props.isAdmin}
                    data={this.state.attendanceReport}
                    foremen={this.props.foremen}
                    updateReportSummary={this.updateReportSummary}
                />
            </div>

            <div className="h5 mt-2">每日包裝明細表</div>
            <div className="packing-handsontable-container flex-grow-1 mb-2">
                <PackingDailyDetailReport
                    ref={this.PackingDailyDetailReportComponent}
                    isAdmin={this.props.isAdmin}
                    data={this.state.detailReport}
                    detailReportReasons={this.props.detailReportReasons}
                />
            </div>
        </div>;
    }
}

PackingDailyReport.propTypes = {
    isAdmin: PropTypes.bool,
    detailReportReasons: PropTypes.array,
    foremen: PropTypes.array,
    lines: PropTypes.array,
    materials: PropTypes.array,
    notMeetReasons: PropTypes.array,
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

PackingDailyReport.defaultProps = {
    isAdmin: false,
    detailReportReasons: [],
    foremen: [],
    lines: [],
    materials: [],
    notMeetReasons: [],
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