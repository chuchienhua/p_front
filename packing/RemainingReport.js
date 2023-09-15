import React, { Component } from "react";
import Utils from "../Utils";
import axios from "axios";
import moment from "moment";
import { toast } from "react-toastify";
import { HotTable } from "@handsontable/react";
import 'handsontable/languages/zh-TW.js';
import { HyperFormula } from 'hyperformula';

export default class RemainingReport extends Component {

    constructor(props) {
        super(props);

        this.state = {
            isLoading: false,
            isFinished: false,
            startDate: moment().startOf('month').format('YYYY-MM-DD'),
            endDate: moment().format('YYYY-MM-DD'),
            reportType: 1, //報表種類 1週報 2月報
            columns: [
                { data: 'LABEL_1', type: 'text', width: 100, className: 'htCenter htMiddle', readOnly: true },
                { data: 'LABEL_2', type: 'text', width: 100, className: 'htCenter htMiddle', readOnly: true },
                { data: 'W1_COUNT', type: 'numeric', width: 100, className: 'htCenter htMiddle', readOnly: true, numericFormat: { pattern: '#,##0', thousandSeparated: true }, },
                { data: 'W2_COUNT', type: 'numeric', width: 100, className: 'htCenter htMiddle', readOnly: true, numericFormat: { pattern: '#,##0', thousandSeparated: true }, },
                { data: 'W3_COUNT', type: 'numeric', width: 100, className: 'htCenter htMiddle', readOnly: true, numericFormat: { pattern: '#,##0', thousandSeparated: true }, },
                { data: 'W4_COUNT', type: 'numeric', width: 100, className: 'htCenter htMiddle', readOnly: true, numericFormat: { pattern: '#,##0', thousandSeparated: true }, },
                { data: 'W5_COUNT', type: 'numeric', width: 100, className: 'htCenter htMiddle', readOnly: true, numericFormat: { pattern: '#,##0', thousandSeparated: true }, },
                { data: 'TOTAL', type: 'numeric', width: 100, className: 'htCenter htMiddle', readOnly: true, numericFormat: { pattern: '#,##0', thousandSeparated: true }, },
            ],
            hiddenColumns: { columns: [] },
            colHeaders: [
                '項目', '', 'W1', 'W2', 'W3', 'W4', 'W5', '合計',
            ],
            reportData: [],
            mergeCell: [
                { row: 0, col: 0, rowspan: 2, colspan: 1 },
                { row: 2, col: 0, rowspan: 2, colspan: 1 },
                { row: 4, col: 0, rowspan: 2, colspan: 1 },
                { row: 6, col: 0, rowspan: 2, colspan: 1 },
                { row: 8, col: 0, rowspan: 2, colspan: 1 },
                { row: 10, col: 0, rowspan: 2, colspan: 1 },
            ],
        };
        this.hyperFormulaInstance = HyperFormula.buildEmpty({
            licenseKey: 'internal-use-in-handsontable',
        });
        this.formulas = {
            engine: this.hyperFormulaInstance,
        };
        this.hotTableCompoent = React.createRef();
        this.queryApiCancelToken = null;
    }

    componentDidMount() {
        const hotInstance = this.hotTableCompoent.current.hotInstance;
        if (!hotInstance) {
            console.warn('hotInstance is null');
            return;
        }
        hotInstance.loadData([]);
    }

