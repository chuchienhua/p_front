import React, { useState } from 'react';
import './SiloStatus.css';

function SiloChart(props) {

    const siloName = props.siloName;
    const lotNo = props.lotNo;
    const productNo = props.productNo;
    const qty = props.qty; //庫存量
    const capacity = props.capacity; //SILO容量
    const processing = props.processing; //正在生產中

    const [showTooltip, setShowTooltip] = useState(false);

    const numberWithCommas = number => {
        return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    return (
        <div className='silo-status-grid'>
            <div className={`silo-name ${processing ? 'text-danger' : ''}`}>{siloName}</div>

            <div className='silo-chart' onMouseEnter={() => setShowTooltip(true)} onMouseLeave={() => setShowTooltip(false)}>
                {(showTooltip) &&
                    <div className="silo-chart-tooltip">{qty ? numberWithCommas(qty) : 0}/{capacity ? numberWithCommas(capacity) : 0}</div>
                }
                {(0 < qty) &&
                    <div className='silo-chart-content' style={{ "--height": (qty <= capacity) ? qty * 100 / capacity + '%' : '100%' }}></div>
                }
            </div>

            <div className="prd-pc">{productNo || '-'}</div>
            <div className="lot-no">{lotNo || '-'}</div>
            <div className={`qty ${0 > qty ? 'text-danger' : ''}`}>{qty ? numberWithCommas(qty) : 0}</div>
        </div>
    );
}

export default SiloChart;