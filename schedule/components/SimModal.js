import React, { useState, useEffect, useCallback } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from 'reactstrap';
import DatePicker from 'react-datepicker';
import {generateAPIUrl} from '../common/Utils'
import 'react-datepicker/dist/react-datepicker.css';
import './sim_modal.css'
import axios from 'axios';
import moment from 'moment';


function SimModal({ isOpen, onClose, title, onSubmit }) {
    const [data, setData] = useState([]);
    const [selectedRow, setSelectedRow] = useState(null);
    const [start_date, setStartDate] = useState(new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000)); // 7 days ago
    const [end_date, setEndDate] = useState(new Date());
    const [isLoading, setIsLoading] = useState(false);

    const NAME_LOOKUP = {
        'production': '押出線',
        'packaging': '包裝線',
    }
    const fetchData = useCallback(async () => {
        try {
            setIsLoading(true); // Start loading
            // Format start_date and end_date as '%Y-%m-%d %H:%M' strings
            const formatDate = (date) => {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                const hours = String(date.getHours()).padStart(2, '0');
                const minutes = String(date.getMinutes()).padStart(2, '0');
                return `${year}-${month}-${day} ${hours}:${minutes}`;
            };

            const formattedStartDate = formatDate(start_date);
            const formattedEndDate = formatDate(end_date);
            const url = generateAPIUrl('/simulation_record/list')
            const response = await axios.post(url, {
                start_time: formattedStartDate,
                end_time: formattedEndDate
            });
            setData(response.data);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setIsLoading(false); // Stop loading
        }
    }, [start_date, end_date])

    useEffect(() => {
        if (isOpen) {
            // 当 Modal 打开时执行查询
            fetchData();
        }
    }, [isOpen, fetchData]);



    const handleStartDateChange = (date) => {
        setStartDate(date);
    };

    const handleEndDateChange = (date) => {
        setEndDate(date);
    };


    const handleRowClick = (envID) => {
        setSelectedRow((prevSelectedRow) => (prevSelectedRow === envID ? null : envID));
    };

    const handleSubmit = () => {
        if (selectedRow) {
            const configs = {}
            for (let key of ['production', 'packaging']) {
                configs[key] = data[selectedRow].config[key].map((c) => (
                    {
                        environment_id: c.EnvID,
                        scheduling_id: c.SchedulingID,
                        simulation_id: 'sim_0'
                    }

                ))
            }

            onSubmit(configs)
        }
    }


    return (
        <Modal isOpen={isOpen} toggle={onClose} size="xl">
            <ModalHeader toggle={onClose}>{title}</ModalHeader>
            <ModalBody>
                <div className="d-flex">
                    <div className="flex-grow-1 d-flex align-items-center">
                        <label className="mr-2 mt-1" style={{ fontSize: '20px' }}>時間範圍</label>
                        <DatePicker
                            selected={start_date}
                            onChange={handleStartDateChange}
                            showTimeSelect
                            timeFormat="HH:mm"
                            timeIntervals={15}
                            dateFormat="yyyy-MM-dd HH:mm"
                            className="form-control mr-2"
                        />
                        <label className="ml-2 mr-2 mt-1" style={{ fontSize: '20px' }}>~</label>
                        <DatePicker
                            selected={end_date}
                            onChange={handleEndDateChange}
                            showTimeSelect
                            timeFormat="HH:mm"
                            timeIntervals={15}
                            dateFormat="yyyy-MM-dd HH:mm"
                            className="form-control mr-2"
                        />
                    </div>
                    <div className="d-flex align-items-center">

                        <button
                            className="btn btn-primary"
                            style={{ fontSize: '16px' }}
                            disabled={isLoading}
                            onClick={fetchData}
                        >
                            {isLoading ? (
                                <><span
                                    className="spinner-border spinner-border-sm"
                                    role="status"
                                    aria-hidden="true"
                                ></span>查詢中</>
                            ) : (
                                '查詢'
                            )}
                        </button>

                    </div>
                </div>
                <div className="mt-2 mb-1 table-container" style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #ddd' }}>
                    <table className="mt-2 table table-bordered table-hover">
                        <thead style={{ position: 'sticky', top: '0' }}>
                            <tr className="table-secondary">
                                <th>環境ID</th>
                                <th>最後創建日期</th>
                                <th>訂單數量</th>
                                <th>訂單區間</th>
                                <th>天數範圍</th>
                                <th>排程數量</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.keys(data).map((envID) => {
                                const order = data[envID].ORDER || {};
                                const createDate = order.maxCreateTime
                                console.log(order.minAssDate)
                                const minAssDate = new Date(order.minAssDate);
                                const maxAssDate = new Date(order.maxAssDate);
                                const formattedMinAssDate = moment(order.minAssDate).format('YYYY-MM-DD HH:mm');
                                const formattedMaxAssDate = moment(order.maxAssDate).format('YYYY-MM-DD HH:mm');
                                const diffInDays = (maxAssDate - minAssDate) / (1000 * 60 * 60 * 24);

                                return (
                                    <tr role='button'
                                        key={envID}
                                        className={`table-row ${selectedRow === envID ? 'selected-row' : ''}`}
                                        onClick={() => handleRowClick(envID)}
                                    >
                                        <td>{envID}</td>
                                        <td>{createDate}</td>
                                        <td>{order ? order.count : 'N/A'}</td>
                                        <td>{order ? `${formattedMinAssDate} ~ ${formattedMaxAssDate}` : 'N/A'}</td>
                                        <td>{isNaN(diffInDays) ? 'N/A' : diffInDays}</td>
                                        <td>{data[envID].config?.production?.length || 'N/A'}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {selectedRow && (<>
                    <p style={{ fontSize: '20px' }} className="mt-4">排程方法</p>
                    <table className="mt-2 table table-bordered">
                        <thead>
                            <tr className="table-secondary">
                                <th>排程ID</th>
                                <th>製程別</th>
                                <th>環境開始時間</th>
                                <th>上次模擬日期</th>
                                <th>模擬總時間</th>
                                <th>已模擬時間</th>
                                <th>模擬進度(%)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data[selectedRow].config?.production?.map((doc) => {

                                let completion
                                if (Boolean(doc.SimInfo))
                                    completion = (doc.SimInfo.envTimeElapsed * 100 / doc.SimInfo.envTimeCompletion).toFixed(2)
                                else
                                    completion = 0
                                return <tr key={doc._id}>
                                    <td>{doc.SchedulingID}</td>
                                    <td>{NAME_LOOKUP[doc.SchedulingType]}</td>
                                    <td>{moment(doc.StartTime).format('YYYY-MM-DD HH:mm')}</td>
                                    <td>{Boolean(doc.SimInfo) ? moment(doc.SimInfo.updatedDate).format('YYYY-MM-DD HH:mm') : 'NA'}</td>
                                    <td>{Boolean(doc.SimInfo) ? doc.SimInfo.envTimeCompletion : 'NA'}</td>
                                    <td>{Boolean(doc.SimInfo) ? doc.SimInfo.envTimeElapsed : 'NA'}</td>
                                    <td>{Boolean(doc.SimInfo) ? `${completion}%` : 'NA'}</td>
                                </tr>
                            })}
                            {data[selectedRow].config?.packaging?.documents?.map((doc) => (
                                <tr key={doc._id}>
                                    <td>{doc.SchedulingID}</td>
                                    <td>{NAME_LOOKUP[doc.SchedulingType]}</td>
                                    <td>{doc.StartTime}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </>
                )}


            </ModalBody>
            <ModalFooter>
                <Button color="primary" onClick={handleSubmit}>選擇</Button>
                <Button color="secondary" onClick={onClose}>取消</Button>
            </ModalFooter>
        </Modal>
    );
}
export default SimModal;