import React from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, PieController, Legend, Title, Tooltip } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import PropTypes from 'prop-types';

ChartJS.register(ArcElement, PieController, Legend, Title, Tooltip);

function NotMeetAnalysisChart(props) {

    let labels = props.labels || [];
    let rows = props.rows || [];

    let backgroundColor = [
        'rgba(255, 0, 41, 0.5)',
        'rgba(55, 126, 184, 0.5)',
        'rgba(102, 166, 30, 0.5)',
        'rgba(152, 78, 163, 0.5)',
        'rgba(0, 210, 213, 0.5)',
        'rgba(255, 127, 0, 0.5)',
        'rgba(175, 141, 0, 0.5)',
        'rgba(127, 128, 205, 0.5)',
        'rgba(179, 233, 0, 0.5)',
        'rgba(196, 46, 96, 0.5)',
        'rgba(166, 86, 40, 0.5)',
        'rgba(247, 129, 191, 0.5)',
    ];
    let borderColor = [
        'rgb(255, 0, 41)',
        'rgb(55, 126, 184)',
        'rgb(102, 166, 30)',
        'rgb(152, 78, 163)',
        'rgb(0, 210, 213)',
        'rgb(255, 127, 0)',
        'rgb(175, 141, 0)',
        'rgb(127, 128, 205)',
        'rgb(179, 233, 0)',
        'rgb(196, 46, 96)',
        'rgb(166, 86, 40)',
        'rgb(247, 129, 191)',
    ];

    let data = {
        labels: labels,
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
        layout: {
            padding: 0,
        },
        plugins: {
            title: {
                display: true,
                text: props.title,
                font: {
                    size: 18,
                    weight: 'bold',
                },
            },
            legend: {
                position: 'bottom',
                align: 'center',
                labels: {
                    font: { size: 14 },
                },
                title: {
                    display: true,
                    text: '', //增加圖例與主要圖表區域的間隔
                },
            },
            datalabels: {
                display: function (context) {
                    const index = context.dataIndex;
                    const value = context.dataset.data[index];
                    return value > 0; // display labels with a value greater than 0
                },
                formatter: (value, ctx) => {
                    let sum = 0;
                    let dataArr = ctx.chart.data.datasets[0].data;
                    dataArr.map(data => sum += data);
                    let percentage = (value / sum * 100).toFixed(2) + '%';
                    return percentage;
                },
                color: '#000000',
                anchor: 'end',
                align: 'end', //圓心向外移
                font: { size: 14 },
            },
        },
    };

    return (
        <div className="packing-report-chart">
            <Pie data={data} options={options} plugins={[ChartDataLabels]} style={{ width: '420px', height: '420px' }} />
        </div>
    );
}

NotMeetAnalysisChart.propTypes = {
    title: PropTypes.array,
    labels: PropTypes.array,
    rows: PropTypes.array,
};

NotMeetAnalysisChart.defaultProps = {
    title: ['無標題'],
    labels: [],
    rows: [],
};

export default NotMeetAnalysisChart;