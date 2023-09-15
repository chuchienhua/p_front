import React, { Component } from "react";
import Swal from "sweetalert2";
import { toast } from 'react-toastify';
import Utlis from '../Utils';
import axios from "axios";

export default class RemainingInput extends Component {

    constructor(props) {
        super(props);

        this.state = {
            isLoading: false,
            scanedLONO: false,  //格位標籤
            scanedBag: false,  //殘包標籤
            LONO: '',  //儲位
            OPNO: '',
            PRD_PC: '',
            LOT_NO: '',
            WEIGHT: 0,
        }
        this.insertApiCancelToken = null;
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
                this.setState({ LONO: result.value, scanedLONO: true });
            }
        }).catch(err => alert('QRCode Error ', err));
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
                this.setState({ OPNO: result.value, scanedBag: true });
            }
        }).catch(err => alert('QRCode Error ', err));
    }

    //入庫記錄
    queryBagInfo = (OPNO, LONO) => {
        this.setState({ isLoading: true });

        const apiUrl = Utlis.generateApiUrl('/remainingBag/getBagData');
        const apiData = { OPNO };
        this.insertApiCancelToken = axios.CancelToken.source();
        axios.post(apiUrl, apiData, {
            ...Utlis.pbtAxiosConfig,
            cancelToken: this.insertApiCancelToken.token,
            timeout: 10000,
        }).then(res => {
            if (!res.data.error) {
                const result = res.data.res;
                let bagArray = [];
                result.forEach(element => bagArray.push({
                    PRD_PC: element.PRD_PC,
                    LOT_NO: element.LOT_NO,
                    WEIGHT: element.WEIGHT,
                    OPNO: element.OPNO,
                    LONO: element.LONO,
                }));
                this.setState({ isLoading: false });
                const updateUrl = Utlis.generateApiUrl('/remainingBag/updateBagInfo');
                const prd_pc = bagArray[0].PRD_PC;
                const lot_no = bagArray[0].LOT_NO;
                const weight = bagArray[0].WEIGHT;
                const doingType = 'IN';
                const updateData = { prd_pc, lot_no, weight, LONO, OPNO, doingType };
                axios.post(updateUrl, updateData, {
                    ...Utlis.pbtAxiosConfig,
                    cancelToken: this.insertApiCancelToken.token,
                    timeout: 10000,
                }).catch(err => alert('updatebaginfo error', err))
            }
        });
    }

    //殘包入庫
    bagInStorage = () => {
        this.setState({ isLoading: true });

        const { OPNO, LONO } = this.state;
        const apiUrl = Utlis.generateApiUrl('/remainingBag/bagInStorage');
        const apiData = { OPNO, LONO };
        this.insertApiCancelToken = axios.CancelToken.source();
        return axios.post(apiUrl, apiData, {
            ...Utlis.pbtAxiosConfig,
            cancelToken: this.insertApiCancelToken.token,
            timeout: 10000,
        }).then(res => {
            if (!res.data.error) {
                toast.success('殘包入庫成功');
                this.queryBagInfo(OPNO, LONO);
            } else {
                toast.error(`殘包入庫失敗，${res.data.error}`);
            }
        }).catch(err => {
            if (!axios.isCancel(err)) {
                console.error(err);
                toast.error(`殘包入庫失敗。\n錯誤訊息: ${err.toString()}`);
            }
        }).then(() => {
            this.setState({ isLoading: false, scanedBag: false, scanedLONO: false });
        });
    }

    render() {
        const { isLoading, scanedBag, scanedLONO } = this.state;
        return <>
            <div className="remaining-query-container mb-2">
                <div className="input-group input-group-sm me-2 mt-3">
                    <span className="input-group-text">欲存放的格位</span>
                    <input type="text"
                        className="form-control"
                        value={this.state.LONO}
                        readOnly={true} />
                    <button type="button"
                        className="btn btn-success me-2"
                        onClick={this.scanStoreQRCode} disabled={isLoading}><span className="icon bi-qr-code-scan"></span> 儲位QR Code</button>
                </div>
                <div className="input-group input-group-sm me-2 mt-3">
                    <span className="input-group-text">殘包標籤編號</span>
                    <input type="text"
                        className="form-control"
                        value={this.state.OPNO}
                        readOnly={true} />
                    <button type="button"
                        className="btn btn-success me-2"
                        onClick={this.scanBagQRCode} disabled={isLoading}><span className="icon bi-qr-code-scan"></span> 殘包QR Code</button>
                </div>
                {(scanedBag && scanedLONO) ?
                    <div className="input-group input-group-sm me-2 mt-3">
                        <button type="button" className="btn btn-success me-2" onClick={this.bagInStorage} disabled={isLoading}>確認送出</button>
                    </div>
                    : null}
            </div>
        </>
    }
}
