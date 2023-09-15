import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { homepagePath } from '../index';
import TopNavbar from './TopNavbar';
import HomePage from './HomePage';
import PrivateRoute from './PrivateRoute';
import LoadingPage from './LoadingPage';

const Login = lazy(() => import('./Login'));
const Recipes = lazy(() => import('./recipes/Recipes'));
const Mixing = lazy(() => import('./mixing/Mixing'));
const MixingPDA = lazy(() => import('./mixing/MixingPDA'));
const ExtrusionHome = lazy(() => import('./extrusion/ExtrusionHome'));
const ExtrusionStorage = lazy(() => import('./extrusion/ExtrusionStorage'));
const AuthManage = lazy(() => import('./AuthManage'));
const Packing = lazy(() => import('./packing/Packing'));
const FileMaintain = lazy(() => import('./fileMaintain/FileMaintain'));
const MaterialManage = lazy(() => import('./MaterialManage'));
const TraceHome = lazy(() => import('./trace/TraceHome'));
const ManagementReport = lazy(() => import('./management/ManagementReport'));
const SiloStatus = lazy(() => import('./siloStatus/SiloStatus'));
const PBTCSchedule = lazy(() => import('./schedule/index'));

const AppRouter = () => {
    return <BrowserRouter>
        <TopNavbar />
        <ToastContainer autoClose={2750} position={'top-right'} />
        <Suspense fallback={<LoadingPage />} >
            <Routes>
                <Route path='/' element={<HomePage />} />
                <Route path={homepagePath} >
                    <Route path='' element={<HomePage />} />

                    {/* 需登入才能使用的頁面，直接輸網址會重新跳轉 */}
                    <Route path='recipe' element={<PrivateRoute><Recipes path='/recipe' /></PrivateRoute>} />
                    <Route path='mixing' element={<PrivateRoute><Mixing path='/mixing' /></PrivateRoute>} />
                    <Route path='mixingPDA' element={<PrivateRoute><MixingPDA path='/mixingPDA' /></PrivateRoute>} />
                    <Route path='extrusion' element={<PrivateRoute><ExtrusionHome path='/extrusion' /></PrivateRoute>} />
                    <Route path='extrusionStorage' element={<PrivateRoute><ExtrusionStorage path='/extrusionStorage' /></PrivateRoute>} />
                    <Route path='authManage' element={<PrivateRoute><AuthManage path='/authManage' /></PrivateRoute>} />
                    <Route path='packing' element={<PrivateRoute><Packing path='/packing' /></PrivateRoute>} />
                    <Route path='packing/*' element={<PrivateRoute><Packing path='/packing' /></PrivateRoute>} />
                    <Route path='fileMaintain' element={<PrivateRoute><FileMaintain path='/fileMaintain' /></PrivateRoute>} />
                    <Route path='materialManage' element={<PrivateRoute><MaterialManage path='/materialManage' /></PrivateRoute>} />
                    <Route path='trace' element={<PrivateRoute><TraceHome path='/trace' /></PrivateRoute>} />
                    <Route path='managementReport' element={<PrivateRoute><ManagementReport path='/managementReport' /></PrivateRoute>} />
                    <Route path='siloStatus' element={<PrivateRoute><SiloStatus path='/siloStatus' /></PrivateRoute>} />
                    <Route path='schedule' element={<PrivateRoute login={true}><PBTCSchedule path='/schedule' /></PrivateRoute>} />

                    {/* 未登入才能使用的頁面 */}
                    <Route path='login' element={<PrivateRoute login={false}><Login /></PrivateRoute>} />
                </Route>
            </Routes>
        </Suspense >

    </BrowserRouter>;
};

export default AppRouter;