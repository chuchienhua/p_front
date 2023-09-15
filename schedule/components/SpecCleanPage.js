import React, { Component } from 'react';
import axios from 'axios';
import 'handsontable/languages/zh-TW.js';
import {itraceAxiosConfig} from '../common/Utils';
import {
  Modal, ModalHeader, ModalBody,
} from 'reactstrap'
import Select from 'react-select';

import Swal from 'sweetalert2';
import MySelect from "./MySelect.js";
import makeAnimated from "react-select/animated";

const animatedComponents = makeAnimated();

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

const addNewInfo = {
  addSpecMode: 'spec',
  fromTarget: '',
  toTarget: '',
  lineFilter: [],
  executing_time: 0,
  clean_process: [],
}

export default class SpecCleanPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isLoading: false, //是否在查詢中
      specMode: 'spec', // 規格模式
      modeList: [
        { value: 'spec', title: '規格', label: '規格' },
        { value: 'series', title: '系列', label: '系列' },
      ],
      fromTarget: { value: '', title: '', label: '' }, // 
      toTarget: { value: '', title: '', label: '' },
      targetList: [
        { value: 'A', title: 'A', label: 'A' },
        { value: 'B', title: 'B', label: 'B' }
      ],
      lineList: [],
      lineFilter: 'all',
      prdPcList: [],
      seriesList: [],
      cleanItem: [],
      rowData: [], // 查詢後資料
      detail: [],
      showCleanItem: false, // 顯示清機清單
      optionList: [],
      groupsDetail: [],
      pageIndex: 0,
      maxPagination: 0,
      maxPageIndex: 0, // 顯示最大分頁
      minPageIndex: 0, // 顯示最小分頁
      isShowDetail: false,
      showAdd: false, // 顯示新增清機清單
      tmpNewInfo: {
        fromTarget: '',
        toTarget: '',
        line: 'A',
        executing_time: 0,
        clean_process: [],
      },
      API: null,
    };
    this.hotTableComponent = React.createRef();
    this.queryApiCancelToken = null;
  }

  componentDidMount() {
    this.queryOption()
    this.queryCleanItem()
  }

  componentWillUnmount() {
    if (this.queryApiCancelToken) {
      this.queryApiCancelToken.cancel('QAReleaseQueryForm componentWillUnmount');
    }
  }

  componentDidUpdate(prevProps, prevState) { }

  // 提示訊息的函數
  hintMsg = (mode, msg) => {
    Toast.fire({ icon: mode, title: msg, });
  }

  queryCleanItem = () => {
    const url = `/api/pbtc/query/spec-clean-item`
    this.queryApiCancelToken = axios.CancelToken.source();
    try {
      axios.post(url, {}, {
        itraceAxiosConfig,
        cancelToken: this.queryApiCancelToken.token,
      }).then(res => {
        if (res.data.error !== '') {
          this.setState(this, () => {
            this.hintMsg('warning', `載入清機資料-異常: ${res.data.error}`)
          })
        } else {
          this.setState({
            cleanItem: res.data.result,
            optionList: res.data.result.map((item) => {
              return {
                value: item.steps,
                label: `步驟 ${item.steps} - ${item.detail}`,
                title: `步驟 ${item.steps} - ${item.detail}`,
              }
            })
          }, () => {
            this.hintMsg('success', `載入清機資料-成功`)
          })
        }
      })
    } catch (err) {
      this.hintMsg('error', `載入清機資料-異常: ${err}`)
    }
  }

  queryOption = () => {
    const url = `/api/pbtc/query/spec-clean-option`
    this.queryApiCancelToken = axios.CancelToken.source();
    try {
      axios.post(url, {}, {
        itraceAxiosConfig,
        cancelToken: this.queryApiCancelToken.token,
      }).then(res => {
        if (res.data.error !== '') {
          this.setState(this, () => {
            this.hintMsg('warning', `載入選單資料-異常: ${res.data.error}`)
          })
        } else {
          this.setState({
            targetList: res.data.result.prd_pc.map((item) => { return { value: item, title: item, label: item } }),
            prdPcList: res.data.result.prd_pc.map((item) => { return { value: item, title: item, label: item } }),
            seriesList: res.data.result.series.map((item) => { return { value: item, title: item, label: item } }),
            fromTarget: res.data.result.prd_pc.length > 0 ? { value: res.data.result.prd_pc[0], title: res.data.result.prd_pc[0], label: res.data.result.prd_pc[0] } : { value: '', title: '', label: '' },
            toTarget: res.data.result.prd_pc.length > 0 ? { value: res.data.result.prd_pc[0], title: res.data.result.prd_pc[0], label: res.data.result.prd_pc[0] } : { value: '', title: '', label: '' },
            lineList: [{ value: 'all', title: '', label: '' }].concat(res.data.result.line.map((item) => { return { value: item, title: item, label: item } })),
            lineFilter: 'all',
            specMode: 'spec',
            isLoading: false,
          }, () => {
            this.hintMsg('success', `載入選單資料-成功`)
          })
        }
      })
    } catch (err) {
      this.hintMsg('error', `載入選單資料-異常: ${err}`)
    }
  }

  selectChange1 = (target, value) => {
    let changeItem = {
      [target]: value
    }
    this.setState(changeItem)
  }

  addChange = (target, value) => {
    let { tmpNewInfo } = this.state;
    if (target === 'addSpecMode') {
      tmpNewInfo = Object.assign({}, addNewInfo)
    }

    if (target !== 'lineFilter') {
      tmpNewInfo[target] = value
    } else {
      tmpNewInfo[target] = value.value
    }

    console.log('tmpNewInfo', value)
    this.setState({ tmpNewInfo: tmpNewInfo })
  }

  modeChange = (target, event) => {
    let changeItem = {
      [target]: event.target.value
    }

    if (target === 'specMode') {
      if (event.target.value === 'spec') {
        changeItem['targetList'] = this.state.prdPcList
        changeItem['fromTarget'] = this.state.prdPcList.length > 0 ? { value: this.state.prdPcList[0].value, title: this.state.prdPcList[0].value, label: this.state.prdPcList[0].value } : { value: '', title: '', label: '' }
        changeItem['toTarget'] = this.state.prdPcList.length > 0 ? { value: this.state.prdPcList[0].value, title: this.state.prdPcList[0].value, label: this.state.prdPcList[0].value } : { value: '', title: '', label: '' }
      } else {
        changeItem['targetList'] = this.state.seriesList
        changeItem['fromTarget'] = this.state.seriesList.length > 0 ? { value: this.state.seriesList[0].value, title: this.state.seriesList[0].value, label: this.state.seriesList[0].value } : { value: '', title: '', label: '' }
        changeItem['toTarget'] = this.state.seriesList.length > 0 ? { value: this.state.seriesList[0].value, title: this.state.seriesList[0].value, label: this.state.seriesList[0].value } : { value: '', title: '', label: '' }
      }
      changeItem['rowData'] = []
      changeItem['pageIndex'] = 0
      changeItem['maxPageIndex'] = 0
      changeItem['minPageIndex'] = 0
      changeItem['lineFilter'] = 'all'
      changeItem['isShowDetail'] = false
    }
    this.setState(changeItem)
  }

  exchange = () => {
    let { fromTarget, toTarget, } = this.state;
    this.setState({
      fromTarget: toTarget,
      toTarget: fromTarget,
      rowData: [],
      pageIndex: 0,
      maxPageIndex: 0,
      minPageIndex: 0,
      lineFilter: 'all',
      isShowDetail: false,
    })
  }

  querySpecCleanInfo = async () => {
    let { specMode, fromTarget, toTarget, cleanItem, } = this.state
    const url = `/api/pbtc/query/spec-clean-info`
    let calljson = {
      mode: specMode,
    }
    if (specMode === 'spec') {
      calljson['from_prd_pc'] = fromTarget.value
      calljson['to_prd_pc'] = toTarget.value
    } else {
      calljson['from_series'] = fromTarget.value
      calljson['to_series'] = toTarget.value
    }
    this.queryApiCancelToken = axios.CancelToken.source();
    try {
      axios.post(url, calljson, {
        itraceAxiosConfig,
        cancelToken: this.queryApiCancelToken.token,
      }).then(res => {
        if (res.data.error !== '') {
          this.setState(this, () => {
            this.hintMsg('warning', `${res.data.error}`)
          })
        } else {

          let rowData = res.data.result.spec_clean.map((item) => {
            if (item.clean_process.length > 0) {
              let tmp = cleanItem.filter(row => item.clean_process.indexOf(row.steps) !== -1)
              item.clean_process = tmp.map((inf) => {
                return {
                  value: inf.steps,
                  label: `步驟 ${inf.steps} - ${inf.detail}`,
                  title: `步驟 ${inf.steps} - ${inf.detail}`,
                }

              })
            }
            return item
          })

          let detail = res.data.result.detail.map((item) => {
            if (item.clean_process.length > 0) {
              let tmp = cleanItem.filter(row => item.clean_process.indexOf(row.steps) !== -1)
              item.clean_process = tmp.map((inf) => {
                return {
                  value: inf.steps,
                  label: `步驟 ${inf.steps} - ${inf.detail}`,
                  title: `步驟 ${inf.steps} - ${inf.detail}`,
                }

              })
            }
            return item
          })

          let groupsDetail = this.splitArrayIntoGroups(detail, 50)

          this.setState({
            rowData: rowData,
            detail: detail,
            groupsDetail: groupsDetail,
            maxPageIndex: groupsDetail.length >= 3 ? 3 : groupsDetail.length,
            maxPagination: groupsDetail.length,
            isLoading: false,
            lineFilter: 'all',
            pageIndex: 0,
            isShowDetail: false,
          }, () => {
            this.hintMsg('success', `查詢資料成功`)
          })
        }
      })
    } catch (err) {
      this.hintMsg('error', `查詢資料異常: ${err}`)
    }
  }

  handleOnchange = (key) => {
    this.setState({
      [key]: !this.state[key],
      tmpNewInfo: Object.assign({}, addNewInfo)
    })
  }

  // 清機規則
  cleanMap = () => {
    let { showCleanItem, cleanItem, } = this.state;
    return (<React.Fragment>
      <Modal
        isOpen={showCleanItem}
        style={{ maxWidth: '90%' }}
        backdrop={true}
        toggle={this.handleOnchange.bind(this, 'showCleanItem')}>
        <ModalHeader toggle={this.handleOnchange.bind(this, 'showCleanItem')} ><span className="h4 font-weight-bolder" >清機流程</span></ModalHeader>
        <ModalBody>
          <table className="w-100 table table-sm table-bordered">
            <thead className="table" style={{ position: "sticky", top: 0, zIndex: 996 }}>
              <tr>
                <th style={{ textAlign: 'center', verticalAlign: 'middle', width: '10%', fontWeight: 'bolder', color: 'gray' }} scope="col">步驟</th>
                <th style={{ textAlign: 'center', verticalAlign: 'middle', width: '10%', fontWeight: 'bolder', color: 'gray' }} scope="col">類別</th>
                <th style={{ textAlign: 'center', verticalAlign: 'middle', width: '10%', fontWeight: 'bolder', color: 'gray' }} scope="col">執行時長</th>
                <th style={{ textAlign: 'center', verticalAlign: 'middle', width: '70%', fontWeight: 'bolder', color: 'gray' }} scope="col">項目內容</th>
              </tr>
            </thead>
            <tbody className="table-hover">
              {cleanItem.map((row, idx) => {
                return (
                  <tr key={`row-clean-${idx}`}>
                    <td style={{ textAlign: 'center', verticalAlign: 'middle', width: '10%', fontWeight: 'bolder', }}>{row.steps}</td>
                    <td style={{ textAlign: 'center', verticalAlign: 'middle', width: '10%', fontWeight: 'bolder', }}>{row.category}</td>
                    <td style={{ textAlign: 'center', verticalAlign: 'middle', width: '10%', fontWeight: 'bolder', }}>{row.executing_time}</td>
                    <td style={{ textAlign: 'center', verticalAlign: 'middle', width: '70%', fontWeight: 'bolder', }}>{row.detail}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </ModalBody>
      </Modal>
    </React.Fragment>
    )
  }

  // 新增清機規則
  addClean = () => {
    let { showAdd, targetList, optionList, tmpNewInfo, lineList, } = this.state;
    return (<React.Fragment>
      <Modal
        isOpen={showAdd}
        style={{ maxWidth: '90%', }}
        backdrop={true}
        toggle={this.handleOnchange.bind(this, 'showAdd')}>
        <ModalHeader toggle={this.handleOnchange.bind(this, 'showAdd')} ><span className="h4 font-weight-bolder" >新增清機流程</span></ModalHeader>
        <ModalBody>
          <form>
            <div className="form-row">
              {/* <div className="form-group col-md-2">
                <label >規格</label>
                <MySelect
                  options={modeList}
                  isMulti={false}
                  closeMenuOnSelect={false}
                  hideSelectedOptions={false}
                  components={animatedComponents}
                  onChange={this.addChange.bind(this, 'addSpecMode')}
                  allowSelectAll={false}
                  value={tmpNewInfo.addSpecMode}
                  placeholder='選擇新增模式'
                  NoAllOption={false}
                />
              </div> */}
              <div className="form-group col-md-5">
                <label >規格</label>
                <Select
                  onChange={this.addChange.bind(this, 'fromTarget')}
                  className="mr-2 w-auto"
                  value={tmpNewInfo.fromTarget}
                  options={targetList}
                  placeholder='選擇規格'
                  styles={{ menu: provided => ({ ...provided, zIndex: 9999 }) }}>
                </Select>
              </div>
              <div className="form-group col-md-5">
                <label >切換規格</label>
                <Select
                  onChange={this.addChange.bind(this, 'toTarget')}
                  className="mr-2 w-auto"
                  value={tmpNewInfo.toTarget}
                  options={targetList}
                  placeholder='選擇規格'
                  styles={{ menu: provided => ({ ...provided, zIndex: 9999 }) }}>
                </Select>
              </div>
              <div className="form-group col-md-2">
                <label >押出線</label>
                <MySelect
                  options={lineList}
                  isMulti
                  closeMenuOnSelect={false}
                  hideSelectedOptions={false}
                  components={animatedComponents}
                  onChange={this.addChange.bind(this, 'lineFilter')}
                  allowSelectAll={true}
                  value={tmpNewInfo.lineFilter}
                  placeholder='選擇押出線'
                  NoAllOption={true}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group col-md-12">
                <label >清機流程</label>
                <MySelect
                  options={optionList}
                  isMulti
                  closeMenuOnSelect={false}
                  hideSelectedOptions={false}
                  components={animatedComponents}
                  onChange={this.handleChangeAdvancedFilter.bind(this, '')}
                  allowSelectAll={true}
                  value={tmpNewInfo.clean_process}
                  placeholder='選擇清機流程'
                  NoAllOption={true}
                />
              </div>
            </div>
          </form>
        </ModalBody>
      </Modal>
    </React.Fragment>
    )
  }

  // 儲存清機規則
  save = async () => {
    let { specMode, rowData, } = this.state
    const url = `/api/pbtc/update/spec-clean-info`
    let calljson = {
      mode: specMode,
      update: rowData,
    }

    this.queryApiCancelToken = axios.CancelToken.source();
    try {
      axios.post(url, calljson, {
        itraceAxiosConfig,
        cancelToken: this.queryApiCancelToken.token,
      }).then(res => {
        if (res.data.error !== '') {
          this.setState(this, () => {
            this.hintMsg('warning', `更新資料-異常: ${res.data.error}`)
          })
        } else {
          this.hintMsg('success', `更新資料-成功`)
        }
      })
    } catch (err) {
      this.hintMsg('error', `更新資料-異常: ${err}`)
    }
  }

  // 進階篩選的清單資訊
  handleChangeAdvancedFilter = (_id, selected) => {
    let { rowData, cleanItem, tmpNewInfo } = this.state;
    selected = selected.sort(function (a, b) {
      var keyA = new Date(a.value),
        keyB = new Date(b.value);
      // Compare the 2 dates
      if (keyA < keyB) return -1;
      if (keyA > keyB) return 1;
      return 0;
    });

    let executing_time = cleanItem.filter(row => selected.map((info) => info.value).indexOf(row.steps) !== -1).reduce((acc, cur) => {
      acc = acc + cur.executing_time
      return acc
    }, 0)
    if (_id !== '') {
      rowData = rowData.map((item) => {
        if (item._id === _id) {
          item.clean_process = selected
          item.executing_time = executing_time
        }
        return item
      })
      this.setState({ rowData: rowData });
    } else {
      tmpNewInfo.executing_time = executing_time
      tmpNewInfo.clean_process = selected
      this.setState({ tmpNewInfo: tmpNewInfo });
    }
  };


  // 將data拆分成多組，每組包含100筆資料
  splitArrayIntoGroups = (array, groupSize) => {
    const result = [];
    for (let i = 0; i < array.length; i += groupSize) {
      result.push(array.slice(i, i + groupSize));
    }
    return result;
  }

  // 頁面指標
  pageChange = (idx) => {
    let { pageIndex, maxPagination, } = this.state;
    if (idx === 'minus') {
      idx = pageIndex - 1 < 0 ? 0 : pageIndex - 1
    } else if (idx === 'plus') {
      idx = pageIndex + 1 >= maxPagination ? maxPagination : pageIndex + 1
    }

    return idx
  }

  // 頁面切換
  pageIndexChange = async (idx) => {
    let { maxPagination, hintMsg, } = this.state;
    this.setState({ show_photo: [], })

    try {
      idx = await this.pageChange(idx)
      let maxPageIndex = (idx + 3 >= maxPagination) ? maxPagination : idx + 3
      let minPageIndex = (idx - 3) >= 0 ? idx - 3 : 0

      this.setState({ pageIndex: idx, maxPageIndex: maxPageIndex, minPageIndex: minPageIndex })
    } catch (err) {
      hintMsg('error', `切換頁面異常: ${err}`)
    }

  }

  // 產生頁籤
  range = (start, stop, step = 1) => Array(Math.ceil((stop - start) / step)).fill(start).map((x, y) => x + y * step)

  // 是否顯示細項
  showDetail = () => {
    let { isShowDetail } = this.state;
    this.setState({
      isShowDetail: !isShowDetail
    })
  }

  // 表格顯示資訊
  showInfo = (prd_pc = '', series = '', color = '') => {
    let { specMode, isShowDetail } = this.state;
    if ((specMode !== 'spec') & (!isShowDetail)) {
      return (
        <React.Fragment>
          <span style={{ textAlign: 'center', }}>{`系列: ${series} 顏色: ${color}`}</span>
        </React.Fragment>
      )
    }
    return (
      <React.Fragment>
        <span >{prd_pc}</span>
        <br />
        <span style={{ textAlign: 'center', fontSize: 'small' }}>{`系列: ${series} 顏色: ${color}`}</span>
      </React.Fragment>
    )
  }



  render() {
    let { isLoading, modeList, specMode, fromTarget, toTarget, targetList, rowData, lineFilter, lineList, optionList, pageIndex, maxPageIndex, minPageIndex, isShowDetail, groupsDetail } = this.state
    let showData = rowData
    if (isShowDetail) {
      showData = groupsDetail[pageIndex]
    }
    if (lineFilter !== 'all') {
      showData = showData.filter(item => item.line === lineFilter)
    }

    let showDetailButton = groupsDetail.length > 0 ? true : false
    let testPage = this.range(minPageIndex, maxPageIndex)

    return <div className="col">
      <div className="row pt-2 mb-2 ml-1 d-inline" style={{ width: '100%' }}>
        <div>
          <label className="mb-0 mt-0" style={{ color: 'gray', fontSize: '10px' }}>查詢方式</label>
          <select onChange={this.modeChange.bind(this, 'specMode')} className="form-control w-auto mr-2" value={specMode} disabled={isLoading}>
            {modeList.map(
              (item, index) => <option className="Option" key={`mode_${index}`} value={item.value}>{item.title}</option>)}
          </select>
        </div>
        <div style={{ width: '15%' }}>
          <label className="mb-0 mt-0" style={{ color: 'gray', fontSize: '10px' }}>規格</label>
          <Select
            onChange={this.selectChange1.bind(this, 'fromTarget')}
            className="mr-2 w-auto"
            value={fromTarget}
            options={targetList}
            disabled={isLoading}
            placeholder='選擇規格'
            styles={{
              menu: provided => ({ ...provided, zIndex: 9999 })
            }}>
          </Select>
        </div>
        <div className="mr-2">
          <label className="mb-0 mt-0" style={{ color: 'gray', fontSize: '10px' }}></label>
          <div>
            <button type="button" className="btn btn-outline-dark align-baseline" onClick={this.exchange} disabled={isLoading} title="規格交換"><span className="fa fa-arrow-right"> </span></button>
          </div>
        </div>
        <div style={{ width: '15%' }}>
          <label className="mb-0 mt-0" style={{ color: 'gray', fontSize: '10px' }}>規格</label>
          <Select
            onChange={this.selectChange1.bind(this, 'toTarget')}
            className="mr-2 w-auto"
            value={toTarget}
            options={targetList}
            disabled={isLoading}
            placeholder='選擇規格'
            styles={{
              menu: provided => ({ ...provided, zIndex: 9999 })
            }}>
          </Select>
        </div>
        <div className="mr-2">
          <label className="mb-0 mt-0"></label>
          <div>
            <button type="button" className="btn btn-outline-primary" disabled={isLoading} onClick={this.querySpecCleanInfo}><span className="oi oi-magnifying-glass"></span> 查詢</button>
          </div>
        </div>
        <div>
          <label className="mb-0 mt-0" style={{ color: 'gray', fontSize: '10px' }}>押出線</label>
          <select onChange={this.modeChange.bind(this, 'lineFilter')} className="form-control w-auto mr-2" value={lineFilter} disabled={isLoading} title="選擇押出線">
            {lineList.map(
              (item, index) => <option className="Option" key={`to_${index}`} value={item.value}>{item.title}</option>)}
          </select>
        </div>

        <div className="mr-2">
          <label className="mb-0 mt-0"></label>
          <div>
            <button type="button" className="btn btn-outline-success align-baseline mr-2" onClick={this.save} disabled={isShowDetail ? true : false} title="將資料更新回資料庫"><span className="fas fa-save"> 儲存</span></button>
          </div>
        </div>
        <div style={{ width: '5%' }}>
          <label className="mb-0 mt-0"></label>
          <div>
            <button type="button" className={`btn ${isShowDetail ? "btn-dark" : "btn-outline-dark"} align-baseline mr-2`} onClick={this.showDetail} disabled={isLoading} style={{ display: showDetailButton ? '' : 'none' }}>{`${isShowDetail ? '隱藏' : '顯示'}細項`}</button>
          </div>
        </div>
        <div style={{ display: ((specMode !== 'spec') & (isShowDetail) ? '' : 'none') }}>
          <label className="mb-0 mt-0"></label>
          <ul className="pagination mb-0">
            <li className="page-item">
              <button className="page-link" aria-label="Previous" onClick={this.pageIndexChange.bind(this, 'minus')}>
                <span aria-hidden="true">&laquo;</span>
              </button>
            </li>
            {
              testPage.map((item, idx) => {
                return (
                  <li className={`page-item ${item === pageIndex ? "active" : ""}`} key={`page-item-${idx}`}><a className="page-link" href={`#${item}`} onClick={this.pageIndexChange.bind(this, item)}>{item + 1}</a></li>
                )
              })
            }
            <li className="page-item">
              <button className="page-link" aria-label="Next" onClick={this.pageIndexChange.bind(this, 'plus')}>
                <span aria-hidden="true">&raquo;</span>
              </button>
            </li>
          </ul>
        </div>
        <div className="ml-auto mr-2">
          <label className="mb-0 mt-0"></label>
          <div>
            <button type="button" className="btn btn-outline-info" onClick={this.handleOnchange.bind(this, 'showAdd')} ><span className="fas fa-plus"></span>新增</button>
          </div>
        </div>
        <div>
          <label className="mb-0 mt-0"></label>
          <div>
            <button type="button" className="btn btn-outline-secondary " onClick={this.handleOnchange.bind(this, 'showCleanItem')} ><span className="fas fa-screwdriver"></span>清機流程</button>
          </div>
        </div>
      </div>


      <div className="w-100 height: 1px border-top border-info"></div>
      <div className="pbtc-spec-maintenance-body mt-2">

        <table className="w-100 table table-sm table-bordered">
          <thead className="table" style={{ position: "sticky", top: 0, zIndex: 996 }}>
            <tr>
              <th style={{ textAlign: 'center', verticalAlign: 'middle', width: '10%', fontWeight: 'bolder', color: 'gray' }} scope="col">押出線</th>
              <th style={{ textAlign: 'center', verticalAlign: 'middle', width: '15%', fontWeight: 'bolder', color: 'gray' }} scope="col">從規格</th>
              <th style={{ textAlign: 'center', verticalAlign: 'middle', width: '15%', fontWeight: 'bolder', color: 'gray' }} scope="col">到規格</th>
              <th style={{ textAlign: 'center', verticalAlign: 'middle', width: '10%', fontWeight: 'bolder', color: 'gray' }} scope="col">清機時間</th>
              <th style={{ textAlign: 'center', verticalAlign: 'middle', width: '50%', fontWeight: 'bolder', color: 'gray' }} scope="col">清機流程</th>
            </tr>
          </thead>
          <tbody className="table-hover">
            {showData.map((row, idx) => {
              return (
                <tr key={`row-${idx}`}>
                  <td style={{ textAlign: 'center', verticalAlign: 'middle', width: '10%', fontWeight: 'bolder', }}>{row.line}</td>
                  <td style={{ textAlign: 'center', verticalAlign: 'middle', width: '15%', fontWeight: 'bolder', }}>{this.showInfo(row.prd_pc, row.from_series, row.from_color)}</td>
                  <td style={{ textAlign: 'center', verticalAlign: 'middle', width: '15%', fontWeight: 'bolder', }}>{this.showInfo(row.to_prd_pc, row.to_series, row.to_color)} </td>
                  <td style={{ textAlign: 'center', verticalAlign: 'middle', width: '10%', fontWeight: 'bolder', }}>{row.executing_time}</td>
                  <td style={{ textAlign: 'center', verticalAlign: 'middle', width: '50%', fontWeight: 'bolder', }}>
                    <MySelect
                      options={optionList}
                      isMulti
                      closeMenuOnSelect={false}
                      hideSelectedOptions={false}
                      components={animatedComponents}
                      onChange={this.handleChangeAdvancedFilter.bind(this, row._id)}
                      allowSelectAll={true}
                      value={row.clean_process}
                      placeholder='選擇清機流程'
                      NoAllOption={true}
                    /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {this.cleanMap()}
      {this.addClean()}
    </div>
  }
}

SpecCleanPage.defaultProps = {
  exportFilePrefix: 'PBTc清機表',
};