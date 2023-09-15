import React, { Component } from "react";
import { toast } from "react-toastify";
import Utlis from '../Utils';
import axios from "axios";
import PropTypes from 'prop-types';

export default class RemainingPrintLabel extends Component {

    constructor(props) {
        super(props);

        this.state = {
            isLoading: false,
            isConfirmed: false,
            printLabelType: 0, //1儲位 2殘包 
            lonoRow: '',  //格位列數(1~10)
            selectRow: ['0', '01', '02', '03', '04', '05', '06', '07', '08', '09', '10'],
            lonoCount: '',  //格位位數(1~6)
            selectCount: ['0', '001', '002', '003', '004', '005', '006'],
            lonoLayer: '01',  //格位層數(1~4)
            selectLayer: ['0', '01', '02', '03', '04'],
            bagPRD_PC: '',  //殘包簡碼
            bagLOT_NO: '',  //殘包批號
            bagWeight: 0,  //殘包重量
            bagProperty: '',  //殘包性質
            printerIP: '',  //標籤機ID
            materials: '',  //包裝性質
        }
        this.queryApiCancelToken = null;
    }

    handleLonoPrint = () => {
        this.setState({ printLabelType: 1 });
    }

    handleBagPrint = () => {
        this.setState({ printLabelType: 2 });
    }

    handleChange = event => {
        let value = event.target.value;
        let field = event.target.dataset.field; //data-field

        if ('lonoRow' === field) {
            this.setState({ lonoRow: value });
        } else if ('lonoCount' === field) {
            this.setState({ lonoCount: value });
        }
    }

    handleLonoConfirm = () => {
        const { lonoRow, lonoCount, printerIP } = this.state;
        this.setState({ isLoading: true });

        if ('0' === lonoRow || '0' === lonoCount || '' === lonoRow || '' === lonoCount || '' === printerIP) {
            if ('' === printerIP) {
                toast.error('請選擇標籤機!');
            } else {
                toast.error('格位格式輸入錯誤，不得為0!');
            }
            this.setState({ isLoading: false });
        } else {
            const lonoData = lonoRow + lonoCount;
            const apiUrl = Utlis.generateApiUrl('/remainingBag/printLonoLabel');
            const apiData = { lonoData, printerIP };
            this.queryApiCancelToken = axios.CancelToken.source();
            return axios.post(apiUrl, apiData, {
                ...Utlis.pbtAxiosConfig,
                cancelToken: this.queryApiCancelToken.token,
                timeout: 10000,
            }).then(res => {
                if (!res.data.error) {
                    toast.success('標籤列印成功');
                    this.setState({ isLoading: false, lonoRow: '', lonoCount: '' });
                } else {
                    toast.error(`列印標籤失敗，${res.data.res}`);
                }
            }).catch(err => toast.error(`列印標籤失敗，${err}`))
                .finally(() => this.setState({ isLoading: false }))
        }
    }

    confirmWithProSchedule = () => {
        const { bagPRD_PC, bagLOT_NO, bagProperty, bagWeight, printerIP } = this.state;
        this.setState({ isLoading: true });

        const apiUrl = Utlis.generateApiUrl('/remainingBag/confirmProSchedule');
        const apiData = { bagPRD_PC, bagLOT_NO };
        this.queryApiCancelToken = axios.CancelToken.source();
        return axios.post(apiUrl, apiData, {
            ...Utlis.pbtAxiosConfig,
            cancelToken: this.queryApiCancelToken.token,
            timeout: 10000,
        }).then(res => {
            if (!res.data.error) {
                if (0 < res.data.res.length) {
                    const apiUrl = Utlis.generateApiUrl('/remainingBag/printBagLabel');
                    const apiData = { bagPRD_PC, bagLOT_NO, bagProperty, bagWeight, printerIP };
                    this.queryApiCancelToken = axios.CancelToken.source();
                    return axios.post(apiUrl, apiData, {
                        ...Utlis.pbtAxiosConfig,
                        cancelToken: this.queryApiCancelToken.token,
                        timeout: 10000,
                    }).then(res => {
                        if (!res.data.error) {
                            toast.success('標籤列印成功');
                            this.setState({ isLoading: false, bagPRD_PC: '', bagLOT_NO: '', bagProperty: '', bagWeight: 0 });
                        } else {
                            toast.error(`列印標籤失敗，${res.data.res}`);
                        }
                    }).catch(err => toast.error(`列印標籤失敗，${err}`))
                        .finally(() => this.setState({ isLoading: false }))
                } else {
                    toast.error('輸入的成品簡碼與批號和主排程有誤');
                    this.setState({ isConfirmed: false, isLoading: false });
                }
            } else {
                toast.error('輸入的成品簡碼與批號和主排程有誤');
                this.setState({ isLoading: false, isConfirmed: false });
            }
        }).catch(err => console.error(err))
            .finally(() => this.setState({ isLoading: false }));
    }

    // storeBagInfo = () => {
    //     const { bagPRD_PC, bagLOT_NO, bagProperty, bagWeight, lonoRow, lonoCount, lonoLayer } = this.state;
    //     const lonoData = lonoRow + lonoCount + lonoLayer;

    //     const apiUrl = Utlis.generateApiUrl('/remainingBag/storeBagInfo');
    //     const apiData = { bagPRD_PC, bagLOT_NO, bagProperty, bagWeight, lonoData };
    //     this.queryApiCancelToken = axios.CancelToken.source();
    //     return axios.post(apiUrl, apiData, {
    //         ...Utlis.pbtAxiosConfig,
    //         cancelToken: this.queryApiCancelToken.token,
    //         timeout: 10000,
    //     }).then(res => {
    //         if (res.data.error) {
    //             toast.error('儲存殘包資訊錯誤');
    //         }
    //     }).catch(err => toast.error(`儲存殘包資訊錯誤，${err}`))
    //         .finally(() => this.setState({ isLoading: false }))
    // }

