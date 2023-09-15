import React, { Component } from 'react';
import axios from 'axios';
import { HotTable } from '@handsontable/react';
import Handsontable from 'handsontable';
import 'handsontable/languages/zh-TW.js';
import moment from 'moment';
import PropTypes from 'prop-types';
import queryString from 'query-string';
import Swal from 'sweetalert2';
import { toast } from 'react-toastify';
import { checkBypassPrintData, formatPackingBottom, formatPackingDupontPrint, exportDataToXlsx, isPackingStatusFinish } from './PackingUtils';
import Utils from '../Utils';

const QUERY_MODE = {
    NORMAL: 'normal',
    UNDONE: 'undone',
    PRO_LINE: 'proLine',
};

export default class PackingSchedule extends Component {

    constructor(props) {
        super(props);

        this.state = {
            isLoading: false,
            packingDateStart: moment(new Date()).format('YYYY-MM-DD'),
            packingDateEnd: moment(new Date()).format('YYYY-MM-DD'),
            queryMode: QUERY_MODE.NORMAL,
            proLine: '',
            proSeq: '',
            data: [],
            columns: [
                {
                    data: 'PACKING_DATE',
                    type: 'date',
                    width: 50,
                    renderer: (instance, td, row, col, prop, value/*, cellProperties*/) => {
                        Handsontable.dom.empty(td);
                        td.classList.add('htCenter');
                        // td.classList.add('htMiddle');
                        if (value) {
                            td.innerHTML = moment(value).format('MM/DD');
                            td.title = `排程日期: ${moment(value).format('YYYY/MM/DD')}`;
                        }
                    },
                    dateFormat: 'YYYY-MM-DD',
                },
                {
                    data: 'WORK_SHIFT', type: 'dropdown', width: 60, className: 'htCenter', strict: true, allowInvalid: false,
                    source: (query, process) => {
                        process(this.props.shifts.map(row => row.SHIFT_NAME)); //班別
                    },
                },
                {
                    data: 'PACKING_LINE_NAME', type: 'dropdown', width: 90, className: 'htCenter', allowInvalid: false,
                    source: (query, process) => {
                        process(this.props.lines.map(row => row.LINE_NAME)); //包裝線
                    },
                },
                {
                    data: 'SILO_NO', type: 'dropdown', width: 70, className: 'htCenter', allowInvalid: false,
                    source: (query, process) => {
                        process(this.props.silos.map(row => row.SILO_NAME)); //SILO
                    },
                },
                {
                    data: 'PRO_SCHEDULE_LINE', type: 'dropdown', width: 50, className: 'htCenter', allowInvalid: false,
                    source: (query, process) => {
                        process(this.props.prodLines.map(row => row.LINE)); //生產線別
                    },
                },
                { data: 'PRO_SCHEDULE_SEQ', type: 'numeric', width: 60, className: 'htCenter', allowInvalid: false, },
                { data: 'PRD_PC', type: 'text', width: 100, className: 'htCenter', },
                { data: 'CUST_PRD_PC', type: 'text', width: 100, className: 'htCenter', },
                { data: 'LOT_NO', type: 'text', width: 100, className: 'htCenter', },
                { data: 'ORDER_WEIGHT', type: 'numeric', width: 70, className: 'htCenter', readOnly: true, },
                { data: 'SEQ_START', type: 'numeric', width: 55, className: 'htCenter', },
                { data: 'TARGET_WEIGHT', type: 'numeric', width: 65, className: 'htCenter', },
                {
                    data: 'PACKING_NOTE', type: 'dropdown', width: 120, className: 'htCenter',
                    source: (query, process) => {
                        process(this.props.notes.map(row => row.NOTE_NAME)); //備註
                    },
                },
                { data: 'IS_EMPTYING', type: 'checkbox', width: 55, className: 'htCenter', },
                {
                    data: 'PACKING_WEIGHT_SPEC', type: 'dropdown', width: 60, className: 'htCenter', allowInvalid: false,
                    source: (query, process) => {
                        process(this.props.weightSpecs.map(row => row.SPEC_ID)); //包裝別(KG)
                    },
                },
                {
                    data: 'PACKING_MATERIAL', type: 'dropdown', width: 110, className: 'htCenter', allowInvalid: false,
                    source: (query, process) => {
                        process(this.props.materials.map(row => row.MATERIAL_NAME)); //包裝規格
                    },
                },
                {
                    data: 'PACKING_PALLET_NAME', type: 'dropdown', width: 100, className: 'htCenter', allowInvalid: false,
                    source: (query, process) => {
                        process(this.props.pallets.map(row => row.PALLET_NAME)); //棧板別
                    },
                },
                { data: 'PACKING_MATERIAL_ID', type: 'text', width: 50, className: 'htCenter', readOnly: true, },
                { data: 'PACKING_GRADE', type: 'text', width: 100, className: 'htCenter', readOnly: true, },
                { data: 'PACKING_COLOR', type: 'text', width: 100, className: 'htCenter', readOnly: true, },
                {
                    data: 'PACKING_BOTTOM', type: 'text', width: 100, className: 'htCenter', readOnly: true,
                    renderer: (instance, td, row, col, prop, value, cellProperties) => {
                        Handsontable.dom.empty(td);
                        td.classList.add('htCenter');

                        const rowData = instance.getSourceDataAtRow(cellProperties.row);
                        td.innerHTML = formatPackingBottom(value, rowData.PRD_PC);
                    },
                },
                {
                    data: 'DUPONT_PRINT', type: 'text', width: 100, className: 'htCenter',
                    renderer: (instance, td, row, col, prop, value, cellProperties) => {
                        Handsontable.dom.empty(td);
                        td.classList.add('htCenter');

                        const rowData = instance.getSourceDataAtRow(cellProperties.row);
                        td.innerHTML = formatPackingDupontPrint(value, rowData.PRD_PC);
                    },
                },
                { data: 'BARLOG_PRINT', type: 'text', width: 100, className: 'htCenter', },
                {
                    data: 'PACKING_SELECT',
                    type: 'dropdown',
                    width: 90,
                    className: 'htCenter',
                    source: ['新單包裝', '續單包裝'],
                    strict: true,
                    allowInvalid: false,
                },
                {
                    data: 'PACKING_STATUS', type: 'text', width: 60, className: 'htCenter', readOnly: true,
                    renderer: (instance, td, row, col, prop, value) => {
                        Handsontable.dom.empty(td);
                        td.innerHTML = value;
                        td.classList.add('htCenter');
                        if ('包裝中' === value) {
                            td.classList.add('text-primary');
                        } else if ('已完成' === value) {
                            td.classList.add('text-danger');
                        } else if ('包裝取消' === value) {
                            td.classList.add('text-success');
                        } else if ('強制結束' === value) {
                            td.classList.add('text-primary');
                        }
                    },
                },
                { data: 'TOTAL_PACKING_WEIGHT', type: 'numeric', width: 70, className: 'htCenter', readOnly: true, },
                { data: 'REMAINDER_WEIGHT', type: 'numeric', width: 50, className: 'htCenter', readOnly: true, },
                { data: 'CREATE_TIME', type: 'text', width: 120, className: 'htCenter', readOnly: true, },
                { data: 'CREATE_USER_NAME', type: 'text', width: 100, className: 'htCenter', readOnly: true, },
                { data: 'EDIT_TIME', type: 'text', width: 120, className: 'htCenter', readOnly: true, },
                { data: 'EDIT_USER_NAME', type: 'text', width: 100, className: 'htCenter', readOnly: true, },
                {
                    data: 'SAVE_BTN',
                    width: 70,
                    readOnly: true,
                    renderer: (instance, td, row, col, prop, value, cellProperties) => {
                        const rowData = instance.getSourceDataAtRow(cellProperties.row);

                        const icon = document.createElement('SPAN');
                        icon.className = 'icon bi-pencil-square';
                        icon.innerHTML = ' 儲存';

                        const btn = document.createElement('BUTTON');
                        btn.className = 'btn btn-outline-success btn-sm px-1 py-0 nowrap align-top';
                        btn.disabled = !rowData.__UPDATED;
                        btn.appendChild(icon);
                        //console.log('renderer', row, physicalRow, rowData.SCHEDULE_ORDER, rowData.__UPDATED, rowData);

                        Handsontable.dom.addEvent(btn, 'click', () => {
                            //console.log(row, col, prop, value, cellProperties);
                            this.savePackingSchedule(instance, cellProperties.row);
                        });

                        const div = document.createElement('DIV');
                        div.appendChild(btn);

                        Handsontable.dom.empty(td);
                        td.appendChild(div);
                        td.classList.add('htCenter');
                        td.classList.add('htMiddle');
                    },
                },
                {
                    data: 'DEL_BTN',
                    width: 70,
                    readOnly: true,
                    renderer: (instance, td, row, col, prop, value, cellProperties) => {
                        const rowData = instance.getSourceDataAtRow(cellProperties.row);

                        const icon = document.createElement('SPAN');
                        icon.className = 'icon bi-x-circle';
                        icon.innerHTML = ' 刪除';

                        const btn = document.createElement('BUTTON');
                        btn.className = 'btn btn-outline-danger btn-sm px-1 py-0 nowrap align-top';
                        btn.appendChild(icon);
                        if (rowData.PACKING_STATUS) {
                            btn.disabled = true;
                            td.title = '排程開始、結束或取消都不可刪除';
                        }

                        Handsontable.dom.addEvent(btn, 'click', () => {
                            //console.log(row, col, prop, value, cellProperties);
                            this.deletePackingSchedule(instance, cellProperties.row);
                        });

                        const div = document.createElement('DIV');
                        div.appendChild(btn);

                        Handsontable.dom.empty(td);
                        td.appendChild(div);
                        td.classList.add('htCenter');
                        td.classList.add('htMiddle');
                    },
                },
                {
                    data: 'SELECT_BTN',
                    width: 70,
                    readOnly: true,
                    renderer: (instance, td, row, col, prop, value, cellProperties) => {
                        const rowData = instance.getSourceDataAtRow(cellProperties.row);
                        //排除 按下新增尚未儲存的狀態
                        if (!rowData.PACKING_SEQ) {
                            Handsontable.dom.empty(td);
                            return;
                        }

                        const icon = document.createElement('SPAN');
                        icon.className = 'icon bi-arrow-return-left';
                        icon.innerHTML = ' 包裝';

                        const btn = document.createElement('BUTTON');
                        btn.className = 'btn btn-outline-info btn-sm px-1 py-0 nowrap align-top';
                        btn.appendChild(icon);
                        td.title = '進入包裝作業';
                        if (!rowData.LOT_NO) {
                            btn.disabled = true;
                            td.title = '必須有Lot No.才能進入包裝作業';
                        }
                        if ('包裝取消' === rowData.PACKING_STATUS) {
                            btn.disabled = true;
                            td.title = '包裝排程已取消，無法進入包裝作業';
                        }

                        if ('系統排程' === rowData.CREATE_USER_NAME) {
                            td.parentNode.classList.add('bg-warning');
                            td.parentNode.classList.add('bg-opacity-25');
                        } else {
                            td.parentNode.classList.remove('bg-warning');
                            td.parentNode.classList.remove('bg-opacity-25');
                        }

                        Handsontable.dom.addEvent(btn, 'click', () => {
                            //console.log(row, col, prop, value, cellProperties);
                            const rowData = instance.getSourceDataAtRow(cellProperties.row);
                            if (rowData.__UPDATED) {
                                toast.warn('排程資料修改後請先儲存，才能進入包裝作業');
                                return;
                            }
                            if ('function' === typeof this.props.setSelectedSchedule) {
                                this.props.setSelectedSchedule(rowData);
                            }
                        });

                        const div = document.createElement('DIV');
                        div.appendChild(btn);

                        Handsontable.dom.empty(td);
                        td.appendChild(div);
                        td.classList.add('htCenter');
                        td.classList.add('htMiddle');
                    },
                },
                { data: 'SCHEDULE_ORDER', type: 'numeric', width: 50, className: 'htCenter', },
            ],
            hiddenColumns: { columns: [] },
            colHeaders: [
                '日期', '班別', '包裝機', 'SILO No.', '線別',
                '押出<br />序號', '成品簡碼', '客戶產品碼', 'Lot No.', '排定產量',
                '起始<br />序號', '預計包<br />裝重量', '備註', '是否<br />出空',
                '包裝別<br />(KG)', '包裝規格',
                '棧板別', '包裝<br />代號', '噴印<br />Grade', '噴印<br />Color', '噴印<br />底部',
                '杜邦品<br />噴印', 'BARLOG<br />噴印', '包裝選擇', '包裝<br />狀況', '實際包<br />裝重量',
                '殘包<br />重量', '建立時間', '建立人員', '修改時間', '修改人員',
                '儲存', '刪除', '包裝', '顯示<br />順序',
            ],
            columnSorting: {
                compareFunctionFactory(sortOrder, columnMeta) {
                    if ('WORK_SHIFT' === columnMeta.prop) {
                        //班別排序
                        const shifts = {
                            '早': 10,
                            '早中': 20,
                            '中': 30,
                            '中夜': 40,
                            '夜': 50,
                            '普': 60,
                        };
                        if ('asc' === sortOrder) {
                            return function (value, nextValue) {
                                return ~~shifts[value] - ~~shifts[nextValue];
                            };
                        } else {
                            return function (value, nextValue) {
                                return ~~shifts[nextValue] - ~~shifts[value];
                            };
                        }
                    } else if ('numeric' === columnMeta.type) {
                        if ('asc' === sortOrder) {
                            return function (value, nextValue) {
                                return value - nextValue;
                            };
                        } else {
                            return function (value, nextValue) {
                                return nextValue - value;
                            };
                        }
                    } else {
                        if ('asc' === sortOrder) {
                            return function (value, nextValue) {
                                return ('' + value).localeCompare('' + nextValue);
                            };
                        } else {
                            return function (value, nextValue) {
                                return ('' + nextValue).localeCompare('' + value);
                            };
                        }
                    }
                },
            }
        };
        this.state.hiddenColumns.columns.push(this.state.columns.length - 8, this.state.columns.length - 7, this.state.columns.length - 6, this.state.columns.length - 5);
        if (this.props.isAdmin) {
            //排程人員
        } else {
            //包裝人員
            this.state.hiddenColumns.columns.push(this.state.columns.length - 4, this.state.columns.length - 3);
        }
        //如果還在前一天夜班(00:00~08:00)則日期帶昨天
        if ((new Date().getHours()) < 8) {
            this.state.packingDateStart = this.state.packingDateEnd = moment(new Date()).subtract(1, 'days').format('YYYY-MM-DD');
        }

        //根據廠別使用特殊規則
        const firm = Utils.getFirmFromLocalStorage();
        this.state.firm = firm;
        if ('A' === firm) {
            //漳州廠隱藏欄位
            this.state.hiddenColumns.columns.push(this.state.colHeaders.indexOf('客戶產品碼'));
            this.state.hiddenColumns.columns.push(this.state.colHeaders.indexOf('杜邦品<br />噴印'));
            this.state.hiddenColumns.columns.push(this.state.colHeaders.indexOf('BARLOG<br />噴印'));
        }

        this.packingDateStartComponent = React.createRef();
        this.hotTableComponent = React.createRef();
        this.queryApiCancelToken = null;
    }

