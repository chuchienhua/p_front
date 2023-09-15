import React, { Component } from "react";
import Utlis from "../Utils";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import './RemainingStatus.css';
import axios from "axios";
import moment from "moment";
import PropTypes from 'prop-types';

const chineseNum = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];
const currentRow = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

//查詢格位存放物
function queryLonoInfo(LONO) {
    const apiUrl = Utlis.generateApiUrl('/remainingBag/queryLonoInfo');
    const apiData = { LONO };
    axios.post(apiUrl, apiData, { ...Utlis.pbtAxiosConfig })
        .then(res => {
            if (!res.data.error) {
                const info = res.data.res;
                if (0 < info.length) {
                    Swal.fire({
                        title: `格位${LONO}目前存放物`,
                        html: `
                        <div style="font-size: 18px">
                            <p style="margin-top: 10px;">規格</p>
                            <input type="text" id="input-proudctNo" style="width: 80%; height: 30px" readOnly={true} value=${info[0].PRD_PC} />
                            <p style="margin-top: 10px;">批號</p>
                            <input type="text" id="input-LOT_No" style="width: 80%; height: 30px" readOnly={true} value=${info[0].LOT_NO} />
                            <p style="margin-top: 10px;">重量</p>
                            <input type="text" id="input-weight" style="width: 80%; height: 30px" readOnly={true} value=${info[0].WEIGHT} />
                            <p style="margin-top: 10px;">入庫日期</p>
                            <input type="text" id="input-DATE" style="width: 80%; height: 30px" readOnly={true} value=${moment(info[0].INV_DATE).format('YYYY-MM-DD-HH:mm:ss')} />
                        </div> ` ,
                        position: 'top',
                        timer: 10000,
                        showConfirmButton: false,
                        showCancelButton: false,
                    });
                } else {
                    toast.error('格位存放物查詢錯誤');
                }

            } else {
                toast.error('格位存放物查詢錯誤');
            }
        }).catch(err => {
            if (!axios.isCancel(err)) {
                console.error(err);
            }
        });
}

//修改格位存放物資訊
function updateLonoInfo(LONO) {
    const apiUrl = Utlis.generateApiUrl('/remainingBag/queryLonoInfo');
    const apiData = { LONO };

    axios.post(apiUrl, apiData, { ...Utlis.pbtAxiosConfig })
        .then(res => {
            const info = res.data.res;
            if (0 < info.length) {
                const callback = response => {
                    if (response.isConfirmed) {
                        const newProductNo = response.value.productNo;
                        const newLotNo = response.value.lotNo;
                        const newWeight = response.value.weight;
                        const opno = info[0].OPNO;
                        const oldProductNo = info[0].PRD_PC;
                        const oldLotNo = info[0].LOT_NO;
                        const oldWeight = info[0].WEIGHT;
                        if ('' === newProductNo || '' === newLotNo || '' === newWeight) {
                            /*toast.error('規格、批號和重量欄位不得為空')*/
                            deleteLonoInfo(opno, LONO, oldProductNo, oldLotNo, oldWeight);
                        } else {
                            const apiURL = Utlis.generateApiUrl('/remainingBag/updateLonoInfo');
                            const apiData = { newProductNo, newLotNo, newWeight, opno, LONO };
                            axios.post(apiURL, apiData, { ...Utlis.pbtAxiosConfig })
                                .then(res => {
                                    if ('' === res.data.error) {
                                        toast.success('更新成功!');
                                    } else if ('1' === res.data.error) {
                                        toast.error('更新失敗!');
                                    } else if ('2' === res.data.error) {
                                        toast.error('規格或批號與主排程不符!');
                                    }
                                }
                                ).catch(err => console.error(err));
                        }
                    }
                }

                Swal.fire({
                    title: `修改格位${LONO}存放物資訊`,
                    html: `
                    <div style="font-size: 18px>
                        <p style="margin-top: 10px;">規格</p>
                        <input type="text" id="input-proudctNo" style="width: 80%; height: 30px" value=${info[0].PRD_PC} />
                        <p style="margin-top: 10px;">批號</p>
                        <input type="text" id="input-lotNo" style="width: 80%; height: 30px" value=${info[0].LOT_NO} />
                        <p style="margin-top: 10px;">重量</p>
                        <input type="text" id="input-weight" style="width: 80%; height: 30px" value=${info[0].WEIGHT} />
                        <p style="margin-top: 10px;">入庫日期</p>
                        <input type="text" id="input-date" style="width: 80%; height: 30px" readOnly={true} value=${moment(info[0].INV_DATE).format('YYYY-MM-DD-HH:mm:ss')} />
                    </div> `,
                    preConfirm: () => {
                        let data = {
                            productNo: document.getElementById('input-proudctNo') ? document.getElementById('input-proudctNo').value : info[0].PRD_PC,
                            lotNo: document.getElementById('input-lotNo') ? document.getElementById('input-lotNo').value : info[0].LOT_NO,
                            weight: document.getElementById('input-weight') ? document.getElementById('input-weight').value : info[0].WEIGHT,
                            date: document.getElementById('input-date') ? document.getElementById('input-date').value : info[0].INV_DATE,
                        };
                        return data;
                    },
                    position: 'top',
                    showCancelButton: true,
                }).then(callback).catch(error => {
                    Swal.showValidationMessage(`Request failed: ${error}`);
                })
            }
        })
}

