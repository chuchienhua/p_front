import React from "react";
import { Line } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

function ExtruderTrendChart(props) {

    let ecArray = props.ecArray || [];
    let rpmArray = props.rpmArray || [];
    let timeArray = props.timeArray || [];
    let ecAverage = props.ecAverage;
    let rpmAverage = props.rpmAverage;

    let backgroundColor = [
        "rgba(255, 55, 55, 0.5)",
        "rgba(55, 155, 55, 0.5)",
    ];
    let borderColor = [
        "rgb(255, 55, 55)",
        "rgb(55, 155, 55)",
    ];

    let ecData = {
        labels: timeArray,
        datasets: [
            {
                label: 'ec',
                data: ecArray,
                backgroundColor: backgroundColor[0],
                borderColor: borderColor[0],
                borderWidth: 1,
                yAxisID: 'y',
            },
        ],
    };

    let rpmData = {
        labels: timeArray,
        datasets: [
            {
                label: 'rpm',
                data: rpmArray,
                backgroundColor: backgroundColor[1],
                borderColor: borderColor[1],
                borderWidth: 1,
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
                display: false,
            },
            tooltips: {
                callbacks: {
                    label: function (tooltipItem) {
                        return tooltipItem.yLabel;
                    }
                }
            }
        },
        elements: {
            point: {
                radius: 0
            }
        },
        scales: {
            y: {
                ticks: {
                    stepSize: 50
                },
                max: ecAverage + 200 - ecAverage % 25,
                min: ecAverage - 200 - ecAverage % 25,
            },
        }
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
                display: false,
            },
            tooltips: {
                callbacks: {
                    label: function (tooltipItem) {
                        return tooltipItem.yLabel;
                    }
                }
            }
        },
        elements: {
            point: {
                radius: 0
            }
        },
        scales: {
            y: {
                ticks: {
                    stepSize: 20
                },
                max: rpmAverage + 60 - rpmAverage % 20,
                min: rpmAverage - 60 - rpmAverage % 20,
            },
        }
    };

    return (
        <div className="d-flex">
            <Line data={ecData} options={ecOptions} style={{ maxWidth: '600px', maxHeight: '400px', marginRight: '50px' }} />
            <Line data={rpmData} options={rpmOptions} style={{ maxWidth: '600px', maxHeight: '400px' }} />
        </div>
    );
}

export default ExtruderTrendChart;