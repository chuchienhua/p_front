import React, { useState, useEffect } from 'react';
import { useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import Utils from '../Utils';
import axios from 'axios';
import { toast } from 'react-toastify';
import './Extrusion.css'
import ExtrusionFeeding from './ExtrusionFeeding';
import ExtrusionScrap from './ExtrusionScrap';
import ExtrusionHead from './ExtrusionHead';
import ExtrusionForm from './ExtrusionForm';
import ExtrusionHandover from './ExtrusionHandover';
import DailyReport from './DailyReport';
import LoadingPage from '../LoadingPage';
import ExtruderStatistics from './ExtruderStatistics';
import ShutdownAnalyze from './ShutdownAnalyze';
import CrewPerformance from './CrewPerformance';
import ProductionSummary from './ProductionSummary';
import Availability from './Avability';
import SummaryReport from './SummaryReport';
import PowerStatistics from './PowerStatistics';
import ExtrusionMeterRecord from './ExtrusionMeterRecord';

function ExtrusionHome() {

    const [searchParams, setSearchParams] = useSearchParams();

    const user = useSelector(state => state.user);
    const authRoute = useSelector(state => state.authRoute);
    const firm = useSelector(state => state.firm);

    const [mounted, setMounted] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false); //是否為管理員

    const [showTab, setShowTab] = useState('feeding');

    const [printers, setPrinters] = useState([]); //所有標籤機
    const [feeders, setFeeders] = useState([]); //所有入料機
    const [orders, setOrders] = useState([]); //押出入料的工令
    const [bags, setBags] = useState([]); //所有回收料頭太空袋種類
    const [packingSilos, setPackingSilos] = useState([]); //所有包裝用的SILO
    const [operators, setOperators] = useState([]); //押出作業的作業人員
    const [reasons, setReasons] = useState([]); //交接紀錄停機原因

    //抓取權限是否為管理員
    useEffect(() => {
        if (!mounted) {
            if (authRoute) {
                let routeSetting = authRoute.filter(x => (window.location.pathname.split('/').pop() === x.ROUTE))[0];
                if (routeSetting.ISADMIN) {
                    setIsAdmin(('1' === routeSetting.ISADMIN));
                }
            }

            //取得標籤機
            const getPrinter = async () => {
                const apiUrl = Utils.generateApiUrl('/printer');
                let res = await axios.get(apiUrl, {
                    ...Utils.pbtAxiosConfig,
                })
                if (!res.data.error && res.data.res.length) {
                    setPrinters(res.data.res);
                };
            }

            //取得入料機
            const getFeeder = async () => {
                const apiUrl = Utils.generateApiUrl('/feeder');
                let res = await axios.get(apiUrl, {
                    ...Utils.pbtAxiosConfig,
                })
                if (!res.data.error && res.data.res.length) {
                    setFeeders(res.data.res);
                }
            }

            //押出入料取得正在處理或下一筆工令
            const getOrder = async () => {
                const apiUrl = Utils.generateApiUrl('/extrusion/getWorkingOrders');
                let res = await axios.get(apiUrl, {
                    ...Utils.pbtAxiosConfig,
                })
                if (!res.data.error && res.data.res.length) {
                    setOrders(res.data.res.map(x => x.LINE + '-' + x.SEQ));
                }
            }

            //取得包裝SILO
            const getPackingSilo = async () => {
                const apiUrl = Utils.generateApiUrl('/extrusion/packingSilos');
                let res = await axios.get(apiUrl, {
                    ...Utils.pbtAxiosConfig,
                })
                if (!res.data.error && res.data.res.length) {
                    setPackingSilos(res.data.res.map(x => x.SILO_NAME));
                }
            }

            //取得作業人員
            const getOperator = async () => {
                const apiUrl = Utils.generateApiUrl('/extrusion/getOperator');
                let res = await axios.get(apiUrl, {
                    ...Utils.pbtAxiosConfig,
                })
                if (!res.data.error && res.data.res.length) {
                    setOperators(res.data.res);
                }
            }

            //取得作業人員
            const getHandoverReason = async () => {
                const apiUrl = Utils.generateApiUrl('/extrusion/getHandoverReason');
                let res = await axios.get(apiUrl, {
                    ...Utils.pbtAxiosConfig,
                })
                if (!res.data.error && res.data.res.length) {
                    setReasons(res.data.res.map(x => x.REASON));
                }
            }

            //取得回收太空袋種類
            const getBag = async () => {
                setBags(['1000/3000(W)', '1000/3000(B)', '2000/4000(W)', '2000/4000(B)', '5000', '6000~9000']);
            }

            const loadAPI = async () => {
                try {
                    await Promise.all([getPrinter(), getFeeder(), getOrder(), getPackingSilo(), getBag(), getOperator(), getHandoverReason()]);
                    setMounted(true);
                } catch (err) {
                    toast.error('載入異常', err.toString());
                }
            }
            loadAPI();
        }
    }, [mounted, authRoute])

    useEffect(() => {
        if (searchParams.has('tabName')) {
            setShowTab(searchParams.get('tabName'));
        } else {
            setShowTab('feeding');
        }
    }, [searchParams])

    //檢查Tab位置
    const switchActive = newTab => {
        return (newTab === showTab) ? 'nav-link active' : 'nav-link';
    }

    if (!mounted) {
        return (<LoadingPage />);
    }

    return (
        <div className="extrusion-home-page m-2">
            <ul className="nav nav-tabs mt-2">
                <li className="nav-item">
                    <div className={switchActive('feeding')} onClick={() => setSearchParams({ tabName: 'feeding' })}>入料作業</div>
                </li>
                <li className="nav-item">
                    <div className={switchActive('scrap')} onClick={() => setSearchParams({ tabName: 'scrap' })}>料頭作業</div>
                </li>
                <li className="nav-item">
                    <div className={switchActive('head')} onClick={() => setSearchParams({ tabName: 'head' })}>前料作業</div>
                </li>
                <li className="nav-item">
                    <div className={switchActive('form')} onClick={() => setSearchParams({ tabName: 'form' })}>押出作業</div>
                </li>
                <li className="nav-item">
                    <div className={switchActive('meterRecord')} onClick={() => setSearchParams({ tabName: 'meterRecord' })}>電錶抄表</div>
                </li>
                <li className="nav-item">
                    <div className={switchActive('handover')} onClick={() => setSearchParams({ tabName: 'handover' })}>交接紀錄</div>
                </li>
                <li className="nav-item">
                    <div className={switchActive('daily')} onClick={() => setSearchParams({ tabName: 'daily' })}>生產日報</div>
                </li>
                <li className="nav-item">
                    <div className={switchActive('summary')} onClick={() => setSearchParams({ tabName: 'summary' })}>彙整報表</div>
                </li>
                <li className={isAdmin ? 'nav-item' : 'd-none'}>
                    <div className={switchActive('power')} onClick={() => setSearchParams({ tabName: 'power' })}>用電統計</div>
                </li>
                <li className="nav-item">
                    <div className={switchActive('extruder')} onClick={() => setSearchParams({ tabName: 'extruder' })}>設備運轉</div>
                </li>
                <li className="nav-item">
                    <div className={switchActive('stutdown')} onClick={() => setSearchParams({ tabName: 'stutdown' })}>停機分析</div>
                </li>
                <li className={isAdmin ? 'nav-item' : 'd-none'}>
                    <div className={switchActive('performance')} onClick={() => setSearchParams({ tabName: 'performance' })}>個人績效</div>
                </li>
                <li className={isAdmin ? 'nav-item' : 'd-none'}>
                    <div className={switchActive('production')} onClick={() => setSearchParams({ tabName: 'production' })}>生產總表</div>
                </li>
                <li className={isAdmin ? 'nav-item' : 'd-none'}>
                    <div className={switchActive('availability')} onClick={() => setSearchParams({ tabName: 'availability' })}>稼動率</div>
                </li>
            </ul>

            <div className="container-fluid">
                {('feeding' === showTab || 'scrap' === showTab || 'head' === showTab) ?
                    <>
                        <div className={('feeding' === showTab) ? 'row' : 'd-none'}>
                            <ExtrusionFeeding printers={printers} feeders={feeders} orders={orders} isAdmin={isAdmin} />
                        </div>
                        <div className={('scrap' === showTab) ? 'row' : 'd-none'}>
                            <ExtrusionScrap printers={printers} feeders={feeders} bags={bags} isAdmin={isAdmin} />
                        </div>
                        <div className={('head' === showTab) ? 'row' : 'd-none'}>
                            <ExtrusionHead printers={printers} feeders={feeders} />
                        </div>
                    </>
                    :
                    <div className="row">
                        {('form' === showTab) && <ExtrusionForm feeders={feeders} packingSilos={packingSilos} user={user} isAdmin={isAdmin} />}
                        {('meterRecord' === showTab) && <ExtrusionMeterRecord />}
                        {('handover' === showTab) && <ExtrusionHandover operators={operators} reasons={reasons} user={user} />}
                        {('daily' === showTab) && <DailyReport user={user} />}
                        {('summary' === showTab) && <SummaryReport />}
                        {('extruder' === showTab) && <ExtruderStatistics feeders={feeders} />}
                        {('power' === showTab) && <PowerStatistics />}
                        {('stutdown' === showTab) && <ShutdownAnalyze />}
                        {('performance' === showTab) && <CrewPerformance />}
                        {('production' === showTab) && <ProductionSummary firm={firm} />}
                        {('availability' === showTab) && <Availability firm={firm} />}
                    </div>
                }
            </div>
        </div>
    );
}

export default ExtrusionHome;
