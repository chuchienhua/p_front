import React, { useEffect, useState, useCallback } from 'react';
import {generateAPIUrl} from '../common/Utils'
import Select from 'react-select';
import axios from 'axios';
import echarts from 'echarts'
import ReactECharts from 'echarts-for-react';


const fixedColors = ['#FFD700', '#A9A9A9', '#00FFFF', '#FF69B4']
function darkenColor(color, factor) {
  // 解析颜色为 R、G、B 分量
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);

  // 计算变暗后的 R、G、B 分量
  const darkenedR = Math.max(0, Math.min(255, Math.round(r * (1 - factor))));
  const darkenedG = Math.max(0, Math.min(255, Math.round(g * (1 - factor))));
  const darkenedB = Math.max(0, Math.min(255, Math.round(b * (1 - factor))));

  // 将 R、G、B 分量转换回十六进制并组合成新的颜色
  return `#${darkenedR.toString(16).padStart(2, '0')}${darkenedG.toString(16).padStart(2, '0')}${darkenedB.toString(16).padStart(2, '0')}`;
}

const getColorShade = (index, fixedColors) => {
  const DARKEN_FACTOR = 0.5;
  const baseColor = fixedColors[index % fixedColors.length];
  const darkenedColor = darkenColor(baseColor, DARKEN_FACTOR);

  return darkenedColor;
};



function CleanTimeChart({ data }) {

  const allLineNames = new Set();
  data.forEach(item => {
    const lineNames = item.docs.production_job.map(job => job.line_name);
    lineNames.forEach(lineName => allLineNames.add(lineName));
  });

  const sortedLineNames = Array.from(allLineNames).sort();

  const schedulingIds = data.map(item => item.scheduling_id);


  const option = {
    toolbox: {
      top: 20,
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
    grid: {
      top: 120,   // Adjust this value to control the distance from the top
    },

    xAxis: {
      type: 'category',
      data: Array.from(sortedLineNames),
    },
    yAxis: {
      type: 'value',
      name: '時間(HR)'
    },
    legend: {
      top: 5,
      data: schedulingIds.map(schedulingId => [
        `${schedulingId} - 清機時間`,
        `${schedulingId} - 總生產時間`
      ]).flat(),
    },
    series: schedulingIds.map((schedulingId, index) => ([
      {
        name: `${schedulingId} - 總生產時間`,
        type: 'bar',
        stack: schedulingId,
        itemStyle: {
          borderWidth: 1,
          borderColor: echarts.color.lift('black'),
          color: fixedColors[index % fixedColors.length]
        },
        label: {
          show: true,
          position: 'inside',
          color: 'black',
          formatter: '{c}',
        },
        data: Array.from(sortedLineNames).map(lineName =>
          data.reduce((total, item) =>
            item.scheduling_id === schedulingId ?
              total + (item.docs.production_job
                .filter(job => job.line_name === lineName)
                .reduce((jobTotal, job) => jobTotal + job.sim_duration, 0)) :
              total
            , 0).toFixed(1)
        ),
      },
      {
        name: `${schedulingId} - 清機時間`,
        type: 'bar',
        stack: schedulingId,
        itemStyle: {
          borderWidth: 1,
          borderColor: echarts.color.lift('black'),
          color: getColorShade(index, fixedColors)
        },
        label: {
          show: true, // Show labels on top of bars
          position: 'inside', // Position of the label

          formatter: '{c}', // Display the data value as the label
          itemStyle: {
            borderWidth: 0.2,
            borderColor: echarts.color.lift('black'),
            color: 'white',
          },
        },
        data: Array.from(sortedLineNames).map(lineName =>
          data.reduce((total, item) =>
            item.scheduling_id === schedulingId ?
              total + (item.docs.production_job
                .filter(job => job.line_name === lineName)
                .reduce((jobTotal, job) => jobTotal + job.sim_clean_time, 0)) :
              total
            , 0).toFixed(1)
        ),
      },

    ])).flat(),
  };

  const randomKey = Math.random().toString(36);

  return <ReactECharts key={randomKey} option={option} style={{ height: '400px' }} />;
}


function TotalCapacityTable({ totalCapacityBySchedulingId }) {
  return (
    <table key={Math.random().toString(36)} className="table table-bordered table-striped">
      <thead className="thead-dark">
        <tr>
          <th>排程ID</th>
          <th>總產能(KG/HR)</th>
          <th>總產量(KG)</th>
          <th>最大生產時間(HR)</th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(totalCapacityBySchedulingId).map(([schedulingId, value]) => (
          <tr key={schedulingId}>
            <td>{schedulingId}</td>
            <td>{value['產能']}</td>
            <td>{value['產量']}</td>
            <td>{value['生產時間(最大)']}</td>

          </tr>
        ))}
      </tbody>
    </table>
  );
}