    componentDidMount() {
        //加入hook
        const hotInstance = this.hotTableComponent.current.hotInstance;
        if (!hotInstance) {
            console.warn('hotInstance is null');
            return;
        }
        hotInstance.addHook('afterChange', this.afterChangeHandler(hotInstance));

        //網址帶入參數
        const parsed = queryString.parse(window.location.search);
        if (parsed.proLine && parsed.proSeq) {
            this.setState({
                proLine: parsed.proLine,
                proSeq: parsed.proSeq,
            }, this.queryPackingScheduleProLine);
        } else if (parsed.packing_date) {
            this.setState({ packingDateStart: parsed.packing_date }, this.queryPackingScheduleNormal);
            if (this.packingDateStartComponent && this.packingDateStartComponent.current) {
                this.packingDateStartComponent.current.value = parsed.packing_date;
            }
        }
    }

    componentWillUnmount() {
        this.isUnmount = true;
        if (this.queryApiCancelToken) {
            this.queryApiCancelToken.cancel('componentWillUnmount');
        }
    }

    //報表日期區間條件
    handleQueryDateChange = field => event => {
        let value = event.target.value;

        //如果清空，則自動帶現在時間
        if (('dateType' !== field) && (0 === value.length)) {
            value = moment().format('YYYY-MM-DD');
        }

        this.setState(state => {
            let obj = { [field]: value };
            if ('packingDateEnd' === field) {
                //如果結束時間 < 開始時間，則自動調整開始時間
                if (value < state.packingDateStart) {
                    obj['packingDateStart'] = value.substr(0, 10);
                }
            } else if ('packingDateStart' === field) {
                //如果開始時間 > 結束時間，則自動調整開始時間
                if (value > state.packingDateEnd) {
                    obj['packingDateEnd'] = value.substr(0, 10);
                }
            }

            return obj;
        });
    }

