import React, { useEffect, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import echarts from 'echarts';
import axios from 'axios';
import { customHash } from '../common/Utils'
import {generateAPIUrl} from '../common/Utils'
import Swal from 'sweetalert2';
// import { Gantt } from 'gantt-task-react';
import "gantt-task-react/dist/index.css";


const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3500,
    timerProgressBar: true,
    didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer);
        toast.addEventListener('mouseleave', Swal.resumeTimer);
    }
});

const hintMsg = (mode, msg) => {
    Toast.fire({ icon: mode, title: msg, });
}



const getColorFromProductSpec = (productSpec, uniquePrefixes, prefixSuffixMap) => {

    const prefix = productSpec.substring(0, 4); // Get the first four characters
    const suffix = productSpec.substring(4); // Get the remaining characters
    const uniqueSuffixes = prefixSuffixMap[prefix]

    const suffixIndex = uniqueSuffixes.indexOf(suffix);
    const lightness = 1 - (suffixIndex / uniqueSuffixes.length)

    // Calculate hue value based on the index of the prefix
    const hue = getHueFromText(prefix, uniquePrefixes);

    // Convert hue, adjusted lightness, and fixed saturation to RGB
    const rgbColor = hslToRgb(hue / 360, lightness, 0.5);

    // Convert RGB components to CSS color value
    const cssColor = `rgb(${rgbColor.join(',')})`;

    return cssColor;
};

const getHueFromText = (prefix, uniquePrefixes) => {
    const prefixIndex = uniquePrefixes.indexOf(prefix);
    // Calculate hue value based on index and distribute it across 0-360
    const hue = (prefixIndex * (360 / uniquePrefixes.length)) % 360;
    return hue;
};

const hslToRgb = (h, s, l) => {
    let r, g, b;

    if (s === 0) {
        r = g = b = l; // achromatic
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };

        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
};



