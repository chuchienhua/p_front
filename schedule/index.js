import React, { PureComponent } from 'react';
// import io from 'socket.io-client';
import SimProcess from './components/SimProcess';
import SimModal from './components/SimModal'
import SimConfigPage from './components/SimConfigPage'
import SimResult from './components/SimResult'
import SpecCleanPage from './components/SpecCleanPage'
import Interface from './interface'
import './pbtc_schedule.css';


class PBTCSchedule extends PureComponent {
  constructor(props) {
    super(props);

    this.state = {
      activeTab: 'scheduleData',
      tabIndex: 0,
      socket: null,
      isModalOpen: false,
      configs: {
        production: [],
        packaging: []
      },
    };
    this.Components = [
      this.DisptchInfo = React.createRef(),
      this.SimulationInfo = React.createRef(),
    ];
  }

  getTabLinkClass = (tabIndex) =>
    tabIndex === this.state.tabIndex ? 'nav-item nav-link active' : 'nav-item nav-link';

  switchTab = (tabIndex) => (event) => {
    event.nativeEvent.preventDefault();
    this.setState({ tabIndex }, () => {
      this.afterSwitchTab();
    });
    window.history.pushState({ tabIndex }, 'PBTc-schedule');
  };

  afterSwitchTab = () => {
    const tabIndex = this.state.tabIndex;
    const component = this.Components[tabIndex];

    if (component && component.current && component.current.init) {
      component.current.init();
    }
  };
 


  handleTabChange = (tab) => {
    this.setState({ activeTab: tab });
  };
  handleOpenModal = () => {
    this.setState({ isModalOpen: true });
  };

  handleCloseModal = () => {
    this.setState({ isModalOpen: false });
  };


  handleModalSubmit = (selectedConfigs) => {
    this.setState({ configs: selectedConfigs }, () => { this.handleCloseModal(); });


  };


  render() {
    const { activeTab } = this.state;
    const { isModalOpen, configs } = this.state;
    const { socket } = this.state;

    return (
      <>
        <div className="container-fluid pbtc-schedule-container m-2">
          <ul className="nav nav-tabs overlap-nav-tabs cf-nav-tabs mt-2" id="pbtc-schedule-container" role="tablist">
            <li className="nav-item invisible">&nbsp;</li>
            <li className="nav-item">
              <a
                href="#top"
                className={this.getTabLinkClass(0)}
                role="tab"
                onClick={this.switchTab(0)}
              >
                派工資訊
              </a>
            </li>
            <li className="nav-item">
              <a
                href="#top"
                className={this.getTabLinkClass(1)}
                role="tab"
                onClick={this.switchTab(1)}
              >
                模擬資訊
              </a>
            </li>
            {/* <li className="nav-item">
              <a
                href="#top"
                className={this.getTabLinkClass(2)}
                role="tab"
                onClick={this.switchTab(2)}
              >
                清機設定
              </a>
            </li> */}
          </ul>
          <div className={0 === this.state.tabIndex ? '' : 'd-none'}>
            <Interface />
          </div>


          <div className={1 === this.state.tabIndex ? '' : 'd-none'}>

            <div className="row pt-2 mb-1">
              <div className="col-md-2">
                <button
                  className="btn ml-1 btn-outline-primary"
                  style={{ width: 100 }}
                  onClick={this.handleOpenModal}
                >
                  模擬環境
                </button>
              </div>
            </div>
            <div className="row">
              <div className="col-md-2">
                <div className="list-group">
                  <button
                    className={`list-group-item list-group-item-action ${activeTab === 'scheduleData' && 'active'}`}
                    onClick={() => this.handleTabChange('scheduleData')}
                  >
                    模擬設定
                  </button>
                  <button
                    className={`list-group-item list-group-item-action ${activeTab === 'scheduleSimulation' && 'active'}`}
                    onClick={() => this.handleTabChange('scheduleSimulation')}
                  >
                    模擬過程
                  </button>
                  <button
                    className={`list-group-item list-group-item-action ${activeTab === 'simulationResult' && 'active'}`}
                    onClick={() => this.handleTabChange('simulationResult')}
                  >
                    模擬結果
                  </button>
                </div>
              </div>

              <div className="col-md-10">
                <div className="tab-content">
                  <div className={`tab-pane ${activeTab === 'scheduleData' && 'show active'}`}>
                    <h2>模擬設定</h2>
                    <SimConfigPage simConfigs={configs} socket={socket} />
                  </div>
                  <div className={`tab-pane ${activeTab === 'scheduleSimulation' && 'show active'}`}>
                    <h2>模擬過程</h2>
                    <SimProcess simConfigs={configs} />
                  </div>
                  <div className={`tab-pane ${activeTab === 'simulationResult' && 'show active'}`}>
                    <h2>模擬結果</h2>
                    <SimResult simConfigs={configs} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className={2 === this.state.tabIndex ? '' : 'd-none'}>
            <SpecCleanPage />
          </div>

        </div>


        <SimModal
          title="模擬環境查詢"
          isOpen={isModalOpen}
          onClose={this.handleCloseModal}
          onSubmit={this.handleModalSubmit}
        />
      </>
    );
  }
}

export default PBTCSchedule;
