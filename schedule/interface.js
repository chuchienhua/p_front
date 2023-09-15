import React, { PureComponent } from 'react';
import ScheduleTable from './components/ScheduleTable'
import ScheduleOrder from './components/ScheduleOrder'
import './pbtc_schedule.css';


class Interface extends PureComponent {
    constructor(props) {
        super(props);

        this.state = {
            activeTab: 'order',
            tabIndex: 0,
        };

    }


    handleTabChange = (tab) => {
        this.setState({ activeTab: tab });
    };



    render() {
        const { activeTab } = this.state;

        return (


            <div className="row mt-5">
                <div className="col-md-2">
                    <div className="list-group">
                        <button
                            className={`list-group-item list-group-item-action ${activeTab === 'order' && 'active'}`}
                            onClick={() => this.handleTabChange('order')}
                        >
                            訂單查詢
                        </button>
                        <button
                            className={`list-group-item list-group-item-action ${activeTab === 'result' && 'active'}`}
                            onClick={() => this.handleTabChange('result')}
                        >
                            排程結果
                        </button>
                 
                    </div>
                </div>

                {/* Right-side content */}
                <div className="col-md-10">
                    <div className="tab-content">
                        <div className={`tab-pane ${activeTab === 'order' && 'show active'}`}>
                            <ScheduleOrder />
                        </div>
                        <div className={`tab-pane ${activeTab === 'result' && 'show active'}`}>
                            <ScheduleTable />
                        </div>
                        <div className={`tab-pane ${activeTab === 'setting' && 'show active'}`}>
                        </div>
                    </div>
                </div>
            </div>



        );
    }
}

export default Interface;
