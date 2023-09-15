import React, { Component } from 'react';
import axios from 'axios';
import { HotTable } from '@handsontable/react';
import Handsontable from 'handsontable';
import 'handsontable/languages/zh-TW.js';
import moment from 'moment';
import PropTypes from 'prop-types';
import Swal from 'sweetalert2';
import { toast } from 'react-toastify';
import { formatPackingBottom, formatPackingDupontPrint, isPackingStatusFinish } from './PackingUtils';
import Utils from '../Utils';

//計算包裝總計
function calcPackingSummary(scheduleData, packingDetails) {
    if (!scheduleData || !packingDetails) {
        return {};
    }
    const packingWeightSpec = scheduleData ? scheduleData.PACKING_WEIGHT_SPEC : 0;

    let packingQuantity = 0; //包裝數量
    let packingWeight = 0; //包裝總重量
    for (let i = 0; i < packingDetails.length; i++) {
        const row = packingDetails[i];

        if ('number' !== typeof row.DETAIL_SEQ_START) {
            row.DETAIL_SEQ_START = 0;
        }
        if ('number' !== typeof row.DETAIL_SEQ_END) {
            row.DETAIL_SEQ_END = 0;
        }
        if ('number' !== typeof row.SEQ_ERROR_COUNT) {
            row.SEQ_ERROR_COUNT = 0;
        }

        //總包數
        const packingNumber = Math.max(0, ~~(row.DETAIL_SEQ_END - row.DETAIL_SEQ_START + 1 - row.SEQ_ERROR_COUNT));
        packingQuantity += packingNumber;
    }
    packingWeight = packingQuantity * packingWeightSpec;

    const newState = {
        packingQuantity: packingQuantity,
        packingWeight: packingWeight,
    };

    return newState;
}

//產生棧板資料
function generateDetailRow(selectedSchedule, packingDetails, packingNumber) {
    const row = {
        PACKING_SEQ: selectedSchedule.PACKING_SEQ,
        DETAIL_ID: packingDetails.length + 1,
        PALLET_NO: '列印後自動產生',
        PRD_PC: selectedSchedule.PRD_PC,
        LOT_NO: selectedSchedule.LOT_NO,
        DETAIL_SEQ_START: selectedSchedule.SEQ_START,
        DETAIL_SEQ_END: 40,
        SEQ_ERROR_COUNT: 0,
    };
    if (packingDetails.length) {
        row.DETAIL_SEQ_START = packingDetails[packingDetails.length - 1].DETAIL_SEQ_END + 1;
    }
    row.DETAIL_SEQ_END = row.DETAIL_SEQ_START + packingNumber - 1;

    return row;
}

export default class PackingWork extends Component {

