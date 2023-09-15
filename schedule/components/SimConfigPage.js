import React, { useState, useEffect } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from 'reactstrap';
import Swal from 'sweetalert2';
import {generateAPIUrl} from '../common/Utils'

import axios from 'axios';

import './sim_config_page.css';

const SimulationModal = ({ isOpen, toggle, selectedItemsLeft, simNowResult, onStartSimulation, simulationLoading }) => {
  return (
    <Modal isOpen={isOpen} toggle={toggle}>
      <ModalHeader toggle={toggle}>模擬確認</ModalHeader>
      <ModalBody>
        <p>已選取下面的排程ID</p>
        <ul>
          {selectedItemsLeft.map((index) => (
            <li key={index}>{simNowResult[index].SchedulingID}</li>
          ))}
        </ul>
        <p>是否開始進行模擬?</p>
      </ModalBody>
      <ModalFooter>
        <Button color="primary" onClick={toggle} disabled={simulationLoading}>
          取消
        </Button>
        <Button color="success" onClick={() => {
          const selectedItemsWithSimNow = selectedItemsLeft
            // .concat(selectedItemsRight)
            .filter(index => !(simNowResult[index] && simNowResult[index].SimNow));


          onStartSimulation(selectedItemsWithSimNow)
        }} disabled={simulationLoading}>
          {simulationLoading ? <div><span className="spinner-border spinner-border-sm mr-1" role="status" aria-hidden="true"></span>開始</div> : '開始'}
        </Button>
      </ModalFooter>
    </Modal>
  );
};


const Tab1Content = ({ simNowResult, handleCheckboxChange, selectedItemsLeft, selectedItemsRight, setSelectedItemsLeft }) => {
  const itemsLeft = simNowResult.filter(item => item.SchedulingType === 'production');
  // const itemsRight = simNowResult.filter(item => item.SchedulingType === 'packaging');
  const [selectAllLeft, setSelectAllLeft] = useState(false);

  const toggleSelectAllLeft = () => {
    setSelectAllLeft(!selectAllLeft);
    const allItemIndices = Array.from({ length: itemsLeft.length }, (_, index) => index);
    setSelectedItemsLeft(selectAllLeft ? [] : allItemIndices);
  };


  return (
    <div className="row">
      {/* 押出線 */}
      <div className="col-md-6">
        <h4 className="mt-1">押出線
          <span className="btn btn-link" onClick={toggleSelectAllLeft}>
            {selectAllLeft ? '取消全選' : '全選'}
          </span>
        </h4>
        <div className="scrollable-box">
          <ul id="leftList" className="list-group">
            {itemsLeft.map((item, index) => (<>
              <li
                className={`list-group-item ${selectedItemsLeft.includes(index) ? 'active' : ''}`}
                key={index}
                onClick={() => {
                  if (item.SimNow)
                    return
                  else
                    handleCheckboxChange(index, 'left')
                }}
                style={{ position: 'relative' }}
              >
                <div className="checkbox-wrapper">
                  <div className="centered-content">
                    <input
                      type="checkbox"
                      id={`rightCheckbox${index}`}
                      className="custom-checkbox"
                      checked={selectedItemsLeft.includes(index)}
                      disabled={item.SimNow}
                    />
                    <label>{item.SchedulingID}</label>
                    <div
                      style={{
                        position: 'absolute',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        right: '1%',
                      }}>
                      {Boolean(item.SimNow) && <span className='mr-2' style={{ color: 'red', fontWeight: 'bold' }}>{`${(item.envTimeElapsed * 100 / item.envTimeCompletion).toFixed(0)} %`}</span>}
                      <button
                        className={`btn btn-primary`}

                        onClick={(e) => {
                          e.stopPropagation();
                          const table = document.getElementById(`leftTable${index}`);
                          table.style.display = table.style.display === 'none' ? 'block' : 'none';
                        }}
                      >設定</button>
                    </div>
                  </div>
                </div>


              </li>
              <table
                id={`leftTable${index}`}
                className="table"
                style={{ display: 'none' }}
              >
                <tbody>
                  <tr>
                    <td>SimNow:</td>
                    <td>{item.SimNow.toString()}</td>
                  </tr>
                  <tr>
                    <td>EnvTimeCompletion:</td>
                    <td>{item.envTimeCompletion}</td>
                  </tr>
                  <tr>
                    <td>EnvTimeElapsed:</td>
                    <td>{item.envTimeElapsed}</td>
                  </tr>
                  <tr>
                    <td>EnvTimeFrequency:</td>
                    <td>{item.envTimeFrequency}</td>
                  </tr>
                </tbody>
              </table>
            </>
            ))}
          </ul>
        </div>
      </div>

      {/* 包裝線 */}
      <div className="col-md-6">
        <h4 className="mt-1">包裝線
        </h4>
        {/* <div className="scrollable-box">
          <ul id="rightList" className="list-group">
            {itemsRight.map((item, index) => (
              <li
                className={`list-group-item ${selectedItemsRight.includes(index) ? 'active' : ''}`}
                key={index}
                onClick={() => handleCheckboxChange(index, 'right')}
              >
                <div className="checkbox-wrapper">
                  <div className="centered-content">
                    <input
                      type="checkbox"
                      id={`rightCheckbox${index}`}
                      className="custom-checkbox"
                      checked={selectedItemsRight.includes(index)}
                    />
                    <label>{item.SchedulingID}</label>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div> */}
      </div>
    </div>
  );
};

