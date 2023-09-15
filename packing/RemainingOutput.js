import React, { Component } from "react";
import Swal from "sweetalert2";
import { HotTable } from '@handsontable/react';
import 'handsontable/languages/zh-TW.js';
import { toast } from 'react-toastify';
import Utlis from '../Utils';
import axios from "axios";
import PropTypes from 'prop-types';

function manualOutStorage() {
    const callback = res => {
        if (res.isConfirmed) {
            const LONO = res.value.lono;
            const reason = res.value.reason;
            if ('1' !== reason && '2' !== reason && '3' !== reason ){
                toast.error('用途欄位請依照提示填寫!');
                return;
            }
            if ('' === LONO || '' === reason) {
                toast.error(`${('' === LONO) ? '格位' : '用途'}欄位為空白`);
            } else {
                const apiUrl = Utlis.generateApiUrl('/remainingBag/queryLonoInfo');
                const apiData = { LONO };
                axios.post(apiUrl, apiData, { ...Utlis.pbtAxiosConfig })
                    .then(res => {
                        if (!res.data.error) {
                            const queryResult = res.data.res;
                            if (0 === queryResult.length) {
                                toast.error(`查詢格位資料失敗，${res.data.error}`);
                            } else {
                                const prd_pc = queryResult[0].PRD_PC;
                                const lot_no = queryResult[0].LOT_NO;
                                const OPNO = queryResult[0].OPNO;
                                const weight = queryResult[0].WEIGHT;
                                const apiUrl = Utlis.generateApiUrl('/remainingBag/bagOutStorage');
                                const apiData = { LONO, OPNO, reason };
                                axios.post(apiUrl, apiData, { ...Utlis.pbtAxiosConfig })
                                    .then(response => {
                                        if (!response.data.error) {
                                            const updateUrl = Utlis.generateApiUrl('/remainingBag/updateBagInfo');
                                            const doingType = 'manualOut';
                                            const updateData = { prd_pc, lot_no, weight, LONO, OPNO, doingType, reason };
                                            axios.post(updateUrl, updateData, { ...Utlis.pbtAxiosConfig })
                                                .catch(err => alert('updatebaginfo error', err))
                                            toast.success('殘包手動出庫成功');
                                        } else {
                                            toast.error('殘包手動出庫失敗');
                                        }
                                    })
                            }
                        }
                    })
            }
        }
    }

    Swal.fire({
        title: '手動出庫',
        html: `
        <div style="font-size: 18px">
            <p style="margin-top: 10px;">格位</p>
            <input type="text" id="input-lono" style="width: 80%; height: 30px" />
            <p style="margin-top: 10px;">出庫用途 <br />*請輸入1(押出回摻)、2(包裝回摻)、3(重工去化)</p>
            <input type="text" id="input-reason" style="width: 80%; height: 30px" />
        </div>`,
        preConfirm: () => {
            let data = {
                lono: document.getElementById('input-lono') ? document.getElementById('input-lono').value : null,
                reason: document.getElementById('input-reason') ? document.getElementById('input-reason').value : null,
            };
            return data;
        },
        position: 'top',
        showCancelButton: true,
    }).then(callback).catch(error => {
        Swal.showValidationMessage(`Request failed: ${error}`);
    })
}

export default class RemainingOutput extends Component {

    constructor(props) {
        super(props);

        this.state = {
            isLoading: false,
            isScan: false,
            isConfirm: false,
            isSelected: false,
            LONO: '',  //格位位置
            bagID: 0,  //殘包標籤編號
            lonoData: [],  //儲位資料
            bagData: [],  //殘包資料
            outStorageType: 0, //出庫用途 1押出回摻 2包裝回摻 3重工去化
            isAdmain: false,
            colHeaders: ['規格', '批號', '重量'],
            columns: [
                { data: 'PRD_PC', type: 'text', width: 90, className: 'htCenter', readOnly: true },
                { data: 'LOT_NO', type: 'text', width: 100, className: 'htCenter', readOnly: true },
                { data: 'WEIGHT', type: 'numeric', width: 50, className: 'htCenter', readOnly: true },
            ],
        }
        this.queryApiCancelToken = null;
        this.hotTableComponent = React.createRef();
    }

