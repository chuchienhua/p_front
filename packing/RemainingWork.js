import React, { Component } from "react";
import PropTypes from 'prop-types';
import RemainingInput from "./RemainingInput";  //殘包入庫
import RemainingOutput from "./RemainingOutput";  //殘包出庫
import RemainingRecord from "./RemainingRecord";  //殘包紀錄
import RemainingStock from "./RemainingStock";  //殘包庫存
import RemainingPrintLabel from "./RemainingPrintLabel"; //標籤列印
import RemainingStatus from "./RemainingStatus"; //格位盤點
import RemainingReport from "./RemainingReport"; //殘包報表
import axios from "axios";
import Utils from "../Utils";
import { toast } from "react-toastify";

export default class RemainingWork extends Component {

    constructor(props) {
        super(props);

        this.state = {
            isLoading: false,
            tabIndex: 0,  //0入庫 1出庫 2庫存 3進出記錄 4標籤列印 5格位盤點
            printers: [],
            materials: [],
            lonoStatus: [],
            isAdmin: false,
        }
    }

    getTabLinkClass = tabIndex => tabIndex === this.state.tabIndex ? 'btn btn-outline-secondary btn-sm active' : 'btn btn-outline-secondary btn-sm'

    switchTab = tabIndex => event => {
        event.nativeEvent.preventDefault();
        this.setState({ tabIndex });
        window.history.pushState({ tabIndex }, 'PBTC');
    }

    componentDidMount() {
        this.queryLono();
    }

    queryLono = () => {
        const apiUrl = Utils.generateApiUrl('/remainingBag/queryLonoStatus');
        this.queryApiCancelToken = axios.CancelToken.source();
        let data = [];

        axios.get(apiUrl, { ...Utils.pbtAxiosConfig, cancelToken: this.queryApiCancelToken.token, timeout: 10000, })
            .then(res => {
                if (!res.data.error) {
                    const result = res.data.res;
                    result.forEach(element => data.push({
                        LONO: element.LONO,
                        STATUS: element.STATUS,
                    }));
                    this.setState({ lonoStatus: data })
                } else {
                    toast.error('格位盤點更新異常');
                }
            });
    }

    render() {
        const { isLoading } = this.state;
        return <>
            <div className="remaining-query-container mb-2">
                <ul className="nav nav-pills mt-2 mb-2 d-inline-flex">
                    <li className="nav-item">
                        <a className={this.getTabLinkClass(0)} onClick={this.switchTab(0)} href="#work" disabled={isLoading}>殘包入庫</a>
                    </li>
                    <li className="nav-item">
                        <a className={this.getTabLinkClass(1)} onClick={this.switchTab(1)} href="#work" disabled={isLoading}>殘包出庫</a>
                    </li>
                    <li className="nav-item">
                        <a className={this.getTabLinkClass(2)} onClick={this.switchTab(2)} href="#work" disabled={isLoading}>殘包庫存</a>
                    </li>
                    <li className="nav-item">
                        <a className={this.getTabLinkClass(3)} onClick={this.switchTab(3)} href="#work" disabled={isLoading}>殘包進出紀錄</a>
                    </li>
                    <li className="nav-item">
                        <a className={this.getTabLinkClass(4)} onClick={this.switchTab(4)} href="#work" disabled={isLoading}>標籤列印</a>
                    </li>
                    <li className="nav-item">
                        <a className={this.getTabLinkClass(5)} onClick={this.switchTab(5)} href="#work" disabled={isLoading}>格位盤點</a>
                    </li>
                    <li className="nav-item">
                        <a className={this.getTabLinkClass(6)} onClick={this.switchTab(6)} href="#work" disabled={isLoading}>殘包管理報表</a>
                    </li>
                </ul>
            </div>
            <div className={0 === this.state.tabIndex ? 'd-flex flex-column flex-grow-1 flex-shrink-1' : 'd-none'}>
                <RemainingInput />
            </div>
            <div className={1 === this.state.tabIndex ? 'd-flex flex-column flex-grow-1 flex-shrink-1' : 'd-none'}>
                <RemainingOutput
                    isAdmin={this.props.isAdmin} />
            </div>
            <div className={2 === this.state.tabIndex ? 'd-flex flex-column flex-grow-1 flex-shrink-1' : 'd-none'}>
                <RemainingStock
                    isAdmin={this.props.isAdmin} />
            </div>
            <div className={3 === this.state.tabIndex ? 'd-flex flex-column flex-grow-1 flex-shrink-1' : 'd-none'}>
                <RemainingRecord />
            </div>
            <div className={4 === this.state.tabIndex ? 'd-flex flex-column flex-grow-1 flex-shrink-1' : 'd-none'}>
                <RemainingPrintLabel
                    printers={this.props.printers}
                    materials={this.props.materials} />
            </div>
            <div className={5 === this.state.tabIndex ? 'd-flex flex-column flex-grow-1 flex-shrink-1' : 'd-none'}>
                <RemainingStatus
                    isAdmin={this.props.isAdmin}
                    lonoStatus={this.state.lonoStatus} />
            </div>
            <div className={6 === this.state.tabIndex ? 'd-flex flex-column flex-grow-1 flex-shrink-1' : 'd-none'}>
                <RemainingReport
                    isAdmin={this.props.isAdmin}
                    lonoStatus={this.state.lonoStatus} />
            </div>
        </>;
    }
}

RemainingWork.protoTypes = {
    isAdmin: PropTypes.bool,
    printers: PropTypes.array,
    materials: PropTypes.array,
};

RemainingWork.defaultProps = {
    isAdmin: false,
    printers: [],
    materials: [],
};