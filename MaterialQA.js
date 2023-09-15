import React, { Component } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import Utils from './Utils';

export default class MaterialQA extends Component {

    constructor(props) {
        super(props);

        this.state = {
            isLoading: false,
            qa: '',
            remain: 0,
        };

        this.MaterialQA = React.createRef();
        this.queryApiCancelToken = null;
    }

    query = qrCodeValue => {
        const decodeQR = Utils.decodeMaterialQrCode(qrCodeValue);
        if (!decodeQR.error) {
            const apiURL = Utils.generateApiUrl('/materialBatchDetail', [decodeQR.material, decodeQR.lotNo, decodeQR.batchNo]);
            this.queryApiCancelToken = axios.CancelToken.source();
            axios.get(apiURL, {
                ...Utils.pbtAxiosConfig,
                cancelToken: this.queryApiCancelToken.token,
            }).then(res => {
                if (!res.data.error) {
                    this.setState({ qa: res.data.qa, remain: res.data.remain });
                } else {
                    toast.error(`查詢失敗，${res.data.error}`);
                }
            }).catch(err => {
                console.error(err);
                toast.error('查詢失敗', err);
            }).finally(() => this.setState({ isLoading: false }));
        } else {
            toast.error('QR Code 讀取異常');
        }
    }

    //掃原料簡碼查詢品檢結果
    scanQRCode = () => {
        let timerInterval;
        Swal.fire({
            title: '請於10秒內掃描QR Code!',
            input: 'text',
            inputPlaceholder: 'QRCode',
            showConfirmButton: false,
            timer: 10000,
            timerProgressBar: true,
            allowOutsideClick: false,
            willClose: () => {
                clearInterval(timerInterval);
            }
        }).then((result) => {
            /* 時間到以後 */
            if (result.dismiss === Swal.DismissReason.timer) {
                toast.error('已過期，請再掃碼一次');
            } else {
                this.query(result.value);
            }
        }).catch(err => alert(err))
    }

    render() {
        return <div className="accordion mt-2" id="accordionQA">
            <div className="accordion-item">
                <h2 className="accordion-header" id="headingQA">
                    <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseQA" aria-expanded="true" aria-controls="collapseQA">
                        原料棧板品檢查詢
                    </button>
                </h2>
                <div id="collapseQA" className="accordion-collapse collapse" aria-labelledby="headingOne" data-bs-parent="#accordionQA">
                    <div className="accordion-body">
                        <div className="input-group input-group-sm mt-2">
                            <span className="input-group-text">品檢結果</span>
                            <input type="text" className="form-control" value={this.state.qa} disabled />

                            <span className="input-group-text">剩餘包數</span>
                            <input type="text" className="form-control" value={this.state.remain} disabled />
                            <button type="button" className="btn btn-warning" onClick={this.scanQRCode}><span className="icon bi-qr-code-scan"></span> 掃碼</button>
                        </div>
                    </div>
                </div>
            </div>
        </div >;
    }
}