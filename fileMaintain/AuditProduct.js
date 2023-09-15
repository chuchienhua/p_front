import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import Utils from '../Utils';

function AuditProduct() {

    const [mounted, setMounted] = useState(false);
    const [productNo, setProductNo] = useState([]); //稽核用產品簡碼清單

    useEffect(() => {
        if (!mounted) {
            queryAuditProduct();
            setMounted(true);
        }
    }, [mounted]);

    //查詢稽核用的產品簡碼
    const queryAuditProduct = async () => {
        const apiUrl = Utils.generateApiUrl('/recipe/getAuditProduct');
        axios.get(apiUrl, {
            ...Utils.pbtAxiosConfig,
        }).then(res => {
            console.log(res.data.res)
            if (!res.data.error) {
                setProductNo(res.data.res?.map(x => x.PRODUCT_NO));
            } else {
                toast.error('查詢失敗，', res.data.res);
            }
        }).catch(err => console.error(err));
    }

    //移除/新增欲稽核用的產品簡碼
    const updateList = type => {

        const callback = res => {
            if (res.isConfirmed) {
                if (res.value.trim().length) {
                    const apiUrl = Utils.generateApiUrl('/recipe/updateAuditProduct', [('remove' === type) ? 'remove' : 'add']);
                    axios.post(apiUrl, {
                        productNo: res.value,
                    }, {
                        ...Utils.pbtAxiosConfig,
                    }).then(res => {
                        if (!res.data.error) {
                            toast.success(`${'remove' === type ? '移除' : '新增'}成功`);
                            queryAuditProduct();
                        } else {
                            toast.error(`${'remove' === type ? '移除' : '新增'}失敗，${res.data.res}`);
                        }
                    }).catch(err => console.error(err));
                } else {
                    toast.warn('請確認輸入的員工編號格式');
                }
            }
        }

        Swal.fire({
            title: `${('remove' === type) ? '移除' : '新增'}稽核用的產品簡碼`,
            input: 'text',
            inputPlaceholder: '產品簡碼',
            position: 'top',
            showCancelButton: true,
        }).then(callback).catch(error => {
            Swal.showValidationMessage(`Request failed: ${error}`);
        });
    }

    return (
        <div className="audit-product-page">
            <div className="input-group mt-2">
                <span className="input-group-text">產品清單</span>
                <input className="form-control" value={productNo} disabled />

                <button type="button" className="btn btn-success rounded-end me-2" onClick={() => updateList('normal')}><span className="icon bi-plus-circle"></span> 新增</button>
                <button type="button" className="btn btn-danger rounded" onClick={() => updateList('remove')}><span className="icon bi-x-circle"></span> 移除</button>
            </div>
        </div>
    )
}

export default AuditProduct;