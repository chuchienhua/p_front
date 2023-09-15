import React, { Component } from 'react';
import axios from 'axios';
import PropTypes from 'prop-types';
import queryString from 'query-string';
import { connect } from 'react-redux';
import { toast } from 'react-toastify';
import LoadingPage from '../LoadingPage';
import PackingSchedule from './PackingSchedule';
import PackingWork from './PackingWork';
import RemainingWork from './RemainingWork';
import PackingReport from './report/PackingReport';
import Utils from '../Utils';
import './Packing.css';

class Packing extends Component {

    constructor(props) {
        super(props);

        this.state = {
            isAdmin: false,
            isLoading: true,
            tabIndex: 0, //畫面分頁: 0排程、1包裝、2報表、3殘包
            detailReportReasons: [], //包裝日報表異常原因
            foremen: [], //包裝日報表領班
            lines: [], //包裝機
            materials: [], //包裝規格
            notMeetReasons: [], //排程達成率 未達標原因
            notes: [], //備註
            pallets: [], //棧板別
            printers: [], //標籤機
            prints: [], //噴印
            prodLines: [], //生產線別
            shifts: [], //班別
            silos: [], //SILO
            weightSpecs: [], //包裝別(KG)
            selectedSchedule: null,
        };

        this.PackingScheduleComponent = React.createRef();
        this.PackingWorkComponent = React.createRef();
        this.PackingDailyReportComponent = React.createRef();
        this.queryApiCancelToken = null;
    }

    componentDidMount() {
        //網址帶入參數
        const parsed = queryString.parse(window.location.search);
        if (parsed.tab) {
            this.setState({ tabIndex: +parsed.tab });
        }

        this.init();
    }

    componentWillUnmount() {
        this.isUnmount = true;
        if (this.queryApiCancelToken) {
            this.queryApiCancelToken.cancel('componentWillUnmount');
        }
    }


    async init() {
        //權限檢查
        const routeSetting = this.props.authRoute.find(x => (this.props.path.substring(1) === x.ROUTE));
        if (routeSetting && ('1' === routeSetting.ISADMIN)) {
            this.setState({ isAdmin: true });
        }

        if (this.state.isLoading) {
            await this.getPackingOptions();
        }
    }

    getTabLinkClass = tabIndex => tabIndex === this.state.tabIndex ? 'nav-item nav-link active' : 'nav-item nav-link';

    switchTab = tabIndex => event => {
        event.nativeEvent.preventDefault();
        this.setState({ tabIndex });
        window.history.pushState({ tabIndex }, 'PBTC');
    }

    getPackingOptions = () => {
        const apiUrl = Utils.generateApiUrl('/packing/options');
        this.queryApiCancelToken = axios.CancelToken.source();
        return axios.get(apiUrl, {
            ...Utils.pbtAxiosConfig,
            cancelToken: this.queryApiCancelToken.token,
            timeout: 10000,
        }).then(res => {
            if (!res.data.error) {
                const newState = {
                    isLoading: false,
                };
                const fields = [
                    'detailReportReasons', 'foremen',
                    'lines', 'materials', 'notMeetReasons',
                    'notes', 'pallets', 'printers',
                    'prints', 'prodLines', 'shifts', 'silos', 'weightSpecs',
                ];
                fields.forEach(key => {
                    if (Array.isArray(res.data[key])) {
                        newState[key] = res.data[key];
                    }
                });
                this.setState(newState);
            } else {
                toast.error(`包裝作業基本資料載入失敗，${res.data.error}`);
            }
        }).catch(err => {
            //除了api取消以外都要顯示錯誤訊息
            if (!axios.isCancel(err)) {
                console.error(err);
                toast.error(`包裝作業基本資料載入失敗，畫面將在10秒後重新載入。\n錯誤訊息: ${err.toString()}`);
                setTimeout(() => window.location.reload(), 10000);
            }
        });
    }

    //查詢包裝項次資料
    getPackingDetail = schedule => {
        const apiUrl = Utils.generateApiUrl('/packing/getPackingDetail');
        const apiData = {
            packingSeq: schedule.PACKING_SEQ,
        };
        this.queryApiCancelToken = axios.CancelToken.source();
        return axios.post(apiUrl, apiData, {
            ...Utils.pbtAxiosConfig,
            cancelToken: this.queryApiCancelToken.token,
            timeout: 10000,
        }).then(res => {
            if (!res.data.error) {
                return res.data;
            } else {
                toast.error(`包裝資料查詢失敗，${res.data.error}`);
            }
        }).catch(err => {
            //除了api取消以外都要顯示錯誤訊息
            if (!axios.isCancel(err)) {
                console.error(err);
                toast.error(`包裝資料查詢失敗。\n錯誤訊息: ${err.toString()}`);
            }
        });
    };

