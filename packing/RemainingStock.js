import React, { Component } from "react";
import { HotTable } from "@handsontable/react";
import axios from "axios";
import Utlis from "../Utils";
import { toast } from "react-toastify";
import moment from 'moment';
import 'handsontable/languages/zh-TW.js';

export default class RemainingStock extends Component {

    constructor(props) {
        super(props);

        this.state = {
            isLoading: false,
            isError: false,
            PRD_PC: '*',
            LOT_NO: '*',
            LONO: '*',
            startDate: moment(new Date()).subtract(1, 'months').format('YYYY-MM-DD'),
            endDate: moment(new Date()).format('YYYY-MM-DD'),
            searchDate: moment().format('YYYY-MM-DD HH:mm:ss'),
            lonoData: [],
            lonoErrorData: [],
            proScheduleData: [],
            hiddenCol: [],
            colHeaders: ['格位', '規格', '批號', '重量(KG)', '入庫日期', '存放天數', '人員', '標籤編號', '進行中<br>包裝排程', '未開始<br>包裝排程', '進行中<br>押出排程', '未開始<br>押出排程'],
            colErrorHeaders: ['格位', '規格', '批號', '重量(KG)', '列印日期', '存放天數', '人員', '標籤編號'], //異常查詢欄位
            columns: [
                { data: 'LONO', type: 'text', width: 70, className: 'htCenter', readOnly: true },
                { data: 'PRD_PC', type: 'text', width: 110, className: 'htCenter', readOnly: true },
                { data: 'LOT_NO', type: 'text', width: 100, className: 'htCenter', readOnly: true },
                { data: 'WEIGHT', type: 'numeric', width: 90, className: 'htCenter', readOnly: true },
                { data: 'INV_DATE', type: 'text', width: 160, className: 'htCenter', readOnly: true },
                {
                    data: 'DATE', type: 'numeric', width: 75, className: 'htCenter', readOnly: true,
                    renderer: (instance, td, row, col, prop, value, cellProperties) => {  //存放天數超過30天紅字表示
                        if (30 <= value && 60 > value) {
                            td.classList.add('bg-warning');
                            td.classList.add('text-dark');
                            td.classList.add('htCenter');
                            td.innerHTML = value;
                        } else if (60 < value) {
                            td.classList.add('bg-danger');
                            td.classList.add('text-dark');
                            td.classList.add('htCenter');
                            td.innerHTML = value;
                        } else {
                            td.innerHTML = value;
                            td.classList.add('htCenter');
                        }
                    }
                },
                { data: 'CREATOR', type: 'text', width: 90, className: 'htCenter', readOnly: true },
                { data: 'OPNO', type: 'text', width: 160, className: 'htCenter', readOnly: true },
                {
                    data: 'TODAYPACKING', type: 'text', width: 120, className: 'htCenter', readOnly: true,
                    /*renderer: (instance, td, row, col, prop, value, cellProperties) => {
                        const rowData = instance.getSourceDataAtRow(cellProperties.row);
                        Handsontable.dom.empty(td);

                        const btn = document.createElement('BUTTON');
                        btn.className = 'btn btn-link btn-sm';
                        btn.dataset['prd_pc'] = rowData.PRD_PC;
                        btn.dataset['lot_no'] = rowData.LOT_NO;
                        btn.innerHTML = value;
                        Handsontable.dom.addEvent(btn, 'click', this.hendlePackingOnClick);

                        td.appendChild(btn);
                        td.className = 'align-middle text-center';

                        return td;
                    }*/
                },
                { data: 'FEATUREPACKING', type: 'text', width: 120, className: 'htCenter', readOnly: true },
                { data: 'TODAYPRO', type: 'text', width: 140, className: 'htCenter', readOnly: true },
                { data: 'FEATUREPRO', type: 'text', width: 140, className: 'htCenter', readOnly: true }
            ],
            columnsError: [
                { data: 'LONO', type: 'text', width: 70, className: 'htCenter', readOnly: true },
                { data: 'PRD_PC', type: 'text', width: 110, className: 'htCenter', readOnly: true },
                { data: 'LOT_NO', type: 'text', width: 100, className: 'htCenter', readOnly: true },
                { data: 'WEIGHT', type: 'numeric', width: 90, className: 'htCenter', readOnly: true },
                { data: 'INV_DATE', type: 'text', width: 160, className: 'htCenter', readOnly: true },
                {
                    data: 'DATE', type: 'numeric', width: 75, className: 'htCenter', readOnly: true,
                    renderer: (instance, td, row, col, prop, value, cellProperties) => {  //存放天數超過30天紅字表示
                        if (30 <= value) {
                            td.classList.add('bg-danger');
                            td.classList.add('text-light');
                            td.classList.add('htCenter');
                            td.innerHTML = value;
                        } else {
                            td.innerHTML = value;
                            td.classList.add('htCenter');
                        }
                    }
                },
                { data: 'CREATOR', type: 'text', width: 90, className: 'htCenter', readOnly: true },
                { data: 'OPNO', type: 'text', width: 160, className: 'htCenter', readOnly: true },
            ],
        }
        this.queryApiCancelToken = null;
        this.hotTableComponent = React.createRef();
    }