    constructor(props) {
        super(props);

        this.state = {
            isLoading: false,
            selectedSchedule: {},
            packingQuantity: 0, //包裝數量
            packingWeight: 0, //包裝總重量
            printerIP: '', //標籤機IP
            packingDetails: [],
            isPackingFinish: false, //是否包裝完成
            packingNumber: 40, //每個棧板的包裝數量
            columns: [
                { data: 'PALLET_NO', type: 'text', width: 160, className: 'htCenter htMiddle', readOnly: true, },
                { data: 'DETAIL_SEQ_START', type: 'numeric', width: 50, className: 'htCenter htMiddle', allowInvalid: false, },
                { data: 'DETAIL_SEQ_END', type: 'numeric', width: 50, className: 'htCenter htMiddle', allowInvalid: false, },
                { data: 'SEQ_ERROR_COUNT', type: 'numeric', width: 60, className: 'htCenter htMiddle', allowInvalid: false, },
                {
                    data: 'CONFIRM_BTN',
                    width: 90,
                    readOnly: true,
                    renderer: (instance, td, row, col, prop, value, cellProperties) => {
                        const rowData = instance.getSourceDataAtRow(cellProperties.row);

                        const div = document.createElement('DIV');
                        if (rowData.CONFIRM_TIME) {
                            div.innerHTML = moment(rowData.CONFIRM_TIME).format('YYYY/MM/DD HH:mm:ss');
                        } else {
                            const icon = document.createElement('SPAN');
                            icon.className = 'icon bi-check';
                            icon.innerHTML = ' 確認';

                            const btn = document.createElement('BUTTON');
                            btn.className = 'btn btn-outline-info btn-sm px-1 py-0 nowrap align-top';
                            btn.appendChild(icon);

                            Handsontable.dom.addEvent(btn, 'click', async () => {
                                //console.log(row, col, prop, value, cellProperties);
                                btn.disabled = true;
                                await this.confirmPackingDetail(instance, cellProperties.row);
                                btn.disabled = false;
                            });

                            div.appendChild(btn);
                        }

                        Handsontable.dom.empty(td);
                        td.appendChild(div);
                        td.classList.add('htCenter');
                        td.classList.add('htMiddle');
                    },
                },
                {
                    data: 'PRINT_BTN',
                    width: 80,
                    readOnly: true,
                    renderer: (instance, td, row, col, prop, value, cellProperties) => {
                        const icon = document.createElement('SPAN');
                        icon.className = 'icon bi-printer';
                        icon.innerHTML = ' 列印';

                        const printStatus = document.createElement('SPAN');
                        printStatus.classList.add('text-muted');

                        const btn = document.createElement('BUTTON');
                        btn.className = 'btn btn-outline-info btn-sm px-1 py-0 nowrap align-top';
                        btn.appendChild(icon);

                        Handsontable.dom.addEvent(btn, 'click', async () => {
                            //console.log(row, col, prop, value, cellProperties);
                            btn.disabled = true;
                            await this.printLabel(instance, cellProperties.row, printStatus);
                            btn.disabled = false;
                        });

                        const div = document.createElement('DIV');
                        div.appendChild(btn);
                        div.appendChild(printStatus);

                        Handsontable.dom.empty(td);
                        td.appendChild(div);
                        td.classList.add('htCenter');
                        td.classList.add('htMiddle');

                        const rowData = instance.getSourceDataAtRow(cellProperties.row);
                        if (rowData.PRINT_LABEL_TIME) {
                            printStatus.innerText = '已列印';
                            td.title = '列印時間: ' + moment(rowData.PRINT_LABEL_TIME).format('YYYY/MM/DD HH:mm:ss');
                        }
                    },
                },
                {
                    data: 'PRINT_LABEL_TIME',
                    type: 'text',
                    width: 100,
                    readOnly: true,
                    renderer: (instance, td, row, col, prop, value/*, cellProperties*/) => {
                        Handsontable.dom.empty(td);
                        td.classList.add('htCenter');
                        td.classList.add('htMiddle');
                        if (value) {
                            td.innerHTML = moment(value).format('YYYY/MM/DD HH:mm:ss');
                        }
                    },
                },
                {
                    data: 'PHOTO_STATUS',
                    width: 120,
                    readOnly: true,
                    renderer: (instance, td, row, col, prop, value, cellProperties) => {
                        const rowData = instance.getSourceDataAtRow(cellProperties.row);

                        Handsontable.dom.empty(td);
                        td.classList.add('htCenter');
                        td.classList.add('htMiddle');
                        if (rowData.PHOTO_URL) {
                            const icon = document.createElement('SPAN');
                            icon.className = 'icon bi-image';
                            icon.innerHTML = ' 照片';

                            const link = document.createElement('A');
                            link.classList.add('px-2');
                            link.href = rowData.PHOTO_URL;
                            link.target = 'packing';
                            link.rel = 'noreferrer noopener';
                            link.innerHTML = '';
                            link.appendChild(icon);
                            td.appendChild(link);
                            // return;
                        }

                        const fileInput = document.createElement('INPUT');
                        fileInput.type = 'file';
                        fileInput.accept = 'image/*';
                        fileInput.capture = 'environment';
                        Handsontable.dom.addEvent(fileInput, 'change', event => {
                            //console.log(row, col, prop, value, cellProperties);
                            this.imageChangeHandler(instance, cellProperties.row, event);
                        });
                        td.appendChild(fileInput);
                    },
                },
                {
                    data: 'DETAIL_NOTE', type: 'text', width: 80, className: 'htCenter htMiddle', readOnly: true,
                    renderer: (instance, td, row, col, prop, value, cellProperties) => {
                        const rowData = instance.getSourceDataAtRow(cellProperties.row);
                        Handsontable.dom.empty(td);
                        td.classList.add('htCenter');
                        td.classList.add('htMiddle');
                        if (rowData.IS_CONTINUE) {
                            if (value) {
                                value += '(續包)';
                            } else {
                                value = '(續包)';
                            }
                        }
                        if (value) {
                            td.innerHTML = value;
                        }
                    },
                },
                { data: 'CREATE_USER_NAME', type: 'text', width: 100, className: 'htCenter htMiddle', readOnly: true, },
                {
                    data: 'INV_TIME',
                    type: 'text',
                    width: 100,
                    readOnly: true,
                    renderer: (instance, td, row, col, prop, value/*, cellProperties*/) => {
                        Handsontable.dom.empty(td);
                        td.classList.add('htCenter');
                        td.classList.add('htMiddle');
                        if (value) {
                            td.innerHTML = moment(value).format('YYYY/MM/DD HH:mm:ss');
                        }
                    },
                },
            ],
            hiddenColumns: {
                columns: [0, 6, 8, 9, 10],
                indicators: false,
            },
            colHeaders: [
                '棧板編號', '起始<br />序號', '結束<br />序號', '序號<br />異常數', '確認',
                '列印標籤', '列印時間', '拍照', '包裝備註', '包裝人員',
                '過帳時間',
            ],
            needCheckPrintLabel: true, //是否要檢查標籤列印完成
            needCheckPrintInterval: true, //是否要檢查標籤列印的間隔時間不可太短
        };

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
        hotInstance.addHook('afterGetRowHeader', (row, TH) => {
            TH.className = 'htMiddle';
        });

        //根據畫面寬度調整顯示欄位
        if (window.innerWidth >= 425) {
            const hiddenColumns = this.state.hiddenColumns;
            //電腦版畫面 顯示 棧板編號、列印時間、包裝備註、包裝人員
            if (0 === hiddenColumns.columns.indexOf(0)) {
                hiddenColumns.columns.shift();
                hiddenColumns.columns.shift();
                hiddenColumns.columns.shift();
                hiddenColumns.columns.shift();
                this.setState({
                    hiddenColumns: hiddenColumns,
                });
            }
        }

        //根據廠別使用特殊規則
        const firm = Utils.getFirmFromLocalStorage();
        const newState = {};
        if (firm) {
            //是否必須完成列印才能產生下一筆
            newState.needCheckPrintLabel = ('A' === firm) ? false : true;
            //列印的間隔時間太短就不允許列印
            newState.needCheckPrintInterval = ('A' === firm) ? false : true;
        }
        this.setState(newState);
    }

    componentWillUnmount() {
        this.isUnmount = true;
        if (this.queryApiCancelToken) {
            this.queryApiCancelToken.cancel('componentWillUnmount');
        }
    }

