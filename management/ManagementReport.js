import React, { Component } from 'react';
import PropTypes from 'prop-types';
import queryString from 'query-string';
import { connect } from 'react-redux';
import LoadingPage from '../LoadingPage';
import MaterialInvTraceReport from './MaterialInvTraceReport';
import './ManagementReport.css';

class ManagementReport extends Component {

    constructor(props) {
        super(props);

        this.state = {
            isAdmin: false,
            isLoading: true,
            tabIndex: 0,
        };

        this.MaterialInvTraceReportComponent = React.createRef();
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

        this.setState({ isLoading: false, });
    }

    getTabLinkClass = tabIndex => tabIndex === this.state.tabIndex ? 'nav-item nav-link active' : 'nav-item nav-link';

    switchTab = tabIndex => event => {
        event.nativeEvent.preventDefault();
        this.setState({ tabIndex });
        window.history.pushState({ tabIndex }, 'PBTC');
    }

    render() {
        const { isLoading } = this.state;
        if (isLoading) {
            return <LoadingPage />;
        }
        return <div className="col ms-2 me-2 management-container">
            <ul className="nav nav-pills mt-2 mb-2 d-inline-flex">
                <li className="nav-item">
                    <a className={this.getTabLinkClass(0)} href="#matInv" onClick={this.switchTab(0)}>原料庫存追蹤表</a>
                </li>
            </ul>

            <div className={0 === this.state.tabIndex ? 'd-flex flex-column flex-grow-1 flex-shrink-1' : 'd-none'}>
                <MaterialInvTraceReport
                    ref={this.MaterialInvTraceReportComponent}
                    isAdmin={this.state.isAdmin} />
            </div>
        </div>;
    }
}

ManagementReport.propTypes = {
    path: PropTypes.string,
    authRoute: PropTypes.array,
    user: PropTypes.any,
};

ManagementReport.defaultProps = {
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

export default connect(mapStateToProps, mapDispatchToProps)(ManagementReport);