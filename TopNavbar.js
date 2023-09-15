import React, { useState, useEffect, useCallback } from "react";
import "./css/TopNavbar.css";
import { useNavigate, Link } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { homepagePath } from "../index";

function TopNavbar() {
  const user = useSelector((state) => state.user); //Global State
  const authRoute = useSelector((state) => state.authRoute); //Global State
  const firm = useSelector((state) => state.firm); //Global State

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [routes, setRoutes] = useState([]); //有權限的Routes

  useEffect(() => {
    if (authRoute) {
      if (authRoute.length) {
        setRoutes(authRoute);
      } else {
        setRoutes([]);
      }
    }
  }, [authRoute]);

  const handleLogout = useCallback(() => {
    dispatch({ type: "LOGOUT" });
    localStorage.removeItem("user");
    navigate(homepagePath + "/login");
  }, [dispatch, navigate]);

  const switchActive = (path) => {
    return path === window.location.pathname
      ? "nav-item nav-link active bg-secondary rounded ms-2"
      : "nav-item nav-link ms-2";
  };

  const generateRoutes = () => {
    let div = [];
    routes.forEach((element, index) => {
      if (element.IS_HIDE) {
        return;
      }
      div.push(
        <li key={index}>
          <Link
            className={switchActive(homepagePath + "/" + element.ROUTE)}
            to={homepagePath + "/" + element.ROUTE}
          >
            {element.ROUTE_NAME}
          </Link>
        </li>
      );
    });
    return div;
  };

  return (
    <div className="top-navbar">
      <nav className="navbar navbar-expand-sm navbar-dark bg-dark">
        <div
          className="navbar-brand text-light ms-2"
          onClick={() => navigate(homepagePath)}
        >
          PBTc數位生管系統
        </div>

        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarToggleExternalContent"
          aria-controls="navbarToggleExternalContent"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div
          className="collapse navbar-collapse"
          id="navbarToggleExternalContent"
        >
          {user ? (
            <>
              <ul className="navbar-nav">{generateRoutes()}</ul>

              <li className="nav-item dropdown">
                <span
                  className="nav-link dropdown-toggle ms-2"
                  href="#"
                  role="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  {user.PPS_CODE}
                </span>
                <div
                  className="dropdown-menu"
                  aria-labelledby="navbarDropdown"
                  style={{ margin: 0 }}
                >
                  <span className="dropdown-item">{user.NAME}</span>
                  <span className="dropdown-item">廠別-{firm}</span>
                  <div className="dropdown-divider"></div>
                  <span className="dropdown-item" onClick={handleLogout}>
                    登出
                  </span>
                </div>
              </li>
            </>
          ) : (
            <button
              className="btn btn-outline-success my-2 my-sm-0"
              onClick={() => navigate(homepagePath + "/login")}
            >
              登入
            </button>
          )}
        </div>
      </nav>
    </div>
  );
}

export default TopNavbar;