    //查詢欄位onChange
    handleChange = event => {
        let field = event.target.dataset.field;
        let value = event.target.value;

        if ('checkbox' === event.target.type) {
            value = event.target.checked;
        }
        const oldValue = this.state[field];

        //onChange前處理
        if (oldValue === value) {
            return false;
        }

        const newState = {};

        switch (field) {
            default:
                break;
        }
        //修改值
        newState[field] = value;

        this.setState(newState, () => {
            //後處理
            switch (field) {
                default:
                    break;
            }
        });
    }

    handleOnKeyDownEnter = callback => event => {
        //enter
        if (13 === event.keyCode) {
            if ('function' === typeof callback) {
                callback();
            }
        }
    }

    //顯示包裝線onChange
    handleDisplayPackingLineChange = event => {
        const hotInstance = this.hotTableComponent.current.hotInstance;
        if (!hotInstance) {
            return;
        }
        const filters = hotInstance.getPlugin('filters');
        if (event) {
            filters.removeConditions(2);
            if (event.target.value) {
                filters.addCondition(2, 'eq', [event.target.value]);
            }
        }
        filters.filter();
    }

    //查詢生產排程
    getProSchedule = (LINE, SEQ) => {
        const apiUrl = Utils.generateApiUrl('/packing/getProScheduleByProductionLine');
        const apiData = {
            LINE: LINE,
            SEQ: SEQ,
        };
        this.queryApiCancelToken = axios.CancelToken.source();
        return axios.post(apiUrl, apiData, {
            ...Utils.pbtAxiosConfig,
            cancelToken: this.queryApiCancelToken.token,
            timeout: 10000,
        }).then(res => {
            if (!res.data.error) {
                return res.data.schedules;
            } else {
                toast.error(`查詢查詢生產排程失敗，${res.data.error}`);
            }
        }).catch(err => {
            //除了api取消以外都要顯示錯誤訊息
            if (!axios.isCancel(err)) {
                console.error(err);
                toast.error(`查詢查詢生產排程失敗。\n錯誤訊息: ${err.toString()}`);
            }
        });
    }

