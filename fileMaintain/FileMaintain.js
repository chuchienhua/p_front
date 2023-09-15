import React, { useRef, useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import Utils from '../Utils';
import { registerAllCellTypes } from 'handsontable/cellTypes';
import Handsontable from 'handsontable';
import Swal from 'sweetalert2';
import { HotTable } from '@handsontable/react';
import axios from 'axios';
import { registerAllModules } from 'handsontable/registry';
import { toast } from 'react-toastify';
import PackingExpenseItemsReport from './PackingExpenseItemsReport';
import AuditProduct from './AuditProduct';
import StockSetting from './StockSetting';

function FileMaintain() {

    const user = useSelector(state => state.user); //Global State

    const [mounted, setMounted] = useState(false);

    const [tabName, setTab] = useState('');
    const [authRouteMap, setAuthRouteMap] = useState(null);

    const [feeders, setFeeder] = useState([]);
    const [mixers, setMixer] = useState([]);
    const [bagWeights, setBagWeight] = useState([]);

    const [productNo, setProductNo] = useState('');
    const [hiddenRows, setHiddenRows] = useState([]);

    const feederColumns = [
        {
            data: 'LINE',
            width: 90,
            type: 'text',
            readOnly: true,
        },
        {
            data: 'FEEDER',
            width: 90,
            type: 'text',
            readOnly: true,
        },
        {
            data: 'TOLERANCE_RATIO',
            width: 80,
            type: 'numeric',
        },
        {
            data: 'DEL_BTN',
            width: 80,
            renderer: function (instance, td, row, col, prop, value, cellProperties) {
                const icon = document.createElement('SPAN');
                icon.className = 'icon bi-x-circle';
                icon.innerHTML = ' 移除';

                const btn = document.createElement('DEL_BTN');
                btn.className = 'btn btn-outline-danger btn-sm px-1 py-0 nowrap align-top';
                Handsontable.dom.addEvent(btn, 'click', () => {
                    const selectedLast = instance.getSelectedLast();
                    editList('delete', 'feeder', selectedLast);
                });
                btn.appendChild(icon);

                const div = document.createElement('DIV');
                div.appendChild(btn);

                Handsontable.dom.empty(td);
                td.appendChild(div);
                td.classList.add('htCenter');
                td.classList.add('align-middle');
            }
        },
        {
            data: 'SAVE_BTN',
            width: 80,
            renderer: function (instance, td, row, col, prop, value, cellProperties) {
                const icon = document.createElement('SPAN');
                icon.className = 'icon bi-save';
                icon.innerHTML = ' 儲存';

                const btn = document.createElement('SVAE_BTN');
                btn.className = 'btn btn-outline-success rounded btn-sm px-1 py-0 nowrap align-top';
                btn.appendChild(icon);

                Handsontable.dom.addEvent(btn, 'click', () => {
                    const selectedLast = instance.getSelectedLast();
                    editList('update', 'feeder', selectedLast);
                });

                const div = document.createElement('DIV');
                div.appendChild(btn);

                Handsontable.dom.empty(td);
                td.appendChild(div);
                td.classList.add('htCenter');
                td.classList.add('align-middle');
            }
        }
    ];
    const feederColHeader = ['線別', '入料機名稱', '入料品質<br>誤差比例', '移除', '儲存'];

    const mixerColumn = [
        {
            data: 'MIXER',
            width: 90,
            type: 'text',
            readOnly: true,
        }
    ];
    const mixerColHeader = ['拌粉機名稱'];

    const bagWeightColumn = [
        {
            data: 'PRODUCT_NO',
            width: 120,
            type: 'text',
            readOnly: true,
        },
        {
            data: 'VER',
            width: 60,
            type: 'text',
            readOnly: true,
        },
        {
            data: 'LINE',
            width: 75,
            type: 'text',
            readOnly: true,
        },
        {
            data: 'BAG_WEIGHT',
            width: 90,
            type: 'numeric'
        },
        {
            data: 'UPDATE_BTN',
            width: 80,
            renderer: function (instance, td, row, col, prop, value, cellProperties) {
                const icon = document.createElement('SPAN');
                icon.className = 'icon bi-save';
                icon.innerHTML = ' 修改';

                const btn = document.createElement('UPDATE_BTN');
                btn.className = 'btn btn-outline-success rounded btn-sm px-1 py-0 nowrap align-top';
                btn.appendChild(icon);

                Handsontable.dom.addEvent(btn, 'click', () => {
                    const selectedLast = instance.getSelectedLast();
                    editList('update', 'bagWeight', selectedLast);
                });

                const div = document.createElement('DIV');
                div.appendChild(btn);

                Handsontable.dom.empty(td);
                td.appendChild(div);
                td.classList.add('htCenter');
                td.classList.add('align-middle');
            }
        }
    ];
    const bagWeightColHeader = ['成品簡碼', '配方別', '生產線別', '半成品袋重', '修改'];

    /*
    const [returnHtml, setReturnHtml] = useState('');

    const getPage = () => {
        const apiUrl = Utils.generateApiUrl('/maintainPage', ['printer'])
        axios.get(apiUrl, {
            ...Utils.pbtAxiosConfig,
        }).then(res => {
            console.log(res)
            setReturnHtml(res.data);
        }).catch(err => console.error(err));
    }
    */

    useEffect(() => {
        if (!mounted) {
            const authRouteMap = Utils.getAuthRouteMap();
            setAuthRouteMap(authRouteMap);
            const getMixer = async () => {
                const apiUrl = Utils.generateApiUrl('/mixing/mixer');
                let appendData = [];
                let res = await axios.get(apiUrl, {
                    ...Utils.pbtAxiosConfig,
                });
                if (!res.data.error && 0 < res.data.res.length) {
                    const mixer = res.data.res.map(x => x.MIXER_NAME);
                    mixer.forEach(element => appendData.push({
                        MIXER: element,
                    }));
                    setMixer(appendData);
                }
            };
            const getFeeder = async () => {
                const apiUrl = Utils.generateApiUrl('/feeder/fileMaintain');
                let appendArray = [];
                let res = await axios.get(apiUrl, {
                    ...Utils.pbtAxiosConfig,
                });
                if (!res.data.error && 0 < res.data.res.length) {
                    const feeder = res.data.res;
                    feeder.forEach(element => appendArray.push({
                        LINE: element.LINE,
                        FEEDER: element.FEEDER,
                        COMPANY: element.COMPANY,
                        FIRM: element.FIRM,
                        TOLERANCE_RATIO: element.TOLERANCE_RATIO,
                    }));
                    setFeeder(appendArray);
                }
            };
            const getBagWeight = async () => {
                const apiUrl = Utils.generateApiUrl('/recipe/fileMaintain');
                let appendArray = [];
                let res = await axios.get(apiUrl, {
                    ...Utils.pbtAxiosConfig,
                });
                if (!res.data.error && 0 < res.data.res.length) {
                    const bagWeight = res.data.res;
                    bagWeight.forEach(element => appendArray.push({
                        PRODUCT_NO: element.PRODUCT_NO,
                        LINE: element.LINE,
                        VER: element.VER,
                        BAG_WEIGHT: element.BAG_WEIGHT,
                    }));
                    setBagWeight(bagWeight);
                }
            };
            const loadAPI = async () => {
                try {
                    await Promise.all([getFeeder(), getMixer(), getBagWeight()]);
                    setMounted(true);
                } catch (err) {
                    toast.error('載入異常', '' + err);
                }
            };
            loadAPI();
        }
    }, [mounted]);

    const openPage = type => {
        /*
        window.open('http://tpiot.ccpgp.com:81/PrinterInfoConfig/PrinterInfoConfig');
        */
        let pageURL = '';
        switch (type) {
            case 'printer':
                pageURL = 'https://tpiot.ccpgp.com:81/PrinterInfoConfig/PrinterInfoConfig';
                break;
            case 'mixer':
                pageURL = 'https://tpiot.ccpgp.com:81/MixerInfoConfig/MixerInfoConfig';
                break;
            case 'feeder':
                pageURL = 'https://tpiot.ccpgp.com:81/FeederInfoConfig/FeederInfoConfig';
                break;
            case 'packingPrint':
                pageURL = 'https://tpiot.ccpgp.com:81/PackingPrintConfig/PackingPrintConfig';
                break;
            default:
                console.error('openPage Type Error');
                break;
        }

        const form = document.createElement('form');
        form.target = 'view';
        form.method = 'POST';
        form.action = pageURL;
        const params = {
            COMPANY: user.COMPANY,
            FIRM: Utils.getFirmFromLocalStorage() || user.FIRM,
            DEPT: user.DEPT,
            PPS_CODE: user.PPS_CODE,
            USER_NAME: user.NAME,
        };

        //廠別 -> 公司別
        if ('7' === params.FIRM) {
            params.COMPANY = '1';
        } else if ('A' === params.FIRM) {
            params.COMPANY = 'A';
        }

        for (let i in params) {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = i;
            input.value = params[i];
            form.appendChild(input);
        }

        document.body.appendChild(form);
        form.submit();
        window.open('', 'view');
    };

    const changeTab = (type) => {
        setTab('' + type);
    };

    const getMixer = async () => {
        const apiUrl = Utils.generateApiUrl('/mixer');
        let appendData = [];
        let res = await axios.get(apiUrl, {
            ...Utils.pbtAxiosConfig,
        });
        if (!res.data.error && 0 < res.data.res.length) {
            const mixer = res.data.res.map(x => x.MIXER_NAME);
            mixer.forEach(element => appendData.push({
                MIXER: element,
            }));
            setMixer(appendData);
        }
    };

    const getFeeder = async () => {
        const apiUrl = Utils.generateApiUrl('/feeder/fileMaintain');
        let appendArray = [];
        let res = await axios.get(apiUrl, {
            ...Utils.pbtAxiosConfig,
        });
        if (!res.data.error && 0 < res.data.res.length) {
            const feeder = res.data.res;
            feeder.forEach(element => appendArray.push({
                LINE: element.LINE,
                FEEDER: element.FEEDER,
                COMPANY: element.COMPANY,
                FIRM: element.FIRM,
                TOLERANCE_RATIO: element.TOLERANCE_RATIO,
            }));
            setFeeder(appendArray);
        }
    };

    const getBagWeight = async () => {
        const apiUrl = Utils.generateApiUrl('/recipe/fileMaintain');
        let appendArray = [];
        let res = await axios.get(apiUrl, {
            ...Utils.pbtAxiosConfig,
        });
        if (!res.data.error && 0 < res.data.res.length) {
            const bagWeight = res.data.res;
            bagWeight.forEach(element => appendArray.push({
                PRODUCT_NO: element.PRODUCT_NO,
                LINE: element.LINE,
                VER: element.VER,
                BAG_WEIGHT: element.BAG_WEIGHT,
            }));
            setBagWeight(bagWeight);
        }
    };

    const editList = (operation, tabName, selectedLast) => {
        const callback = res => {
            if (res.isConfirmed) {
                if ('mixer' === tabName) {
                    if (0 < res.value.trim().length) {
                        const apiURL = Utils.generateApiUrl('/fileMaintain', [tabName, operation]);
                        axios.post(apiURL, {
                            mixer: res.value
                        }, {
                            ...Utils.pbtAxiosConfig,
                        }).then(res => {
                            if (!res.data.error) {
                                toast.success('成功!!');
                                getMixer();
                            } else {
                                toast.error('失敗!!');
                            }
                        })
                            .catch(err => console.error(err));
                    } else {
                        toast.warn('請確認輸入拌粉機格式');
                    }
                } else if ('feeder' === tabName) {
                    const apiURL = Utils.generateApiUrl('/fileMaintain', [tabName, operation]);
                    if ('update' === operation) {
                        let currentRow = selectedLast[0];
                        axios.post(apiURL, {
                            feederArray: feeders[currentRow]
                        }, {
                            ...Utils.pbtAxiosConfig,
                        }).then(res => {
                            if (!res.data.error) {
                                toast.success('新增儲存成功!');
                                getFeeder();
                            } else {
                                toast.error(`儲存失敗，${JSON.stringify(res.data.res)}`);
                            }
                        });
                    } else {
                        if ('delete' === operation) {
                            let currentRow = selectedLast[0];
                            axios.post(apiURL, {
                                line: feeders[currentRow].LINE,
                                feeder: feeders[currentRow].FEEDER,
                                toleranceRatio: feeders[currentRow].TOLERANCE_RATIO
                            }, {
                                ...Utils.pbtAxiosConfig,
                            }).then(res => {
                                if (!res.data.error) {
                                    toast.success('移除成功!');
                                    getFeeder();
                                } else {
                                    toast.error(`儲存失敗，${JSON.stringify(res.data.res)}`);
                                }
                            });
                        } else {
                            axios.post(apiURL, {
                                line: res.value.line,
                                feeder: res.value.feeder,
                                toleranceRatio: res.value.tolerance
                            }, {
                                ...Utils.pbtAxiosConfig,
                            }).then(res => {
                                if (!res.data.error) {
                                    toast.success('新增儲存成功!');
                                    getFeeder();
                                } else {
                                    toast.error(`儲存失敗，${JSON.stringify(res.data.res)}`);
                                }
                            });
                        }
                    }
                } else if ('bagWeight' === tabName) {
                    const apiURL = Utils.generateApiUrl('/fileMaintain', [tabName, operation]);
                    let currentRow = selectedLast[0];
                    axios.post(apiURL, {
                        productNo: bagWeights[currentRow].PRODUCT_NO,
                        line: bagWeights[currentRow].LINE,
                        ver: bagWeights[currentRow].VER,
                        bagWeight: res.value.bagWeight
                    }, {
                        ...Utils.pbtAxiosConfig,
                    }).then(res => {
                        if (!res.data.error) {
                            toast.success('修改成功!!');
                            setHiddenRows([]);
                            getBagWeight();
                        } else {
                            toast.error(`儲存失敗，${JSON.stringify(res.data.res)}`);
                        }
                    });
                }
            } else {
                toast.error('儲存失敗');
            }
        };

        if ('mixer' === tabName) {
            Swal.fire({
                title: `請輸入欲${('delete' === operation) ? '移除' : '新增'}的拌粉機名稱`,
                input: 'text',
                position: 'top',
                showCancelButton: true,
            }).then(callback).catch(error => {
                Swal.showValidationMessage(`Request failed: ${error}`);
            });
        } else if ('feeder' === tabName) {
            if ('update' === operation) {
                Swal.fire({
                    title: '確定要儲存嗎?',
                    position: 'top',
                    showCancelButton: true,
                }).then(callback).catch(err => {
                    Swal.showValidationMessage(`Request failed: ${err}`);
                });
            } else if ('delete' === operation) {
                Swal.fire({
                    title: '確定要刪除嗎?',
                    position: 'top',
                    showCancelButton: true,
                }).then(callback).catch(err => {
                    Swal.showValidationMessage(`Request failed: ${err}`);
                });
            } else {
                Swal.fire({
                    title: '請輸入欲新增的線別、入料機名稱和誤差比例',
                    html: `
                    <div style="font-size: 18px">
                        <p>請選擇<span class="font-weight-bold">入料機名稱</span></p>
                        <input type="text" id="input-feeder" style="width: 80%; height: 30px" />
                        <p style="margin-top: 30px;">請選擇<span class="font-weight-bold">線別</span></p>
                        <input type="text" id="input-line" style="width: 80%; height: 30px;">
                        <p style="margin-top: 30px;">請選擇<span class="font-weight-bold">誤差比例</span></p>
                        <input type="number" id="input-tolerance" style="width: 80% height: 30px;">
                    </div>`,
                    preConfirm: () => {
                        let data = {
                            line: document.getElementById('input-line') ? document.getElementById('input-line').value : '',
                            feeder: document.getElementById('input-feeder') ? document.getElementById('input-feeder').value : '',
                            tolerance: document.getElementById('input-tolerance') ? document.getElementById('input-tolerance').value : '',
                        };
                        return data;
                    },
                    position: 'top',
                    showCancelButton: true,
                }).then(callback).catch(err => {
                    Swal.showValidationMessage(`Request failed: ${err}`);
                });
            }
        } else if ('bagWeight' === tabName) {
            Swal.fire({
                title: '請輸入欲修改的半成品袋重',
                html: `
                <div style="font-size: 18px">
                    <p style="margin-top: 30px;">請選擇<span class="font-weight-bold">半成品袋重</span></p>
                    <input type="number" id="input-bagWeight" style="width: 80% height: 30px;">
                </div>`,
                preConfirm: () => {
                    let data = {
                        bagWeight: document.getElementById('input-bagWeight') ? document.getElementById('input-bagWeight').value : '',
                    };
                    return data;
                },
                position: 'top',
                showCancelButton: true,
            }).then(callback).catch(err => {
                Swal.showValidationMessage(`Request failed: ${err}`);
            });
        }
    };

    const queryProduct = () => {
        let hiddenIndex = [];
        if (productNo === '') {
            toast.warn('請輸入產品簡碼!!');
        } else {
            bagWeights.forEach((element, index) => {
                if (element.PRODUCT_NO !== productNo) {
                    hiddenIndex.push(index);
                }
            });
            setHiddenRows(hiddenIndex);
        }
    };

    const queryRecovery = () => {
        setHiddenRows([]);
        setProductNo('');
    };

    registerAllCellTypes();
    registerAllModules();
    const hotTableComponent = useRef(null);

    return (
        <div className="col m-2">
            <div className="btn-group" role="group" aria-label="FileMaintain basic radio toggle button group">
                <input type="radio" className="btn-check" name="fileMaintain-btn" id="fileMaintain-btn-printer" onClick={() => openPage('printer')} defaultChecked={false} />
                <label className="btn btn-outline-secondary" htmlFor="fileMaintain-btn-printer">標籤機</label>

                <input type="radio" className="btn-check" name="fileMaintain-btn" id="fileMaintain-btn-mixer" onClick={() => changeTab('mixer')} defaultChecked={false} />
                <label className="btn btn-outline-secondary" htmlFor="fileMaintain-btn-mixer">拌粉機</label>

                <input type="radio" className="btn-check" name="fileMaintain-btn" id="fileMaintain-btn-feeder" onClick={() => changeTab('feeder')} defaultChecked={false} />
                <label className="btn btn-outline-secondary" htmlFor="fileMaintain-btn-feeder">入料機</label>

                <input type="radio" className="btn-check" name="fileMaintain-btn" id="fileMaintain-btn-bagWeight" onClick={() => changeTab('bagWeight')} defaultChecked={false} />
                <label className="btn btn-outline-secondary" htmlFor="fileMaintain-btn-bagWeight">半成品袋重</label>

                <input type="radio" className="btn-check" name="fileMaintain-btn" id="fileMaintain-btn-packingPrint" onClick={() => openPage('packingPrint')} defaultChecked={false} />
                <label className="btn btn-outline-secondary" htmlFor="fileMaintain-btn-packingPrint">包裝噴印</label>

                <input type="radio" className="btn-check" name="fileMaintain-btn" id="fileMaintain-btn-auditProduct" onClick={() => changeTab('auditProduct')} defaultChecked={false} />
                <label className="btn btn-outline-secondary" htmlFor="fileMaintain-btn-auditProduct">稽核產品</label>

                <input type="radio" className="btn-check" name="fileMaintain-btn" id="fileMaintain-btn-safetyStock" onClick={() => changeTab('stockSetting')} defaultChecked={false} />
                <label className="btn btn-outline-secondary" htmlFor="fileMaintain-btn-safetyStock">安全庫存</label>

                {authRouteMap && authRouteMap.has('packingExpense') && <>
                    <input type="radio" className="btn-check" name="fileMaintain-btn" id="fileMaintain-btn-packingExpenseItems" onClick={() => changeTab('packingExpenseItems')} defaultChecked={false} />
                    <label className="btn btn-outline-secondary" htmlFor="fileMaintain-btn-packingExpenseItems">包裝費用單價表</label>
                </>}
            </div>

            {('mixer' === tabName) &&
                <>
                    <div className="mixer-manage-table mb-2 mt-2">
                        <button type="button" className="btn btn-sm btn-outline-info me-2" onClick={() => editList('create', 'mixer')}><span className="icon bi-plus-circle"></span>新增</button>
                        <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => editList('delete', 'mixer')} ><span className="icon bi-x-circle"></span>移除</button>

                        <div className="mb-2 mt-2">
                            <HotTable
                                data={mixers}
                                columns={mixerColumn}
                                colHeaders={mixerColHeader}
                                rowHeaders={false}
                                licenseKey="non-commercial-and-evaluation"
                                ref={hotTableComponent}
                            />
                        </div>
                    </div>
                </>
            }

            {('feeder' === tabName) &&
                <>
                    <div className="feeder-manage-table mb-2 mt-2">
                        <button type="button" className="btn btn-sm btn-outline-info" onClick={() => editList('create', 'feeder')}><span className="icon bi-plus-circle"></span>新增</button>

                        <div className="mb-2 mt-2">
                            <HotTable
                                data={feeders}
                                columns={feederColumns}
                                colHeaders={feederColHeader}
                                rowHeaders={false}
                                licenseKey="non-commercial-and-evaluation"
                                ref={hotTableComponent}
                            />
                        </div>
                    </div>
                </>
            }

            {('bagWeight' === tabName) &&
                <>
                    <div className="bagWeight-manage-table mb-2 mt-2">

                        <div className="input-group input-group-sm w-25">
                            <span className="input-group-text">成品簡碼</span>
                            <input type="text" className="form-control" value={productNo} onChange={evt => setProductNo(evt.target.value)} />
                            <button type="button" className="btn btn-outline-primary me-2" onClick={queryProduct}><span className="icon bi-save"></span>查詢</button>
                            <button type="button" className="btn btn-outline-info" onClick={queryRecovery}><span className="icon bi-sign-turn-left"></span>重置</button>
                        </div>

                        <div className="mb-2 mt-2">
                            <HotTable
                                data={bagWeights}
                                columns={bagWeightColumn}
                                colHeaders={bagWeightColHeader}
                                rowHeaders={false}
                                hiddenRows={{ rows: hiddenRows }}
                                licenseKey="non-commercial-and-evaluation"
                                ref={hotTableComponent}
                            />
                        </div>
                    </div>
                </>

            }

            {('packingExpenseItems' === tabName) &&
                <PackingExpenseItemsReport />
            }

            {('auditProduct' === tabName) &&
                <AuditProduct />
            }

            {('stockSetting' === tabName) &&
                <StockSetting />
            }
        </div>
    );
}

export default FileMaintain;