//手動刪除格位資料，並自動出庫，需加備註
function deleteLonoInfo(OPNO, LONO, prd_pc, lot_no, weight) {

    const callback = response => {
        if (response.isConfirmed) {
            const doingType = 'manualDelete';
            const apiURL = Utlis.generateApiUrl('/remainingBag/deleteLonoInfo');
            const apiData = { prd_pc, lot_no, weight, LONO, OPNO, doingType };

            axios.post(apiURL, apiData, { ...Utlis.pbtAxiosConfig })
                .then(res => {
                    if ('' === res.data.error) {
                        /*const updateUrl = Utlis.generateApiUrl('/remainingBag/updateBagInfo');
                        const doingType = 'manualDelete';
                        const updateData = { prd_pc, lot_no, weight, LONO, OPNO, doingType };
                        axios.post(updateUrl, updateData, { ...Utlis.pbtAxiosConfig })
                            .catch(err => alert('updateBagInfo error', err))*/
                        toast.success('格位資料刪除成功!');
                    } else {
                        toast.error('格位資料刪除失敗!');
                    }
                }).catch(err => console.error(err));
        }
    }

    Swal.fire({
        title: `請確認是否要刪除格位${LONO}資料`,
        position: 'top',
        showCancelButton: true,
    }).then(callback).catch(error => {
        Swal.showValidationMessage(`Request failed: ${error}`);
    })
}

export default class RemainingStatus extends Component {

    constructor(props) {
        super(props);

        this.state = {
            isLoading: false,
            lonoStatus: [],
            lonoData: [],
            usingLono: [],
            usingRate: 0,
            lonoInfo: {},
            tabIndex: 0,
            isAdmin: false,
        }
        this.queryApiCancelToken = null;
    }

    //初始化
    componentDidMount() {
        this.queryLono();
        this.interval = setInterval(this.updatePage, 3600000);  //60分鐘更新一次
    }

    //清理
    componentWillUnmount() {
        clearInterval(this.interval);
    }

    //進入畫面前預先更新表格狀態
    componentDidUpdate(prevProps) {
        if (this.props.lonoStatus !== prevProps.lonoStatus) {
            this.updateTable(this.props.lonoStatus);
        }
    }

    //定時更新
    updatePage = () => {
        this.queryLono();
        this.updateTable(this.state.lonoData);
    }

    updateTable = (data) => {
        let usingData = [];
        data.forEach(element => {
            if ("0" !== element.STATUS) {
                usingData.push(element.LONO);
            }
        })
        this.setState({ usingLono: usingData, usingRate: parseFloat(100 * usingData.length / 240).toFixed(2) });
    }

    //查詢格位
    queryLono = () => {
        const apiUrl = Utlis.generateApiUrl('/remainingBag/queryLonoStatus');
        this.queryApiCancelToken = axios.CancelToken.source();
        let data = [];
        const lonoInfo = {};

        axios.get(apiUrl, { ...Utlis.pbtAxiosConfig, cancelToken: this.queryApiCancelToken.token, timeout: 10000, })
            .then(res => {
                if (!res.data.error) {
                    const result = res.data.res;
                    result.forEach(element => {
                        data.push({
                            LONO: element.LONO,
                            STATUS: element.STATUS,
                        });
                        lonoInfo[element.LONO] = element;
                    });
                    this.setState({ lonoData: data, lonoInfo: lonoInfo });
                } else {
                    toast.error('格位盤點更新異常');
                }
            });
    }

    getTabLinkClass = tabIndex => tabIndex === this.state.tabIndex ? 'btn btn-outline-secondary btn-sm active' : 'btn btn-outline-secondary btn-sm'

    switchTab = tabIndex => event => {
        event.nativeEvent.preventDefault();
        this.setState({ tabIndex });
        window.history.pushState({ tabIndex }, 'PBTC');
    }