function GanttBarChart({ stats }) {

    const [data, setData] = useState([]);
    const [ref, setRef] = useState(Math.random().toString(36));


    useEffect(() => {
        setData([...stats]);
        setRef(Math.random().toString(36))
    }, [stats]);

    const uniqueProductSpecs = [...new Set(data.map(item => item.product_spec))];
    const prefixes = uniqueProductSpecs.map(productSpec => productSpec.substring(0, 4));
    const uniquePrefixes = [...new Set(prefixes)];
    uniquePrefixes.sort();

    // Create a mapping of prefixes to suffixes
    const prefixSuffixMap = {};

    // Populate the mapping
    uniqueProductSpecs.forEach(productSpec => {
        const prefix = productSpec.substring(0, 4);
        const suffix = productSpec.substring(4);

        if (!prefixSuffixMap[prefix]) {
            prefixSuffixMap[prefix] = new Set();
        }
        prefixSuffixMap[prefix].add(suffix);
    });

    // Sort the suffix arrays for each prefix
    for (const prefix in prefixSuffixMap) {
        prefixSuffixMap[prefix] = Array.from(prefixSuffixMap[prefix]).sort((a, b) => a.localeCompare(b));
    }
    uniqueProductSpecs.sort((a, b) => {
        const aMain = a.substring(0, 4);
        const bMain = b.substring(0, 4);
        const aRemaining = a.substring(4);
        const bRemaining = b.substring(4);

        if (aMain !== bMain) {
            return aMain.localeCompare(bMain);
        }

        return aRemaining.localeCompare(bRemaining);
    });


    const uniqueLines = [...new Set(data.map(item => item.line_name))].sort();




    const ganttDataYield = uniqueLines.flatMap(line => {
        const tasksForLine = data.filter(item => item.line_name === line);
        tasksForLine.sort((a, b) => a.job_no - b.job_no);

        let accumulatedQuantity = 0;

        return tasksForLine.map((item, index, array) => {

            const color = getColorFromProductSpec(item.product_spec, uniquePrefixes, prefixSuffixMap);
            accumulatedQuantity += item.short_quantity;

            return {
                name: item.product_spec,
                type: 'bar',
                barWidth: 20,
                yAxisIndex: 0, // Use the first Y axis
                stack: 'yield',
                emphasis: {
                    focus: 'series'
                },
                label: { // Adding label configuration for the last data point in each stack
                    show: index === array.length - 1, // Show label only for the last data point
                    position: 'top',
                    color: 'black',
                    formatter: params => {
                        if (params.data !== 0) {
                            return `Quantity\n${accumulatedQuantity}`;
                        }
                        return '';
                    }
                },
                itemStyle: {
                    borderWidth: 1,
                    borderColor: echarts.color.lift('black'),
                    color: color,

                },
                data: Array.from({ length: uniqueLines.length }, (_, idx) =>
                    idx === uniqueLines.indexOf(line) ? item.short_quantity : 0
                ),
            };
        });
    });


    const ganttDataTime = uniqueLines.flatMap(line => {

        const tasksForLine = data.filter(item => item.line_name === line);

        let accumulatedTime = 0;

        tasksForLine.sort((a, b) => a.job_no - b.job_no);



        return tasksForLine.map((item, index, array) => {
            const color = getColorFromProductSpec(item.product_spec, uniquePrefixes, prefixSuffixMap);
            const time = item.output_speed !== 0 ? item.short_quantity / item.output_speed : item.schedule_duration;
            accumulatedTime += time;

            return {
                name: item.product_spec,
                type: 'bar',
                barWidth: 5,
                yAxisIndex: 1, // Use the second Y axis
                stack: 'time',
                emphasis: {
                    focus: 'series'
                },
                label: { // Adding label configuration for the last data point in each stack
                    show: index === array.length - 1, // Show label only for the last data point
                    position: 'top',
                    color: 'black',
                    formatter: params => {
                        if (params.data !== 0) {
                            return `Time\nSpan\n${accumulatedTime.toFixed(1)}`;
                        }
                        return '';
                    }
                },
                itemStyle: {
                    borderWidth: 1,
                    borderColor: echarts.color.lift('black'),
                    color: color,
                },

                data: Array.from({ length: uniqueLines.length }, (_, idx) =>
                    idx === uniqueLines.indexOf(line) ? time : 0
                ),
            };
        });
    });


    const option = {
        title: {
            text: '各線生產排程',
            left: "3%"
        },
        toolbox: {
            top: 0,
            show: true,
            itemSize: 20,
            // itemGap: 30,
            right: 50,
            feature: {
                dataView: { show: true },
                saveAsImage: {
                    pixelRatio: 2
                }
            }
        },
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'shadow'
            },

            formatter: params => {
                const filteredParams = params.filter(param => param.data !== 0);
                if (filteredParams.length > 0) {
                    return filteredParams[0].name + '<br/>' + filteredParams.map(param =>
                        param.marker + param.seriesName + ': ' + param.value + '<br/>'
                    ).join('');
                }
                return '';
            }
        },
        grid: {
            top: 250,
            left: '3%',
            right: '4%',
            bottom: '3%',
            containLabel: true
        },
        legend: {
            data: uniqueProductSpecs,
            orient: 'horizontal',
            top: 30,
            left: 'center',
            itemGap: 5,
        },
        barGap: '120%', // Adjust the gap between bars in the same category
        barCategoryGap: '150%', // Adjust the gap between different categories of bars
        xAxis: [
            {
                type: 'category',
                data: uniqueLines
            }
        ],
        yAxis: [
            {
                type: 'value', // First Y axis for 'yield'
                name: 'Yield Unit', // Set the unit name
                position: 'left',
            },
            {
                type: 'value', // Second Y axis for 'time'
                name: 'Time Unit', // Set the unit name
                position: 'right',
            },
        ],
        series: [...ganttDataYield, ...ganttDataTime]
    };


    return (
        <ReactECharts
            key={ref}
            option={option}
            style={{ height: '500px' }}
        />
    );
}
function LineSummaryChart({ stats }) {
    const [data, setData] = useState([]);
    const [ref, setRef] = useState(Math.random().toString(36));


    useEffect(() => {
        setData([...stats]);
        setRef(Math.random().toString(36))
    }, [stats]);

    const uniqueLines = [...new Set(data.map(item => item.line_name))];

    const lineSwitchTime = uniqueLines.map(line => {
        const switchTime = data
            .filter(item => item.line_name === line)
            .reduce((total, item) => total + item.sim_switch_number, 0);
        return {
            lineName: line,
            switchTime: switchTime,
        };
    });

    const lineCleanTime = uniqueLines.map(line => {
        const cleanTime = data
            .filter(item => item.line_name === line)
            .reduce((total, item) => total + item.sim_clean_time, 0);
        return {
            lineName: line,
            cleanTime: cleanTime,
        };
    });

    const option = {
        title: {
            text: 'Line Summary Chart',
            left: 'center',
        },
        legend: {
            data: ['Switch Time', 'Clean Time'],
            orient: 'horizontal',
            top: 30,
            left: 'center',
        },
        grid: {
            top: 50,
            left: '3%',
            right: '4%',
            bottom: '3%',
            containLabel: true
        },
        tooltip: {
            trigger: 'axis',
        },
        xAxis: {
            type: 'category',
            data: uniqueLines,
        },
        yAxis: [{
            type: 'value',
            name: 'Time Unit',
            position: 'right',
        },
        {
            type: 'value',
            name: 'Switch Time',
            position: 'left',
        }],
        series: [
            {
                name: 'Switch Time',
                type: 'bar',
                data: lineSwitchTime.map(item => item.switchTime),
            },
            {
                name: 'Clean Time',
                type: 'bar',
                data: lineCleanTime.map(item => item.cleanTime),
            },
        ],
    };

    return (
        <ReactECharts
            key={ref}
            option={option}
            style={{ height: '500px' }}
        />
    );
}


