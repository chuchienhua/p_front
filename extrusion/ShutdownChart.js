import React from "react";
import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, ArcElement, Tooltip, Legend } from "chart.js";
import ChartDataLabels from 'chartjs-plugin-datalabels';

ChartJS.register(CategoryScale, ArcElement, Tooltip, Legend);

function ShutdownChart(props) {

    let rows = props.rows || [];

    let backgroundColor = [
        "rgba(255, 55, 55, 0.5)",
        "rgba(255, 128, 55, 0.5)",
        "rgba(55, 128, 55, 0.5)",
        "rgba(55, 155, 55, 0.5)",
        "rgba(55, 155, 155, 0.5)",
        "rgba(55, 55, 255, 0.5)",
        "rgba(155, 55, 255, 0.5)",
    ];
    let borderColor = [
        "rgb(255, 55, 55)",
        "rgb(255, 128, 55)",
        "rgb(55, 128, 55)",
        "rgb(55, 155, 55)",
        "rgb(55, 155, 155)",
        "rgb(55, 55, 255)",
        "rgb(155, 55, 255)",
    ];

    let data = {
        labels: ['準備', '等待', '清機', '現場排除', '工務維修', '計畫性停機', '其他'],
        datasets: [
            {
                label: 'Hr',
                data: rows,
                backgroundColor: backgroundColor,
                borderColor: borderColor,
                borderWidth: 1,
            },
        ],
    };

    const options = {
        plugins: {
            title: {
                display: true,
                text: ['停機項目占比', ''], //增加間隔
                font: {
                    size: 20,
                    weight: 'bold',
                },
            },
            legend: {
                position: "bottom",
                align: 'start',
                labels: {
                    font: { size: 14 },
                },
                title: {
                    display: true,
                    text: '', //增加間隔
                }
            },
            datalabels: {
                formatter: (value, ctx) => {
                    let sum = 0;
                    let dataArr = ctx.chart.data.datasets[0].data;
                    dataArr.map(data => sum += data);
                    let percentage = (value * 100 / sum).toFixed(2) + "%";
                    return percentage;
                },
                color: '#000000',
                anchor: 'end', //比例直接顯示在圓周外
                align: 'end', //圓心向外移
            },
        },
    };

    return (
        <div className="d-flex">
            <Pie data={data} options={options} plugins={[ChartDataLabels]} style={{ width: '500px', height: '500px' }} />
        </div>
    );
}

export default ShutdownChart;