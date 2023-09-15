import React, { useState, useEffect } from 'react';
import { useSelector } from "react-redux";
import Utils from '../Utils';
import axios from 'axios';
import './MixingPDA.css'
import MixPickingPDA from './MixPickingPDA';
import MixStockPDA from './MixStockPDA';
import MixFeedPDA from './MixFeedPDA';
import MixPickAndFeed from './MixPickAndFeed';

function MixingPDA() {

    const authRoute = useSelector(state => state.authRoute);

    const [mounted, setMounted] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false); //是否為管理員

    const [tabName, setTabName] = useState('picking');

    const [auditProductList, setAuditProductList] = useState([]); //稽核用成品簡碼

    useEffect(() => {
        if (!mounted) {
            //抓取權限是否為管理員
            if (authRoute) {
                let routeSetting = authRoute.filter(x => (window.location.pathname.split('/').pop() === x.ROUTE))[0];
                if (routeSetting.ISADMIN) {
                    setIsAdmin(('1' === routeSetting.ISADMIN));
                }
            }

            //取得稽核用產品簡碼
            const getAuditProduct = async () => {
                const apiUrl = Utils.generateApiUrl('/recipe/getAuditProduct');
                let res = await axios.get(apiUrl, {
                    ...Utils.pbtAxiosConfig,
                })
                if (!res.data.error && res.data.res.length) {
                    setAuditProductList(res.data.res.map(x => x.PRODUCT_NO));
                };
            }

            getAuditProduct()
            setMounted(true);
        }
    }, [mounted, authRoute])

    //檢查Tab位置
    const switchActive = (newTab) => {
        return (newTab === tabName) ? 'nav-link active' : 'nav-link';
    }

    return (
        <div className="mixing-pda-page m-2">
            <ul className="nav nav-tabs mt-2">
                <li className="nav-item">
                    <div className={switchActive('picking')} onClick={() => setTabName('picking')}>原料備料</div>
                </li>
                <li className={`${isAdmin ? "nav-item" : "nav-item d-none"}`}>
                    <div className={switchActive('stock')} onClick={() => setTabName('stock')}>備料確認</div>
                </li>
                <li className="nav-item">
                    <div className={switchActive('feed')} onClick={() => setTabName('feed')}>拌粉入料</div>
                </li>
                <li className="nav-item">
                    <div className={switchActive('pickAndFeed')} onClick={() => setTabName('pickAndFeed')}>備料直接入料</div>
                </li>
            </ul>

            <div className="container-fluid">
                <div className={('picking' === tabName) ? 'row' : 'd-none'}>
                    <MixPickingPDA />
                </div>
                <div className={('stock' === tabName) ? 'row' : 'd-none'}>
                    <MixStockPDA />
                </div>
                <div className={('feed' === tabName) ? 'row' : 'd-none'}>
                    <MixFeedPDA />
                </div>
                <div className={('pickAndFeed' === tabName) ? 'row' : 'd-none'}>
                    <MixPickAndFeed auditProductList={auditProductList} />
                </div>
            </div>
        </div>
    );
}

export default MixingPDA;
