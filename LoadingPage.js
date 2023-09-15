import React from 'react';

const LoadingPage = (props) => {
    return (
        <div className="text-center mt-5">
            <span style={{ fontSize: "2.5rem" }}>PBT</span>
            <div className="spinner-border text-warning" style={{ width: "1.5rem", height: "1.5rem", borderWidth: "0.375rem" }} role="status">
                <span className="visually-hidden">Loading...</span>
            </div>
            <span style={{ fontSize: "2.5rem" }}>數位生管系統</span>
            <div className="spinner-grow ms-2" style={{ width: "1rem", height: "1rem" }} role="status" />
            <div className="spinner-grow ms-2" style={{ width: "1rem", height: "1rem" }} role="status" />
            <div className="spinner-grow ms-2" style={{ width: "1rem", height: "1rem" }} role="status" />
        </div>
    )
};


export default LoadingPage;