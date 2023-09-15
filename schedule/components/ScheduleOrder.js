import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import DatePicker from 'react-datepicker';
import Select from 'react-select'; // Import react-select
import 'react-datepicker/dist/react-datepicker.css';
import {generateAPIUrl} from '../common/Utils'
import './schedule_order.css';

function ScheduleOrder() {

    const today = new Date();
    const twoMonthsLater = new Date();
    twoMonthsLater.setMonth(today.getMonth() + 2);

    const [loading, setLoading] = useState(false);
    const [orders, setOrders] = useState([]);
    const [startDate, setStartDate] = useState(today);
    const [endDate, setEndDate] = useState(twoMonthsLater);

    const [selectedLines, setSelectedLines] = useState([]);
    const [availableLines, setAvailableLines] = useState([]);
    const fetchOrders = useCallback(async () => {
        try {
            setLoading(true); // Set querying status to true
            const url = generateAPIUrl('/simulation/get_customer_orders')
            console.log(url)
            const response = await axios.post(url, {
                start_date: startDate,
                end_date: endDate
            });

            const orders = response.data.map(order => ({
                ...order,
                DEFAULT_LINE: order.LINE ? [...order.LINE] : [],
                selected: true
            }));


            setOrders(orders);
            const availableLines = Array.from(new Set(orders.flatMap(order => order.LINE)));
            setAvailableLines(availableLines); // Set availableLines state
            setSelectedLines(availableLines)


        } catch (error) {
            console.error('Error fetching orders:', error);
        } finally {
            setLoading(false); // Reset querying status to false, regardless of success or failure
        }
    }, [endDate, startDate])

    useEffect(() => {

        fetchOrders();

    }, [fetchOrders]);

    const handleSaveSelectedRows = async () => {
        try {
            setLoading(true);
            const filterOrders = handleFilterOrders(orders)
            const selectedOrders = filterOrders.filter(row => Boolean(row.selected))
            const url = generateAPIUrl('/simulation/save_selected_orders')
            await axios.post(url, {
                selected_orders: selectedOrders
            });

        } catch (error) {
            console.error('Error saving selected rows:', error);
        } finally {
            setLoading(false); // Reset querying status to false, regardless of success or failure
        }
    };




    const handleRowSelect = (order) => {
        order.selected = !order.selected
        console.log(order)
        
        const updatedOrders = [...orders];
        console.log(updatedOrders[0])

        setOrders(updatedOrders);
    };

    const handleLineSelect = (selectedOptions) => {
        const selectedLines = selectedOptions.map(option => option.value);
        setSelectedLines(selectedLines);
    };

    const handleFilterOrders = (orders) => {
        const filteredOrders = orders.filter(order => {
            if (selectedLines.length === 0) {
                return true; // If no lines selected, show all orders
            }
            return order.LINE.some(line => selectedLines.includes(line));
        });

        return filteredOrders

    }


    const handleUN_QTYChange = (order, newValue) => {
        // Parse the new value as an integer
        const newUN_QTY = parseInt(newValue, 10);

        // Update the 'UN_QTY' property of the current order
        const updatedOrder = {
            ...order,
            UN_QTY: newUN_QTY,
        };

        // Find the index of the updated order in the 'orders' array
        const orderIndex = orders.findIndex(o => o.ORD_NO === updatedOrder.ORD_NO);

        // Create a copy of the 'orders' array with the updated order
        const updatedOrders = [...orders];
        updatedOrders[orderIndex] = updatedOrder;

        // Update 'orders' state with the updated order
        setOrders(updatedOrders);
    };


    const filteredOrders = handleFilterOrders(orders)

    orders.forEach((order) => {
        order.isDisabled = !filteredOrders.includes(order) // Check if the order is not in filteredOrders
    });




    return (
        <div>
            <div className="row">
                <div className="col-md-3">
                    <h4 className="mt-1">交期區間</h4>
                    <div className="mb-3">
                        <label className="mr-2">開始: &nbsp;{/* Non-breaking space */}</label>
                        <DatePicker
                            selected={startDate}
                            onChange={(date) => setStartDate(date)}
                            dateFormat="yyyy-MM-dd"
                            className="form-control"
                            disabled={loading}
                        />
                    </div>
                    <div className="mb-3">
                        <label className="mr-2">結束: &nbsp;{/* Non-breaking space */}</label>
                        <DatePicker
                            selected={endDate}
                            onChange={(date) => setEndDate(date)}
                            dateFormat="yyyy-MM-dd"
                            className="form-control"
                            disabled={loading}
                        />
                    </div>

                </div>
                <div className="col-md-5">
                    <div className="mb-3">
                        <h4 className="mt-1">設定可用線別</h4>
                        <Select
                            isMulti
                            options={availableLines.map(line => ({ value: line, label: `${line}線` }))}
                            value={selectedLines.map(line => ({ value: line, label: `${line}線` }))}
                            onChange={handleLineSelect}
                        />
                    </div>
                </div>
                <div className="col-md-4 d-flex justify-content-end align-items-end">
                    <button
                        className="btn btn-primary mr-2 mb-3"
                        onClick={fetchOrders}
                        disabled={loading}
                    >
                        {loading ? (
                            <><span
                                className="spinner-border spinner-border-sm"
                                role="status"
                                aria-hidden="true"

                            ></span> 查詢中</>
                        ) : (
                            '查詢'
                        )}
                    </button>
                    <div style={{ width: '10px' }}></div> {/* 新增空白元素 */}
                    <button
                        className="btn btn-success mb-3"
                        onClick={handleSaveSelectedRows}
                        disabled={loading}
                    >
                        儲存設定
                    </button>
                </div>
            </div>

            <div style={{width:'100%', overflowX: 'scroll'}}>
                <table className="table">
                    <thead className="thead-dark">
                        <tr>
                            <th>訂單編號</th>
                            <th>產品簡碼</th>
                            <th>客戶簡碼</th>
                            <th>客戶名稱</th>
                            <th style={{ minWidth: 80 }}>需求量</th>
                            <th style={{ minWidth: 100 }}>目前庫存</th>
                            <th style={{ minWidth: 100 }}>加生產量<br></br>(不足量)</th>
                            <th style={{ minWidth: 80 }}>包裝別</th>
                            <th style={{ minWidth: 130 }}>希望交期</th>
                            <th style={{ minWidth: 200 }}>可排產線</th>
                            <th style={{ minWidth: 50 }}>選擇</th>
                        </tr>
                    </thead>
                    <tbody>
                        {orders.map((order, index) => (
                            <tr
                                key={`order-${index}`}
                                className={order.selected ? 'selected-order-row' : ''}
                            >
                                <td>{order['ORD_NO']}</td>
                                <td>{order['PRD_PC']}</td>
                                <td>{order['CUST_PRD_PC']}</td>
                                <td>{order['CUST_NAME']}</td>
                                <td>{order['ORD_QTY']}</td>
                                <td>{order['INV_QTY']}</td>
                                <td>
                                    <input
                                        type="number"
                                        value={order.UN_QTY}
                                        className={`form-control ${order.UN_QTY > 0 ? 'text-danger' : ''}`}
                                        onChange={(e) => handleUN_QTYChange(order, e.target.value)}
                                        disabled={order.isDisabled}
                                    />
                                </td>
                                <td>{order['PCK_NO']}</td>
                                <td>{order['ASS_DATE']}</td>
                                <td>
                                    <Select
                                        isMulti
                                        options={order['DEFAULT_LINE'].map(line => ({ value: line, label: line }))}
                                        value={order['LINE'].map(line => ({ value: line, label: line }))}
                                        onChange={selectedOptions => {
                                            const selectedLineValues = selectedOptions.map(option => option.value);

                                            const updatedOrder = {
                                                ...order,
                                                LINE: selectedLineValues,
                                            };

                                            const orderIndex = orders.findIndex(o => o.ORD_NO === updatedOrder.ORD_NO && o.PRD_PC === updatedOrder.PRD_PC && o.CUST_PRD_PC === updatedOrder.CUST_PRD_PC);

                                            const updatedOrders = [...orders];
                                            updatedOrders[orderIndex] = updatedOrder;
                                            setOrders(updatedOrders);
                                        }
                                        }
                                    />
                                </td>
                                <td>
                                    <input
                                        type="checkbox"
                                        checked={order.selected}
                                        className="order-custom-checkbox"
                                        onChange={() => handleRowSelect(order)}
                                        disabled={order.isDisabled} // Disable checkbox if isDisabled is true
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default ScheduleOrder;