    //查詢包裝排程(單天)
    queryPackingScheduleNormal = () => {
        this.setState({
            queryMode: QUERY_MODE.NORMAL,
        }, () => {
            this.queryPackingSchedule();
        });
    }

    //查詢包裝排程(未完成包裝)
    queryPackingScheduleUndone = () => {
        this.setState({
            queryMode: QUERY_MODE.UNDONE,
        }, () => {
            this.queryPackingSchedule();
        });
    }

    //查詢包裝排程(線別+押出序號)
    queryPackingScheduleProLine = () => {
        this.setState({
            queryMode: QUERY_MODE.PRO_LINE,
        }, () => {
            this.queryPackingSchedule({
                proLine: this.state.proLine,
                proSeq: this.state.proSeq,
            });
        });
    }

    //包裝排程資料格式處理
    formatPackingSchedule = row => {
        ['PACKING_DATE'].forEach(key => {
            if (row[key]) {
                row[key] = moment(row[key]).format('YYYY-MM-DD');
            }
        });
        ['CREATE_TIME', 'EDIT_TIME'].forEach(key => {
            if (row[key]) {
                row[key] = moment(row[key]).format('YYYY-MM-DD HH:mm:ss');
            }
        });
        ['IS_EMPTYING'].forEach(key => {
            if (row[key]) {
                row[key] = Boolean(row[key]);
            }
        });
    };