    static getDerivedStateFromProps(props, state) {
        if (props.selectedSchedule !== state.selectedSchedule) {
            const selectedSchedule = props.selectedSchedule;
            const isPackingFinish = (selectedSchedule && isPackingStatusFinish(selectedSchedule.PACKING_STATUS));
            //計算每個棧板的包裝數量
            let packingNumber = 40;
            if (selectedSchedule && selectedSchedule.PACKING_WEIGHT_SPEC) {
                if (selectedSchedule.PACKING_MATERIAL_ID && selectedSchedule.PACKING_MATERIAL_ID.length) {
                    const materialIdPrefix = selectedSchedule.PACKING_MATERIAL_ID[0];
                    if ('T' === materialIdPrefix || 'C' === materialIdPrefix) {
                        //T太空袋、C八角箱
                        packingNumber = 1;
                    }
                }
                selectedSchedule.packingNumber = packingNumber;
            }

            const packingDetails = props.packingDetails.slice();
            //如果同工令排程的最後一個棧板有標記"續包"
            //就自動帶入對應的序號
            if (!packingDetails.length && props.prevDetail.length) {
                const prevDetail = props.prevDetail[0];
                if (prevDetail.IS_CONTINUE) {
                    const row = generateDetailRow(selectedSchedule, packingDetails, packingNumber);
                    row.DETAIL_NOTE = '續包棧板';
                    row.DETAIL_SEQ_START = prevDetail.DETAIL_SEQ_END + 1;
                    row.LABEL_SEQ_START = prevDetail.LABEL_SEQ_START || prevDetail.DETAIL_SEQ_START;
                    row.DETAIL_SEQ_END = row.LABEL_SEQ_START + packingNumber - 1 + prevDetail.SEQ_ERROR_COUNT;
                    row.LABEL_SEQ_END = row.DETAIL_SEQ_END;
                    packingDetails.push(row);
                    //console.log(row);
                }
            }

            const packingSummary = calcPackingSummary(props.selectedSchedule, packingDetails);

            const newState = {
                selectedSchedule: selectedSchedule,
                packingDetails: packingDetails,
                isPackingFinish: isPackingFinish,
                packingNumber: packingNumber,
                ...packingSummary,
            };

            //根據排程帶入預設的標籤機
            if (props.printers.length) {
                if (props.user && ['1', '2'].includes(props.user.FIRM)) {
                    //台北測試
                    newState.printerIP = '192.168.102.185';
                } else if (props.selectedSchedule && props.selectedSchedule.DEFAULT_PRINTER_IP) {
                    newState.printerIP = props.selectedSchedule.DEFAULT_PRINTER_IP;
                } else {
                    newState.printerIP = props.printers[0].PRINTER_IP;
                }
            }

            return newState;
        }
        return null;
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

    //產生棧板編號
    generatePackingDetail = async () => {
        const selectedSchedule = this.props.selectedSchedule;

        if (!selectedSchedule) {
            toast.error('請先從包裝排程中選取資料');
            return;
        }

        //計算每個棧板的包數
        const packingNumber = this.state.packingNumber;

        const data = this.state.packingDetails;
        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            if (!row.CONFIRM_TIME) {
                toast.warn(`包裝項次#${row.DETAIL_ID} 尚未確認`);
                return;
            }
            if (this.state.needCheckPrintLabel && !row.PRINT_LABEL_TIME) {
                toast.warn(`包裝項次#${row.DETAIL_ID} 尚未列印標籤`);
                return;
            }
            //TODO: 2023-02-17 暫停檢查拍照
            // if (!row.PHOTO_URL) {
            //     toast.warn(`包裝項次#${row.DETAIL_ID} 尚未完成拍照`);
            //     return;
            // }
        }
        const row = generateDetailRow(selectedSchedule, data, packingNumber);
        data.push(row);

        const packingSummary = calcPackingSummary(selectedSchedule, data);
        this.setState({
            ...packingSummary,
            packingDetails: data,
            packingNumber: packingNumber,
        });

        const hotInstance = this.hotTableComponent.current.hotInstance;
        if (!hotInstance) {
            console.warn('hotInstance is null');
            return;
        }
        hotInstance.updateData(data, 'generatePackingDetail');
    }

    //檢查包裝序號是否重複
    isSeqOverlap = (index) => {
        const data = this.state.packingDetails;
        const targetRow = data[index];
        if (!targetRow) {
            return false;
        }

        for (let i = 0; i < data.length; i++) {
            //跳過自己那筆
            if (index === i) {
                continue;
            }
            const row = data[i];
            if (row.DETAIL_SEQ_START <= targetRow.DETAIL_SEQ_END && row.DETAIL_SEQ_END >= targetRow.DETAIL_SEQ_START) {
                return true;
            }
        }

        return false;
    }

    //確認完成
    confirmPackingDetail = async (hotInstance, index) => {
        const rowData = hotInstance.getSourceDataAtRow(index);
        if (this.isSeqOverlap(index)) {
            toast.warn(`包裝項次#${rowData.DETAIL_ID} 序號重複，請重新輸入`);
            return;
        }

        //確認是否續包
        let packingNumber = Math.max(0, ~~(rowData.DETAIL_SEQ_END - (rowData.LABEL_SEQ_START || rowData.DETAIL_SEQ_START) + 1 - rowData.SEQ_ERROR_COUNT));
        if (this.state.packingNumber > 1 && packingNumber < this.state.packingNumber) {
            const confirmResult = await Swal.fire({
                title: '本棧板是否續包?',
                text: `包裝項次#${rowData.DETAIL_ID} 不足${this.state.packingNumber}包，是否要接續到下一個包裝排程`,
                showCancelButton: true,
                confirmButtonText: '確認續包',
                cancelButtonText: '不續包',
            });
            if (confirmResult.isConfirmed) {
                rowData.IS_CONTINUE = 1;
                rowData.LABEL_SEQ_START = rowData.DETAIL_SEQ_START;
                rowData.LABEL_SEQ_END = rowData.DETAIL_SEQ_END;
            } else {
                rowData.IS_CONTINUE = null;
                if ('續包棧板' !== rowData.DETAIL_NOTE) {
                    rowData.LABEL_SEQ_START = null;
                    rowData.LABEL_SEQ_END = null;
                }
            }
        } else {
            rowData.IS_CONTINUE = null;
            if ('續包棧板' !== rowData.DETAIL_NOTE) {
                rowData.LABEL_SEQ_START = null;
                rowData.LABEL_SEQ_END = null;
            }
        }

        //產生確認時間
        if (!rowData.CONFIRM_TIME) {
            return this.savePackingDetail(hotInstance, index).then(res => {
                if (res && res.length) {
                    toast.success(`包裝項次#${rowData.DETAIL_ID} 確認完成`);
                    const detail = res[0];
                    const sourceData = hotInstance.getSourceData();
                    if (sourceData[index]) {
                        sourceData[index] = rowData;
                        rowData.CONFIRM_TIME = new Date(detail.CONFIRM_TIME);
                        rowData.PACKING_STATUS = detail.PACKING_STATUS;
                        hotInstance.updateData(sourceData, 'confirmPackingDetail');
                        this.setState({ packingDetails: sourceData });
                    }
                } else {
                    rowData.CONFIRM_TIME = null;
                }
            });
        }
    }