// function LineSummaryScatterMultiYAxisChart({ stats }) {

//     const [data, setData] = useState([]);
//     const [ref, setRef] = useState(Math.random().toString(36));


//     useEffect(() => {
//         setData([...stats]);
//         setRef(Math.random().toString(36))
//     }, [stats]);
//     const uniqueLines = [...new Set(data.map(item => item.line_name))];

//     const scatterData = data.map(item => ({
//         lineName: item.line_name,
//         cleanTime: item.sim_clean_time,
//         producedQuantity: item.produced_quantity,
//         switchNumber: item.sim_switch_number,
//     }));

//     const option = {
//         title: {
//             text: 'Line Summary Scatter Multi Y-Axis Chart',
//             left: 'center',
//         },
//         legend: {
//             data: ['Clean Time', 'Produced Quantity', 'Switch Number'],
//             orient: 'horizontal',
//             top: 30,
//             left: 'center',
//         },
//         xAxis: {
//             type: 'category',
//             data: uniqueLines,
//         },
//         yAxis: [
//             {
//                 type: 'value',
//                 name: 'Clean Time',
//             },
//             {
//                 type: 'value',
//                 name: 'Switch Number',
//             },
//         ],
//         series: [
//             {
//                 name: 'Clean Time',
//                 type: 'scatter',
//                 symbolSize: 12,
//                 yAxisIndex: 0,
//                 data: scatterData.map(item => ({
//                     name: item.lineName,
//                     value: [item.lineName, item.cleanTime],
//                 })),
//             },

//             {
//                 name: 'Switch Number',
//                 type: 'scatter',
//                 symbolSize: 12,
//                 yAxisIndex: 2,
//                 data: scatterData.map(item => ({
//                     name: item.lineName,
//                     value: [item.lineName, item.switchNumber],
//                 })),
//             },
//         ],
//     };

