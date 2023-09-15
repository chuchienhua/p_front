import React from "react";
import { Line } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

function StatisticsChart(props) {

    let rows = props.rows || [];

    let backgroundColor = [
        "rgba(255, 55, 55, 0.5)",
        "rgba(55, 155, 55, 0.5)",
        "rgba(55, 55, 255, 0.5)",
    ];
    let borderColor = [
        "rgb(255, 55, 55)",
        "rgb(55, 155, 55)",
        "rgb(55, 55, 255)",
    ];

    let ecData = {
        labels: rows.map(x => (x.LINE + x.SEQUENCE)),
        datasets: [
            {
                label: '平均值',
                data: rows.map(x => x.EC_AVG),
                backgroundColor: backgroundColor[0],
                borderColor: borderColor[0],
                borderWidth: 1,
                yAxisID: 'y',
            },
            {
                label: '標準差',
                data: rows.map(x => x.EC_STD),
                backgroundColor: backgroundColor[1],
                borderColor: borderColor[1],
                borderWidth: 1,
                yAxisID: 'y1',
            },
        ],
    };

    let rpmData = {
        labels: rows.map(x => (x.LINE + x.SEQUENCE)),
        datasets: [
            {
                label: '平均值',
                data: rows.map(x => x.RPM_AVG),
                backgroundColor: backgroundColor[0],
                borderColor: borderColor[0],
                borderWidth: 1,
                yAxisID: 'y',
            },
            {
                label: '標準差',
                data: rows.map(x => x.RPM_STD),
                backgroundColor: backgroundColor[1],
                borderColor: borderColor[1],
                borderWidth: 1,
                yAxisID: 'y1',
            },
        ],
    };

    const ecOptions = {
        plugins: {
            title: {
                display: true,
                text: '押出機電流',
                font: {
                    size: 20
                }
            },
            legend: {
                position: "bottom",
                labels: {
                    font: {
                        size: 18,
                        weight: 'bold',
                    },
                },
            },
        },
        scales: {
            y: {
                title: {
                    display: true,
                    text: '平均值',
                    color: backgroundColor[0],
                    font: {
                        size: 20,
                        weight: 'bold',
                    },
                },
                ticks: {
                    stepSize: 50
                },
                max: rows.length ? parseInt(rows[rows.length - 1]['EC_AVG'] + 200 - rows[rows.length - 1]['EC_AVG'] % 25) : 200,
                min: rows.length ? parseInt(rows[rows.length - 1]['EC_AVG'] - 200 - rows[rows.length - 1]['EC_AVG'] % 25) : 0,
            },
            y1: {
                title: {
                    display: true,
                    text: '標準差',
                    color: backgroundColor[1],
                    font: {
                        size: 20,
                        weight: 'bold',
                    },
                },
                ticks: {
                    stepSize: 50
                },
                position: 'right',
                grid: {
                    drawOnChartArea: false,
                },
                max: 200,
                min: 0,
            },
        },
    };

    const rpmOptions = {
        plugins: {
            title: {
                display: true,
                text: '押出機轉速',
                font: {
                    size: 20,
                }
            },
            legend: {
                position: "bottom",
                labels: {
                    font: {
                        size: 18,
                        weight: 'bold',
                    },
                },
            },
        },
        scales: {
            y: {
                title: {
                    display: true,
                    text: '平均值',
                    color: backgroundColor[0],
                    font: {
                        size: 20,
                        weight: 'bold',
                    },
                },
                ticks: {
                    stepSize: 50
                },
                max: rows.length ? parseInt(rows[rows.length - 1]['RPM_AVG'] + 200 - rows[rows.length - 1]['RPM_AVG'] % 25) : 200,
                min: rows.length ? parseInt(rows[rows.length - 1]['RPM_AVG'] - 200 - rows[rows.length - 1]['RPM_AVG'] % 25) : 0,
            },
            y1: {
                title: {
                    display: true,
                    text: '標準差',
                    color: backgroundColor[1],
                    font: {
                        size: 20,
                        weight: 'bold',
                    },
                },
                ticks: {
                    stepSize: 50
                },
                display: true,
                position: 'right',
                grid: {
                    drawOnChartArea: false,
                },
                max: 200,
                min: 0,
            },
        },
    };

    return (
        <div className="d-flex">
            <Line data={ecData} options={ecOptions} style={{ maxWidth: '600px', maxHeight: '400px', marginRight: '50px' }} />
            <Line data={rpmData} options={rpmOptions} style={{ maxWidth: '600px', maxHeight: '400px' }} />
        </div>
    );
}

export default StatisticsChart;