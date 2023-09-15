import React, { Component, useState, useEffect, useCallback } from 'react';
// import echarts from 'echarts';
import axios from 'axios';
import './schedule_table.css';

import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './sim_modal.css'
import {generateAPIUrl} from '../common/Utils'
import moment from 'moment';

import XLSX from 'xlsx-js-style';
import Swal from 'sweetalert2';

// function BarChart(props) {
//     useEffect(() => {


//         const chart = echarts.init(document.getElementById('barChart'));

//         const option = {
//             title: {
//                 text: '直方图',
//                 x: 'center',
//             },
//             tooltip: {
//                 trigger: 'axis',
//             },
//             legend: {
//                 data: ['sim_total_duration_sum', 'sim_switch_number_sum'],
//                 x: 'left',
//             },
//             xAxis: {
//                 type: 'category',
//                 data: Object.keys(props.data[0].sim_total_duration_sum), // x轴数据，根据您的需求选择数据
//             },
//             yAxis: {
//                 type: 'value',
//                 name: '数值',
//             },
//             series: [
//                 {
//                     name: 'sim_total_duration_sum',
//                     type: 'bar',
//                     data: Object.values(props.data[0].sim_total_duration_sum), // y轴数据，根据您的需求选择数据
//                 },
//                 {
//                     name: 'sim_switch_number_sum',
//                     type: 'bar',
//                     data: Object.values(props.data[0].sim_switch_number_sum), // y轴数据，根据您的需求选择数据
//                 },
//             ],
//         };

//         // 使用刚指定的配置项和数据显示图表
//         chart.setOption(option);

//         // 在组件卸载时销毁图表，以防止内存泄漏
//         return () => {
//             chart.dispose();
//         };
//     }, [props.data]);

//     return <div id="barChart" style={{ width: '100%', height: '400px' }} />;
// }