    //查詢包裝排程
    queryPackingSchedule = (postData) => {
        this.setState({ isLoading: true });

        const apiUrl = Utils.generateApiUrl('/packing/getPackingSchedule');
        const apiData = {
            ...postData,
            packingDateStart: this.state.packingDateStart,
            packingDateEnd: moment().format('YYYY-MM-DD'),
            queryMode: this.state.queryMode,
        };
        this.queryApiCancelToken = axios.CancelToken.source();
        return axios.post(apiUrl, apiData, {
            ...Utils.pbtAxiosConfig,
            cancelToken: this.queryApiCancelToken.token,
            timeout: 10000,
        }).then(res => {
            if (!res.data.error) {
                const schedules = Array.isArray(res.data.schedules) ? res.data.schedules : [];
                schedules.forEach(this.formatPackingSchedule);
                this.setState({
                    data: schedules,
                }, () => {
                    const hotInstance = this.hotTableComponent.current.hotInstance;
                    if (!hotInstance) {
                        return;
                    }
                    //套用先前的排序設定
                    const columnSorting = hotInstance.getPlugin('ColumnSorting');
                    if (columnSorting.isSorted()) {
                        const sortConfig = columnSorting.getSortConfig();
                        columnSorting.sort(sortConfig);
                    }
                });
            } else {
                toast.error(`包裝排程查詢失敗，${res.data.error}`);
            }
        }).catch(err => {
            //除了api取消以外都要顯示錯誤訊息
            if (!axios.isCancel(err)) {
                console.error(err);
                toast.error(`包裝排程查詢失敗。\n錯誤訊息: ${err.toString()}`);
            }
        }).then(() => {
            this.setState({ isLoading: false });
        });
    }

    //新增包裝排程
    addPackingSchedule = () => {
        const hotInstance = this.hotTableComponent.current.hotInstance;
        if (!hotInstance) {
            console.warn('hotInstance is null');
            return;
        }

        const data = hotInstance.getSourceData();
        const row = {
            PACKING_DATE: this.state.packingDateStart,
        };
        data.push(row);
        hotInstance.updateData(data, 'addPackingSchedule');
    }

    //儲存包裝排程
    savePackingSchedule = (hotInstance, index) => {
        const rowData = hotInstance.getSourceDataAtRow(index);
        // console.log(index, rowData);

        //欄位檢查
        if (!rowData.WORK_SHIFT) {
            toast.warn('班別不可為空');
            return;
        }
        if (!rowData.PACKING_LINE_NAME) {
            toast.warn('包裝機不可為空');
            return;
        }
        if (!rowData.SILO_NO) {
            toast.warn('SILO No.不可為空');
            return;
        }
        if (!rowData.PRD_PC) {
            toast.warn('成品簡碼不可為空');
            return;
        }
        if (!rowData.ORDER_WEIGHT) {
            toast.warn('排定產量不可為空，請確認成品簡碼、Lot No是否正確');
            return;
        }
        if (!rowData.TARGET_WEIGHT) {
            toast.warn('預計包裝重量不可為空');
            return;
        }
        if (!rowData.PACKING_WEIGHT_SPEC) {
            toast.warn('包裝別(KG)不可為空');
            return;
        }
        if (!rowData.PACKING_MATERIAL) {
            toast.warn('包裝規格不可為空');
            return;
        }
        if (!rowData.PACKING_PALLET_NAME) {
            toast.warn('棧板別不可為空');
            return;
        }
        if (!rowData.PACKING_GRADE && !rowData.PACKING_COLOR && !rowData.PACKING_BOTTOM && !rowData.DUPONT_PRINT && !rowData.BARLOG_PRINT) {
            toast.warn('噴印欄位至少要一個欄位有資料');
            return;
        }
        if (rowData.DUPONT_PRINT && (rowData.DUPONT_PRINT.length > 10)) {
            toast.warn('杜邦品噴印欄位最多輸入10位');
            return;
        }
        if (rowData.BARLOG_PRINT && (rowData.BARLOG_PRINT.length > 20)) {
            toast.warn('BARLOG噴印欄位最多輸入20位');
            return;
        }

        //ID與NAME對照
        [
            { displayField: 'PACKING_LINE_NAME', rowFiled: 'PACKING_LINE', source: this.props.lines, sourceFiled: 'LINE_NAME', sourceID: 'LINE_ID' },
            { displayField: 'PACKING_PALLET_NAME', rowFiled: 'PACKING_PALLET', source: this.props.pallets, sourceFiled: 'PALLET_NAME', sourceID: 'PALLET_ID' },
            { displayField: 'PACKING_MATERIAL', rowFiled: 'PACKING_MATERIAL_ID', source: this.props.materials, sourceFiled: 'MATERIAL_NAME', sourceID: 'MATERIAL_ID' },
        ].forEach(col => {
            const target = col.source.find(row => (row[col.sourceFiled] === rowData[col.displayField]));
            rowData[col.rowFiled] = target ? target[col.sourceID] : null;
        });

        if (!rowData.PACKING_DATE) {
            rowData.PACKING_DATE = this.state.packingDateStart;
        }
        console.log('savePackingSchedule', index, rowData);

        //呼叫後端儲存
        this.setState({ isLoading: true });
        const apiUrl = Utils.generateApiUrl('/packing/savePackingSchedule');
        const apiData = {
            rows: [
                { ...rowData },
            ],
        };
        this.queryApiCancelToken = axios.CancelToken.source();
        return axios.post(apiUrl, apiData, {
            ...Utils.pbtAxiosConfig,
            cancelToken: this.queryApiCancelToken.token,
            timeout: 10000,
        }).then(res => {
            if (!res.data.error) {
                if (Array.isArray(res.data.res) && res.data.res.length) {
                    toast.success('包裝排程儲存成功');
                    //將新增或修改的資料更新到前端，此處暫時不處理回傳多筆資料
                    const sourceData = hotInstance.getSourceData();
                    if (sourceData[index]) {
                        sourceData[index] = res.data.res[0];
                        this.formatPackingSchedule(sourceData[index]);
                        delete sourceData[index].__UPDATED;
                        hotInstance.updateData(sourceData, 'savePackingSchedule');
                        this.setState({ data: sourceData });
                        //console.log('savePackingSchedule', sourceData[index].PACKING_SEQ, sourceData[index].__UPDATED, rowData.__UPDATED);
                    }
                } else {
                    toast.error('包裝排程儲存失敗');
                }
            } else {
                toast.error(`包裝排程儲存失敗，${res.data.error}`);
            }
        }).catch(err => {
            //除了api取消以外都要顯示錯誤訊息
            if (!axios.isCancel(err)) {
                console.error(err);
                toast.error(`包裝排程儲存失敗。\n錯誤訊息: ${err.toString()}`);
            }
        }).then(() => {
            this.setState({ isLoading: false });
        });
    }