//     return (
//         <ReactECharts
//             key={ref}
//             option={option}
//             style={{ height: '500px' }}
//         />
//     );
// }
function TankChart({ stats }) {

    const [tankData, setTankData] = useState([]);
    const [ref, setRef] = useState(Math.random().toString(36));


    useEffect(() => {
        setTankData(stats);
        setRef(Math.random().toString(36))
    }, [stats]);

    const tankNames = tankData.map(tank => tank.storage_tank_name);
    const tankLevelCapacity = tankData.map(tank => tank.level / tank.capacity);
    const tankCapacitieLabels = tankData.map(tank => {
        const capacity = tank.capacity / 1000
        if (capacity > 10000) {
            return '∞'; // Display infinity symbol
        } else {
            return `${capacity}T`;
        }
    });

    const option = {
        title: {
            text: 'SILO桶裝載量',
            left: "3%"
        },
        grid: {
            top: 50,
            left: '3%',
            right: '4%',
            bottom: '5%',
            containLabel: true
        },
        xAxis: [
            {
                type: 'category',
                data: tankNames,
                axisLabel: {
                    inside: false,
                    color: 'black',
                    rotate: 45, // Rotate the labels for better visibility
                    interval: 0 // Display all labels
                },
                axisTick: {
                    show: false
                },
                axisLine: {
                    show: false
                },
                z: 10
            },
            {
                type: 'category', // Secondary axis
                data: tankCapacitieLabels, // Use tank capacities as labels
                position: 'top', // Position above the chart
                axisLabel: {
                    show: true,
                    color: 'black',
                    interval: 0 // Display all labels
                },
                axisTick: {
                    show: false
                },
                axisLine: {
                    show: false
                },
                z: 10
            }
        ],
        yAxis: {
            axisLine: {
                show: false
            },
            axisTick: {
                show: false
            },
            axisLabel: {
                color: '#999'
            }
        },
        dataZoom: [
            {
                type: 'inside'
            }
        ],
        series: [
            {
                type: 'bar',
                showBackground: true,
                itemStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: '#83bff6' },
                        { offset: 0.5, color: '#188df0' },
                        { offset: 1, color: '#188df0' }
                    ])
                },
                emphasis: {
                    itemStyle: {
                        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                            { offset: 0, color: '#2378f7' },
                            { offset: 0.7, color: '#2378f7' },
                            { offset: 1, color: '#83bff6' }
                        ])
                    }
                },
                data: tankLevelCapacity,
                label: {
                    show: true,
                    position: 'top', // Position label inside the bar
                    formatter: params => {
                        const tank = tankData[params.dataIndex];
                        const level = tank.level / 1000
                        return `${level}`;
                    },
                    color: '#000'
                }
            }
        ]
    };

    return (
        <ReactECharts
            key={ref}
            option={option}
            style={{ width: '100%', height: '400px' }}
        />
    );
}