    //掃描儲位QR Code
    scanStoreQRCode = () => {
        let timerInterval;
        Swal.fire({
            title: '請於10秒內掃描格位QR Code!',
            input: 'text',
            inputPlaceholder: 'QRCode',
            showCancelButton: true,
            showConfirmButton: false,
            timer: 10000,
            timerProgressBar: true,
            allowOutsideClick: false,
            willClose: () => {
                clearInterval(timerInterval);
            }
        }).then((result) => {
            if (Swal.DismissReason.timer === result.dismiss) {
                toast.error('已過期，請重新掃碼');
            } else {
                this.setState({ LONO: result.value, isScan: true });
                this.queryLONOData(result.value);
            }
        }).catch(err => alert('QRCode Error ', err));
    }

    //查詢格位資料
    queryLONOData = (LONO) => {
        this.setState({ isLoading: true });

        const { bagData } = this.state;
        const apiUrl = Utlis.generateApiUrl('/remainingBag/queryLonoInfo');
        const apiData = { LONO };
        this.queryApiCancelToken = axios.CancelToken.source();
        return axios.post(apiUrl, apiData, {
            ...Utlis.pbtAxiosConfig,
            cancelToken: this.queryApiCancelToken.token,
            timeout: 10000,
        }).then(res => {
            if (!res.data.error) {
                const bagResult = res.data.res;
                if (0 === bagResult.length) {
                    toast.error(`查詢格位資料失敗，${res.data.error}`);
                    this.setState({ isLoading: false, isScan: false });
                } else {
                    bagResult.forEach(element => bagData.push({
                        PRD_PC: element.PRD_PC,
                        LOT_NO: element.LOT_NO,
                        WEIGHT: element.WEIGHT,
                        OPNO: element.OPNO,
                        LONO: element.LONO,
                    }));
                }
            } else {
                toast.error(`查詢格位資料失敗，${res.data.error}`);
            }
        }).catch(err => {
            if (!axios.isCancel()) {
                console.error(err);
                toast.error(`查詢格位資料失敗，${err}`);
            }
        }).then(() => {
            this.setState({ isLoading: false });
        })
    }

    //掃描殘包QR Code
    scanBagQRCode = () => {
        let timerInterval;
        Swal.fire({
            title: '請於10秒內掃描殘包QR Code!',
            input: 'text',
            inputPlaceholder: 'QRCode',
            showCancelButton: true,
            showConfirmButton: false,
            timer: 10000,
            timerProgressBar: true,
            allowOutsideClick: false,
            willClose: () => {
                clearInterval(timerInterval);
            }
        }).then((result) => {
            if (Swal.DismissReason.timer === result.dismiss) {
                toast.error('已過期，請重新掃碼');
            } else {
                this.setState({ bagID: result.value });
                this.confirmCorrect(result.value);
            }
        }).catch(err => alert('QRCode Error ', err));
    }

    //格位殘包資訊確認
    handleConfirm = () => {
        this.setState({ isConfirm: true });
    }