    //設定要包裝的排程資料
    setSelectedSchedule = async data => {
        const detailData = await this.getPackingDetail(data);
        if (detailData) {
            this.setState({
                selectedSchedule: detailData.schedule || null,
                packingDetails: detailData.details,
                prevDetail: detailData.prevDetail,
                tabIndex: data ? 1 : this.state.tabIndex, //有資料時才切換到包裝作業
            });
        }
    }

    //更新包裝排程
    refreshPackingSchedule = () => {
        if (this.PackingScheduleComponent && this.PackingScheduleComponent.current) {
            this.PackingScheduleComponent.current.queryPackingSchedule();
        }
    }

    render() {
        const { isLoading } = this.state;
        if (isLoading) {
            return <LoadingPage />;
        }
        return <div className="col ms-2 me-2 packing-container">
            <ul className="nav nav-pills mt-2 mb-2 d-inline-flex">
                <li className="nav-item">
                    <a className={this.getTabLinkClass(0)} href="#schedule" onClick={this.switchTab(0)}>包裝排程</a>
                </li>
                <li className="nav-item">
                    <a className={this.getTabLinkClass(1) + (this.state.selectedSchedule ? '' : ' disabled')} href="#work" onClick={this.switchTab(1)}>包裝作業</a>
                </li>
                <li className="nav-item">
                    <a className={this.getTabLinkClass(2)} href="#work" onClick={this.switchTab(2)}>包裝報表</a>
                </li>
                <li className="nav-item">
                    <a className={this.getTabLinkClass(3)} href="#work" onClick={this.switchTab(3)}>殘包作業</a>
                </li>
            </ul>

            <div className={0 === this.state.tabIndex ? 'd-flex flex-column flex-grow-1 flex-shrink-1' : 'd-none'}>
                <PackingSchedule
                    ref={this.PackingScheduleComponent}
                    isAdmin={this.state.isAdmin}
                    lines={this.state.lines}
                    materials={this.state.materials}
                    notes={this.state.notes}
                    pallets={this.state.pallets}
                    printers={this.state.printers}
                    prints={this.state.prints}
                    prodLines={this.state.prodLines}
                    shifts={this.state.shifts}
                    silos={this.state.silos}
                    weightSpecs={this.state.weightSpecs}
                    setSelectedSchedule={this.setSelectedSchedule} />
            </div>
            <div className={1 === this.state.tabIndex ? 'd-flex flex-column flex-grow-1 flex-shrink-1' : 'd-none'}>
                <PackingWork
                    ref={this.PackingWorkComponent}
                    isAdmin={this.state.isAdmin}
                    lines={this.state.lines}
                    materials={this.state.materials}
                    notes={this.state.notes}
                    pallets={this.state.pallets}
                    printers={this.state.printers}
                    prints={this.state.prints}
                    prodLines={this.state.prodLines}
                    shifts={this.state.shifts}
                    silos={this.state.silos}
                    weightSpecs={this.state.weightSpecs}
                    selectedSchedule={this.state.selectedSchedule}
                    packingDetails={this.state.packingDetails}
                    prevDetail={this.state.prevDetail}
                    user={this.props.user}
                    refreshPackingSchedule={this.refreshPackingSchedule} />
            </div>
            <div className={2 === this.state.tabIndex ? 'd-flex flex-column flex-grow-1 flex-shrink-1' : 'd-none'}>
                <PackingReport
                    ref={this.PackingDailyReportComponent}
                    isAdmin={this.state.isAdmin}
                    detailReportReasons={this.state.detailReportReasons}
                    foremen={this.state.foremen}
                    lines={this.state.lines}
                    materials={this.state.materials}
                    notMeetReasons={this.state.notMeetReasons}
                    notes={this.state.notes}
                    pallets={this.state.pallets}
                    printers={this.state.printers}
                    prints={this.state.prints}
                    prodLines={this.state.prodLines}
                    shifts={this.state.shifts}
                    silos={this.state.silos}
                    weightSpecs={this.state.weightSpecs}
                    setSelectedSchedule={this.setSelectedSchedule} />
            </div>
            <div className={3 === this.state.tabIndex ? 'd-flex flex-column flex-grow-1 flex-shrink-1' : 'd-none'}>
                {(3 === this.state.tabIndex) ? <RemainingWork
                    printers={this.state.printers}
                    isAdmin={this.state.isAdmin}
                    materials={this.state.materials} /> : null} 
            </div>
        </div>;
    }
}

Packing.propTypes = {
    path: PropTypes.string,
    authRoute: PropTypes.array,
    user: PropTypes.any,
};

Packing.defaultProps = {
    path: '/packing',
    authRoute: [],
    user: {},
};

const mapStateToProps = state => ({
    authRoute: state.authRoute,
    user: state.user,
});

const mapDispatchToProps = () => ({});

// 註解起來留著未來參考
// const mapDispatchToProps = dispatch => ({
//     login: bindActionCreators(login, dispatch),
//     reset: bindActionCreators(resetUI, dispatch)
// });

export default connect(mapStateToProps, mapDispatchToProps)(Packing);