    //列印標籤
    printLabel = async (hotInstance, index, printStatusElement) => {
        const rowData = hotInstance.getSourceDataAtRow(index);

        if (!rowData.CONFIRM_TIME) {
            toast.warn(`包裝項次#${rowData.DETAIL_ID} 尚未完成確認`);
            return;
        }

        if (this.isSeqOverlap(index)) {
            toast.warn(`包裝項次#${rowData.DETAIL_ID} 序號重複，請重新輸入`);
            return;
        }

        const scheduleData = this.state.selectedSchedule;
        rowData.PACKING_STATUS = scheduleData.PACKING_STATUS;
        const printerData = this.props.printers.find(printer => printer.PRINTER_IP === this.state.printerIP);
        //console.log('printLabel', scheduleData, rowData, printerData);

        if (!scheduleData) {
            toast.warn('包裝排程資料為空，請重新操作');
            return;
        }
        if (!rowData) {
            toast.warn('包裝項次資料為空，請重新操作');
            return;
        }
        if (!printerData) {
            toast.warn('標籤機資料為空，請重新操作');
            return;
        }

        if (this.state.needCheckPrintInterval && scheduleData.MIN_PACKING_INTERVAL && (index > 0)) {
            //檢查前一筆的列印時間，不可少於指定的分鐘數
            const prevDetailData = this.state.packingDetails[index - 1];
            if (prevDetailData && prevDetailData.PRINT_LABEL_TIME) {
                const prevPrintTime = new Date(prevDetailData.PRINT_LABEL_TIME);
                console.log('前一筆的標籤列印時間', prevPrintTime);
                if (!isNaN(prevPrintTime)) {
                    const printInterval = Date.now() - prevPrintTime.getTime();
                    if (printInterval < scheduleData.MIN_PACKING_INTERVAL * 60000) {
                        toast.warn(`標籤列印的間隔時間不可少於 ${scheduleData.MIN_PACKING_INTERVAL}分鐘，請稍後再印`);
                        return;
                    }
                }
            }
        }

        //確認是否續包
        let packingNumber = Math.max(0, ~~(rowData.DETAIL_SEQ_END - (rowData.LABEL_SEQ_START || rowData.DETAIL_SEQ_START) + 1 - rowData.SEQ_ERROR_COUNT));
        if (this.state.packingNumber > 1 && packingNumber < this.state.packingNumber) {
            const confirmResult = await Swal.fire({
                title: '本棧板是否續包?',
                text: `包裝項次#${rowData.DETAIL_ID} 不足${this.state.packingNumber}包，是否要接續到下一個包裝排程`,
                showCancelButton: true,
                confirmButtonText: '確認續包',
                cancelButtonText: '不續包',
            });
            if (confirmResult.isConfirmed) {
                rowData.IS_CONTINUE = 1;
                rowData.LABEL_SEQ_START = rowData.DETAIL_SEQ_START;
                rowData.LABEL_SEQ_END = rowData.DETAIL_SEQ_END;
            } else {
                rowData.IS_CONTINUE = null;
                if ('續包棧板' !== rowData.DETAIL_NOTE) {
                    rowData.LABEL_SEQ_START = null;
                    rowData.LABEL_SEQ_END = null;
                }
            }
        } else {
            rowData.IS_CONTINUE = null;
            if ('續包棧板' !== rowData.DETAIL_NOTE) {
                rowData.LABEL_SEQ_START = null;
                rowData.LABEL_SEQ_END = null;
            }
        }

        if (printStatusElement) {
            printStatusElement.innerHTML = '列印中...';
        }
        const apiUrl = Utils.generateApiUrl('/packing/printLabel');
        const apiData = {
            scheduleData: scheduleData,
            detailData: rowData,
            printerData: printerData,
        };
        this.queryApiCancelToken = axios.CancelToken.source();
        return axios.post(apiUrl, apiData, {
            ...Utils.pbtAxiosConfig,
            cancelToken: this.queryApiCancelToken.token,
            timeout: 10000,
        }).then(res => {
            if (!res.data.error) {
                //更新列印時間
                if (res.data.detailData) {
                    const sourceData = hotInstance.getSourceData();
                    if (sourceData[index]) {
                        sourceData[index] = res.data.detailData;
                        hotInstance.updateData(sourceData, 'printLabel');
                        this.setState({ packingDetails: sourceData });
                    }
                    this.savePackingDetail(hotInstance, index);
                }
                if (printStatusElement) {
                    printStatusElement.innerHTML = '已列印';
                }
                return res.data.res;
            } else {
                toast.error(`列印標籤失敗，${res.data.error}`);
                if (printStatusElement) {
                    printStatusElement.innerHTML = '列印失敗';
                }
            }
        }).catch(err => {
            //除了api取消以外都要顯示錯誤訊息
            if (!axios.isCancel(err)) {
                console.error(err);
                toast.error(`列印標籤失敗。\n錯誤訊息: ${err.toString()}`);
                if (printStatusElement) {
                    printStatusElement.innerHTML = '列印失敗';
                }
            }
        });
    }