    //刪除包裝排程
    deletePackingSchedule = async (hotInstance, index) => {
        const rowData = hotInstance.getSourceDataAtRow(index);
        const keys = Object.keys(rowData);
        //空白row，直接刪除
        if (keys.length <= 0) {
            hotInstance.alter('remove_row', index);
            return;
        }
        console.log('deletePackingSchedule', index, rowData);

        if (rowData.PACKING_STATUS) {
            toast.error('包裝已經開始或結束，無法刪除');
            return;
        }

        const confirmResult = await Swal.fire({
            title: '請確認是否要刪除?',
            text: `第${index + 1}筆，成品簡碼:${rowData.PRD_PC}、LOT NO: ${rowData.LOT_NO}`,
            showCancelButton: true,
            confirmButtonText: '確認',
            cancelButtonText: '取消',
        });
        if (!confirmResult.isConfirmed) {
            return;
        }

        //沒有新增到DB，直接從畫面上刪除
        if (!rowData.PACKING_SEQ) {
            hotInstance.alter('remove_row', index);
            return;
        }

        //呼叫後端刪除
        this.setState({ isLoading: true });
        const apiUrl = Utils.generateApiUrl('/packing/deletePackingSchedule');
        const apiData = {
            rows: [
                { ...rowData },
            ],
        };
        this.queryApiCancelToken = axios.CancelToken.source();
        return axios.post(apiUrl, apiData, {
            ...Utils.pbtAxiosConfig,
            cancelToken: this.queryApiCancelToken.token,
            timeout: 10000,
        }).then(res => {
            if (!res.data.error) {
                if (res.data.res) {
                    toast.success('包裝排程刪除成功');
                    hotInstance.alter('remove_row', index);
                } else {
                    toast.error('包裝排程刪除失敗');
                }
            } else {
                toast.error(`包裝排程刪除失敗，${res.data.error}`);
            }
        }).catch(err => {
            //除了api取消以外都要顯示錯誤訊息
            if (!axios.isCancel(err)) {
                console.error(err);
                toast.error(`包裝排程刪除失敗。\n錯誤訊息: ${err.toString()}`);
            }
        }).then(() => {
            this.setState({ isLoading: false });
        });
    }