    componentDidUpdate() {
        if (this.state.isFinished) {
            const hotInstance = this.hotTableCompoent.current.hotInstance;
            if (!hotInstance) {
                console.warn('hotInstance is null');
                return;
            }
            hotInstance.loadData(this.state.reportData);
            if (1 === this.state.reportType) {
                hotInstance.updateSettings({
                    mergeCells: this.state.mergeCell,
                    colHeaders: [
                        '項目', '', 'W1', 'W2', 'W3', 'W4', 'W5', '合計',
                    ],
                    columns: this.state.columns,
                });
            } else {
                hotInstance.updateSettings({
                    mergeCells: this.state.mergeCell,
                    colHeaders: [
                        '項目', '', `${moment(this.state.startDate).month() + 1}月`, `${moment(this.state.endDate).month() + 1}月`,
                    ],
                    columns: [
                        { data: 'LABEL_1', type: 'text', width: 100, className: 'htCenter htMiddle', readOnly: true },
                        { data: 'LABEL_2', type: 'text', width: 100, className: 'htCenter htMiddle', readOnly: true },
                        { data: 'LAST_COUNT', type: 'numeric', width: 100, className: 'htCenter htMiddle', readOnly: true, numericFormat: { pattern: '#,##0', thousandSeparated: true }, },
                        { data: 'THIS_COUNT', type: 'numeric', width: 100, className: 'htCenter htMiddle', readOnly: true, numericFormat: { pattern: '#,##0', thousandSeparated: true }, },
                    ],
                })
            }

        }
    }