let pollingTimer = null
const SimConfigPage = ({ simConfigs }) => {


  const [selectedItemsLeft, setSelectedItemsLeft] = useState([]);
  const [selectedItemsRight, setSelectedItemsRight] = useState([]);
  const [simNowResult, setSimNowResult] = useState([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [simulationLoading, setSimulationLoading] = useState(false);





  useEffect(() => {
    const pollingInterval = 2000;

    if (pollingTimer) {
      clearInterval(pollingTimer);
    }
    apiQuerySimnow(simConfigs)
    pollingTimer = setInterval(() => {
      apiQuerySimnow(simConfigs);
    }, pollingInterval)

    return () => {
      if (pollingTimer) {
        clearInterval(pollingTimer);
      }
    };
  }, [simConfigs]);

  const toggleModal = () => {
    setModalOpen(!modalOpen);
  };

  const handleCheckboxChange = (index, side) => {
    if (side === 'left') {
      const newSelectedItems = [...selectedItemsLeft];
      if (newSelectedItems.includes(index)) {
        newSelectedItems.splice(newSelectedItems.indexOf(index), 1);
      } else {
        newSelectedItems.push(index);
      }
      setSelectedItemsLeft(newSelectedItems);
    } else if (side === 'right') {
      const newSelectedItems = [...selectedItemsRight];
      if (newSelectedItems.includes(index)) {
        newSelectedItems.splice(newSelectedItems.indexOf(index), 1);
      } else {
        newSelectedItems.push(index);
      }
      setSelectedItemsRight(newSelectedItems);
    }
  };

  const handleStartSimulation = (selectedItemsLeft) => {




    if (selectedItemsLeft.length === 0) {
      Swal.fire({
        title: '請選擇至少一個排程ID',
        icon: 'warning',
        confirmButtonText: '確認',
      });
      return;
    }

    const selectedConfigs = simConfigs.production
      .filter((_, index) => selectedItemsLeft.includes(index))
    // .concat(simConfigs.packaging.filter((_, index) => selectedItemsRight.includes(index)));

    const requestData = {
      config_list: selectedConfigs,
    };
    setSimulationLoading(true);
    const url = generateAPIUrl('/simulation/start')
    axios
      .post(url, requestData)
      .then(response => {
        setSimulationLoading(false);
        toggleModal();
      })
      .catch(error => {
        console.error('Error starting simulation:', error);
        setSimulationLoading(false);
      });
  };

  const apiQuerySimnow = async (simConfigs) => {
    try {
      const configs = simConfigs.production
      const url = generateAPIUrl('/simulation/query_simnow')
      const response = await axios.post(url, { configs });
      const combinedData = response.data.filter((item) => {
        const matchingConfig = configs.find((config) => {
          const isMatching = (config.scheduling_id === item.SchedulingID) && (config.environment_id === item.EnvID)
          return isMatching
        });

        return Boolean(matchingConfig)
      });
      setSimNowResult(combinedData);
    } catch (error) {
      console.error("Failed to query SimNow:", error);
      //pass
    }
  };


  return (
    <>
      {/* SimulationModal component */}
      <SimulationModal
        isOpen={modalOpen}
        toggle={toggleModal}
        selectedItemsLeft={selectedItemsLeft}
        simNowResult={simNowResult}
        onStartSimulation={handleStartSimulation}
        simulationLoading={simulationLoading}
      />
      <button
        className="btn btn-primary"
        onClick={toggleModal}>
        開始模擬
      </button>
      <div className="container-fluid mt-1">
        <div className="row">
          <ul className="nav nav-tabs">
            <li className="nav-item">
              <a className="nav-link active" data-toggle="tab" href="#config-tab1">排程方法</a>
            </li>
            <li className="nav-item">
              <a className="nav-link" data-toggle="tab" href="#config-tab2">製程參數</a>
            </li>
            <li className="nav-item">
              <a className="nav-link" data-toggle="tab" href="#config-tab3">訂單規格</a>
            </li>
            <li className="nav-item">
              <a className="nav-link" data-toggle="tab" href="#config-tab4">產線規格</a>
            </li>
            <li className="nav-item">
              <a className="nav-link" data-toggle="tab" href="#config-tab5">SILO規格</a>
            </li>
          </ul>

        </div>
        <div className="tab-content">
          <div className="tab-pane fade show active" id="config-tab1">
            <Tab1Content
              simNowResult={simNowResult}
              handleCheckboxChange={handleCheckboxChange}
              selectedItemsLeft={selectedItemsLeft}
              selectedItemsRight={selectedItemsRight}
              setSelectedItemsLeft={setSelectedItemsLeft}
            />
          </div>
        </div>
        <div className="tab-pane fade" id="config-tab2">
          <p>Content of Tab 2</p>
        </div>
        <div className="tab-pane fade" id="config-tab3">
          <p>Content of Tab 3</p>
        </div>
      </div>
    </>
  );
};

export default SimConfigPage;
