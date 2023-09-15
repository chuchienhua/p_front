import React, { Component } from 'react';
import axios from 'axios';
import 'handsontable/languages/zh-TW.js';
import moment from 'moment';
import PropTypes from 'prop-types';
import queryString from 'query-string';
import { toast } from 'react-toastify';
import { exportDataToXlsx } from '../PackingUtils';
import Utils from '../../Utils';
import PackingCompletionRateReportTable from './PackingCompletionRateReportTable';
import PackingCompletionRateNotMeetAnalysis from './PackingCompletionRateNotMeetAnalysis';
import NotMeetAnalysisChart from './NotMeetAnalysisChart';

//計算報表總計
function calcReportSummary(completionRateReport, lines, notMeetReasons) {
    if (!completionRateReport) {
        return {};
    }
    let totalTargetWeight = 0;
    let totalPackingWeight = 0;
    const newState = {
        totalAchievementRate: '',
        totalPackingPeriod: 0,
        totalNotMeetWeightByLine: 0,
        totalNotMeetWeightByReason: 0,
    };

    //未達標原因分析
    const lineMap = lines.reduce((map, row) => {
        map.set(row.LINE_NAME, {
            name: row.LINE_NAME,
            weight: 0,
            ratio: 0,
        });
        return map;
    }, new Map());
    const reasonMap = notMeetReasons.reduce((map, row) => {
        map.set(row.REASON_NAME, {
            name: row.REASON_NAME,
            weight: 0,
            ratio: 0,
        });
        return map;
    }, new Map());

    completionRateReport.forEach(row => {
        //合計包裝達成率、包裝時間
        totalTargetWeight += +row.TARGET_WEIGHT;
        totalPackingWeight += +row.PACKING_WEIGHT;
        newState.totalPackingPeriod += +row.PACKING_PERIOD;

        //未達標統計
        if (!row.IS_COMPLETED) {
            //線別
            if (lineMap.has(row.PACKING_LINE_NAME)) {
                const summary = lineMap.get(row.PACKING_LINE_NAME);
                summary.weight += row.WEIGHT_DIFF;
                newState.totalNotMeetWeightByLine += row.WEIGHT_DIFF;
            }

            //未達標原因
            if (reasonMap.has(row.NOT_MEET_REASON)) {
                const summary = reasonMap.get(row.NOT_MEET_REASON);
                summary.weight += row.WEIGHT_DIFF;
                newState.totalNotMeetWeightByReason += row.WEIGHT_DIFF;
            }
        }
    });

    //計算合計
    if (totalTargetWeight) {
        const totalAchievementRate = totalPackingWeight / totalTargetWeight;
        newState.totalAchievementRate = ~~(totalAchievementRate * 10000) / 100 + '%';
    }

    const lineSummary = [...lineMap.values()];
    newState.lineChartLabels = lineSummary.map(row => row.name);
    newState.lineChartRows = lineSummary.map(row => row.weight);
    lineSummary.forEach(row => {
        if (row.weight <= 0) {
            row.weight = null;
            row.ratio = null;
        } else {
            row.ratio = (row.weight / newState.totalNotMeetWeightByLine * 100).toFixed(2) + '%';
        }
    });
    lineSummary.push({
        name: '合計',
        weight: newState.totalNotMeetWeightByLine,
        ratio: null,
    });
    const reasonSummary = [...reasonMap.values()];
    newState.reasonChartLabels = reasonSummary.map(row => row.name);
    newState.reasonChartRows = reasonSummary.map(row => row.weight);
    reasonSummary.forEach(row => {
        if (row.weight <= 0) {
            row.weight = null;
            row.ratio = null;
        } else {
            row.ratio = (row.weight / newState.totalNotMeetWeightByReason * 100).toFixed(2) + '%';
        }
    });
    reasonSummary.push({
        name: '合計',
        weight: newState.totalNotMeetWeightByReason,
        ratio: null,
    });

    //產生未達標原因分析的表格
    const notMeetRows = [];
    const notMeetRowsLength = Math.max(lineSummary.length, reasonSummary.length);
    for (let i = 0; i < notMeetRowsLength; i++) {
        const row = {
            lineName: '',
            lineWeight: null,
            lineRatio: null,
            reasonName: '',
            reasonWeight: null,
            reasonRatio: null,
        };
        if (i < lineSummary.length) {
            row.lineName = lineSummary[i].name;
            row.lineWeight = lineSummary[i].weight;
            row.lineRatio = lineSummary[i].ratio;
        }
        if (i < reasonSummary.length) {
            row.reasonName = reasonSummary[i].name;
            row.reasonWeight = reasonSummary[i].weight;
            row.reasonRatio = reasonSummary[i].ratio;
        }

        notMeetRows.push(row);
    }
    newState.notMeetAnalysisRows = notMeetRows;

    // console.log(newState);
    return newState;
}

