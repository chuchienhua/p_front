import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Utils from '../Utils';
import './SiloStatus.css';
import SiloChart from './SiloChart';
import LoadingPage from '../LoadingPage';

function SiloStatus() {

    const [mounted, setMounted] = useState(false);

    const [showTab, setShowTab] = useState('chart');
    const [silosLoc, setSilosLoc] = useState([]);

    const [siloTimer, setSiloTimer] = useState(0);
    const timerFrequency = 5 * 60; //幾秒抓一次

    useEffect(() => {
        //儲位狀態
        const getSilosLoc = async () => {
            const apiUrl = Utils.generateApiUrl('/siloStatus/getSilos');
            let res = await axios.get(apiUrl, {
                ...Utils.pbtAxiosConfig,
            });
            if (!res.data.error && res.data.res.length) {
                setSilosLoc(res.data.res);
            }
        };

        const loadAPI = async () => {
            try {
                await Promise.all([getSilosLoc()]);
                if (!mounted) {
                    setMounted(true);
                }
            } catch (err) {
                console.error('載入異常', err.toString());
            }
        }

        const timer = setInterval(() => {
            if (siloTimer > 0) {
                setSiloTimer((prevTimer) => prevTimer - 1);
            } else if (siloTimer === 0) {
                setSiloTimer(timerFrequency);
                loadAPI();
            }
        }, 1000);

        return () => {
            clearInterval(timer);
        };
    }, [siloTimer, timerFrequency, mounted]);

    const generateSilosLocTable = () => {
        const theadHtml = (
            <thead>
                <tr>
                    <th className="silo-name">Silo No</th>
                    <th className="prd-pc">產品簡碼</th>
                    <th className="lot-no">Lot No</th>
                    <th className="qty">庫存量</th>
                </tr>
            </thead>
        );

        let tableHtml = [];
        let tbodyHtml = [];
        let lastSiloGroup = '';
        silosLoc.forEach((element, index) => {
            if (lastSiloGroup !== element.SILO_NAME.charAt(1) && tbodyHtml.length) {
                tableHtml.push(
                    <React.Fragment key={lastSiloGroup + index}>
                        <table>
                            {theadHtml}
                            <tbody>{tbodyHtml}</tbody>
                        </table>
                    </React.Fragment>
                );
                tbodyHtml = [];
            }

            tbodyHtml.push(
                <tr key={element.SILO_NAME + index}>
                    <td className={`silo-name ${checkIsProcessing(element.ACT_STR_TIME, element.ACT_END_TIME) ? 'text-danger' : ''}`}>{element.SILO_NAME}</td>
                    <td className="prd-pc">{element.PRD_PC ? element.PRD_PC.split(',')[0] : ''}</td>
                    <td className="lot-no">{element.LOT_NO || '-'}</td>
                    <td className="qty">{element.QTY || 0}</td>
                </tr>
            );

            lastSiloGroup = element.SILO_NAME.charAt(1);

            if (index === silosLoc.length - 1) {
                tableHtml.push(
                    <table key="last">
                        {theadHtml}
                        <tbody>{tbodyHtml}</tbody>
                    </table>
                );
            }
        });
        return tableHtml;
    };

    const checkIsProcessing = (startTimeString, endTimeString) => {
        let processing = false;
        if (startTimeString && endTimeString) {
            if (startTimeString.split(',').length !== endTimeString.split(',').length) {
                processing = true;
            }
        } else if (startTimeString && !endTimeString) {
            processing = true;
        }

        return processing;
    }

    //因為儲位很亂所以先用繳庫與包裝差異量計算
    const generateSilosScheduleTable = () => {
        const html = [];
        silosLoc.forEach((element, index) => {
            html.push(
                <div key={element.SILO_NAME + index} style={{ display: 'inline-block' }}>
                    <SiloChart
                        siloName={element.SILO_NAME || ''}
                        lotNo={element.LOT_NO || ''}
                        productNo={element.PRD_PC ? element.PRD_PC.split(',')[0] : ''}
                        qty={element.QTY}
                        capacity={element.CAPACITY}
                        processing={checkIsProcessing(element.ACT_STR_TIME, element.ACT_END_TIME)} />
                </div>
            );
        });
        return html;
    }

    return (
        <div className="silo-status-page m-2">
            <h3>SILO動態看板</h3>
            <div className="btn-group btn-group-sm" role="group" aria-label="SiloStatus basic radio toggle button group">
                <input type="radio" className="btn-check" name="SiloStatus-btn" id="SiloStatus-btn-schedule" onClick={() => setShowTab('chart')} defaultChecked={true} />
                <label className="btn btn-outline-secondary" htmlFor="SiloStatus-btn-schedule">圖示檢視</label>

                <input type="radio" className="btn-check" name="SiloStatus-btn" id="SiloStatus-btn-loc" onClick={() => setShowTab('table')} defaultChecked={false} />
                <label className="btn btn-outline-secondary" htmlFor="SiloStatus-btn-loc">表格檢視</label>
            </div>

            <div className="badge rounded-pill text-bg-info ms-2">距離下次更新剩餘{siloTimer}秒</div>

            <div className={`silo-status-table ${'table' === showTab ? '' : 'd-none'} mt-2`}>
                {generateSilosLocTable()}
            </div>

            <div className={`${'chart' === showTab ? '' : 'd-none'} mt-2`}>
                <div key='example-grid' style={{ display: 'inline-block' }}>
                    <SiloChart
                        siloName='Silo No (紅字生產中)'
                        productNo='成品簡碼'
                        lotNo='Lot No'
                        qty='庫存量'
                        capacity='容量'
                        processing={false} />
                </div>

                {(!mounted) ?
                    <LoadingPage />
                    :
                    <>
                        {generateSilosScheduleTable()}
                    </>
                }
            </div>
        </div>
    );
}

export default SiloStatus;