function SchedulingMethodsTable({
    data,
    selectedRow,
    selectedSubTableRow,
    handleRowClickSubTable,
    handleOnClick,
    isSearchLoading,
}) {
    return (
        <div>
            <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #ddd' }}>
                <table className="mt-2 table table-bordered">
                    <thead style={{ position: 'sticky', top: '0' }}>
                        <tr className="table-secondary">
                            <th>排程編號</th>
                            <th>總產能</th>
                            <th>總產量</th>
                            <th>最大生產時間</th>
                            <th>總切換次數</th>
                            <th>總清機時間</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {data[selectedRow].config?.production?.map((doc, index) => {
                            const key = `${doc.EnvID}-${doc.SchedulingID}`;
                            const isRowSelected = key === selectedSubTableRow;

                            let config = {
                                EnvID: doc.EnvID,
                                SchedulingID: doc.SchedulingID,
                            };

                            return (
                                <tr
                                    key={doc._id}
                                    className={isRowSelected ? 'selected-subtable-row' : ''}
                                >
                                    {/* <td>{doc.SchedulingID}</td> */}
                                    <td>{`${doc.Title}-${index}`}</td>
                                    <td>{doc.SimResult?.totalMetrics?.total_capacity.toFixed(1) || "N/A"}</td>
                                    <td>{doc.SimResult?.totalMetrics?.total_produced_quantity.toFixed(1) || "N/A"}</td>
                                    <td>{doc.SimResult?.totalMetrics?.max_total_duration.toFixed(1) || "N/A"}</td>
                                    <td>{doc.SimResult?.totalMetrics?.total_switch_num.toFixed(1) || "N/A"}</td>
                                    <td>{doc.SimResult?.totalMetrics?.total_clean_time.toFixed(1) || "N/A"}</td>
                                    <td>
                                        <button
                                            className="btn btn-outline-secondary"
                                            onClick={() => {
                                                handleRowClickSubTable(doc.EnvID, doc.SchedulingID);
                                                handleOnClick(config);
                                            }}
                                            style={{ fontSize: '14px' }}
                                            disabled={isSearchLoading}
                                        >
                                            {isSearchLoading && isRowSelected ? (
                                                <>
                                                    <span
                                                        className="spinner-border spinner-border-sm"
                                                        role="status"
                                                        aria-hidden="true"
                                                    ></span>{' '}
                                                    查詢中
                                                </>
                                            ) : (
                                                '查詢'
                                            )}
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}


class SchedulePipeline extends Component {
    constructor(props) {
        super(props);
        this.state = {
            activeTab: '全部',
            tableData: [],
            tabList: [
                '全部',
                'A',
                'B',
                'C',
                'D',
                'E',
                'F',
                'G',
                'H',
                'K',
                'M',
                'N',
                'Q',
                'R',
                'S',
                'T'
            ],
            categorizedData: {}, // 分類好的數據

        };
        this.fetchTableData = this.fetchTableData.bind(this)

    }

    componentDidMount() {
        // this.fetchTableData();
    }
    componentDidUpdate = async (prevProps) => {
        if (prevProps.selectedConfig !== this.props.selectedConfig) {
            await this.fetchTableData();
        }
    }
    fetchTableData = async () => {
        const { selectedConfig, setIsLoading } = this.props
        try {
            setIsLoading(true)
            const url = generateAPIUrl('/simulation_record/schedule_table')
            const response = await axios.post(url, {
                config: selectedConfig
            });

            const data = response.data;
            const tableData = data.jobs.production_jobs;
            const tabList = ['全部', ...data.production_line_names];
            // 將 line_name 分類並設定 categorizedData
            const categorizedData = {
                '全部': tableData, // Add an "All" category with all tableData items
            };
            tableData.forEach(item => {
                if (!categorizedData[item.line_name]) {
                    categorizedData[item.line_name] = [];
                }
                categorizedData[item.line_name].push(item);
            });
            this.setState({ tableData, tabList, categorizedData });

            // 如果 activeTab 尚未設定，預設選取第一個 Tab
            if (!this.state.activeTab && tabList.length > 0) {
                this.setState({ activeTab: tabList[0] });
            }
        } catch (error) {
            console.error('Error fetching table data:', error);
        } finally {
            setIsLoading(false)
        }
    };



    exportToExcel = () => {

        try {

            if (!this.state.tabList || !this.state.categorizedData) {
                throw new Error("Data is not available for export.");
            }
            const workbook = XLSX.utils.book_new();

            this.state.tabList.forEach(tab => {
                const filteredData = this.state.categorizedData[tab] || [];

                // Create an array of column headers from the table
                const columnHeaders = [
                    `${tab}線序號`,
                    'GRADE',
                    '批號',
                    '批數',
                    '預計產量',
                    'PBR規格',
                    'PBR用量(KG)',
                    '押出量(KG/Hr)',
                    '押時(Hr)',
                    '預定生產開始',
                    '預定生產結束',
                    '實際開機',
                    '實際完工',
                    '異常停機(Hr)',
                    '預計清機(Hr)',
                    '實際停機(Hr)',
                    '出貨日',
                    '品檢判定',
                    '生產備註',
                    '實際包裝(KG)'
                ];

                // Create a 2D array representing the data
                const dataMatrix = [columnHeaders, ...filteredData.map(item => [
                    item.job_no,
                    item.grade,
                    item.lot_no,
                    item.batch_size,
                    item.quantity,
                    item.product_spec,
                    item.pbr_usage_kg,
                    item.line_output_qty,
                    item.schedule_duration,
                    item.schedule_start,
                    item.schedule_end,
                    item.actual_startup,
                    item.actual_completion,
                    item.abnormal_shutdown,
                    item.expected_cleanup,
                    item.actual_shutdown,
                    item.shipping_date,
                    item.inspection_decision,
                    item.production_notes,
                    item.actual_packaging_kg
                ])];

                // Convert the data matrix to a worksheet
                const worksheet = XLSX.utils.aoa_to_sheet(dataMatrix);
                XLSX.utils.book_append_sheet(workbook, worksheet, tab);
            });

            // Generate a unique filename using the current date and time
            const now = new Date();
            const filename = `schedule_data_${now.toISOString()}.xlsx`;

            // Save the workbook as an Excel file
            XLSX.writeFile(workbook, filename);
        } catch (error) {
            // Handle error using sweetalert2
            console.error("Error exporting data to Excel:", error);
            Swal.fire({
                icon: 'error',
                title: '匯出失敗',
                text: '沒有對應的排程結果可以匯出',
                confirmButtonText: 'OK'
            });
        }
    };




    handleTabChange = tabId => {
        this.setState({ activeTab: tabId });
    };

    renderTabList() {
        return (
            <ul className="mt-4 nav nav-tabs">
                {this.state.tabList.map((tab, index) => (
                    <li
                        style={{ fontSize: 12 }}
                        className="ml-1 nav-item"
                        key={`${tab}-${index}`}>
                        <button
                            className={`nav-link ${this.state.activeTab === tab ? 'active' : ''}`}
                            onClick={() => this.handleTabChange(tab)}
                        >
                            {`${tab} 線 `}
                            <span className="badge text-bg-secondary ml-1">
                                {this.state.categorizedData[tab] ? this.state.categorizedData[tab].length : 0}
                            </span>
                        </button>
                    </li>
                ))}
            </ul>
        );
    }
    renderTable() {
        // console.log(this.state.categorizedData)
        const filteredData = this.state.categorizedData[this.state.activeTab] || [];
        // console.log(filteredData)
        const { activeTab } = this.state

        return (
            <div key={this.state.activeTab} className="table-container">
                <table className="table table-bordered table-hover">
                    <thead>
                        <tr>
                            <th className="text-center schedule-table-nowrap-header">線別</th>
                            <th className="text-center schedule-table-nowrap-header">{`${activeTab}線序號`}</th>
                            {/* <th className="text-center schedule-table-nowrap-header">GRADE</th> */}
                            {/* <th className="text-center schedule-table-nowrap-header">批號</th> */}
                            <th className="text-center schedule-table-nowrap-header">批數</th>
                            <th className="text-center schedule-table-nowrap-header">預計產量</th>
                            <th className="text-center schedule-table-nowrap-header">PBR規格</th>
                            {/* <th className="text-center schedule-table-nowrap-header">PBR用量<br></br><small>(KG)</small></th> */}
                            <th className="text-center schedule-table-nowrap-header">押出量<br></br><small>(KG/Hr)</small></th>
                            <th className="text-center schedule-table-nowrap-header">押時<br></br><small>(Hr)</small></th>
                            <th className="text-center schedule-table-nowrap-header">預定生產開始</th>
                            <th className="text-center schedule-table-nowrap-header">預定生產結束</th>
                            {/* <th className="text-center schedule-table-nowrap-header">實際開機</th> */}
                            {/* <th className="text-center schedule-table-nowrap-header">實際完工</th> */}
                            {/* <th className="text-center schedule-table-nowrap-header">異常停機<br></br><small>(Hr)</small></th> */}
                            <th className="text-center schedule-table-nowrap-header">預計清機<br></br><small>(Hr)</small></th>
                            {/* <th className="text-center schedule-table-nowrap-header">實際停機<br></br><small>(Hr)</small></th> */}
                            {/* <th className="text-center schedule-table-nowrap-header">出貨日</th> */}
                            {/* <th className="text-center schedule-table-nowrap-header">品檢判定</th> */}
                            {/* <th className="text-center schedule-table-nowrap-header">生產備註</th> */}
                            {/* <th className="text-center schedule-table-nowrap-header">實際包裝<br></br><small>(KG)</small></th> */}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredData.map(item => (
                            <tr key={`${item.line_name}-${item.job_no}`}>
                                <td>{item.line_name}</td>
                                <td>{item.job_no}</td>
                                {/* <td></td> */}
                                {/* <td></td> */}
                                <td>{item.batch_size}</td>
                                <td>{item.quantity}</td>
                                <td>{item.product_spec}</td>
                                {/* <td></td> */}
                                <td>{item.line_output_qty}</td>
                                <td>{item.schedule_duration}</td>
                                <td>{item.schedule_start}</td>
                                <td>{item.schedule_end}</td>
                                {/* <td></td> */}
                                {/* <td></td> */}
                                {/* <td></td> */}
                                <td>{item.executing_time}</td>
                                {/* <td></td> */}
                                {/* <td></td> */}
                                {/* <td></td> */}
                                {/* <td></td> */}
                                {/* <td></td> */}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    }



    render() {
        const { isSearchLoading } = this.props; // Use isLoading from props
        return (
            <div>

                <div className="mt-4 d-flex justify-content-between align-items-center">
                    <button className="btn btn-outline-secondary" onClick={this.exportToExcel} disabled={isSearchLoading}>
                        匯出Excel
                    </button>
                </div>
                {this.renderTabList()}
                <div className="schedule-line"></div>

                {this.renderTable()}
            </div>
        );
    }
}



function ScheduleCandidateTable() {
    const [activeTab, setActiveTab] = useState('methods');
    const [data, setData] = useState([]);
    const [selectedRow, setSelectedRow] = useState(null);
    const [start_date, setStartDate] = useState(new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000)); // 7 days ago
    const [end_date, setEndDate] = useState(new Date());
    const [isLoading, setIsLoading] = useState(false);
    const [selectedSubTableRow, setSelectedSubTableRow] = useState(null);
    const [selectedConfig, setSelectedConfig] = useState(null);

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

            // console.log(response.data)
            setData(response.data);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setIsLoading(false); // Stop loading
        }
    }, [start_date, end_date])


    useEffect(() => {
        fetchData();
    }, [fetchData]);



    const handleStartDateChange = (date) => {
        setStartDate(date);
    };

    const handleEndDateChange = (date) => {
        setEndDate(date);
    };


    const handleRowClick = (envID) => {
        setSelectedRow((prevSelectedRow) => (prevSelectedRow === envID ? null : envID));
    };

    const handleRowClickSubTable = (envID, schedulingID) => {
        const selectedRowKey = `${envID}-${schedulingID}`;
        setSelectedSubTableRow(selectedSubTableRow === selectedRowKey ? null : selectedRowKey);
    };

    const handleOnClick = async (config) => {
        console.log(config)
        setSelectedConfig({ ...config })
    };

    const handleTabChange = (tab) => {
        setActiveTab(tab);
    };

    // const chartDataProcess = (data) => {
    //     //production line
    //     let dataConfig = []
    //     if (data && data[envID]) {
    //         if (data[envID].config && data[envID].config.production) {
    //             dataConfig = data[envID].config.production;
    //         } 
    //     } 

    //     return dataChart
    // }

    // const dataChart = chartDataProcess(data)


    return (


        <div>
            <div className="d-flex">
                <div className="flex-grow-1 d-flex align-items-center">
                    <h4 className="mr-2 mt-1">交期區間</h4>

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
                    <span className='mt-2 muted'>選擇排程訂單區間列後, 會顯示排程結果</span>
                </div>
                <div className="d-flex align-items-center">

                    <button
                        className="btn btn-outline-secondary"
                        style={{ fontSize: '14px' }}
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
                            {/* <th>環境ID</th> */}
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
                            const minAssDate = new Date(order.minAssDate);
                            const maxAssDate = new Date(order.maxAssDate);
                            const formattedMinAssDate = moment(order.minAssDate).format('YYYY-MM-DD HH:mm');
                            const formattedMaxAssDate = moment(order.maxAssDate).format('YYYY-MM-DD HH:mm');
                            const diffInDays = (maxAssDate - minAssDate) / (1000 * 60 * 60 * 24);

                            return (
                                <tr role='button'
                                    key={envID}
                                    className={`table-row ${selectedRow === envID ? 'selected-row' : ''}`}
                                    onClick={() => handleRowClick(envID)
                                    }
                                >
                                    {/* <td>{envID}</td> */}
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

            <div>
                <div className="d-flex">
                    {Boolean(selectedRow) && <button
                        className={`btn btn-outline-secondary ${activeTab === 'methods' ? 'active' : ''}`}
                        onClick={() => handleTabChange('methods')}
                        style={{ fontSize: '14px' }}
                    >
                        排程方法
                    </button>}
                    {Boolean(selectedConfig) && <button
                        className={`btn btn-outline-secondary ${activeTab === 'pipeline' ? 'active' : ''}`}
                        onClick={() => handleTabChange('pipeline')}
                        style={{ fontSize: '14px', marginLeft: '10px' }}
                    >
                        {isLoading ? (
                            <>
                                {'排程結果 (查詢中 '}<span
                                    className="spinner-border spinner-border-sm"
                                    role="status"
                                    aria-hidden="true"
                                ></span>{' '}
                                {' )'}

                            </>
                        ) : (
                            `排程結果 (${selectedConfig.SchedulingID})`
                        )}

                    </button>}
                </div>

                {activeTab === 'methods' && Boolean(selectedRow) && (
                    <SchedulingMethodsTable
                        data={data}
                        selectedRow={selectedRow}
                        selectedSubTableRow={selectedSubTableRow}
                        handleRowClickSubTable={handleRowClickSubTable}
                        handleOnClick={handleOnClick}
                        isSearchLoading={isLoading}
                    />
                )}

                {activeTab === 'methods' && Boolean(selectedRow) && (
                    <div>
                    </div>
                )}




                <div className={activeTab === 'pipeline' && Boolean(selectedConfig) ? '' : 'd-none'}>
                    <SchedulePipeline
                        isSearchLoading={isLoading}
                        setIsLoading={setIsLoading}
                        selectedConfig={selectedConfig}
                    />
                </div>
            </div>

        </div>

    );
}

function ScheduleTable() {
    return (
        <ScheduleCandidateTable />
    );
}

export default ScheduleTable;