    render() {
        const { usingRate, isLoading } = this.state;
        const { isAdmin } = this.props;
        return <>
            <div className="remaining-status-data mt-2">
                <span className="me-2">整體使用率:
                    &nbsp;<input type="numeric"
                        className="remaining-status-usingrate form-control max-width-6em d-inline-block"
                        value={usingRate}
                        readOnly={true} /> %
                </span>
                <ul className="nav nav-pills  mt-3 mb-3 d-inline-flex">
                    <li className="nav-item">
                        <a className={this.getTabLinkClass(0)} onClick={this.switchTab(0)} href="#work" disabled={isLoading}>全部</a>
                    </li>
                    <li className="nav-item">
                        <a className={this.getTabLinkClass(1)} onClick={this.switchTab(1)} href="#work" disabled={isLoading}>第一列</a>
                    </li>
                    <li className="nav-item">
                        <a className={this.getTabLinkClass(2)} onClick={this.switchTab(2)} href="#work" disabled={isLoading}>第二列</a>
                    </li>
                    <li className="nav-item">
                        <a className={this.getTabLinkClass(3)} onClick={this.switchTab(3)} href="#work" disabled={isLoading}>第三列</a>
                    </li>
                    <li className="nav-item">
                        <a className={this.getTabLinkClass(4)} onClick={this.switchTab(4)} href="#work" disabled={isLoading}>第四列</a>
                    </li>
                    <li className="nav-item">
                        <a className={this.getTabLinkClass(5)} onClick={this.switchTab(5)} href="#work" disabled={isLoading}>第五列</a>
                    </li>
                    <li className="nav-item">
                        <a className={this.getTabLinkClass(6)} onClick={this.switchTab(6)} href="#work" disabled={isLoading}>第六列</a>
                    </li>
                    <li className="nav-item">
                        <a className={this.getTabLinkClass(7)} onClick={this.switchTab(7)} href="#work" disabled={isLoading}>第七列</a>
                    </li>
                    <li className="nav-item">
                        <a className={this.getTabLinkClass(8)} onClick={this.switchTab(8)} href="#work" disabled={isLoading}>第八列</a>
                    </li>
                    <li className="nav-item">
                        <a className={this.getTabLinkClass(9)} onClick={this.switchTab(9)} href="#work" disabled={isLoading}>第九列</a>
                    </li>
                    <li className="nav-item">
                        <a className={this.getTabLinkClass(10)} onClick={this.switchTab(10)} href="#work" disabled={isLoading}>第十列</a>
                    </li>
                </ul>
            </div>
            <div className="remaining-status-container mt-2">
                <div className="remaining-status-table">
                    {(0 === currentRow[this.state.tabIndex] ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] : [currentRow[this.state.tabIndex]]).map((row) => {
                        return <table key={row} className="remaining-table text-start table table-bordered">
                            <thead>
                                <tr>
                                    <th>第{chineseNum[row]}列</th>
                                    <th>第一位</th>
                                    <th>第二位</th>
                                    <th>第三位</th>
                                    <th>第四位</th>
                                    <th>第五位</th>
                                    <th>第六位</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[4, 3, 2, 1].map((layer) => {
                                    return <tr key={layer}>
                                        <td className="remaining-table-layer table-primary align-middle text-center">第{chineseNum[layer]}層</td>
                                        {[1, 2, 3, 4, 5, 6].map((count) => {
                                            const lono = row.toString().padStart(2, '0') + count.toString().padStart(3, '0') + layer.toString().padStart(2, '0');
                                            return <td key={count} id={count} className="align-middle text-center">{lono}<br />
                                                {this.state.lonoInfo[lono] ? ("1" === this.state.lonoInfo[lono].STATUS)
                                                    ?
                                                    <>
                                                        <button type="button" className="btn btn-info text-nowrap" onClick={() => {
                                                            queryLonoInfo(lono);
                                                        }}>使用中</button> <br />
                                                        {isAdmin &&
                                                            <button type="button" className="btn btn-outline-info btn-sm mt-2" onClick={() => {
                                                                updateLonoInfo(lono);
                                                            }}>格位維護</button>
                                                        }
                                                    </>
                                                    :
                                                    <>
                                                        <button type="button" className="btn btn-light text-nowrap" disabled={true}>未使用</button><br />
                                                        {isAdmin &&
                                                            <button type="button" className="btn btn-light btn-sm mt-2" disabled={true} >格位維護</button>
                                                        }
                                                    </>
                                                    : null}
                                            </td>
                                        })}
                                    </tr>
                                })}
                            </tbody>
                        </table>;
                    })}
                </div>
            </div>
        </>
    }
}

RemainingStatus.protoTypes = {
    isAdmin: PropTypes.bool,
    lonoStatus: PropTypes.array,
}

RemainingStatus.defaultProps = {
    isAdmin: false,
    lonoStatus: [],
}