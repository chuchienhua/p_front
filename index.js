import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import configureStore from "./store/configureStore";
import AppRouter from "./components/AppRouter";

/* Bootstrap 5 相關 */
import "bootstrap/dist/css/bootstrap.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "@popperjs/core";
import "bootstrap";
import "bootstrap-icons/font/bootstrap-icons.css";

import "react-toastify/dist/ReactToastify.css";
import "handsontable/dist/handsontable.full.css";

export const { store, persistor } = configureStore();
export const homepagePath = "/pbtc";
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <Provider store={store}>
    <PersistGate loading={<div>Loading...</div>} persistor={persistor}>
      <div className="pbt-system">
        <AppRouter />
      </div>
    </PersistGate>
  </Provider>
);
