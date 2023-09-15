import React, { useState, useRef, useEffect } from "react";
import { HotTable } from '@handsontable/react';
import { toast } from 'react-toastify';
import { registerAllCellTypes } from 'handsontable/cellTypes';
import { registerAllModules } from 'handsontable/registry';
import Swal from "sweetalert2";
import Utils from './Utils';
import axios from "axios";

function MixerTable() {
    const colHeader = ['拌粉機名稱'];
    const [mixers, setMixerRows] = useState([]);
    const [mounted, setMounted] = useState(false);

    const columns = [
        {
            data: 'MIXER',
            width: 90,
            type: 'text',
            readOnly: true,
        }
    ];

    registerAllCellTypes();
    registerAllModules();

    const hotTableComponent = useRef(null);

    useEffect(() => {
        if (!mounted) {
            const getMixer = async () => {
                const apiUrl = Utils.generateApiUrl('/mixer');
                let appendData = [];
                let res = await axios.get(apiUrl, {
                    ...Utils.pbtAxiosConfig,
                })
                if (!res.data.error && 0 < res.data.res.length) {
                    const mixer = res.data.res.map(x => x.MIXER_NAME);
                    mixer.forEach(element => appendData.push({
                        MIXER: element,
                    }));
                    setMixerRows(appendData);
                }
            }
            const loadAPI = async () => {
                try {
                    await Promise.all([getMixer()]);
                    setMounted(true);
                } catch (err) {
                    toast.error('載入異常', '' + err);
                }
            }
            loadAPI();
        }
    }, [mounted])

    const editMixerList = operation => {
        const callback = res => {
            if (res.isConfirmed) {
                if (0 < res.value.trim().length) {
                    const apiURL = Utils.generateApiUrl('/mixer/fileMaintain', [operation, res.value]);
                    axios.get(apiURL, {
                        ...Utils.pbtAxiosConfig,
                    }).then(res => {
                        if (!res.data.error) {
                            toast.success('成功!');
                            getMixer();
                        } else {
                            toast.error('失敗!');
                        }
                    })
                        .catch(err => console.error(err));
                } else {
                    toast.warn('請確認輸入的拌粉機格式');
                }
            }
        }
        Swal.fire({
            title: `請輸入欲${('delete' === operation) ? '移除' : '新增'}的拌粉機名稱`,
            input: 'text',
            position: 'top',
            showCancelButton: true,
        }).then(callback).catch(error => {
            Swal.showValidationMessage(`Request failed: ${error}`);
        });
    }

    const getMixer = async () => {
        const apiUrl = Utils.generateApiUrl('/mixer');
        let appendData = [];
        let res = await axios.get(apiUrl, {
            ...Utils.pbtAxiosConfig,
        })
        if (!res.data.error && 0 < res.data.res.length) {
            const mixer = res.data.res.map(x => x.MIXER_NAME);
            mixer.forEach(element => appendData.push({
                MIXER: element,
            }));
            setMixerRows(appendData);
        }
    }
    return (
        <div className="mixer-manage-table mt-2 mb-2">
            <button type="button" className="btn btn-outline-info rounded me-2" onClick={() => editMixerList('create')} ><span className="icon bi-plus-circle"></span>新增</button>
            <button type="button" className="btn btn-outline-danger rounded me-2" onClick={() => editMixerList('delete')} ><span className="icon bi-x-circle"></span>移除</button>

            <div className='mt-2'>
                <HotTable
                    data={mixers}
                    columns={columns}
                    colHeaders={colHeader}
                    rowHeaders={false}
                    licenseKey="non-commercial-and-evaluation"
                    ref={hotTableComponent}
                />
            </div>
        </div>
    )
}

export default MixerTable;