    //處理欄位連動
    afterChangeHandler = hotInstance => async (changes, source) => {
        console.log(changes, source);
        if ('edit' === source && Array.isArray(changes)) {
            const data = hotInstance.getSourceData();
            let updated = false;
            //此處只處理畫面上需要看到的欄位，其餘欄位會在儲存時再檢查一次
            for (let i = 0; i < changes.length; i++) {
                let [row, prop, oldValue, newValue] = changes[i];
                row = hotInstance.toPhysicalRow(row);

                const rowData = data[row];
                if (oldValue !== newValue) {
                    rowData.__UPDATED = true;
                    updated = true;
                }
                //console.log('afterChangeHandler', rowData.PACKING_SEQ, rowData.__UPDATED);
                switch (prop) {
                    case 'SILO_NO':
                        if (('' + newValue).indexOf('換包') > -1) {
                            rowData.PRO_SCHEDULE_LINE = null;
                            rowData.PRO_SCHEDULE_SEQ = null;
                            updated = true;
                        }
                        break;
                    case 'PRO_SCHEDULE_LINE':
                    case 'PRO_SCHEDULE_SEQ':
                        {
                            let proSchedule = null;
                            if (rowData.PRO_SCHEDULE_LINE && rowData.PRO_SCHEDULE_SEQ) {
                                //查詢生產排程
                                const schedules = await this.getProSchedule(rowData.PRO_SCHEDULE_LINE, rowData.PRO_SCHEDULE_SEQ);
                                proSchedule = (Array.isArray(schedules) && schedules.length) ? schedules[0] : null;
                            }

                            //從生產排程連動的資料
                            rowData.PRD_PC = proSchedule ? proSchedule.PRD_PC : null;
                            rowData.CUST_PRD_PC = proSchedule ? proSchedule.CUST_PRD_PC : null;
                            rowData.LOT_NO = proSchedule ? proSchedule.LOT_NO : null;
                            rowData.ORDER_WEIGHT = proSchedule ? proSchedule.PRO_WT : null;
                            rowData.PRO_SCHEDULE_UKEY = proSchedule ? proSchedule.UKEY : null;
                            if (proSchedule && proSchedule.SILO && !rowData.SILO_NO) {
                                rowData.SILO_NO = proSchedule.SILO;
                            }

                            //噴印資料
                            const bypassPrintData = checkBypassPrintData(rowData.PACKING_MATERIAL); //檢查是否"不要"連動
                            if (!bypassPrintData) {
                                const printData = this.state.firm === 'A' ? this.props.prints.find(row => {
                                    //漳州廠只用成品簡碼 or 保稅FD
                                    return (row.PRD_PC === rowData.PRD_PC) || ((row.PRD_PC + 'FD') === rowData.PRD_PC);
                                }) : this.props.prints.find(row => {
                                    return (row.CUST_PRD_PC === rowData.CUST_PRD_PC);
                                });
                                rowData.PACKING_GRADE = printData ? printData.GRADE : null;
                                rowData.PACKING_COLOR = printData ? printData.COLOR : null;
                                rowData.PACKING_BOTTOM = printData ? printData.BOTTOM : null;
                            }

                            if (!rowData.SEQ_START) {
                                rowData.SEQ_START = 1;
                            }
                            updated = true;
                        }
                        break;
                    case 'CUST_PRD_PC':
                        //換包時不連動噴印資料
                        if (('' + rowData.SILO_NO).indexOf('換包') === -1) {
                            const target = this.props.prints.find(row => (row.CUST_PRD_PC === newValue));
                            rowData.PACKING_GRADE = target ? target.GRADE : null;
                            rowData.PACKING_COLOR = target ? target.COLOR : null;
                            rowData.PACKING_BOTTOM = target ? target.BOTTOM : null;
                            updated = true;
                        }
                        break;
                    case 'PACKING_MATERIAL':
                        {
                            const target = this.props.materials.find(row => (row.MATERIAL_NAME === newValue));
                            rowData.PACKING_MATERIAL_ID = target ? target.MATERIAL_ID : null;
                            const bypassPrintData = checkBypassPrintData(rowData.PACKING_MATERIAL); //檢查是否"不要"連動
                            if (bypassPrintData) {
                                rowData.LOT_NO = null;
                                rowData.PACKING_GRADE = null;
                                rowData.PACKING_COLOR = null;
                                rowData.PACKING_BOTTOM = null;
                            }
                            updated = true;
                        }
                        break;
                    default:
                        break;
                }
            }
            if (updated) {
                hotInstance.updateData(data, 'afterChangeHandler');
            }
            if (data !== this.state.data) {
                this.setState({ data: data });
            }
        } //end of if 'edit'
    }

    //cells連動處理
    cellsHandler = (row, col, prop) => {
        if (!this.hotTableComponent.current) {
            return;
        }
        const hotInstance = this.hotTableComponent.current.hotInstance;
        const rowData = hotInstance.getSourceDataAtRow(row);
        if (!rowData) {
            return;
        }
        const cellProperties = {};
        const isFinish = isPackingStatusFinish(rowData.PACKING_STATUS);
        switch (prop) {
            case 'PRO_SCHEDULE_LINE':
            case 'PRO_SCHEDULE_SEQ':
                if (isFinish) {
                    cellProperties.readOnly = true;
                } else if (('' + rowData.SILO_NO).indexOf('換包') > -1) {
                    cellProperties.readOnly = true;
                }
                break;
            case 'WORK_SHIFT':
            case 'PACKING_LINE_NAME':
            case 'PACKING_MATERIAL':
            case 'PACKING_WEIGHT_SPEC':
            case 'PACKING_PALLET_NAME':
                if (isFinish) {
                    cellProperties.readOnly = true;
                }
                break;
            case 'ORDER_WEIGHT':
            case 'PACKING_GRADE':
            case 'PACKING_COLOR':
            case 'PACKING_BOTTOM':
                if (('' + rowData.SILO_NO).indexOf('換包') > -1) {
                    cellProperties.readOnly = false;
                }
                break;
            case 'DUPONT_PRINT':
                //包裝規格如果有"杜邦"，則此欄位才能修改
                if ('string' !== typeof rowData.PACKING_MATERIAL) {
                    cellProperties.readOnly = true;
                } else if (!rowData.PACKING_MATERIAL.includes('杜邦')) {
                    cellProperties.readOnly = true;
                }
                break;
            case 'BARLOG_PRINT':
                //包裝規格如果有"BARLOG"，則此欄位才能修改
                if ('string' !== typeof rowData.PACKING_MATERIAL) {
                    cellProperties.readOnly = true;
                } else if (!rowData.PACKING_MATERIAL.includes('BARLOG')) {
                    cellProperties.readOnly = true;
                }
                break;
            default:
                break;
        }
        // console.log(row, col, prop, rowData, cellProperties);
        return cellProperties;
    }

    //匯出排程
    exportSchedules = () => {
        if (!this.state.data || !this.state.data.length) {
            toast.warn('畫面上無資料，請先查詢');
            return;
        }

        exportDataToXlsx([
            {
                sheetName: '包裝排程',
                columns: this.state.columns,
                colHeaders: this.state.colHeaders,
                data: this.state.data,
            },
        ], 'PBTC包裝排程.xlsx');
    }