    //拍照onChange
    imageChangeHandler = async (hotInstance, index, event) => {
        if (!event || !event.target) {
            return;
        }
        if (!event.target.files) {
            return;
        }

        const rowData = hotInstance.getSourceDataAtRow(index);

        if (!rowData.PRINT_LABEL_TIME) {
            toast.warn(`包裝項次#${rowData.DETAIL_ID} 尚未完成列印標籤`);
            return;
        }

        console.log('imageChangeHandler', rowData, event.target.files);

        const file = event.target.files[0];

        const confirmResult = await Swal.fire({
            title: `包裝項次#${rowData.DETAIL_ID} 預覽照片`,
            imageUrl: URL.createObjectURL(file),
            imageHeight: 320,
            imageAlt: 'image',
            showCancelButton: true,
            confirmButtonText: '確認上傳',
            cancelButtonText: '取消',
        });
        if (!confirmResult.isConfirmed) {
            event.target.value = ''; //清空照片
            return;
        }

        return this.imageUpload(hotInstance, index, file);
    }

    //拍照上傳
    imageUpload = (hotInstance, index, file) => {
        if (!file) {
            toast.error('無法讀取檔案，請重新操作一次');
            return;
        }

        const rowData = hotInstance.getSourceDataAtRow(index);
        rowData.PACKING_STATUS = this.state.selectedSchedule.PACKING_STATUS;
        console.log('imageUpload', rowData, file);

        //呼叫後端
        this.setState({ isLoading: true });

        const apiUrl = Utils.generateApiUrl('/packing/uploadImage');
        const formData = new FormData();
        formData.append('detailData', JSON.stringify(rowData));
        formData.append('image', file);

        this.queryApiCancelToken = axios.CancelToken.source();
        return axios.post(apiUrl, formData, {
            ...Utils.pbtAxiosConfig,
            cancelToken: this.queryApiCancelToken.token,
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 10000,
        }).then(res => {
            if (!res.data.error) {
                //更新照片URL
                if (res.data.detailData) {
                    const sourceData = hotInstance.getSourceData();
                    if (sourceData[index]) {
                        sourceData[index] = res.data.detailData;
                        hotInstance.updateData(sourceData, 'imageUpload');
                        this.setState({ packingDetails: sourceData });
                    }
                }
                toast.success(`包裝項次#${rowData.DETAIL_ID} 照片上傳成功`);
                return res.data.res;
            } else {
                toast.error(`包裝項次#${rowData.DETAIL_ID} 照片上傳失敗，${res.data.error}`);
            }
        }).catch(err => {
            //除了api取消以外都要顯示錯誤訊息
            if (!axios.isCancel(err)) {
                console.error(err);
                toast.error(`包裝項次#${rowData.DETAIL_ID} 照片上傳失敗。\n錯誤訊息: ${err.toString()}`);
            }
        }).then(() => {
            this.setState({ isLoading: false });
        });
    }

