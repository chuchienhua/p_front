import React, { useState } from 'react';
import TraceMaterials from './TraceMaterials';
import TracePackPalletNo from './TracePackPalletNo';
import TraceRecord from './TraceRecord';
import './Trace.css'

function TraceHome() {

    const [tabName, setTabName] = useState('packing');

    //檢查Tab位置
    const switchActive = (newTab) => {
        return (newTab === tabName) ? 'nav-link active' : 'nav-link';
    }

    return (
        <div className='trace-home-page m-2'>
            <ul className="nav nav-tabs mt-2">
                <li className="nav-item">
                    <div className={switchActive('packing')} onClick={() => setTabName('packing')}>成品追原料</div>
                </li>
                <li className="nav-item">
                    <div className={switchActive('material')} onClick={() => setTabName('material')}>原料追成品</div>
                </li>
                <li className="nav-item">
                    <div className={switchActive('record')} onClick={() => setTabName('record')}>領用明細</div>
                </li>
            </ul>

            <div className="container-fluid">
                <div className={('packing' === tabName) ? 'row' : 'd-none'}>
                    <TraceMaterials />
                </div>

                <div className={('material' === tabName) ? 'row' : 'd-none'}>
                    <TracePackPalletNo />
                </div>

                <div className={('record' === tabName) ? 'row' : 'd-none'}>
                    <TraceRecord />
                </div>
            </div>
        </div>
    );
}

export default TraceHome;