    handleBagConfirm = () => {
        const { bagPRD_PC, bagLOT_NO, bagProperty, bagWeight, printerIP } = this.state;
        this.setState({ isLoading: true });

        if ('' === bagPRD_PC || '' === bagLOT_NO || '' === bagProperty || 0 === bagWeight || '' === printerIP) {
            if ('' === bagPRD_PC) {
                toast.error('殘包成品簡碼不得為空!');
            } else if ('' === bagLOT_NO) {
                toast.error('殘包成品批號不得為空!');
            } else if ('' === bagProperty) {
                toast.error('殘包包裝性質不得為空!');
            } else if (0 === bagWeight) {
                toast.error('殘包餘重不得為0!');
            } else if ('' === printerIP) {
                toast.error('請選擇標籤機!');
            }
            this.setState({ isLoading: false });
        } else {
            this.confirmWithProSchedule();
        }
    }

    render() {
        const { isLoading, printLabelType } = this.state;
        return <>
            <div className="printLabel-query-container mb-2">
                <div className="input-group input-group-sm w-75 me-2 mt-3">
                    <span className="input-group-text">標籤機</span>
                    <select className="form-select" value={this.state.printerIP} onChange={evt => this.setState({ printerIP: evt.target.value })}>
                        <option value={''}>---請選擇---</option>
                        {this.props.printers.map((row, index) => {
                            return <option key={index} value={row.PRINTER_IP}>{row.PRINTER_NAME}</option>
                        })}
                    </select>
                </div>
                <div className="input-group input-group-sm me-2 mt-3">
                    <button type="button" className="btn btn-primary me-2" onClick={this.handleLonoPrint} disabled={isLoading}>儲位QR Code列印</button>
                    <button type="button" className="btn btn-primary me-2" onClick={this.handleBagPrint} disabled={isLoading}>殘包QR Code列印</button>
                </div>
                {(1 === printLabelType) &&
                    <div className="input-group input-group-sm w-75 me-2 mt-3">
                        <span className="print-Lono-label">儲位QR Code列印</span>
                        <div className="input-group me-2 mt-3">
                            <span className="input-group-text">列數</span>
                            <select className="form-control form-select form-select-sm"
                                data-field="lonoRow"
                                value={this.state.lonoRow}
                                onChange={this.handleChange}>
                                {this.state.selectRow.map((row) => {
                                    return <option key={row} value={row}>{row}</option>
                                })}
                            </select>
                            <span className="input-group-text">位數</span>
                            <select className="form-control form-select form-select-sm"
                                data-field="lonoCount"
                                value={this.state.lonoCount}
                                onChange={this.handleChange}>
                                {this.state.selectCount.map((element) => {
                                    return <option key={element} value={element}>{element}</option>
                                })}
                            </select>
                        </div>
                        <div className="input-group me-2 mt-3">
                            <span className="input-group-text">層數</span>
                            <select className="form-control form-select form-select-sm"
                                data-field="lonoLayer"
                                value={this.state.lonoLayer}
                                onChange={this.handleChange}
                                disabled={true}>
                                {this.state.selectLayer.map((row) => {
                                    return <option key={row} value={row}>{row}</option>
                                })}
                            </select>
                            <button type="button" className="btn btn-primary" onClick={this.handleLonoConfirm} disabled={isLoading}>送出</button>
                        </div>
                        <div className="input-group me-2 mt-3">格位標籤一次列印四張，層數會自行帶入</div>
                    </div>}
                {(2 === printLabelType) ?
                    <div className="input-group input-group-sm w-75 me-2 mt-3">
                        <span className="print-Lono-label">殘包QR Code列印</span>
                        <div className="input-group me-2 mt-3">
                            <span className="input-group-text">成品簡碼</span>
                            <input type="text"
                                className="form-control form-control-sm"
                                value={this.state.bagPRD_PC}
                                onChange={evt => this.setState({ bagPRD_PC: evt.target.value })} />
                        </div>
                        <div className="input-group me-2 mt-3">
                            <span className="input-group-text">成品批號</span>
                            <input type="text"
                                className="form-control form-control-sm"
                                value={this.state.bagLOT_NO}
                                onChange={evt => this.setState({ bagLOT_NO: evt.target.value })} />
                        </div>
                        <div className="input-group me-2 mt-3">
                            <span className="input-group-text">包裝性質</span>
                            <select className="form-select" value={this.state.bagProperty} onChange={evt => this.setState({ bagProperty: evt.target.value })}>
                                <option value={''}>---請選擇---</option>
                                {this.props.materials.map((rows, index) => {
                                    return <option key={index} value={rows.MATERIAL_ID}>{rows.MATERIAL_NAME}</option>
                                })}
                            </select>
                        </div>
                        <div className="input-group me-2 mt-3">
                            <span className="input-group-text">殘包餘重</span>
                            <input type="text"
                                className="form-control form-control-sm"
                                value={this.state.bagWeight}
                                onChange={evt => this.setState({ bagWeight: evt.target.value })} />
                            <button type="button" className="btn btn-primary" onClick={this.handleBagConfirm} disabled={isLoading}>送出</button>
                        </div>
                    </div>
                    : null}
            </div>
        </>
    }
}

RemainingPrintLabel.propTypes = {
    printers: PropTypes.array,
    materials: PropTypes.array,
}

RemainingPrintLabel.defaultProps = {
    printers: [],
    materials: [],
}