    //儲存包裝項次
    savePackingDetail = (hotInstance, index) => {
        const rowData = hotInstance.getSourceDataAtRow(index);
        console.log('savePackingDetail', index, rowData);

        //呼叫後端儲存
        this.setState({ isLoading: true });
        const apiUrl = Utils.generateApiUrl('/packing/savePackingDetail');
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
                    return res.data.res;
                } else {
                    toast.error('包裝項次儲存失敗');
                }
            } else {
                toast.error(`包裝項次儲存失敗，${res.data.error}`);
            }
        }).catch(err => {
            //除了api取消以外都要顯示錯誤訊息
            if (!axios.isCancel(err)) {
                console.error(err);
                toast.error(`包裝項次儲存失敗。\n錯誤訊息: ${err.toString()}`);
            }
        }).then(res => {
            this.setState({ isLoading: false });
            return res;
        });
    }

    //包裝結束
    finishPacking = async () => {
        const confirmResult = await Swal.fire({
            title: '請確認是否要結束包裝?',
            text: `包裝數量: ${this.state.packingQuantity}、包裝重量: ${this.state.packingWeight}`,
            showCancelButton: true,
            confirmButtonText: '確認',
            cancelButtonText: '取消',
        });
        if (!confirmResult.isConfirmed) {
            return;
        }

        const data = this.state.packingDetails;
        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            if (!row.CONFIRM_TIME) {
                toast.warn(`包裝項次#${row.DETAIL_ID} 尚未確認`);
                return;
            }
            if (this.state.needCheckPrintLabel && !row.PRINT_LABEL_TIME) {
                toast.warn(`包裝項次#${row.DETAIL_ID} 尚未列印標籤`);
                return;
            }
            //TODO: 2023-02-17 暫停檢查拍照
            // if (!row.PHOTO_URL) {
            //     toast.warn(`包裝項次#${row.DETAIL_ID} 尚未完成拍照`);
            //     return;
            // }
        }

        const scheduleData = this.state.selectedSchedule;
        if (!scheduleData) {
            toast.warn('包裝排程資料為空，請重新操作');
            return;
        }

        //呼叫後端
        this.setState({ isLoading: true });

        const apiUrl = Utils.generateApiUrl('/packing/finishPacking');
        const apiData = {
            scheduleData: scheduleData,
        };
        this.queryApiCancelToken = axios.CancelToken.source();
        return axios.post(apiUrl, apiData, {
            ...Utils.pbtAxiosConfig,
            cancelToken: this.queryApiCancelToken.token,
            timeout: 10000,
        }).then(res => {
            if (!res.data.error) {
                if (res.data.res) {
                    const packingDetails = this.state.packingDetails;
                    if (res.data.INV_TIME) {
                        packingDetails.forEach(row => {
                            row.INV_TIME = res.data.INV_TIME;
                        });
                    }
                    scheduleData.PACKING_STATUS = '已完成';
                    this.setState({
                        packingDetails: packingDetails,
                        scheduleData: scheduleData,
                        isPackingFinish: true,
                    });
                    toast.success('包裝結束成功，請返回包裝排程');
                    this.props.refreshPackingSchedule();
                    return res.data.res;
                } else {
                    toast.error('包裝結束失敗，請重新操作');
                }
            } else {
                toast.error(`包裝結束失敗，${res.data.error}`);
            }
        }).catch(err => {
            //除了api取消以外都要顯示錯誤訊息
            if (!axios.isCancel(err)) {
                console.error(err);
                toast.error(`包裝結束失敗。\n錯誤訊息: ${err.toString()}`);
            }
        }).then(() => {
            this.setState({ isLoading: false });
        });
    }

    //顯示殘包列印畫面
    showRemainderPrint = async () => {
        const scheduleData = this.state.selectedSchedule;
        const printerData = this.props.printers.find(printer => printer.PRINTER_IP === this.state.printerIP);
        if (!scheduleData) {
            toast.warn('包裝排程資料為空，請重新操作');
            return;
        }
        if (!printerData) {
            toast.warn('標籤機資料為空，請重新操作');
            return;
        }

        const saConfig = {
            title: '輸入殘包重量(KG)',
            input: 'text',
            inputAttributes: {},
            inputValue: this.state.selectedSchedule.REMAINDER_WEIGHT || '',
            inputValidator: (value) => {
                const num = Number(value);
                if (isNaN(num) || '' === value) {
                    return '輸入格式必須為數字';
                }
                if (num < 0) {
                    return '重量必須大於等於0';
                }
            },
            showCancelButton: true,
            confirmButtonText: '確認列印',
            cancelButtonText: '取消',
        };
        //是否有列印過
        if (this.state.selectedSchedule.REMAINDER_NO) {
            saConfig.inputLabel = `標籤編號: ${this.state.selectedSchedule.REMAINDER_NO}`;
            saConfig.inputAttributes.readonly = true;
            saConfig.inputAttributes.disabled = true;
            saConfig.confirmButtonText = '補印標籤';
        }
        const confirmResult = await Swal.fire(saConfig);
        // console.log(confirmResult);
        if (!confirmResult.isConfirmed) {
            return;
        }
        scheduleData.REMAINDER_WEIGHT = Number(confirmResult.value);

        //呼叫列印API
        const apiUrl = Utils.generateApiUrl('/packing/printRemainderLabel');
        const apiData = {
            scheduleData: scheduleData,
            printerData: printerData,
        };
        this.queryApiCancelToken = axios.CancelToken.source();
        return axios.post(apiUrl, apiData, {
            ...Utils.pbtAxiosConfig,
            cancelToken: this.queryApiCancelToken.token,
            timeout: 10000,
        }).then(res => {
            if (!res.data.error) {
                //更新列印時間
                if (res.data.schedule) {
                    const selectedSchedule = this.state.selectedSchedule;
                    selectedSchedule.REMAINDER_NO = res.data.schedule.REMAINDER_NO;
                    selectedSchedule.REMAINDER_WEIGHT = res.data.schedule.REMAINDER_WEIGHT;
                    selectedSchedule.REMAINDER_PRINT_LABEL_TIME = res.data.schedule.REMAINDER_PRINT_LABEL_TIME;
                    this.props.refreshPackingSchedule();
                    toast.success('列印殘包標籤完成');
                }
                return res.data.res;
            } else {
                toast.error(`列印殘包標籤失敗，${res.data.error}`);
            }
        }).catch(err => {
            //除了api取消以外都要顯示錯誤訊息
            if (!axios.isCancel(err)) {
                console.error(err);
                toast.error(`列印殘包標籤失敗。\n錯誤訊息: ${err.toString()}`);
            }
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
                let [row, prop, /*oldValue*/, newValue] = changes[i];

                const rowData = data[row];
                switch (prop) {
                    case 'DETAIL_SEQ_START':
                    case 'SEQ_ERROR_COUNT':
                        {
                            rowData.DETAIL_SEQ_END = rowData.DETAIL_SEQ_START + this.state.packingNumber + rowData.SEQ_ERROR_COUNT - 1;
                            if ('續包棧板' === rowData.DETAIL_NOTE) {
                                rowData.DETAIL_SEQ_END = rowData.LABEL_SEQ_START + this.state.packingNumber + rowData.SEQ_ERROR_COUNT - 1;
                            }
                            rowData.LABEL_SEQ_END = rowData.DETAIL_SEQ_END;
                            const packingSummary = calcPackingSummary(this.state.selectedSchedule, data);
                            this.setState(packingSummary);
                        }
                        break;
                    case 'DETAIL_SEQ_END':
                        {
                            rowData.LABEL_SEQ_END = rowData.DETAIL_SEQ_END;
                            const packingNumber = rowData.DETAIL_SEQ_END - rowData.DETAIL_SEQ_START + 1;
                            if (packingNumber > this.state.packingNumber) {
                                const errorCount = packingNumber - this.state.packingNumber;
                                if (errorCount !== rowData.SEQ_ERROR_COUNT) {
                                    rowData.SEQ_ERROR_COUNT = errorCount;
                                    updated = true;
                                }
                            }
                            const packingSummary = calcPackingSummary(this.state.selectedSchedule, data);
                            this.setState(packingSummary);
                        }
                        break;
                    case 'CUST_PRD_PC':
                        {
                            const target = this.props.prints.find(row => (row.CUST_PRD_PC === newValue));
                            rowData.PACKING_GRADE = target ? target.GRADE : null;
                            rowData.PACKING_COLOR = target ? target.COLOR : null;
                            rowData.PACKING_BOTTOM = target ? target.BOTTOM : null;
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
            if (data !== this.state.packingDetails) {
                this.setState({ packingDetails: data });
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
        switch (prop) {
            case 'DETAIL_SEQ_START':
                //包裝結束後不可修改
                if (this.state.isPackingFinish || (rowData.DETAIL_NOTE === '續包棧板')) {
                    cellProperties.readOnly = true;
                }
                break;
            case 'DETAIL_SEQ_END':
            case 'SEQ_ERROR_COUNT':
                //包裝結束後不可修改
                if (this.state.isPackingFinish) {
                    cellProperties.readOnly = true;
                }
                break;
            default:
                break;
        }
        // console.log(row, col, prop, rowData, cellProperties);
        return cellProperties;
    }

    render() {
        const { isLoading, selectedSchedule, isPackingFinish } = this.state;
        const { user } = this.props;
        return <>
            <div className="packing-work-container mb-2">
                <div className="packing-work-group-row">
                    <div className="form-group">
                        <label>包裝人員</label>
                        <input type="text"
                            className="form-control form-control-sm"
                            value={user ? user.NAME : ''}
                            readOnly={true}
                            disabled={true} />
                    </div>
                    <div className="form-group">
                        <label>日期</label>
                        <input type="text"
                            className="form-control form-control-sm"
                            value={selectedSchedule ? moment(selectedSchedule.PACKING_DATE).format('YYYY-MM-DD') : ''}
                            readOnly={true}
                            disabled={true} />
                    </div>
                    <div className="form-group">
                        <label>班別</label>
                        <input type="text"
                            className="form-control form-control-sm"
                            value={(selectedSchedule && selectedSchedule.WORK_SHIFT) ? selectedSchedule.WORK_SHIFT : ''}
                            readOnly={true}
                            disabled={true} />
                    </div>
                    <div className="form-group">
                        <label>殘包格位</label>
                        <input type="text"
                            className="form-control form-control-sm remainder-lono"
                            value={(selectedSchedule && selectedSchedule.LONO) ? selectedSchedule.LONO : ''}
                            readOnly={true}
                            disabled={true} />
                    </div>
                </div >
                <div className="packing-work-group-row">
                    <div className="form-group">
                        <label>包裝機</label>
                        <input type="text"
                            className="form-control form-control-sm"
                            value={(selectedSchedule && selectedSchedule.PACKING_LINE_NAME) ? selectedSchedule.PACKING_LINE_NAME : ''}
                            readOnly={true}
                            disabled={true} />
                    </div>
                    <div className="form-group">
                        <label>Silo No.</label>
                        <input type="text"
                            className="form-control form-control-sm"
                            value={(selectedSchedule && selectedSchedule.SILO_NO) ? selectedSchedule.SILO_NO : ''}
                            readOnly={true}
                            disabled={true} />
                    </div>
                    <div className="form-group">
                        <label>成品簡碼</label>
                        <input type="text"
                            className="form-control form-control-sm"
                            value={(selectedSchedule && selectedSchedule.PRD_PC) ? selectedSchedule.PRD_PC : ''}
                            readOnly={true}
                            disabled={true} />
                    </div>
                    <div className="form-group">
                        <label>客戶產品碼</label>
                        <input type="text"
                            className="form-control form-control-sm"
                            value={(selectedSchedule && selectedSchedule.CUST_PRD_PC) ? selectedSchedule.CUST_PRD_PC : ''}
                            readOnly={true}
                            disabled={true} />
                    </div>
                </div>
                <div className="packing-work-group-row">
                    <div className="form-group">
                        <label>Lot No.</label>
                        <input type="text"
                            className="form-control form-control-sm"
                            value={(selectedSchedule && selectedSchedule.LOT_NO) ? selectedSchedule.LOT_NO : ''}
                            readOnly={true}
                            disabled={true} />
                    </div>
                    <div className="form-group">
                        <label>排定產量</label>
                        <input type="text"
                            className="form-control form-control-sm"
                            value={(selectedSchedule && selectedSchedule.ORDER_WEIGHT) ? selectedSchedule.ORDER_WEIGHT : ''}
                            readOnly={true}
                            disabled={true} />
                    </div>
                    <div className="form-group">
                        <label>預定包裝重量</label>
                        <input type="text"
                            className="form-control form-control-sm"
                            value={(selectedSchedule && selectedSchedule.TARGET_WEIGHT) ? selectedSchedule.TARGET_WEIGHT : ''}
                            readOnly={true}
                            disabled={true} />
                    </div>
                    <div className="form-group">
                        <label>包裝別</label>
                        <input type="text"
                            className="form-control form-control-sm"
                            value={(selectedSchedule && selectedSchedule.PACKING_WEIGHT_SPEC) ? selectedSchedule.PACKING_WEIGHT_SPEC : ''}
                            readOnly={true}
                            disabled={true} />
                    </div>
                </div>
                <div className="packing-work-group-row">
                    <div className="form-group">
                        <label>包裝性質</label>
                        <input type="text"
                            className="form-control form-control-sm"
                            value={(selectedSchedule && selectedSchedule.PACKING_MATERIAL) ? selectedSchedule.PACKING_MATERIAL : ''}
                            readOnly={true}
                            disabled={true} />
                    </div>
                    <div className="form-group">
                        <label>棧板別</label>
                        <input type="text"
                            className="form-control form-control-sm"
                            value={(selectedSchedule && selectedSchedule.PACKING_PALLET_NAME) ? selectedSchedule.PACKING_PALLET_NAME : ''}
                            readOnly={true}
                            disabled={true} />
                    </div>
                    <div className="form-group">
                        <label>備註</label>
                        <input type="text"
                            className="form-control form-control-sm"
                            value={(selectedSchedule && selectedSchedule.PACKING_NOTE) ? selectedSchedule.PACKING_NOTE : ''}
                            readOnly={true}
                            disabled={true} />
                    </div>
                </div>
                <div className="packing-work-group-row">
                    <div className="form-group">
                        <label>Grade</label>
                        <input type="text"
                            className="form-control form-control-sm"
                            value={(selectedSchedule && selectedSchedule.PACKING_GRADE) ? selectedSchedule.PACKING_GRADE : ''}
                            readOnly={true}
                            disabled={true} />
                    </div>
                    <div className="form-group">
                        <label>Color</label>
                        <input type="text"
                            className="form-control form-control-sm"
                            value={(selectedSchedule && selectedSchedule.PACKING_COLOR) ? selectedSchedule.PACKING_COLOR : ''}
                            readOnly={true}
                            disabled={true} />
                    </div>
                    <div className="form-group">
                        <label>底部噴印</label>
                        <textarea className="form-control form-control-sm"
                            value={(selectedSchedule && selectedSchedule.PACKING_BOTTOM) ? formatPackingBottom(selectedSchedule.PACKING_BOTTOM, selectedSchedule.PACKING_MATERIAL) : ''}
                            rows={2}
                            readOnly={true}
                            disabled={true}></textarea>
                    </div>
                    <div className="form-group">
                        <label>杜邦品噴印</label>
                        <textarea className="form-control form-control-sm"
                            value={(selectedSchedule && selectedSchedule.DUPONT_PRINT) ? formatPackingDupontPrint(selectedSchedule.DUPONT_PRINT, selectedSchedule.PRD_PC) : ''}
                            rows={2}
                            readOnly={true}
                            disabled={true}></textarea>
                    </div>
                    <div className="form-group">
                        <label>BARLOG噴印</label>
                        <input type="text"
                            className="form-control form-control-sm"
                            value={(selectedSchedule && selectedSchedule.BARLOG_PRINT) ? selectedSchedule.BARLOG_PRINT : ''}
                            readOnly={true}
                            disabled={true} />
                    </div>
                </div>
                <div className="packing-work-group-row">
                    <div className="form-group">
                        <label>包裝選擇</label>
                        <input type="text"
                            className="form-control form-control-sm"
                            value={(selectedSchedule && selectedSchedule.PACKING_SELECT) ? selectedSchedule.PACKING_SELECT : ''}
                            readOnly={true}
                            disabled={true} />
                    </div>
                    <div className="form-group">
                        <label>標籤機</label>
                        <select className="form-control form-select form-select-sm"
                            data-field="printerIP"
                            value={this.state.printerIP}
                            onChange={this.handleChange}>
                            {this.props.printers.map((row, index) => {
                                return <option key={index} value={row.PRINTER_IP}>{row.PRINTER_NAME}</option>;
                            })}
                        </select>
                    </div>
                </div>
                <div className="packing-work-group-row">
                    <div className="form-group">
                        <label>實際包裝數量</label>
                        <input type="number"
                            className="form-control form-control-sm"
                            title="系統自動計算，全部棧板共有幾包"
                            value={this.state.packingQuantity}
                            readOnly={true}
                            disabled={true} />
                    </div>
                    <div className="form-group">
                        <label>實際包裝重量</label>
                        <input type="number"
                            className="form-control form-control-sm"
                            title="系統自動計算，全部棧板的包裝總重量"
                            value={this.state.packingWeight}
                            readOnly={true}
                            disabled={true} />
                    </div>
                    <div className="form-group ps-4">
                        <button type="button"
                            className={'btn btn-sm mt-2 mt-sm-0 me-4' + (isPackingFinish ? ' btn-outline-secondary' : ' btn-outline-danger')}
                            onClick={this.finishPacking}
                            disabled={!selectedSchedule || isLoading || isPackingFinish}>包裝結束</button>
                        <button type="button"
                            className="btn btn-primary btn-sm mt-2 mt-sm-0 me-4"
                            onClick={this.generatePackingDetail}
                            disabled={!selectedSchedule || isLoading || isPackingFinish}>產生棧板編號</button>
                        <button type="button"
                            className="btn btn-primary btn-sm mt-2 mt-sm-0"
                            onClick={this.showRemainderPrint}
                            disabled={!selectedSchedule || isLoading}>殘包列印</button>
                    </div>
                </div>
            </div >

            <div className="packing-handsontable-container packing-details flex-grow-1 flex-shrink-1 mb-1">
                <HotTable ref={this.hotTableComponent}
                    licenseKey="non-commercial-and-evaluation"
                    cells={this.cellsHandler}
                    columns={this.state.columns}
                    colHeaders={this.state.colHeaders}
                    data={this.state.packingDetails}
                    rowHeaders={true}
                    manualRowResize={true}
                    manualColumnResize={true}
                    language="zh-TW"
                    renderAllRows={true}
                    autoColumnSize={false}
                    minSpareRows={0}
                    rowHeights={50}
                    viewportColumnRenderingOffset={50}
                    hiddenColumns={this.state.hiddenColumns}
                    rowHeaderWidth={32}
                />
            </div>
        </>;
    }
}

PackingWork.propTypes = {
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
    selectedSchedule: PropTypes.any,
    packingDetails: PropTypes.array,
    prevDetail: PropTypes.array,
    user: PropTypes.any,
    refreshPackingSchedule: PropTypes.func,
};

PackingWork.defaultProps = {
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
    selectedSchedule: null,
    packingDetails: [],
    prevDetail: [],
    user: {},
    refreshPackingSchedule: () => { },
};