//格式化顯示包裝時間
function formatPackingPeriod(value) {
    if ('number' === typeof value) {
        value = Math.ceil(value);
        const hours = ~~(value / 60);
        const minutes = ~~(value - hours * 60);
        return hours.toString().padStart(2, '0') + ':' + minutes.toString().padStart(2, '0');
    }

    return '';
}

export default class PackingCompletionRateReport extends Component {

    constructor(props) {
        super(props);

        this.state = {
            isLoading: false,
            packingDateStart: moment(new Date()).format('YYYY-MM-DD'),
            packingDateEnd: moment(new Date()).format('YYYY-MM-DD'),
            completionRateReport: [],
            totalAchievementRate: 0,
            totalPackingPeriod: 0,
            lineChartLabels: [],
            lineChartRows: [],
            reasonChartLabels: [],
            reasonChartRows: [],
        };

        this.packingDateStartComponent = React.createRef();
        this.packingDateEndComponent = React.createRef();
        this.PackingCompletionRateReportTableComponent = React.createRef();
        this.PackingCompletionRateNotMeetAnalysisComponent = React.createRef();
        this.queryApiCancelToken = null;
    }

    componentDidMount() {
        //網址帶入參數
        const parsed = queryString.parse(window.location.search);
        if (parsed.packing_date) {
            this.setState({
                packingDateStart: parsed.packing_date,
                packingDateEnd: parsed.packing_date,
            }, this.queryPackingCompletionRateReport);
            if (this.packingDateStartComponent && this.packingDateStartComponent.current) {
                this.packingDateStartComponent.current.value = parsed.packing_date;
            }
            if (this.packingDateEndComponent && this.packingDateEndComponent.current) {
                this.packingDateEndComponent.current.value = parsed.packing_date;
            }
        } else {
            this.queryPackingCompletionRateReport();
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

    //顯示包裝線onChange
    handleDisplayPackingLineChange = event => {
        if (!this.PackingCompletionRateReportTableComponent.current) {
            return;
        }
        const hotInstance = this.PackingCompletionRateReportTableComponent.current.hotTableComponent.current.hotInstance;
        if (!hotInstance) {
            return;
        }
        const filters = hotInstance.getPlugin('filters');
        if (event) {
            filters.removeConditions(2);
            if (event.target.value) {
                filters.addCondition(2, 'eq', [event.target.value]);
            }
        }
        filters.filter();
    }

    //查詢包裝報表
    queryPackingCompletionRateReport = () => {
        this.setState({ isLoading: true });

        const apiUrl = Utils.generateApiUrl('/packing/getPackingCompletionRateReport');
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
                const completionRateReport = Array.isArray(res.data.completionRateReport) ? res.data.completionRateReport : [];
                //調整欄位格式
                completionRateReport.forEach(row => {
                    row.PACKING_DATE = moment(row.PACKING_DATE).format('YYYY-MM-DD');
                    row.FIRST_CONFIRM_TIME = row.FIRST_CONFIRM_TIME ? moment(row.FIRST_CONFIRM_TIME).format('YYYY/MM/DD HH:mm:ss') : null;
                    row.LAST_CONFIRM_TIME = row.LAST_CONFIRM_TIME ? moment(row.LAST_CONFIRM_TIME).format('YYYY/MM/DD HH:mm:ss') : null;
                    row.PACKING_PERIOD = formatPackingPeriod(row.PACKING_PERIOD);
                });
                const newState = {
                    completionRateReport,
                };
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
    updateReportSummary = (completionRateReport) => {
        if (!completionRateReport) {
            completionRateReport = this.state.completionRateReport;
        }
        const reportSummary = calcReportSummary(completionRateReport, this.props.lines, this.props.notMeetReasons);
        this.setState(reportSummary, () => {
            const target = document.querySelector('input[name=completion-rate-report-display-packing-line]:checked');
            if (target) {
                target.click();
            }
        });
    }

    //匯出報表
    exportReport = () => {
        if (!this.state.completionRateReport || !this.state.completionRateReport.length) {
            toast.warn('畫面上無資料，請先查詢');
            return;
        }

        exportDataToXlsx([
            {
                sheetName: '排程達成率統計表',
                columns: this.PackingCompletionRateReportTableComponent.current.state.columns,
                colHeaders: this.PackingCompletionRateReportTableComponent.current.state.colHeaders,
                data: this.state.completionRateReport,
            },
            {
                sheetName: '排程未達標原因分析表',
                columns: this.PackingCompletionRateNotMeetAnalysisComponent.current.state.columns,
                colHeaders: this.PackingCompletionRateNotMeetAnalysisComponent.current.state.colHeaders,
                data: this.state.notMeetAnalysisRows,
            },
        ], 'PBTC排程達成率統計表.xlsx');
    }

    render() {
        const { isLoading, packingDateStart, packingDateEnd } = this.state;
        const dateRange = `${packingDateStart ? moment(packingDateStart).format('YYYY/M/D') : ''} ~ ${packingDateEnd ? moment(packingDateEnd).format('YYYY/M/D') : ''}`;

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
                    onClick={this.queryPackingCompletionRateReport} disabled={isLoading}><span className="icon bi-search"></span> 查詢</button>
                <button type="button" className="btn btn-outline-success btn-sm"
                    title="將畫面上的資料匯出成.xlsx檔案"
                    onClick={this.exportReport} disabled={isLoading}><span className="icon bi-file-earmark-text"></span> 匯出</button>
            </div>

            <div className="packing-work-group-row">
                <div className="form-group">
                    <label className="w-9em">合計包裝達成率</label>
                    <input type="text"
                        className="form-control form-control-sm text-end"
                        value={this.state.totalAchievementRate}
                        readOnly={true}
                        disabled={true} />
                </div>
                <div className="form-group">
                    <label className="w-9em">合計包裝時間</label>
                    <input type="text"
                        className="form-control form-control-sm text-end"
                        value={formatPackingPeriod(this.state.totalPackingPeriod)}
                        readOnly={true}
                        disabled={true} />
                </div>
            </div >

            <div className="h5">排程達成率統計表</div>
            <div className="btn-group w-fit-content" role="group" aria-label="Basic radio toggle button group">
                <input type="radio"
                    className="btn-check"
                    name="completion-rate-report-display-packing-line"
                    id="completion-rate-report-display-packing-line-all"
                    defaultChecked={true}
                    value=""
                    onClick={this.handleDisplayPackingLineChange} 
                    onChange={this.handleDisplayPackingLineChange} />
                <label className="btn btn-outline-secondary btn-sm" htmlFor="completion-rate-report-display-packing-line-all">全部</label>

                {this.props.lines.map(row => {
                    return <React.Fragment key={row.LINE_ID}>
                        <input type="radio"
                            className="btn-check"
                            name="completion-rate-report-display-packing-line"
                            id={'completion-rate-report-display-packing-line-' + row.LINE_ID}
                            value={row.LINE_NAME}
                            onClick={this.handleDisplayPackingLineChange} 
                            onChange={this.handleDisplayPackingLineChange} />
                        <label className="btn btn-outline-secondary btn-sm" htmlFor={'completion-rate-report-display-packing-line-' + row.LINE_ID}>{row.LINE_NAME}</label>
                    </React.Fragment>;
                })}
            </div>
            <div className="packing-handsontable-container flex-grow-1 min-height-15em">
                <PackingCompletionRateReportTable
                    ref={this.PackingCompletionRateReportTableComponent}
                    isAdmin={this.props.isAdmin}
                    data={this.state.completionRateReport}
                    lines={this.props.lines}
                    notMeetReasons={this.props.notMeetReasons}
                    formatPackingPeriod={formatPackingPeriod}
                    updateReportSummary={this.updateReportSummary}
                />
            </div>

            <div className="h5 mt-2">排程未達標原因分析表</div>
            <div className="packing-handsontable-container flex-grow-1 not-meet-analysis-table">
                <PackingCompletionRateNotMeetAnalysis
                    ref={this.PackingCompletionRateNotMeetAnalysisComponent}
                    isAdmin={this.props.isAdmin}
                    data={this.state.notMeetAnalysisRows}
                />
            </div>

            <div className="packing-report-chart-container">
                <NotMeetAnalysisChart title={[dateRange, '包裝排程未達標原因佔比圖', '']} labels={this.state.reasonChartLabels} rows={this.state.reasonChartRows} />
                <NotMeetAnalysisChart title={[dateRange, '包裝機台未達標佔比圖', '']} labels={this.state.lineChartLabels} rows={this.state.lineChartRows} />
            </div>
        </div >;
    }
}

PackingCompletionRateReport.propTypes = {
    isAdmin: PropTypes.bool,
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
};

PackingCompletionRateReport.defaultProps = {
    isAdmin: false,
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
};