    componentDidMount() {
        this.interval = setInterval(this.updatePage, 1200000);
    }

    //定時(20分鐘)清空查詢結果
    updatePage = () => {
        this.setState({ lonoData: [] });
    }

    //查詢目前殘包庫存
    queryCurrentStock = () => {
        this.setState({ isLoading: true, lonoData: [], isError: false, searchDate: moment().format('YYYY-MM-DD HH:mm:ss') });

        const { PRD_PC, LOT_NO, LONO } = this.state;
        const apiUrl = Utlis.generateApiUrl('/remainingBag/queryStock');
        const apiData = { PRD_PC, LOT_NO, LONO };
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
                result.forEach(element => {
                    data.push({
                        LONO: element.LONO,
                        PRD_PC: element.PRD_PC,
                        LOT_NO: element.LOT_NO,
                        WEIGHT: element.WEIGHT,
                        INV_DATE: moment(element.INV_DATE).format('YYYY-MM-DD HH:mm:ss'),
                        DATE: moment().diff(element.INV_DATE, 'days'),
                        CREATOR: element.PPS_CODE,
                        OPNO: element.OPNO,
                        TODAYPACKING: ('包裝中' === element.PACKING_STATUS && element.PRO_SCHEDULE_LINE !== null && element.PROSCHEDULE_SEQ !== null) ? '' + element.PRO_SCHEDULE_LINE + element.PRO_SCHEDULE_SEQ : null,
                        FEATUREPACKING: (null === element.PACKING_STATUS && element.PRO_SCHEDULE_LINE !== null && element.PROSCHEDULE_SEQ !== null) ? '' + element.PRO_SCHEDULE_LINE + element.PRO_SCHEDULE_SEQ : null,
                        TODAYPRO: (null !== element.ACT_STR_TIME && element.LINE !== null && element.SEQ !== null) ? '' + element.LINE + element.SEQ : null,
                        FEATUREPRO: (null === element.ACT_STR_TIME && (null !== element.NEXT_PRO || null !== element.NEXT_PRO_DIFF))
                            ? (null === element.NEXT_PRO && null !== element.NEXT_PRO_DIFF)
                                ? '' + element.NEXT_PRO_DIFF
                                : '' + element.NEXT_PRO
                            : null,
                    })
                });
                const uniqueData = [];
                data.forEach(item => {
                    if (!uniqueData.some(obj => obj.OPNO === item.OPNO /*&& "NULL" !== item.FEATUREPRO*/)) {
                        uniqueData.push(item);
                    }
                });
                this.setState({ lonoData: uniqueData });
                if (0 === result.length) {
                    toast.error('查無此庫存記錄');
                }
            } else {
                toast.error('查無此庫存記錄');
                this.setState({ isLoading: false, PRD_PC: '*', LOT_NO: '*', LONO: '*', lonoData: [] });
            }
        });
    }

    //異常查詢(有印標籤，但未入庫)
    queryErrorStock = () => {
        this.setState({ isLoading: true, lonoErrorData: [], isError: true });

        const { PRD_PC, LOT_NO, startDate, endDate } = this.state;
        const newStartDate = moment(startDate).format('YYYYMMDD');
        const newEndDate = moment(endDate).format('YYYYMMDD');
        const apiUrl = Utlis.generateApiUrl('/remainingBag/queryErrorStock');
        const apiData = { PRD_PC, LOT_NO, newStartDate, newEndDate };
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
                    INV_DATE: moment(element.INV_DATE).format('YYYY-MM-DD HH:mm:ss'),
                    DATE: moment().diff(element.INV_DATE, 'days'),
                    CREATOR: element.PPS_CODE,
                    OPNO: element.OPNO,
                }));
                this.setState({ lonoErrorData: data, hiddenCol: [8, 9] });
                if (0 === result.length) {
                    toast.error('查無此庫存記錄');
                }
            } else {
                toast.error('查無此庫存記錄');
                this.setState({ isLoading: false, PRD_PC: '*', LOT_NO: '*', LONO: '*', lonoErrorData: [] });
            }
        });
    }

    //匯出
    exportCSV = () => {
        const { lonoData, isError, startDate, endDate, lonoErrorData } = this.state;
        if (!isError) {
            if (lonoData.length) {
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
                    filename: moment().format('YYYY-MM-DD') + '殘包庫存',
                    mimeType: 'text/csv',
                    rowDelimiter: '\r\n',
                });
            } else {
                toast.warn('請先查詢，再做匯出');
            }
        } else {
            if (lonoErrorData.length) {
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
                    filename: moment(startDate).format('YYYY-MM-DD') + '至' + moment(endDate).format('YYYY-MM-DD') + '未入庫殘包',
                    mimeType: 'text/csv',
                    rowDelimiter: '\r\n',
                });
            } else {
                toast.warn('請先查詢，再做匯出');
            }
        }
    }

    render() {
        const { isLoading, isError } = this.state;
        const { isAdmin } = this.props;
        return <>
            <div className="remaining-query-container mb-2">
                <div className="remaining-handsontable-container mb-2 mt-3">
                    {/* <div className="alert alert-info w-50" role="alert">
                        欄位說明 : <br />
                        1. <strong>未開始排程</strong>表示目前已安排但未開始的排程，<strong>不會</strong>寄送通知信件。<br />
                        2. <strong>進行中排程</strong>表示目前正在進行的排程，當<strong>排程結束</strong>，仍<strong>未使用</strong>殘包，<strong>會</strong>寄送通知信件。
                    </div> */}
                    <div className="input-group input-group-sm me-2 mt-3">
                        <span className="input-group-text">規格</span>
                        <input type="text" className="form-control" value={this.state.PRD_PC} onChange={evt => this.setState({ PRD_PC: evt.target.value })} />
                    </div>

                    <div className="input-group input-group-sm me-2 mt-3">
                        <span className="input-group-text">批號</span>
                        <input type="text" className="form-control" value={this.state.LOT_NO} onChange={evt => this.setState({ LOT_NO: evt.target.value })} />
                    </div>

                    <div className="input-group input-group-sm me-2 mt-3">
                        <span className="input-group-text">格位</span>
                        <input type="text" className="form-control" value={this.state.LONO} onChange={evt => this.setState({ LONO: evt.target.value })} />
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
                        <button type="button" className="btn btn-outline-primary rounded me-2" onClick={this.queryErrorStock} disabled={isLoading}>
                            <span className="icon bi-search"></span>異常查詢
                        </button>
                    </div>

                    <div className="input-group input-group-sm  me-2 mt-3">
                        <button type="button" className="btn btn-outline-primary rounded me-2" onClick={this.queryCurrentStock} disabled={isLoading}>
                            <span className="icon bi-search"></span>查詢
                        </button>
                        <button type="button" className="btn btn-outline-success btn-sm rounded me-2" onClick={this.exportCSV} disabled={isLoading}>
                            <span className="icon bi-cloud-download"></span> 匯出
                        </button>
                    </div>
                    <div className="alert alert-info mt-2 w-50" role="alert">
                        欄位說明 : <br />
                        1. <strong>未開始排程</strong>表示目前已安排但未開始的排程，<strong>不會</strong>寄送通知信件。<br />
                        2. <strong>進行中排程</strong>表示目前正在進行的排程，當<strong>排程結束</strong>，仍<strong>未使用</strong>殘包，<strong>會</strong>寄送通知信件。
                    </div>
                    <div className="input-group input-group-sm me-2 mt-3 w-25">
                        <span>查詢時間</span>
                        &nbsp;<input type="numeric"
                            className="remaining-stock-researchTime form-control d-inline-block"
                            value={this.state.searchDate}
                            readOnly={true} />
                    </div>
                    {/* <div className="accordion mt-2 w-50" id="remainingAccordion">
                        <div className="accordion-item">
                            <h2 className="accordion-header" id="remainingAccordionHeadingOne">
                                <button className="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#collapseOne" aria-expanded="true" aria-controls="collapseOne">
                                    說明
                                </button>
                            </h2>
                            <div id="collapseOne" className="accordion-collapse collapse show " aria-labelledby="remainingAccordionHeadingOne" data-bs-parent="#remainingAccordion">
                                <div className="accordion-body text-dark">
                                    1. <strong>未開始排程</strong>表示目前已安排但未開始的排程，<strong>不會</strong>寄送信件。<br />
                                    2. <strong>進行中排程</strong>表示目前正在進行(生產)的排程，當<strong>排程結束</strong>，仍<strong>未使用</strong>殘包，<strong>會</strong>寄送信件。
                                </div>
                            </div>
                        </div>
                    </div> */}
                    {(!isError) ?
                        <div className="input-group input-group-sm me-2 mt-2">
                            <HotTable ref={this.hotTableComponent}
                                licenseKey="non-commercial-and-evaluation"
                                columns={this.state.columns}
                                colHeaders={this.state.colHeaders}
                                data={this.state.lonoData}
                                language="zh-TW"
                                renderAllRows={true}
                                columnSorting={true}
                                hiddenColumns={(!isAdmin) ? { columns: [7] } : { columns: [] }} />
                        </div>
                        :
                        <div className="input-group input-group-sm me-2 mt-2">
                            <HotTable ref={this.hotTableComponent}
                                licenseKey="non-commercial-and-evaluation"
                                columns={this.state.columnsError}
                                colHeaders={this.state.colErrorHeaders}
                                data={this.state.lonoErrorData}
                                language="zh-TW"
                                renderAllRows={true}
                                columnSorting={true}
                                hiddenColumns={(!isAdmin) ? { columns: [7] } : { columns: [] }} />
                        </div>
                    }
                </div>
            </div>
        </>
    }
}