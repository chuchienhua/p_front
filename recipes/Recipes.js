import React, { useState, useEffect, useRef } from 'react';
import { useSelector } from "react-redux";
import './Recipes.css';
import RecipeTable from './RecipeTable';
import RecipeStandard from './RecipeStandard';
import axios from 'axios';
import { HotTable } from '@handsontable/react';
import Handsontable from 'handsontable';
import { registerAllCellTypes } from 'handsontable/cellTypes';
import { registerAllModules } from 'handsontable/registry';
import Utils from '../Utils';
import moment from 'moment';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import LoadingPage from '../LoadingPage';

function Recipes() {

    const authRoute = useSelector(state => state.authRoute);

    registerAllCellTypes();
    registerAllModules();

    const [mounted, setMounted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false); //是否為管理員

    const [feeders, setFeeders] = useState([]); //所有入料機
    const [mixers, setMixers] = useState([]); //所有拌粉機

    //搜尋列State
    const [searchProductNo, setSearchProductNo] = useState('*'); //查詢輸入值
    const [searchVer, setSearchVer] = useState('*'); //配方別=版本
    const [searchLine, setSearchLine] = useState('*'); //查詢線別
    const [searchCategory, setSearchCategory] = useState('*'); //大類
    const [searchSeries, setSearchSeries] = useState('*'); //系列
    const [isCreating, setIsCreating] = useState(false); //是否在新增中
    const [showErpData, setShowErpData] = useState(false);
    const [showSpecData, setShowSpecData] = useState(false);

    const [tableTab, setTableTab] = useState('ratio'); //配方比例/押出標準表格切換

    const [productNo, setProductNo] = useState(''); //配方原料比例表所顯示的成品簡碼
    const [version, setVersion] = useState(''); //配方別
    const [line, setLine] = useState(''); //生產線別
    const [batchWeight, setBatchWeight] = useState(0); //批次量
    const [productivity, setProductivity] = useState(0); //產能上限
    const [extWeight, setExtWeight] = useState(0); //押出量
    const [category, setCategory] = useState('PBT'); //大類
    const [series, setSeries] = useState(''); //系列
    const [color, setColor] = useState(''); //顏色

    const [rows, setRows] = useState([]); //配方詳細表
    const [recipeRows, setRecipeRows] = useState([]); //粉體、押出配方下各種原料比例配方表
    const [stdRows, setStdRows] = useState([]); //押出製造標準
    const [hiddenColumns, setHiddenColumns] = useState([]); //隱藏的欄位

    const [materialList, setMaterialList] = useState([]);

    const columns = [
        { data: 'PRODUCT_NO', type: 'text', width: 110 },
        { data: 'VERSION', type: 'text', width: 70 },
        { data: 'LINE', type: 'text', width: 70 },
        { data: 'BATCH_WT', type: 'numeric', width: 70 },
        { data: 'UPBOND', type: 'numeric', width: 70 },
        { data: 'OUTPUT_QTY', type: 'numeric', width: 70 },
        { data: 'RESIN_RATE', type: 'numeric', width: 70, numericFormat: { pattern: '##0.00000' } },
        { data: 'FR_RATE', type: 'numeric', width: 70, numericFormat: { pattern: '##0.00000' } },
        { data: 'GF_RATE', type: 'numeric', width: 70, numericFormat: { pattern: '##0.00000' } },
        { data: 'CATEGORY', type: 'text', width: 70 },
        { data: 'SERIES', type: 'text', width: 70 },
        { data: 'COLOR', type: 'text', width: 70 },
        { data: 'BAG_WEIGHT', type: 'numeric', width: 70 },
        {
            data: 'RATIO_BTN',
            width: 70,
            renderer: function (instance, td, row, col, prop, value, cellProperties) {
                const icon = document.createElement('SPAN');
                icon.className = "icon bi-search";
                icon.innerHTML = ' 顯示';

                const btn = document.createElement('RATIO_BTN');
                btn.className = 'btn btn-outline-primary btn-sm px-1 py-0 nowrap align-top';
                btn.appendChild(icon);

                Handsontable.dom.addEvent(btn, 'click', () => {
                    queryRecipe(row);
                });

                const div = document.createElement('DIV');
                div.appendChild(btn);

                Handsontable.dom.empty(td);
                td.appendChild(div);
            },
        },
        { data: 'CREATOR', type: 'text', width: 90 },
        { data: 'CREATE_TIME', type: 'text', width: 170 },
        {
            data: 'DEL_BTN',
            width: 70,
            renderer: function (instance, td, row, col, prop, value, cellProperties) {
                const icon = document.createElement('SPAN');
                icon.className = "icon bi-x-circle";
                icon.innerHTML = ' 刪除';

                const btn = document.createElement('DEL_BTN');
                btn.className = 'btn btn-outline-danger btn-sm px-1 py-0 nowrap align-top';
                btn.appendChild(icon);

                Handsontable.dom.addEvent(btn, 'click', () => {
                    delBtn(row);
                });

                const div = document.createElement('DIV');
                div.appendChild(btn);

                Handsontable.dom.empty(td);
                td.appendChild(div);
            },
        },
        {
            data: 'COPY_BTN',
            width: 70,
            renderer: function (instance, td, row, col, prop, value, cellProperties) {
                const icon = document.createElement('SPAN');
                icon.className = "icon bi-stickies";
                icon.innerHTML = ' 複製';

                const btn = document.createElement('DEL_BTN');
                btn.className = 'btn btn-outline-info btn-sm px-1 py-0 nowrap align-top';
                btn.appendChild(icon);

                Handsontable.dom.addEvent(btn, 'click', () => {
                    copyBtn(row);
                });

                const div = document.createElement('DIV');
                div.appendChild(btn);

                Handsontable.dom.empty(td);
                td.appendChild(div);
            },
        },
        {
            data: 'STD_BTN',
            width: 70,
            renderer: function (instance, td, row, col, prop, value, cellProperties) {
                const icon = document.createElement('SPAN');
                icon.className = "icon bi-search";
                icon.innerHTML = ' 顯示';

                const btn = document.createElement('STD_BTN');
                btn.className = 'btn btn-outline-primary btn-sm px-1 py-0 nowrap align-top';
                btn.appendChild(icon);

                Handsontable.dom.addEvent(btn, 'click', () => {
                    queryStandard(row);
                });

                const div = document.createElement('DIV');
                div.appendChild(btn);

                Handsontable.dom.empty(td);
                td.appendChild(div);
            },
        },
    ];
    const colHeader = [
        '成品簡碼', '配方別', '生產線別', '批次量', '產能上限', '押出量', '樹酯', '耐燃劑', '玻纖', '大類', '系列', '顏色', '單包重',
        '配方比例', '最後修改人', '建立時間', '刪除配方', '複製配方', '押出標準'
    ];
    const hotTableComponent = useRef(null);

    useEffect(() => {
        if (!mounted) {
            if (authRoute) {
                let routeSetting = authRoute.filter(x => (window.location.pathname.split('/').pop() === x.ROUTE))[0];
                if (routeSetting.ISADMIN) {
                    setIsAdmin(('1' === routeSetting.ISADMIN));
                }
            }

            //查詢可用的原料
            const queryMaterials = async () => {
                const apiUrl = Utils.generateApiUrl('/recipe/getMaterials');
                let res = await axios.get(apiUrl, {
                    ...Utils.pbtAxiosConfig,
                })
                if (!res.data.error) {
                    let appendData = [];
                    res.data.res.forEach(element => appendData.push(element.CODE));
                    setMaterialList(appendData);
                }
            }

            //取得入料機
            const getFeeder = async () => {
                const apiUrl = Utils.generateApiUrl('/feeder');
                let res = await axios.get(apiUrl, {
                    ...Utils.pbtAxiosConfig,
                })
                if (!res.data.error && 0 < res.data.res.length) {
                    setFeeders(res.data.res);
                }
            }

            //取得拌粉設備清單
            const getMixer = async () => {
                const apiUrl = Utils.generateApiUrl('/mixing/mixer');
                let res = await axios.get(apiUrl, {
                    ...Utils.pbtAxiosConfig,
                })
                if (!res.data.error && res.data.res.length) {
                    setMixers(res.data.res.map(x => x.MIXER_NAME));
                }
            }

            const loadAPI = async () => {
                try {
                    await Promise.all([queryMaterials(), getFeeder(), getMixer()]);
                    setMounted(true);
                } catch (err) {
                    toast.error('載入異常', err.toString());
                }
            }
            loadAPI();
        }
    }, [mounted, authRoute])

    useEffect(() => {
        let hiddenList = isAdmin ? [] : [16, 17, 18];
        if (!showErpData) {
            hiddenList.push(3, 4, 5, 6, 7, 8);
        }
        if (!showSpecData) {
            hiddenList.push(9, 10, 11);
        }
        setHiddenColumns(hiddenList);

    }, [showErpData, showSpecData, isAdmin])

    //將配方刪除
    const delBtn = row => {

        const callback = res => {
            if (res.isConfirmed) {
                setIsLoading(true);
                const apiURL = Utils.generateApiUrl('/recipe/delete', [rows[row].PRODUCT_NO, rows[row].VERSION, rows[row].LINE]);
                axios.get(apiURL, {
                    ...Utils.pbtAxiosConfig,
                }).then(res => {
                    if (!res.data.error) {
                        toast.success('刪除成功!');
                        queryRecipeDetail();
                    } else {
                        toast.error('刪除失敗!');
                    }
                })
                    .catch(err => console.error(err))
                    .finally(() => setIsLoading(false));
            }
        }

        Swal.fire({
            title: `確認要刪除配方${rows[row].PRODUCT_NO}, ${rows[row].VERSION}, ${rows[row].LINE}嗎`,
            position: 'top',
            showCancelButton: true,
        }).then(callback).catch(error => {
            Swal.showValidationMessage(`Request failed: ${error}`);
        });
    }

    //複製配方
    const copyBtn = row => {

        const callback = res => {
            if (res.isConfirmed) {
                if (res.value.version) {
                    setIsLoading(true);
                    let newVersion = res.value.version;
                    let newLine = res.value.line;
                    let newProductNo = res.value.productNo;
                    const apiURL = Utils.generateApiUrl('/recipe/copy');
                    axios.post(apiURL, {
                        copyProductNo: rows[row].PRODUCT_NO,
                        copyVersion: rows[row].VERSION,
                        copyLine: rows[row].LINE,
                        erpData: {
                            batchWeight: rows[row].BATCH_WT,
                            productivity: rows[row].UPBOND,
                            extWeight: rows[row].OUTPUT_QTY,
                            resinType: rows[row].RESIN_TYPE,
                            resinRate: rows[row].RESIN_RATE,
                            frRate: rows[row].FR_RATE,
                            frType: rows[row].FR_TYPE,
                            gfRate: rows[row].GF_RATE,
                            gfType: rows[row].GF_TYPE,
                        },
                        newProductNo: res.value.productNo,
                        newVersion: res.value.version,
                        newLine: res.value.line,
                    }, {
                        ...Utils.pbtAxiosConfig,
                    }).then(res => {
                        if (!res.data.error) {
                            toast.success('複製成功!');
                            queryRecipeDetail();
                            rows[row].PRODUCT_NO = newProductNo;
                            rows[row].VERSION = newVersion;
                            rows[row].LINE = newLine;
                            queryRecipe(row);
                        } else {
                            toast.error('複製失敗，請注意欲複製線別是否已存在!');
                        }
                    })
                        .catch(err => console.error(err))
                        .finally(() => setIsLoading(false));
                } else {
                    toast.error('複製失敗，配方別輸入為空');
                }
            }
        }

        Swal.fire({
            title: '請選擇欲複製的生產線別',
            html: `
            <div style="font-size: 18px">
                <p>產品簡碼: ${rows[row].PRODUCT_NO}; 配方別: ${rows[row].VERSION}; 參考線別: ${rows[row].LINE}</p>
                <p>請選擇<span class="font-weight-bold">產品簡碼</span></p>
                <input type="text" id="input-productNo" style="width: 80%; height: 30px" />
                <p style="margin-top: 30px;">請選擇<span class="font-weight-bold">生產線別</span></p>
                <input type="text" id="input-line" style="width: 80%; height: 30px" />
                <p style="margin-top: 30px;">請選擇<span class="font-weight-bold">配方別</span></p>
                <input type="text" id="input-version" style="width: 80%; height: 30px;">
            </div>`,
            preConfirm: () => {
                let data = {
                    productNo: document.getElementById('input-productNo') ? document.getElementById('input-productNo').value : '',
                    line: document.getElementById('input-line') ? document.getElementById('input-line').value : '',
                    version: document.getElementById('input-version') ? document.getElementById('input-version').value : '',
                };
                return data;
            },
            position: 'top',
            showCancelButton: true,
        }).then(callback).catch(error => {
            Swal.showValidationMessage(`Request failed: ${error}`);
        });
    }

    //輸出表格
    const exportCSV = () => {
        if (rows.length) {
            const hot = hotTableComponent.current.hotInstance;
            const exportPlugin = hot.getPlugin('exportFile');
            exportPlugin.downloadFile('csv', {
                bom: true,
                columnDelimiter: ',',
                columnHeaders: true,
                exportHiddenColumns: true,
                rowHeaders: false,
                exportHiddenRows: true,
                fileExtension: 'csv',
                filename: '配方列表',
                mimeType: 'text/csv',
                rowDelimiter: '\r\n',
            });
        } else {
            toast.warn('請先查詢，再做匯出');
        }
    }

    //查詢配方詳細表
    const queryRecipeDetail = () => {
        setIsLoading(true);
        setIsCreating(false);
        setRows([]);
        setRecipeRows([]);
        setStdRows([]);

        const apiUrl = Utils.generateApiUrl('/recipe/detail', [searchProductNo]);
        axios.post(apiUrl, {
            version: searchVer,
            line: searchLine,
            category: searchCategory,
            series: searchSeries,
        }, {
            ...Utils.pbtAxiosConfig,
        }).then(res => {
            if (!res.data.error) {
                if (res.data.res.length) {
                    let appendData = [];
                    res.data.res.forEach(element => appendData.push({
                        PRODUCT_NO: element.PRODUCT_NO,
                        VERSION: element.VER,
                        LINE: element.LINE,
                        BATCH_WT: element.PRO_FORMULA_BATCH_WT,
                        UPBOND: element.PRO_FORMULA_UPBOND,
                        OUTPUT_QTY: element.PRO_LINE_OUTPUT_QTY,
                        RESIN_RATE: element.RESIN_RATE,
                        FR_RATE: element.FR_RATE,
                        GF_RATE: element.GF_RATE,
                        CATEGORY: element.CATEGORY,
                        SERIES: element.SERIES,
                        COLOR: element.COLOR,
                        BAG_WEIGHT: element.BAG_WEIGHT,
                        CREATOR: element.EDITOR || element.CREATOR,
                        CREATE_TIME: moment(element.CREATE_TIME).format('YYYY-MM-DD HH:mm:ss'),
                    }));
                    setRows(appendData);
                } else {
                    toast.warn('未查到配方檔', { position: toast.POSITION.TOP_RIGHT });
                }
            } else {
                toast.error(`查詢失敗! ${res.data.res.toString()}`, { position: toast.POSITION.TOP_RIGHT });
            }
        })
            .catch(err => console.error(err))
            .finally(() => setIsLoading(false));
    }

    //配方原料比例表
    const queryRecipe = row => {
        setIsLoading(true);
        setIsCreating(false);
        setBatchWeight(0);
        setProductivity(0);
        setExtWeight(0);
        setCategory('PBT');
        setSeries('');
        setColor('');
        setRecipeRows([]);
        setTableTab('ratio');

        const apiUrl = Utils.generateApiUrl('/recipe/ratio', [rows[row].PRODUCT_NO, rows[row].VERSION, rows[row].LINE]);
        axios.get(apiUrl, {
            ...Utils.pbtAxiosConfig,
        }).then(res => {
            if (!res.data.error) {
                if (res.data.ratio?.length && res.data.detail?.length) {
                    setProductNo(rows[row].PRODUCT_NO);
                    setVersion(rows[row].VERSION);
                    setLine(rows[row].LINE);
                    setBatchWeight(res.data.detail[0].PRO_FORMULA_BATCH_WT ? res.data.detail[0].PRO_FORMULA_BATCH_WT : 0);
                    setProductivity(res.data.detail[0].PRO_FORMULA_UPBOND ? res.data.detail[0].PRO_FORMULA_UPBOND : 0);
                    setExtWeight(res.data.detail[0].PRO_LINE_OUTPUT_QTY ? res.data.detail[0].PRO_LINE_OUTPUT_QTY : 0);
                    setCategory(res.data.detail[0].CATEGORY ? res.data.detail[0].CATEGORY : '');
                    setSeries(res.data.detail[0].SERIES ? res.data.detail[0].SERIES : '');
                    setColor(res.data.detail[0].COLOR ? res.data.detail[0].COLOR : '');

                    let appendData = [{ MATERIAL: '加總', RATIO: '=SUM(B2:B100)' }];
                    res.data.ratio.forEach(element => appendData.push({
                        MATERIAL: element.MATERIAL,
                        RATIO: element.RATIO,
                        FEEDER: element.FEEDER,
                        AIRINPUT: ('Y' === element.AIRINPUT) ? true : false,
                        MIDDLE: ('Y' === element.MIDDLE) ? true : false,
                        MIXER: element.MIXER,
                        SEMI_NO: ('P' === element.SEMI_NO || 'G' === element.SEMI_NO) ? element.SEMI_NO : null,
                        RESIN: ('Y' === element.RESIN_TYPE) ? true : false,
                        FR: ('Y' === element.FR_TYPE) ? true : false,
                        GF: ('Y' === element.GF_TYPE) ? true : false,
                    }));
                    setRecipeRows(appendData);
                } else {
                    toast.warn(`${rows[row].PRODUCT_NO}配方檔異常`, { position: toast.POSITION.TOP_RIGHT });
                }
            } else {
                toast.error(`查詢失敗! ${res.data.res.toString()}`, { position: toast.POSITION.TOP_RIGHT });
            }
        })
            .catch(err => console.error(err))
            .finally(() => setIsLoading(false));
    }

    //新增配方
    const createRecipe = () => {
        setIsCreating(true);
        setProductNo('');
        setVersion('1');
        setLine('C');
        setBatchWeight(3000);
        setProductivity(48000);
        setExtWeight(600);
        setCategory('PBT');
        setSeries('');
        setColor('');
        setTableTab('ratio');

        //預設帶入
        setRecipeRows([
            { MATERIAL: '加總', RATIO: '=SUM(B2:B100)' },
            { MATERIAL: '1100LPM', RATIO: '12.5', FEEDER: 'CM1', AIRINPUT: true, RESIN: true, RESINDATA: '1100LP' },
            { MATERIAL: 'A611', RATIO: '0.2', FEEDER: 'CM2', MIXER: 'MIXER-C', SEMI_NO: 'P' },
            { MATERIAL: 'EWAX', RATIO: '0.1', FEEDER: 'CM2', MIXER: 'MIXER-C', SEMI_NO: 'P' },
            { MATERIAL: 'FLAATO', RATIO: '2.0', FEEDER: 'CM2', MIXER: 'MIXER-C', SEMI_NO: 'P' },
            { MATERIAL: 'SPAN60', RATIO: '0.3', FEEDER: 'CM2', MIXER: 'MIXER-C', SEMI_NO: 'P' },
            { MATERIAL: 'AX200', RATIO: '0.1', FEEDER: 'CM2', MIXER: 'MIXER-C', SEMI_NO: 'P' },
            { MATERIAL: 'HT207', RATIO: '0.5', FEEDER: 'CM3' },
            { MATERIAL: 'BEB6000', RATIO: '0.2', FEEDER: 'CM3', FR: true, FRDATA: 'BEB6000' },
            { MATERIAL: 'CCP187', RATIO: '1', FEEDER: 'CM3', GF: true, GFDATA: 'CCP187' },
            { MATERIAL: 'GFS', RATIO: '3', FEEDER: 'CM3', GF: true, GFDATA: 'GFS' },
        ]);
    }

    //配方比例表新增一行
    // const newRecipeRow = () => {
    //     // setAdd(true);
    //     let oldRecipeRow = [...recipeRows];
    //     oldRecipeRow.push({ MATERIAL: '', RATIO: '', FEEDER: '', MIXER: '', SEMI_NO: '', RESIN: '', RESINDATA: '', FR: '', FRDATA: '', GF: '', GFDATA: '' });
    //     setRecipeRows(oldRecipeRow);
    // }

    //儲存前檢查與調整
    const saveFormatting = () => {
        let obj = {
            array: [],
            resinType: '',
            resinRate: 0,
            frType: '',
            frRate: 0,
            gfType: '',
            gfRate: 0,
            errorString: '',
        };
        let frCount = 0;
        let gfCount = 0;
        let resinCount = 0;
        let materialArray = [...recipeRows];
        materialArray.forEach((element, index) => {
            //第一行Formula省略
            if (0 < index) {
                //空的原料欄位不儲存
                if (element.MATERIAL) {
                    if (5 > productNo.trim().length) {
                        obj.errorString = '產品簡碼請勿小於5碼';
                    } else if (100 <= element.RATIO) {
                        obj.errorString = `第${index}列，原料比例不能大於100`;
                    } else if (!element.FEEDER) {
                        obj.errorString = `第${index}列，需輸入入料機`;
                    } else if (line !== element.FEEDER[0]) {
                        obj.errorString = `第${index}列，生產線別與入料機不符合`;
                    } else if (element.RESIN) {
                        if (element.FR || element.GF) {
                            obj.errorString = `第${index}列，原料不會同時屬於樹酯/耐燃劑/玻纖`;
                        }
                    } else if (element.FR) {
                        if (element.RESIN || element.GF) {
                            obj.errorString = `第${index}列，原料不會同時屬於樹酯/耐燃劑/玻纖`;
                        }
                    } else if (element.GF) {
                        if (element.RESIN || element.FR) {
                            obj.errorString = `第${index}列，原料不會同時屬於樹酯/耐燃劑/玻纖`;
                        }
                    }
                    obj.array.push(element);
                }
                if (element.FR) {
                    if (frCount === 0) {
                        obj.frType = obj.frType + element.MATERIAL;
                        frCount += 1;
                    } else {
                        obj.frType = obj.frType + ',' + element.MATERIAL;
                        frCount += 1;
                    }
                    obj.frRate += Number(element.RATIO) / 100;
                }
                if (element.RESIN) {
                    if (resinCount === 0) {
                        obj.resinType = obj.resinType + element.MATERIAL;
                        resinCount += 1;
                    } else {
                        obj.resinType = obj.resinType + ',' + element.MATERIAL;
                        resinCount += 1;
                    }
                    obj.resinRate += Number(element.RATIO) / 100;
                }
                if (element.GF) {
                    if (gfCount === 0) {
                        obj.gfType = obj.gfType + element.MATERIAL;
                        gfCount += 1;
                    } else {
                        obj.gfType = obj.gfType + ',' + element.MATERIAL;
                        gfCount += 1;
                    }
                    obj.gfRate += Number(element.RATIO) / 100;
                }
            }
        })

        if (2 > obj.array.length) {
            obj.errorString = '配方原料至少要2種以上'
        }

        return obj;
    }

    //新增儲存配方比例表
    const save = () => {
        const callback = res => {
            if (res.isConfirmed) {
                setIsLoading(true);

                let formatted = saveFormatting();

                if (!formatted.errorString) {
                    const apiUrl = Utils.generateApiUrl('/recipe/create');
                    axios.post(apiUrl, {
                        productNo: productNo,
                        version: version,
                        line: line,
                        specData: {
                            category: category,
                            series: series,
                            color: color,
                        },
                        erpData: {
                            batchWeight: batchWeight,
                            productivity: productivity,
                            extWeight: extWeight,
                            resinRate: formatted.resinRate,
                            resinType: formatted.resinType,
                            frRate: formatted.frRate,
                            frType: formatted.frType,
                            gfRate: formatted.gfRate,
                            gfType: formatted.gfType,
                        },
                        materialArray: formatted.array,
                    }, {
                        ...Utils.pbtAxiosConfig,
                    }).then(res => {
                        if (!res.data.error) {
                            toast.success('新增儲存成功');
                            setIsCreating(false);
                        } else {
                            toast.error(`儲存失敗，${JSON.stringify(res.data.res)}`);
                        }
                    }).catch(err => console.error(err))
                        .finally(() => setIsLoading(false));
                } else {
                    toast.error(`儲存失敗，${formatted.errorString}`);
                    setIsLoading(false);
                }
            }
        }

        Swal.fire({
            title: `確認要儲存配方嗎？`,
            position: 'top',
            showCancelButton: true,
        }).then(callback).catch(error => {
            Swal.showValidationMessage(`Request failed: ${error}`);
        });
    }

    //修改儲存配方比例表
    const update = () => {
        const callback = res => {
            if (res.isConfirmed) {
                setIsLoading(true);

                let formatted = saveFormatting();

                if (!formatted.errorString) {
                    const apiUrl = Utils.generateApiUrl('/recipe/create', [productNo, version, line]);
                    axios.post(apiUrl, {
                        specData: {
                            category: category,
                            series: series,
                            color: color,
                        },
                        erpData: {
                            batchWeight: batchWeight,
                            productivity: productivity,
                            extWeight: extWeight,
                            resinRate: formatted.resinRate,
                            resinType: formatted.resinType,
                            frRate: formatted.frRate,
                            frType: formatted.frType,
                            gfRate: formatted.gfRate,
                            gfType: formatted.gfType,
                        },
                        materialArray: formatted.array,
                    }, {
                        ...Utils.pbtAxiosConfig,
                    }).then(res => {
                        if (!res.data.error) {
                            toast.success('新增儲存成功');
                        } else {
                            toast.error(`儲存失敗，${JSON.stringify(res.data.res)}`);
                        }
                    }).catch(err => console.error(err))
                        .finally(() => setIsLoading(false));
                } else {
                    toast.error(`儲存失敗，${formatted.errorString}`);
                    setIsLoading(false);
                }
            }
        }

        Swal.fire({
            title: `確認要更新配方嗎？`,
            position: 'top',
            showCancelButton: true,
        }).then(callback).catch(error => {
            Swal.showValidationMessage(`Request failed: ${error}`);
        });
    }

    //查詢押出機製造標準
    const queryStandard = row => {
        setIsLoading(true);
        setIsCreating(false);
        setStdRows([]);
        setTableTab('standard');

        const apiUrl = Utils.generateApiUrl('/recipe/standard', [rows[row].PRODUCT_NO, rows[row].VERSION, rows[row].LINE]);
        axios.get(apiUrl, {
            ...Utils.pbtAxiosConfig,
        }).then(res => {
            if (!res.data.error) {
                if (res.data.res.length) {
                    // console.log(res.data.res);

                    setProductNo(rows[row].PRODUCT_NO);
                    setVersion(rows[row].VERSION);
                    setLine(rows[row].LINE);

                    let appendData = [];
                    res.data.res.forEach(element => appendData.push({
                        SEQUENCE: element.SEQUENCE,
                        TYPE: element.TYPE,
                        TOLERANCE: element.TOLERANCE,
                        BASE: element.BASE,
                    }));
                    setStdRows(appendData);
                } else {
                    toast.warn('未查到押出機製造標準檔，將帶入預設值', { position: toast.POSITION.TOP_RIGHT });
                    setStdRows([
                        { SEQUENCE: 1, TYPE: '押出機第1段溫度', TOLERANCE: 30, BASE: 250 },
                        { SEQUENCE: 2, TYPE: '押出機第2段溫度', TOLERANCE: 30, BASE: 250 },
                        { SEQUENCE: 3, TYPE: '押出機第3段溫度', TOLERANCE: 30, BASE: 250 },
                        { SEQUENCE: 4, TYPE: '押出機第4段溫度', TOLERANCE: 30, BASE: 250 },
                        { SEQUENCE: 5, TYPE: '押出機第5段溫度', TOLERANCE: 30, BASE: 250 },
                        { SEQUENCE: 6, TYPE: '押出機第6段溫度', TOLERANCE: 30, BASE: 250 },
                        { SEQUENCE: 7, TYPE: '押出機第7段溫度', TOLERANCE: 30, BASE: 250 },
                        { SEQUENCE: 8, TYPE: '押出機第8段溫度', TOLERANCE: 30, BASE: 250 },
                        { SEQUENCE: 9, TYPE: '押出機第9段溫度', TOLERANCE: 30, BASE: 250 },
                        { SEQUENCE: 10, TYPE: '押出機第10段溫度', TOLERANCE: 30, BASE: 250 },
                        { SEQUENCE: 11, TYPE: '押出機第11段溫度', TOLERANCE: 30, BASE: 250 },
                        { SEQUENCE: 12, TYPE: '押出機第12段溫度', TOLERANCE: 30, BASE: 250 },
                        { SEQUENCE: 13, TYPE: '押出機第13段溫度', TOLERANCE: 30, BASE: 250 },
                        { SEQUENCE: 14, TYPE: '押出機DIE1溫度', TOLERANCE: 0, BASE: 0 },
                        { SEQUENCE: 15, TYPE: '押出機DIE2溫度', TOLERANCE: 0, BASE: 0 },
                        { SEQUENCE: 16, TYPE: '押出機轉速', TOLERANCE: 20, BASE: 290 },
                        { SEQUENCE: 17, TYPE: '押出機負載', TOLERANCE: 20, BASE: 670 },
                        { SEQUENCE: 18, TYPE: '押出機真空', TOLERANCE: 0, BASE: 175 },
                        { SEQUENCE: 19, TYPE: '押出機模孔', TOLERANCE: 0, BASE: 71 },
                        { SEQUENCE: 20, TYPE: '水槽水溫', TOLERANCE: 10, BASE: 50 },
                        { SEQUENCE: 21, TYPE: '切粒機Hz', TOLERANCE: 10, BASE: 50 },
                        { SEQUENCE: 22, TYPE: '切粒機壓力', TOLERANCE: 0, BASE: 2 },
                        { SEQUENCE: 23, TYPE: '熔融樹酯溫度', TOLERANCE: 20, BASE: 280 },
                        { SEQUENCE: 24, TYPE: '熔融樹酯壓力', TOLERANCE: 0, BASE: 20 },
                    ]);
                }
            } else {
                toast.error(`查詢失敗! ${res.data.res.toString()}`, { position: toast.POSITION.TOP_RIGHT });
            }
        })
            .catch(err => console.error(err))
            .finally(() => setIsLoading(false));
    }

    //儲存押出製造標準表
    const updateStandard = () => {
        setIsLoading(true);

        const apiUrl = Utils.generateApiUrl('/recipe/updateStandard', [productNo, version, line]);
        axios.post(apiUrl, {
            stdArray: stdRows,
        }, {
            ...Utils.pbtAxiosConfig,
        }).then(res => {
            if (!res.data.error) {
                toast.success('更新成功');
            } else {
                toast.error(`更新失敗，${JSON.stringify(res.data.res)}`);
            }
        }).catch(err => console.error(err))
            .finally(() => setIsLoading(false));
    }

    //生成入料機的線別選項
    const generateFeederLine = () => {
        let div = [];
        let existsLine = new Set();
        feeders.forEach((element, index) => {
            if (!existsLine.has(element.LINE)) {
                div.push(
                    <option key={index} value={element.LINE}>{element.LINE}</option>
                );
                existsLine.add(element.LINE);
            }
        });
        return div;
    }

    if (!mounted) {
        return (<LoadingPage />);
    }

    return (
        <div className="recipes-page m-2">
            <div className="query-form mb-1">
                <div className="input-group input-group-sm mb-1">
                    <span className="input-group-text">權限</span>
                    <input type="text" className="form-control" value={isAdmin ? '管理員' : '一般人員'} disabled style={{ maxWidth: '80px' }} />

                    <span className="input-group-text">成品簡碼</span>
                    <input type="text" className="form-control" value={searchProductNo} onChange={evt => setSearchProductNo(evt.target.value)} style={{ maxWidth: '120px' }} />

                    <span className="input-group-text">配方別</span>
                    <input type="text" className="form-control" value={searchVer} onChange={evt => setSearchVer(evt.target.value)} style={{ maxWidth: '70px' }} />

                    <span className="input-group-text">線別</span>
                    <select className="form-select" value={searchLine} onChange={evt => setSearchLine(evt.target.value)} style={{ maxWidth: '70px' }}>
                        <option value="*">*</option>
                        {generateFeederLine()}
                    </select>

                    <span className="input-group-text ms-2">大類</span>
                    <select className="form-select" value={searchCategory} onChange={evt => setSearchCategory(evt.target.value)} style={{ maxWidth: '100px' }}>
                        <option value="*">*</option>
                        <option value="PBT">PBT</option>
                        <option value="PET">PET</option>
                        <option value="NLC">NLC</option>
                        <option value="NLN">NLN</option>
                    </select>

                    <span className="input-group-text">系列</span>
                    <select className="form-select" value={searchSeries} onChange={evt => setSearchSeries(evt.target.value)} style={{ maxWidth: '120px' }} >
                        <option value="*">*</option>
                        <option value="1000">1000</option>
                        <option value="2000">2000</option>
                        <option value="3000">3000</option>
                        <option value="4000">4000</option>
                        <option value="5000">5000</option>
                        <option value="6000">6000</option>
                        <option value="7000">7000</option>
                        <option value="8000">8000</option>
                        <option value="9000">9000</option>
                        <option value="PA6">PA6</option>
                        <option value="PA66">PA66</option>
                        <option value="其他">其他</option>
                    </select>

                    <button type="button" className="btn btn-outline-primary rounded-end me-2" onClick={queryRecipeDetail} disabled={isLoading}><span className="icon bi-search"></span> 查詢</button>
                    {isAdmin &&
                        <button type="button" className="btn btn-outline-info rounded me-2" onClick={createRecipe} disabled={isLoading}><span className="icon bi-plus-circle"></span> 新增</button>
                    }
                    <button type="button" className="btn btn-outline-success btn-sm rounded me-2" onClick={exportCSV} disabled={isLoading}><span className="icon bi-cloud-download"></span> 匯出</button>
                </div>

                <div className="input-group input-group-sm mb-1">
                    <div className="form-check form-switch">
                        <input className="form-check-input" type="checkbox" role="switch" id="showErpDataSwitch" value={showErpData} onChange={evt => setShowErpData(evt.target.checked)} />
                        <label className="form-check-label" htmlFor="showErpDataSwitch">顯示ERP設定檔</label>
                    </div>
                    <div className="form-check form-switch ms-2">
                        <input className="form-check-input" type="checkbox" role="switch" id="showSpecDataSwitch" value={showSpecData} onChange={evt => setShowSpecData(evt.target.checked)} />
                        <label className="form-check-label" htmlFor="showSpecDataSwitch">顯示規格設定檔</label>
                    </div>
                </div>
            </div>

            <div className="recipes-detail-table mb-2">
                <HotTable
                    licenseKey="non-commercial-and-evaluation"
                    data={rows}
                    columns={columns}
                    colHeaders={colHeader}
                    rowHeaders={true}
                    rowHeights={22}
                    readOnly={true}
                    hiddenColumns={{ columns: hiddenColumns }}
                    ref={hotTableComponent}
                />
            </div>

            <hr />

            <div className="input-group input-group-sm w-50 mb-2">
                <span className="input-group-text">成品簡碼</span>
                <input type="text" className="form-control me-2" value={productNo} onChange={evt => setProductNo(evt.target.value)} disabled={!isCreating} />

                <span className="input-group-text">配方別</span>
                <input type="text" className="form-control me-2" value={version} onChange={evt => setVersion(evt.target.value)} disabled={!isCreating} />

                <span className="input-group-text">生產線別</span>
                <select className="form-select" value={line} onChange={evt => setLine(evt.target.value)} disabled={!isCreating}>
                    {generateFeederLine()}
                </select>
            </div>

            <div className="input-group input-group-sm w-50 mb-2">
                <span className="input-group-text">大類</span>
                <select className="form-select me-2" value={category} onChange={evt => setCategory(evt.target.value)} disabled={'ratio' !== tableTab || !recipeRows.length} >
                    <option value="PBT">PBT</option>
                    <option value="PET">PET</option>
                    <option value="NLC">NLC</option>
                    <option value="NLN">NLN</option>
                </select>

                <span className="input-group-text">系列</span>
                <select className="form-select me-2" value={series} onChange={evt => setSeries(evt.target.value)} disabled={'ratio' !== tableTab || !recipeRows.length} >
                    <option value="1000">1000</option>
                    <option value="2000">2000</option>
                    <option value="3000">3000</option>
                    <option value="4000">4000</option>
                    <option value="5000">5000</option>
                    <option value="6000">6000</option>
                    <option value="7000">7000</option>
                    <option value="8000">8000</option>
                    <option value="9000">9000</option>
                    <option value="PA6">PA6</option>
                    <option value="PA66">PA66</option>
                    <option value="其他">其他</option>
                </select>

                <span className="input-group-text">顏色</span>
                <select className="form-select" value={color} onChange={evt => setColor(evt.target.value)} disabled={'ratio' !== tableTab || !recipeRows.length} >
                    <option value="黑/灰">黑/灰</option>
                    <option value="白">白</option>
                    <option value="綠">綠</option>
                    <option value="黃">黃</option>
                    <option value="藍">藍</option>
                    <option value="橘">橘</option>
                    <option value="紅">紅</option>
                    <option value="紫">紫</option>
                    <option value="其他">其他</option>
                </select>
            </div>

            <div className="input-group input-group-sm w-50 mb-2">
                <span className="input-group-text">批次量</span>
                <input type="number" className="form-control me-2" value={batchWeight} onChange={evt => setBatchWeight(evt.target.value)} disabled={'ratio' !== tableTab || !recipeRows.length} />

                <span className="input-group-text">產能上限</span>
                <input type="number" className="form-control me-2" value={productivity} onChange={evt => setProductivity(evt.target.value)} disabled={'ratio' !== tableTab || !recipeRows.length} />

                <span className="input-group-text">押出量</span>
                <input type="number" className="form-control" value={extWeight} onChange={evt => setExtWeight(evt.target.value)} disabled={'ratio' !== tableTab || !recipeRows.length} />
            </div>

            {('ratio' === tableTab) ?
                <>
                    {(isCreating) ?
                        <button type="button" className="btn btn-outline-success btn-sm me-2" onClick={save} disabled={isLoading || !isCreating || !isAdmin}><span className="icon bi-save"></span> 新增儲存</button>
                        :
                        <button type="button" className="btn btn-outline-success btn-sm me-2" onClick={update} disabled={isLoading || isCreating || !isAdmin || !recipeRows.length}><span className="icon bi-save"></span> 修改儲存</button>
                    }
                    {/* <button type="button" className="btn btn-outline-info btn-sm me-2" onClick={newRecipeRow} disabled={isLoading || !recipeRows.length}><span className="icon bi-plus-circle"></span> 新增一列</button> */}
                    <div className="mb-5">
                        <RecipeTable
                            rows={recipeRows}
                            feeders={feeders}
                            mixers={mixers}
                            materialList={materialList}
                            line={line}
                            isAdmin={isAdmin} />
                    </div>
                </>
                :
                <>
                    <button type="button" className="btn btn-outline-success btn-sm" onClick={updateStandard} disabled={isLoading}><span className="icon bi-save"></span> 儲存</button>
                    <RecipeStandard rows={stdRows} />
                </>
            }

        </div>
    );
}

export default Recipes;