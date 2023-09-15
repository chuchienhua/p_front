import React, { Component } from "react";
import axios from "axios";
import Utlis from "../Utils";
import moment from "moment";
import { HotTable } from "@handsontable/react";
import 'handsontable/languages/zh-TW.js';
import { toast } from "react-toastify";

export default class RemainingRecord extends Component {

    constructor(props) {
        super(props);

        this.state = {
            isLoading: false,
            resultData: [],
            startDate: moment(new Date()).subtract(7,'days').format('YYYY-MM-DD'),
            endDate: moment(new Date()).format('YYYY-MM-DD'),
            PRD_PC: '*',
            LOT_NO: '*',
            columns: [
                { data: 'LONO', type: 'text', width: 70, className: 'htCenter', readOnly: true },
                { data: 'PRD_PC', type: 'text', width: 110, className: 'htCenter', readOnly: true },
                { data: 'LOT_NO', type: 'text', width: 100, className: 'htCenter', readOnly: true },
                { data: 'WEIGHT', type: 'numeric', width: 90, className: 'htCenter', readOnly: true },
                { data: 'STATUS', type: 'text', width: 90, className: 'htCenter', readOnly: true },
                { data: 'DATE', type: 'text', width: 160, className: 'htCenter', readOnly: true },
                { data: 'REMARK', type: 'text', width: 160, className: 'htCenter', readOnly: true },
                { data: 'CREATOR', type: 'text', width: 90, className: 'htCenter', readOnly: true },
                { data: 'NAME', type: 'text', width: 110, className: 'htCenter', readOnly: true },
            ],
            colHeaders: ['格位', '規格', '批號', '重量', '入/出庫', '日期', '備註', '操作人員', '操作人員姓名'],
        }
        this.hotTableComponent = React.createRef();
        this.queryApiCancelToken = null;
    }
    queryStatusRecord = () => {
        this.setState({ isLoading: true, resultData: [] });

        const { startDate, endDate, PRD_PC, LOT_NO } = this.state;
        const apiUrl = Utlis.generateApiUrl('/remainingBag/queryStatus');
        const newStartDate = moment(startDate).format('YYYYMMDD');
        const newEndDate = moment(endDate).format('YYYYMMDD');
        const apiData = { newStartDate, newEndDate, PRD_PC, LOT_NO };
        this.queryApiCancelToken = axios.CancelToken.source();
        axios.post(apiUrl, apiData, {
            ...Utlis.pbtAxiosConfig,
            cancelToken: this.queryApiCancelToken.token,
            timeout: 10000,
        }).then(res => {
            if (!res.data.error) {
                this.setState({ isLoading: false });
                const result = res.data.res;
                let data = [];
                result.forEach(element => data.push({
                    LONO: element.LONO,
                    PRD_PC: element.PRD_PC,
                    LOT_NO: element.LOT_NO,
                    WEIGHT: element.WEIGHT,
                    STATUS: (null !== element.STATUS) ?
                        ('1' === element.STATUS) ? '入庫'
                            : ('0' === element.STATUS) ? '出庫' : null : null,
                    DATE: moment(element.INV_DATE).format('YYYY-MM-DD HH:mm:ss'),
                    REMARK: element.REMARK,
                    CREATOR: element.CREATOR,
                    NAME: (' ' === element.NAME) ? element.CNAME : element.NAME,
                }));
                this.setState({ resultData: data });
                if (0 === result.length) {
                    toast.error('此時間區間內，查無進出記錄');
                }
            } else {
                toast.error('此時間區間內，查無進出記錄');
                this.setState({ isLoading: false });
            }
        })
    }

    exportCSV = () => {
        const { resultData, startDate, endDate } = this.state;
        if (resultData.length) {
            const hot = this.hotTableComponent.current.hotInstance;
            const exportPlugin = hot.getPlugin('exportFile');
            exportPlugin.downloadFile('csv', {
                bom: true,
                columnDelimiter: ',',
                columnHeaders: true,
                exportHiddenColumns: true,
                rowHeaders: false,
                exportHiddenRows: true,
                fileExtension: 'csv',
                filename: moment(startDate).format('YYYY-MM-DD') + '至' + moment(endDate).format('YYYY-MM-DD') + '殘包進出記錄',
                mimeType: 'text/csv',
                rowDelimiter: '\r\n',
            })
        } else {
            toast.warn('請先查詢，再做匯出');
        }
    }

    render() {
        const { isLoading } = this.state;
        return <>
            <div className="remaining-query-container mb-2">
                <div className="input-group input-group-sm me-2 mt-3">
                    <span className="input-group-text">成品簡碼</span>
                    <input type="text" className="form-control" value={this.state.PRD_PC} onChange={evt => this.setState({ PRD_PC: evt.target.value })} />
                    <span className="input-group-text">批號</span>
                    <input type="text" className="form-control" value={this.state.LOT_NO} onChange={evt => this.setState({ LOT_NO: evt.target.value })} />
                </div>
                <div className="input-group input-group-sm me-2 mt-3">
                    <span className="input-group-text">開始日期</span>
                    <input type="date"
                        className="form-control"
                        defaultValue={this.state.startDate}
                        onChange={evt => this.setState({ startDate: evt.target.value })} />
                    <span className="input-group-text">結束日期</span>
                    <input type="date"
                        className="form-control"
                        defaultValue={this.state.endDate}
                        onChange={evt => this.setState({ endDate: evt.target.value })} />
                    {/* <button type="button"
                        className="btn btn-outline-primary btn-sm"
                        onClick={this.queryStatusRecord} disabled={isLoading}><span className="icon bi-search"></span>查詢</button> */}
                </div>
                <div className="input-group input-group-sm me-2 mt-3">
                    <button type="button"
                        className="btn btn-outline-primary rounded btn-sm me-2"
                        onClick={this.queryStatusRecord} disabled={isLoading}><span className="icon bi-search"></span>查詢</button>
                    <button type="button"
                        className="btn btn-outline-success rounded btn-sm me-2"
                        onClick={this.exportCSV} disabled={isLoading}><span className="icon bi-cloud-download"></span>匯出</button>
                </div>
                <div className="input-group input-group-sm me-2 mt-3">
                    <HotTable ref={this.hotTableComponent}
                        licenseKey="non-commercial-and-evaluation"
                        columns={this.state.columns}
                        colHeaders={this.state.colHeaders}
                        data={this.state.resultData}
                        language="zh-TW"
                        columnSorting={true} />
                </div>
            </div>
        </>
    }
}