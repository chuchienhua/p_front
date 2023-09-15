import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Utils from "./Utils";
import { homepagePath } from "../index";
import { toast } from "react-toastify";
import "./css/Login.css";

function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [firm, setFirm] = useState("7");

  const [isLoading, setIsLoading] = useState(false);
  const [resString, setResString] = useState("");

  const login = () => {
    if (!id) {
      toast.warning("請輸入帳號");
      return;
    }
    if (!pw) {
      toast.warning("請輸入密碼");
      return;
    }

    setIsLoading(true);

    const apiUrl = Utils.generateApiUrl("/login");
    axios
      .post(apiUrl, { id: id, pw: pw, firm: firm })
      .then((res) => {
        if (res.data.token) {
          //更新global state
          console.log(res.data);
          dispatch({ type: "LOGIN_SUCCESS", payload: res.data });
          toast.success("登入成功");
          navigate(homepagePath);
        } else {
          toast.error(`登入失敗，${res.data.error}`);
          setResString(res.data.error);
          dispatch({ type: "LOGIN_FAILURE" });
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setIsLoading(false));
  };

  const handlePasswordKeyDown = (event) => {
    //enter
    if (13 === event.keyCode) {
      login();
    }
  };

  return (
    <div className="login-page m-2">
      <div className="row justify-content-center">
        <div className="col-12 col-sm-6 col-md-4">
          <div className="input-group me-2">
            <span className="input-group-text input-title">ERP帳號</span>
            <input
              type="text"
              className="form-control"
              defaultValue={id}
              onChange={(evt) => setId(evt.target.value)}
            />
          </div>

          <div className="input-group mt-2 me-2">
            <span className="input-group-text input-title">ERP密碼</span>
            <input
              type="password"
              className="form-control"
              defaultValue={pw}
              onChange={(evt) => setPw(evt.target.value)}
              onKeyDown={handlePasswordKeyDown}
            />
          </div>

          <div className="input-group mt-2 me-2">
            <span className="input-group-text input-title">選擇廠別</span>
            <select
              className="form-select"
              defaultValue={firm}
              onChange={(evt) => setFirm(evt.target.value)}
            >
              <option value="7">高雄仁武廠</option>
              <option value="A">漳州廠</option>
            </select>
          </div>

          <button
            type="button"
            className="btn btn-success mt-2"
            onClick={login}
            disabled={isLoading}
          >
            登入
          </button>
          <span className="text-danger mt-2 ms-2">
            {0 < resString.length && resString}
          </span>
        </div>
      </div>
    </div>
  );
}

export default Login;