    //確認資訊
    confirmCorrect = OPNO => {
        const { LONO, bagData } = this.state;
        const reason = this.state.outStorageType;

        const apiUrl = Utlis.generateApiUrl('/remainingBag/bagOutStorage');
        const apiData = { LONO, OPNO: OPNO, reason };
        this.queryApiCancelToken = axios.CancelToken.source();
        return axios.post(apiUrl, apiData, {
            ...Utlis.pbtAxiosConfig,
            cancelToken: this.queryApiCancelToken.token,
            timeout: 10000,
        }).then(res => {
            if (!res.data.error) {
                const updateUrl = Utlis.generateApiUrl('/remainingBag/updateBagInfo');
                const prd_pc = bagData[0].PRD_PC;
                const lot_no = bagData[0].LOT_NO;
                const weight = bagData[0].WEIGHT;
                const OPNO = bagData[0].OPNO;
                const doingType = 'OUT';
                const updateData = { prd_pc, lot_no, weight, LONO, OPNO, doingType, reason };
                axios.post(updateUrl, updateData, {
                    ...Utlis.pbtAxiosConfig,
                    cancelToken: this.queryApiCancelToken.token,
                    timeout: 10000,
                }).catch(err => alert('updatebaginfo error', err))
                toast.success('殘包出庫成功');
                this.setState({
                    isConfirm: false,
                    isScan: false,
                    LONO: '',
                    bagID: 0,
                    lonoData: [],
                    bagData: []
                });
            } else {
                toast.error(`殘包出庫失敗，${res.data.error}`);
            }
        });
    }

    switchOutStorageType = outStorageType => event => {
        event.nativeEvent.preventDefault();
        this.setState({ outStorageType, isSelected: true });
    }

    getTablinkClass = outStorageType => outStorageType === this.state.outStorageType ? 'btn btn-outline-secondary btn-sm active' : 'btn btn-outline-secondary btn-sm'

    render() {
        const { isLoading, isScan, isConfirm, isSelected } = this.state;
        const { isAdmin } = this.props;
        return <>
            <div className="remaining-query-container mb-2">
                {(isAdmin) &&
                    <div className="input-group input-group-sm me-2">
                        <button type="button" className="btn btn-success me-2" onClick={() => {
                            manualOutStorage()
                        }}>手動出庫</button>
                    </div>
                }
                <div className="input-group input-group-sm me-2 mt-3">
                    <span className="input-group-text">欲取出的格位</span>
                    <input type="text"
                        className="form-control"
                        readOnly={true}
                        value={this.state.LONO} />
                    <button type="button"
                        className="btn btn-success me-2"
                        onClick={this.scanStoreQRCode} disabled={isLoading}><span className="icon bi-qr-code-scan"></span> 儲位QR Code</button>
                </div>
                {(isScan) ?
                    <div className="remaining-handsontable-container mb-2 mt-4">
                        <HotTable ref={this.hotTableComponent}
                            licenseKey="non-commercial-and-evaluation"
                            columns={this.state.columns}
                            colHeaders={this.state.colHeaders}
                            data={this.state.bagData}
                            language="zh-TW" />
                        <button type="button" className="btn btn-success me-2" onClick={this.handleConfirm} disabled={isLoading}>確認無誤</button>
                    </div>
                    : null}
                {(isConfirm && isScan) ?
                    <div className="input-group input-group-sm me-2 mt-3">
                        <button type="button" className={this.getTablinkClass(1)} onClick={this.switchOutStorageType(1)}>押出回摻</button>
                        <button type="button" className={this.getTablinkClass(2)} onClick={this.switchOutStorageType(2)}>包裝回摻</button>
                        <button type="button" className={this.getTablinkClass(3)} onClick={this.switchOutStorageType(3)}>重工去化</button>
                    </div>
                    : null}
                {(isConfirm && isScan && isSelected) ?
                    <div className="input-group input-group-sm me-2 mt-3">
                        <span className="input-group-text">殘包標籤編號</span>
                        <input type="text"
                            className="form-control"
                            readOnly={true}
                            value={this.state.bagID} />
                        <button type="button"
                            className="btn btn-success me-2"
                            onClick={this.scanBagQRCode} disabled={isLoading}><span className="icon bi-qr-code-scan"></span> 殘包QR Code</button>
                    </div>
                    : null}
            </div>
        </>;
    }
}

RemainingOutput.protoTypes = {
    isAdmin: PropTypes.bool,
}

RemainingOutput.defaultProps = {
    isAdmin: false,
}