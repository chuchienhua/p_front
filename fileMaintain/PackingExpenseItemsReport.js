import React, { Component } from 'react';
import axios from 'axios';
import 'handsontable/languages/zh-TW.js';
import PropTypes from 'prop-types';
import { toast } from 'react-toastify';
import Utils from '../Utils';
import PackingExpenseItemsReportTable from './PackingExpenseItemsReportTable';

export default class PackingExpenseItemsReport extends Component {

    constructor(props) {
        super(props);

        this.state = {
            isLoading: false,
            expenseItems: [],
        };

        this.PackingExpenseItemsReportTableComponent = React.createRef();
        this.queryApiCancelToken = null;
    }

    componentDidMount() {
        this.queryPackingExpenseItemsReport();
    }

    componentWillUnmount() {
        this.isUnmount = true;
        if (this.queryApiCancelToken) {
            this.queryApiCancelToken.cancel('componentWillUnmount');
        }
    }

    //查詢包裝項目單價表
    queryPackingExpenseItemsReport = () => {
        this.setState({ isLoading: true });

        const apiUrl = Utils.generateApiUrl('/packing/getPackingExpenseItemsReport');
        const apiData = {
            packingDateStart: this.state.packingDateStart,
            packingDateEnd: this.state.packingDateEnd,
        };
        this.queryApiCancelToken = axios.CancelToken.source();
        return axios.post(apiUrl, apiData, {
            ...Utils.pbtAxiosConfig,
            cancelToken: this.queryApiCancelToken.token,
            timeout: 10000,
        }).then(res => {
            if (!res.data.error) {
                const newState = {
                    expenseItems: res.data.expenseItems,
                };
                this.setState(newState);
            } else {
                toast.error(`包裝項目單價表查詢失敗，${res.data.error}`);
            }
        }).catch(err => {
            //除了api取消以外都要顯示錯誤訊息
            if (!axios.isCancel(err)) {
                console.error(err);
                toast.error(`包裝項目單價表查詢失敗。\n錯誤訊息: ${err.toString()}`);
            }
        }).then(() => {
            this.setState({ isLoading: false });
        });
    }

    render() {
        return <div className="pt-2">
            <div className="flex-grow-1 min-height-15em">
                <PackingExpenseItemsReportTable
                    ref={this.PackingExpenseItemsReportTableComponent}
                    isAdmin={this.props.isAdmin}
                    data={this.state.expenseItems}
                />
            </div>
        </div >;
    }
}

PackingExpenseItemsReport.propTypes = {
    isAdmin: PropTypes.bool,
};

PackingExpenseItemsReport.defaultProps = {
    isAdmin: false,
};