const initData = {
    silo: [],
    production_job: []
}
function ScheduleChart({ selectedConfig, setIsLoading, isLoading }) {

    const [envTimeValue, setEnvTimeValue] = useState(0);
    const [envTimeStep, setEnvTimeStep] = useState(10)
    const [isStepValid, setIsStepValid] = useState(true)

    const [data, setData] = useState(initData);
    const [ref, setRef] = useState('')



    // const envTimeStep = 10

    // const envTimeRange = null


    useEffect(() => {
        const fetchData = async (envTimeValue, selectedConfig) => {
            try {
                setIsLoading(true);
                const url = generateAPIUrl('/simulation_record/data')
                const response = await axios.post(url, {
                    env_time_value: envTimeValue,
                    config: selectedConfig
                });
                if (Object.keys(response.data).length > 0) {
                    setData(response.data);
                } else {
                    setData(initData);
                }
                const hash = customHash(response.data);
                setRef(hash);
            } catch (error) {
                setData(initData);
                console.error('Error fetching data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData(envTimeValue, selectedConfig);

    }, [envTimeValue, selectedConfig, setIsLoading, setData, setRef]);


    const handleIncreaseEnvTime = async () => {
        let newEnvTimeValue = envTimeValue + envTimeStep;
        setEnvTimeValue(newEnvTimeValue);
    };

    const handleDecreaseEnvTime = async () => {
        let newEnvTimeValue = envTimeValue - envTimeStep
        if (envTimeValue > 0) {
            setEnvTimeValue(newEnvTimeValue);
        }
    };

    const handleSetEnvTimeStep = (newStep, minStep) => {
        setEnvTimeStep(newStep);
    };

    const handleStepBlur = () => {
        if (envTimeStep % 10 === 0 && envTimeStep >= 0) {
            setIsStepValid(true);
        } else {
            setIsStepValid(false);
            hintMsg('error', '設定值請使用10的倍數')
        }
    };


    return (
        <div>

            {/* <LineSummaryScatterMultiYAxisChart data={stats} /> */}
            <div className="container-fluid mt-1"> {/* 使用container-fluid类 */}
                <div className="d-flex justify-content-between align-items-center">
                    <ul className="nav nav-tabs d-flex">
                        <li className="nav-item">
                            <a className="nav-link active" data-toggle="tab" href="#sim-tab-1">機台/SILO</a>
                        </li>
                        <li className="nav-item">
                            <a className="nav-link" data-toggle="tab" href="#sim-tab-2">生產時間/清機時間</a>
                        </li>
                        {/* <li className="nav-item">
                            <a className="nav-link" data-toggle="tab" href="#sim-tab-3">Tab 3</a>
                        </li> */}
                    </ul>
                    <div className="d-flex align-items-center">

                        <button className="btn btn-primary mr-2" onClick={handleDecreaseEnvTime} disabled={isLoading}>-</button>
                        <span>模擬時間(HR): {envTimeValue}</span>
                        <button className="btn btn-primary ml-2" onClick={handleIncreaseEnvTime} disabled={isLoading}>+</button>

                        <input
                            type="number"
                            id="envTimeStepInput"
                            style={{
                                width: 100,
                                minWidth: 100
                            }}
                            className={`ml-1 form-control ${isStepValid ? '' : 'is-invalid'}`}
                            value={envTimeStep}
                            onChange={(e) => handleSetEnvTimeStep(Number(e.target.value))}
                            onBlur={handleStepBlur}
                            min="0"
                            step="10"
                            placeholder="Enter envTimeStep (must be a multiple of 10)"
                            disabled={isLoading}
                        />

                    </div>

                </div>

                <div className="tab-content">
                    <div className="tab-pane fade show active" id="sim-tab-1">

                        {/* {console.log(data.production_job.length)} */}
                        {Boolean(data.production_job) && <GanttBarChart
                            stats={data.production_job} />}

                        <div>
                            {Boolean(data.silo) && <TankChart
                                refKey={`${ref}-tank-chart`}
                                stats={data.silo} />}
                        </div>
                    </div>
                    <div className="tab-pane fade" id="sim-tab-2">
                        {Boolean(data.production_job) && <LineSummaryChart
                            refKey={`${ref}-line-summary`}
                            stats={data.production_job} />}
                    </div>
                    <div className="tab-pane fade" id="sim-tab-3">
                        <p>Content of Tab 3</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function SimProcess({ simConfigs }) {

    const configOptions = simConfigs.production
    const [isLoading, setIsLoading] = useState(false);
    const [selectedConfig, setSelectedConfig] = useState(null);

    const handleConfigChange = (event) => {
        const selectedIndex = event.target.selectedIndex;
        setSelectedConfig(configOptions[selectedIndex]);
    };
    const updateConfig = () => {
        if (Boolean(selectedConfig))
            setSelectedConfig({ ...selectedConfig })
    }

    useEffect(() => {
        const configOptions = simConfigs.production
        setSelectedConfig(configOptions[0])

    }, [simConfigs]);




    return (
        <div>
            <div>
                <button
                    className="btn btn-primary mb-1"
                    onClick={updateConfig}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <><span
                            className="spinner-border spinner-border-sm"
                            role="status"
                            aria-hidden="true"
                        ></span>載入資料中</>
                    ) : (
                        '載入資料'
                    )}
                </button>
                <div className="d-inline justify-content-end mb-3">
                    <select className="form-control" onChange={handleConfigChange}>
                        {configOptions.map((config, index) => (
                            <option key={index} value={index}>
                                {`Environment ID: ${config.environment_id}, Scheduling ID: ${config.scheduling_id}, Simulation ID: ${config.simulation_id}`}
                            </option>
                        ))}
                    </select>
                </div>

            </div>



            {Boolean(selectedConfig) && <ScheduleChart
                selectedConfig={selectedConfig}
                setIsLoading={setIsLoading}
                isLoading={isLoading} />}


        </div>
    );
}


export default SimProcess;