function CapacityChart({ data }) {

  const allLineNames = new Set();
  data.forEach(item => {
    const lineNames = item.docs.production_job.map(job => job.line_name);
    lineNames.forEach(lineName => allLineNames.add(lineName));
  });

  const sortedLineNames = Array.from(allLineNames).sort();

  const schedulingIds = data.map(item => item.scheduling_id);

  const capacityData = [];
  const maxTotalDuration = {}
  for (const lineName of sortedLineNames) {
    const row = {
      lineName,
    };
    for (const schedulingId of schedulingIds) {
      const totalCleanTime = data.reduce((total, item) =>
        item.scheduling_id === schedulingId ?
          total + (item.docs.production_job
            .filter(job => job.line_name === lineName)
            .reduce((jobTotal, job) => jobTotal + job.sim_clean_time, 0)) :
          total
        , 0);
      const totalDuration = data.reduce((total, item) =>
        item.scheduling_id === schedulingId ?
          total + (item.docs.production_job
            .filter(job => job.line_name === lineName)
            .reduce((jobTotal, job) => jobTotal + job.sim_duration, 0)) :
          total
        , 0);

      const producedQuantity = data.reduce((total, item) =>
        item.scheduling_id === schedulingId ?
          total + (item.docs.production_job
            .filter(job => job.line_name === lineName)
            .reduce((jobTotal, job) => jobTotal + job.produced_quantity, 0)) :
          total
        , 0)

      const producedTime = totalDuration + totalCleanTime

      if (!maxTotalDuration[schedulingId]) {
        maxTotalDuration[schedulingId] = producedTime

      } else if (producedTime > maxTotalDuration[schedulingId]) {
        maxTotalDuration[schedulingId] = producedTime
      }

      row[`${schedulingId} - 產能`] = producedTime > 0 ? (producedQuantity / producedTime).toFixed(1) : 0;
      row[`${schedulingId} - 產量`] = producedQuantity
    }
    capacityData.push(row);
  }

  const totalCapacityBySchedulingId = {};

  for (const schedulingId of schedulingIds) {
    for (const row of capacityData) {
      if (!totalCapacityBySchedulingId[schedulingId]) {
        totalCapacityBySchedulingId[schedulingId] = 0;
      }
      totalCapacityBySchedulingId[schedulingId] += parseFloat(row[`${schedulingId} - 產量`]);
    }

    totalCapacityBySchedulingId[schedulingId] = {
      '產量': totalCapacityBySchedulingId[schedulingId],
      '產能': maxTotalDuration[schedulingId] > 0 ? (totalCapacityBySchedulingId[schedulingId] / maxTotalDuration[schedulingId]).toFixed(1) : 0,
      '生產時間(最大)': maxTotalDuration[schedulingId].toFixed(1)
    }
  }


  const option = {
    toolbox: {
      top: 20,
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

    xAxis: {
      type: 'category',
      data: sortedLineNames,
    },
    yAxis: {
      type: 'value',
      name: '產能((KG/HR))'
    },
    legend: {
      top: 5,
      data: schedulingIds.map(schedulingId => `${schedulingId} - 產能`),
    },
    series: schedulingIds.map((schedulingId, index) => ({
      name: `${schedulingId} - 產能`,
      itemStyle: {
        borderWidth: 1,
        borderColor: echarts.color.lift('black'),
        color: fixedColors[index % fixedColors.length]
      },
      type: 'bar',
      label: {
        show: true,
        position: 'top',
        rotate: 45,
        color: 'black',
        formatter: '{c}',
      },
      data: capacityData.map(row => row[`${schedulingId} - 產能`]),
    })),
  };


  return <div>
    <ReactECharts key={Math.random().toString(36)} option={option} style={{ height: '400px' }} />
    <TotalCapacityTable key={Math.random().toString(36)} totalCapacityBySchedulingId={totalCapacityBySchedulingId} />
  </div>
}





function CountChart({ data }) {

  const allLineNames = new Set();
  data.forEach(item => {
    const lineNames = item.docs.production_job.map(job => job.line_name);
    lineNames.forEach(lineName => allLineNames.add(lineName));
  });

  const sortedLineNames = Array.from(allLineNames).sort();

  const schedulingIds = data.map(item => item.scheduling_id);

  const countData = [];
  for (const lineName of sortedLineNames) {
    const row = {
      lineName,
    };

    for (const schedulingId of schedulingIds) {
      const taskCount = data.reduce((total, item) =>
        item.scheduling_id === schedulingId ?
          total + item.docs.production_job.filter(job => job.line_name === lineName).length :
          total
        , 0);


      const simSwitchNumber = data.reduce((total, item) =>
        item.scheduling_id === schedulingId ?
          total + (item.docs.production_job
            .filter(job => job.line_name === lineName)
            .reduce((jobTotal, job) => jobTotal + job.sim_switch_number, 0)) :
          total
        , 0);

      row[`${schedulingId} - 總數量`] = taskCount;
      row[`${schedulingId} - 任務數量 - 切換次數`] = taskCount - simSwitchNumber;
      row[`${schedulingId} - 切換次數`] = simSwitchNumber;
      row[`${schedulingId} - 比率`] = taskCount !== 0 ? (simSwitchNumber / taskCount).toFixed(2) : 0;  // Avoid division by zero


    }
    countData.push(row);
  }




  const option1 = {
    toolbox: {
      top: 20,
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
    grid: {
      top: 120,
    },
    xAxis: {
      type: 'category',
      data: sortedLineNames,
    },
    yAxis: {
      type: 'value',
      name: '數量',
    },
    legend: {
      top: 5,
      data: schedulingIds.map(schedulingId => [
        `${schedulingId} - 任務數量 - 切換次數`,
        `${schedulingId} - 切換次數`
      ]).flat(),
    },
    series: schedulingIds.flatMap((schedulingId, index) => ([
      {
        name: `${schedulingId} - 任務數量 - 切換次數`,
        type: 'bar',
        stack: schedulingId,
        itemStyle: {
          borderWidth: 1,
          borderColor: echarts.color.lift('black'),
          color: fixedColors[index % fixedColors.length]
        },
        label: {
          show: true,
          position: 'inside',
          color: 'black',
          formatter: '{c}',
        },
        data: countData.map(row => row[`${schedulingId} - 任務數量 - 切換次數`]),
      },
      {
        name: `${schedulingId} - 切換次數`,
        type: 'bar',
        itemStyle: {
          borderWidth: 1,
          borderColor: echarts.color.lift('black'),
          color: getColorShade(index, fixedColors)
        },
        stack: schedulingId,
        label: {
          show: true, // Show labels on top of bars
          position: 'inside', // Position of the label

          formatter: '{c}', // Display the data value as the label
          itemStyle: {
            borderWidth: 0.2,
            borderColor: echarts.color.lift('black'),
            color: 'white',
          },
        },
        data: countData.map(row => row[`${schedulingId} - 切換次數`]),
      },
    ])),
  };

  const option2 = {
    toolbox: {
      top: 20,
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
    xAxis: {
      type: 'category',
      data: sortedLineNames,
    },
    yAxis: {
      type: 'value',
      name: '切換率',
    },
    legend: {
      top: 5,
      data: schedulingIds.map(schedulingId => `${schedulingId} - 比率`),
    },
    series: schedulingIds.map((schedulingId, index) => ({
      itemStyle: {
        borderWidth: 1,
        borderColor: echarts.color.lift('black'),
        color: fixedColors[index % fixedColors.length]
      },
      name: `${schedulingId} - 比率`,
      label: {
        show: true, // Show labels on top of bars
        position: 'top', // Position of the label
        formatter: '{c}', // Display the data value as the label
        color: 'black',
      },
      type: 'bar',
      data: countData.map(row => row[`${schedulingId} - 比率`]),
    })),
  };

  return <>
    <ReactECharts key={Math.random().toString(36)} option={option1} style={{ height: '400px' }} />;
    <ReactECharts key={Math.random().toString(36)} option={option2} style={{ height: '400px' }} />;
  </>


}





function ProductionChart({ data, attribute }) {
  const allLineNames = new Set();
  data.forEach(item => {
    const lineNames = item.docs.production_job.map(job => job.line_name);
    lineNames.forEach(lineName => allLineNames.add(lineName));
  });

  const sortedLineNames = Array.from(allLineNames).sort();

  const schedulingIds = data.map(item => item.scheduling_id);

  const option = {
    toolbox: {
      top: 20,
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
    grid: {
      top: 120,
    },

    xAxis: {
      type: 'category',
      data: Array.from(sortedLineNames),
    },
    yAxis: {
      type: 'value',
      name: attribute === 'produced_quantity' ? '產量(KG)' : '缺額(KG)', // 根据属性设置 y 轴名称
    },
    legend: {
      top: 5,
      data: schedulingIds,
    },
    series: schedulingIds.map((schedulingId, index) => ({
      name: schedulingId,
      type: 'bar',
      itemStyle: {
        borderWidth: 1,
        borderColor: echarts.color.lift('black'),
        color: fixedColors[index % fixedColors.length]
      },
      label: {
        show: true,
        position: 'top',
        color: 'black',
        rotate: 45,
        formatter: '{c}',
      },
      data: Array.from(sortedLineNames).map(lineName =>
        data.reduce((total, item) =>
          item.scheduling_id === schedulingId ?
            total + (item.docs.production_job
              .filter(job => (job.line_name === lineName) && (item.scheduling_id === schedulingId))
              .reduce((jobTotal, job) => jobTotal + job[attribute], 0)) :
            total
          , 0).toFixed(1)
      ),
    })),
  };

  return <ReactECharts key={Math.random().toString(36)} option={option} style={{ height: '400px' }} />;
}



const SimResult = ({ simConfigs }) => {

  const [activeTab, setActiveTab] = useState('result-tab-1'); // Initially set the active tab
  const [statsCache, setStatsCache] = useState({});
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedConfigs, setSelectedConfigs] = useState([]);
  const [initialSelectedConfigs, setInitialSelectedConfigs] = useState([]);
  const statsToShow = selectedConfigs.filter(
    option =>
      Boolean(statsCache[option.value]) &&
      Boolean(statsCache[option.value].docs)
  ).map(option => statsCache[option.value]);


  const fetchStats = useCallback(async (simConfigs, selectedConfigs, statsCache) => {
    setIsLoading(true);
    const filteredConfigs = simConfigs.production.filter(config =>
      selectedConfigs.some(selected => selected.value === config.scheduling_id)
    );
    console.log(filteredConfigs)
    try {
      const batchSize = 3; // Set the batch size according to your requirements
      const totalConfigs = filteredConfigs.length;
      const totalBatches = Math.ceil(totalConfigs / batchSize);

      const updatedStatsCache = {};
      setStatsCache({});

      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const startIdx = batchIndex * batchSize;
        const endIdx = Math.min((batchIndex + 1) * batchSize, totalConfigs);

        const batchConfigs = filteredConfigs.slice(startIdx, endIdx);

        const request_data = {
          configs: batchConfigs
        };

        const url = generateAPIUrl('/simulation_record/stats')
        const response = await axios.post(url, request_data);

        if (response.data.length > 0) {

          response.data.forEach(configStats => {
            updatedStatsCache[configStats.scheduling_id] = configStats;
          });
        }
      }

      setStatsCache(updatedStatsCache);
    } catch (error) {
      setError(`${error}`);
    } finally {
      setIsLoading(false);
    }
  }, [])

  useEffect(() => {
    const newInitialSelectedConfigs = simConfigs.production.map(config => ({
      value: config.scheduling_id,
      label: config.scheduling_id
    }));
    setInitialSelectedConfigs(newInitialSelectedConfigs)
    setSelectedConfigs(newInitialSelectedConfigs)

  }, [simConfigs]);





  const handleTabClick = (tabId) => {
    setActiveTab(tabId); // Update the active tab when a tab is clicked
  };

  const renderTabContent = (tabId) => {
    switch (tabId) {
      case 'result-tab-1':
        return (
          <>
            <CleanTimeChart data={statsToShow} />
            <ProductionChart data={statsToShow} attribute="produced_quantity" />
            <CapacityChart data={statsToShow} />
          </>
        );
      case 'result-tab-2':
        return (
          <CountChart data={statsToShow} />
        );
      case 'result-tab-3':
        return (
          <p>Content of Tab 3</p>
        );
      default:
        return null;
    }
  };



  return (
    <div>

      <div>
        <div className="d-flex align-items-end justify-content-between">
          <button
            className="btn btn-primary mb-1"
            onClick={() => {
              fetchStats(simConfigs, selectedConfigs, statsCache)
            }}
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
          <span className="text-muted">當排程ID較多時，會載入較久</span>
        </div>
        <Select
          isMulti
          options={initialSelectedConfigs}
          value={selectedConfigs}
          onChange={selectedOptions => setSelectedConfigs(selectedOptions)}
          placeholder="請選擇排程ID比較"
          isDisabled={isLoading}
        />
        <span>{`查詢到 ${Object.keys(statsCache).join('、')} 共 ${Object.keys(statsCache).length} 筆 有排程模擬結果`}</span>
      </div>


      <ul className="nav nav-tabs mt-1">
        <li className="nav-item">
          <a
            href="#result-tab-1"
            className={`nav-link ${activeTab === 'result-tab-1' ? 'active' : ''}`}
            onClick={() => handleTabClick('result-tab-1')}
          >
            生產時間
          </a>
        </li>
        <li className="nav-item">
          <a
            href="#result-tab-2"
            className={`nav-link ${activeTab === 'result-tab-2' ? 'active' : ''}`}
            onClick={() => handleTabClick('result-tab-2')}
          >
            規格切換
          </a>
        </li>
        <li className="nav-item">
          <a
            href="#result-tab-3"
            className={`nav-link ${activeTab === 'result-tab-3' ? 'active' : ''}`}
            onClick={() => handleTabClick('result-tab-3')}
          >
            達交率
          </a>
        </li>
      </ul>

      <div className="tab-content">
        {renderTabContent(activeTab)}
      </div>

      {error && <p>Error: {error}</p>}
    </div >
  );
};

export default SimResult;