    render() {
        const { isLoading } = this.state;
        const { isAdmin } = this.props;
        return <>
            <div className="packing-query-container mb-2">
                <div className="input-group input-group-sm me-2">
                    <span className="input-group-text">日期</span>
                    <input type="date"
                        className="form-control"
                        ref={this.packingDateStartComponent}
                        defaultValue={this.state.packingDateStart}
                        onChange={this.handleQueryDateChange('packingDateStart')}
                        onKeyDown={this.handleOnKeyDownEnter(this.queryPackingScheduleNormal)} />
                    <button type="button"
                        className="btn btn-outline-primary btn-sm"
                        onClick={this.queryPackingScheduleNormal} disabled={isLoading}><span className="icon bi-search"></span> 查詢</button>
                </div>

                {(isAdmin) ?
                    <button type="button"
                        className="btn btn-outline-info btn-sm me-2"
                        onClick={this.addPackingSchedule} disabled={isLoading}><span className="icon bi-plus-circle"></span> 新增</button>
                    : null}
                <button type="button"
                    className="btn btn-outline-secondary btn-sm me-2"
                    onClick={this.queryPackingScheduleUndone} disabled={isLoading}><span className="icon bi-clock-history"></span> 未完成包裝</button>
                {(isAdmin) ?
                    <button type="button" className="btn btn-outline-success btn-sm me-2"
                        title="將畫面上的資料匯出成.xlsx檔案"
                        onClick={this.exportSchedules} disabled={isLoading || !this.state.data.length}><span className="icon bi-file-earmark-text"></span> 匯出</button>
                    : null}

                <div className="input-group input-group-sm me-2">
                    <span className="input-group-text">線別</span>
                    <input type="text"
                        className="form-control max-width-3em"
                        list="pro-line-list"
                        data-field="proLine"
                        value={this.state.proLine}
                        onChange={this.handleChange}
                        onKeyDown={this.handleOnKeyDownEnter(this.queryPackingScheduleProLine)}
                        maxLength="2" />
                    <datalist id="pro-line-list">
                        {this.props.prodLines.map((row, rowIndex) => {
                            return <option key={rowIndex} value={row.LINE} />;
                        })}
                    </datalist>
                    <span className="input-group-text">押出序號</span>
                    <input type="number"
                        className="form-control max-width-6em"
                        data-field="proSeq"
                        value={this.state.proSeq}
                        onChange={this.handleChange}
                        onKeyDown={this.handleOnKeyDownEnter(this.queryPackingScheduleProLine)}
                        min="0"
                        max="999999"
                        maxLength="6" />
                    <button type="button"
                        className="btn btn-outline-primary btn-sm"
                        onClick={this.queryPackingScheduleProLine} disabled={isLoading}><span className="icon bi-search"></span> 查詢</button>

                </div>

                <div className="flex-basis-100"></div>

                <div className="btn-group mt-1" role="group" aria-label="Basic radio toggle button group">
                    <input type="radio"
                        className="btn-check"
                        name="schedule-display-packing-line"
                        id="schedule-display-packing-line-all"
                        defaultChecked={true}
                        value=""
                        onClick={this.handleDisplayPackingLineChange}
                        onChange={this.handleDisplayPackingLineChange} />
                    <label className="btn btn-outline-secondary btn-sm" htmlFor="schedule-display-packing-line-all">全部</label>

                    {this.props.lines.map(row => {
                        return <React.Fragment key={row.LINE_ID}>
                            <input type="radio"
                                className="btn-check"
                                name="schedule-display-packing-line"
                                id={'schedule-display-packing-line-' + row.LINE_ID}
                                value={row.LINE_NAME}
                                onClick={this.handleDisplayPackingLineChange}
                                onChange={this.handleDisplayPackingLineChange} />
                            <label className="btn btn-outline-secondary btn-sm" htmlFor={'schedule-display-packing-line-' + row.LINE_ID}>{row.LINE_NAME}</label>
                        </React.Fragment>;
                    })}
                </div>
            </div>

            <div className="packing-handsontable-container bg-initial flex-grow-1 flex-shrink-1">
                <HotTable ref={this.hotTableComponent}
                    licenseKey="non-commercial-and-evaluation"
                    cells={this.cellsHandler}
                    columns={this.state.columns}
                    colHeaders={this.state.colHeaders}
                    columnSorting={this.state.columnSorting}
                    data={this.state.data}
                    filters={true}
                    rowHeaders={true}
                    manualRowResize={true}
                    manualColumnResize={true}
                    language="zh-TW"
                    renderAllRows={true}
                    autoColumnSize={false}
                    minSpareRows={0}
                    rowHeights={25}
                    readOnly={!this.props.isAdmin}
                    hiddenColumns={this.state.hiddenColumns}
                    viewportColumnRenderingOffset={50}
                />
            </div>
        </>;
    }
}

PackingSchedule.propTypes = {
    isAdmin: PropTypes.bool,
    lines: PropTypes.array,
    materials: PropTypes.array,
    notes: PropTypes.array,
    pallets: PropTypes.array,
    printers: PropTypes.array,
    prints: PropTypes.array,
    prodLines: PropTypes.array,
    shifts: PropTypes.array,
    silos: PropTypes.array,
    weightSpecs: PropTypes.array,
    setSelectedSchedule: PropTypes.func,
};

PackingSchedule.defaultProps = {
    isAdmin: false,
    lines: [],
    materials: [],
    notes: [],
    pallets: [],
    printers: [],
    prints: [],
    prodLines: [],
    shifts: [],
    silos: [],
    weightSpecs: [],
    setSelectedSchedule: () => { },
};