    handleBtnClick = () => {
        this.setState({ isLoading: true, isFinished: false });
        const regex = /=([^)]+)\)/;

        const { startDate, endDate, reportType } = this.state;

        const startMonth = moment(startDate).month();
        const endMonth = moment(endDate).month();

        if (1 < endMonth - startMonth) {
            toast.warn('只能顯示開始日期和結束日期所在月份的結果');
        }

        if (startMonth !== endMonth) {
            this.setState({ reportType: 2 });
            const apiURL = Utils.generateApiUrl('/remainingBag/queryBagMonthReport');
            const newStartDate = moment(startDate).startOf('month');
            const newEndDate = moment(endDate).startOf('month');
            const apiData = { newStartDate, newEndDate };
            this.queryApiCancelToken = axios.CancelToken.source();
            axios.post(apiURL, apiData, { ...Utils.pbtAxiosConfig, cancelToken: this.queryApiCancelToken.token, timeout: 10000, })
                .then(res => {
                    if (!res.data.error) {
                        const result = res.data.res;
                        let data = [];
                        if (0 === result.length) {
                            toast.error('查詢失敗');
                            this.setState({ isLoading: false });
                            return;
                        }
                        result.forEach(element => {
                            data.push({
                                LABEL_1: element.LABEL_1,
                                LABEL_2: element.LABEL_2,
                                LAST_COUNT: element.LAST_COUNT,
                                THIS_COUNT: element.THIS_COUNT,
                            })
                            this.setState({ reportData: data, isLoading: false, isFinished: true })
                        })
                    } else {
                        toast.error('報表查詢異常');
                        this.setState({ isLoading: false });
                    }
                }).catch(err => {
                    toast.error(`查詢失敗，\n${err.toString()}`);
                    console.error(err);
                    this.setState({ isLoading: false });
                });
        } else {
            this.setState({ reportType: 1 });
            const apiURL = Utils.generateApiUrl('/remainingBag/queryBagReport');
            const newStartDate = moment(startDate).format('YYYYMMDD');
            const newEndDate = moment(endDate).format('YYYYMMDD');
            const apiData = { newStartDate, newEndDate, reportType };
            this.queryApiCancelToken = axios.CancelToken.source();
            axios.post(apiURL, apiData, { ...Utils.pbtAxiosConfig, cancelToken: this.queryApiCancelToken.token, timeout: 60000, })
                .then(res => {
                    if (!res.data.error) {
                        const result = res.data.res;
                        let data = [];
                        if (0 === result.length) {
                            toast.error('查詢失敗');
                            this.setState({ isLoading: false });
                            return;
                        }
                        result.forEach(element => {
                            data.push({
                                LABEL_1: element.LABEL_1,
                                LABEL_2: element.LABEL_2,
                                W1_COUNT: element.W1_COUNT,
                                W2_COUNT: element.W2_COUNT,
                                W3_COUNT: element.W3_COUNT,
                                W4_COUNT: element.W4_COUNT,
                                W5_COUNT: element.W5_COUNT,
                                TOTAL: (null !== element.TOTAL && element.TOTAL.match(regex)) ? element.TOTAL.match(regex)[0] : element.W5_COUNT,
                            })
                            this.setState({ reportData: data, isLoading: false, isFinished: true });
                        })
                    } else {
                        toast.error('報表查詢異常');
                        this.setState({ isLoading: false });
                    }
                }).catch(err => {
                    toast.error(`查詢失敗，\n${err.toString()}`);
                    console.error(err);
                    this.setState({ isLoading: false });
                });
        }
    }

    exportXLSX = () => {
        const { reportData, startDate, endDate, reportType } = this.state;
        const thisMonth = moment(endDate).month() + 1;
        const lastMonth = moment(startDate).month() + 1;
        const downloadFile_week = '殘包管理週報表.xlsx';
        const downloadFile_month = '殘包管理月報表.xlsx';
        this.setState({ isLoading: true });
        if (reportData.length) {
            const apiURL = Utils.generateApiUrl('/remainingBag/exportBagReport');
            const apiData = { reportData, reportType, thisMonth, lastMonth };

            const callback = res => {
                const uint8Array = new Uint8Array(res.data);
                const blob = new Blob([uint8Array], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = (1 === reportType) ? downloadFile_week : downloadFile_month
                a.click();

                window.URL.revokeObjectURL(url);
                this.setState({ isLoading: false });
            };

            return axios.post(apiURL, apiData, { ...Utils.pbtAxiosConfig, cancelToken: this.queryApiCancelToken.token, timeout: 60000, responseType: "arraybuffer", })
                .then(callback).catch(err => {
                    console.error(err);
                    toast.error('報表下載失敗');
                    this.setState({ isLoading: false });
                });
        } else {
            toast.warn('請先查詢，再匯出');
            this.setState({ isLoading: false });
        }
    }

    getTablinkClass = reportType => reportType === this.state.reportType ? 'btn btn-outline-secondary btn-sm active' : 'btn btn-outline-secondary btn-sm'

    switchOutStorageType = reportType => event => {
        event.nativeEvent.preventDefault();
        this.setState({ reportType });
    }

    render() {
        const { isLoading } = this.state;
        return <>
            <div className="remaining-query-container mb-2">
                <div className="remaining-handsontable-container mb-2 mt-3">
                    <div className="input-group input-group-sm me-2 mt-3 w-50">
                        <span className="input-group-text">日期</span>
                        <input type="date"
                            className="form-control"
                            defaultValue={this.state.startDate}
                            onChange={evt => this.setState({ startDate: evt.target.value })} />
                        <span className="input-group-text">~</span>
                        <input type="date"
                            className="form-control"
                            defaultValue={this.state.endDate}
                            onChange={evt => this.setState({ endDate: evt.target.value })} />
                        <button type="button" className="btn btn-outline-primary rounded ms-2 me-2"
                            onClick={this.handleBtnClick} disabled={isLoading}>
                            <span className="icon bi-search"></span>查詢
                        </button>
                        <button type="button" className="btn btn-outline-success rounded me-2"
                            onClick={this.exportXLSX}
                            disabled={isLoading} >
                            <span className="icon bi-cloud-download"></span> 匯出
                        </button>
                        {/* <button type="button" className={this.getTablinkClass(1)} onClick={this.switchOutStorageType(1)}>週報</button>
                        <button type="button" className={this.getTablinkClass(2)} onClick={this.switchOutStorageType(2)}>月報</button>  */}
                    </div>
                </div>
                <div className="input-group input-group-sm me-2 mt-3">
                    <HotTable ref={this.hotTableCompoent}
                        licenseKey="non-commercial-and-evaluation"
                        /*columns={this.state.columns}
                        colHeaders={this.state.colHeaders}*/
                        language="zh-TW"
                        /*data={this.state.reportData}*/
                        /*mergeCells={this.state.mergeCell}*/
                        formulas={this.formulas} />
                </div>
            </div>
        </>
    }
}